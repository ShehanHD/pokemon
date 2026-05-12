import type { ObjectId } from 'mongodb'
import { getDb } from './db'
import { toSeriesSlug } from './sets'
import {
  fetchAllSets,
  fetchSet,
  fetchCardsConcurrent,
  buildCardImageUrls,
  buildAssetUrl,
} from './tcgdex'
import type { TcgdexCard, TcgdexSetBrief } from './schemas/tcgdex'
import { SERIES_OVERRIDES, resolveSeries } from './seedSeries'
import type { SeedReport, SeedSetResult } from './seedSeries'

export type { SeedReport, SeedSetResult }
export { SERIES_OVERRIDES, resolveSeries }

const INTER_SET_DELAY_MS = 250

function language(): string {
  return process.env.TCGDEX_LANG ?? 'en'
}

function resolvePriceEUR(card: TcgdexCard): number | null {
  const cm = card.pricing?.cardmarket
  if (!cm) return null
  const candidates = [cm.avg30, cm.avg, cm.trend, cm.avg7, cm.avg1]
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

function normaliseVariants(card: TcgdexCard) {
  const v = card.variants ?? {}
  return {
    firstEdition: Boolean(v.firstEdition),
    holo: Boolean(v.holo),
    normal: Boolean(v.normal),
    reverse: Boolean(v.reverse),
    wPromo: Boolean(v.wPromo),
  }
}

async function reconcilePokemontcgIndex(collName: string) {
  const db = await getDb()
  const indexes = await db.collection(collName).indexes()
  const existing = indexes.find((i) => i.name === 'pokemontcg_id_1')
  const wantsSparse = existing?.sparse === true
  const wantsUnique = existing?.unique === true
  if (existing && (!wantsSparse || !wantsUnique)) {
    await db.collection(collName).dropIndex('pokemontcg_id_1')
  }
  await db.collection(collName).createIndex(
    { pokemontcg_id: 1 },
    { unique: true, sparse: true, name: 'pokemontcg_id_1' },
  )
}

async function ensureIndexes() {
  const db = await getDb()
  await db.collection('sets').createIndex({ tcgdex_id: 1 }, { unique: true, sparse: true })
  await reconcilePokemontcgIndex('sets')
  await db.collection('sets').createIndex({ seriesSlug: 1 })
  await db.collection('cards').createIndex({ tcgdex_id: 1 }, { unique: true, sparse: true })
  await reconcilePokemontcgIndex('cards')
  await db.collection('cards').createIndex({ set_id: 1 })
}

type LegacySetMatch = { _id: ObjectId; pokemontcg_id: string }

async function findLegacySet(brief: TcgdexSetBrief): Promise<LegacySetMatch | null> {
  const db = await getDb()
  const coll = db.collection<{ _id: ObjectId; pokemontcg_id?: string | null; name?: string | null; releaseDate?: string | null; tcgdex_id?: string | null }>('sets')

  const direct = await coll.findOne(
    { pokemontcg_id: brief.id, tcgdex_id: { $in: [null, undefined] } },
    { projection: { _id: 1, pokemontcg_id: 1 } },
  )
  if (direct && typeof direct.pokemontcg_id === 'string') {
    return { _id: direct._id, pokemontcg_id: direct.pokemontcg_id }
  }

  const releaseDate = brief.releaseDate ?? ''
  if (releaseDate.length > 0) {
    const byNameDate = await coll.findOne(
      { name: brief.name, releaseDate, pokemontcg_id: { $ne: null }, tcgdex_id: { $in: [null, undefined] } },
      { projection: { _id: 1, pokemontcg_id: 1 } },
    )
    if (byNameDate && typeof byNameDate.pokemontcg_id === 'string') {
      return { _id: byNameDate._id, pokemontcg_id: byNameDate.pokemontcg_id }
    }
  }

  const byName = await coll.findOne(
    { name: brief.name, pokemontcg_id: { $ne: null }, tcgdex_id: { $in: [null, undefined] } },
    { projection: { _id: 1, pokemontcg_id: 1 } },
  )
  if (byName && typeof byName.pokemontcg_id === 'string') {
    return { _id: byName._id, pokemontcg_id: byName.pokemontcg_id }
  }

  return null
}

async function loadLegacyCardMap(legacySetId: string): Promise<Map<string, ObjectId>> {
  const db = await getDb()
  const cursor = db.collection<{ _id: ObjectId; number?: string | null; tcgdex_id?: string | null }>('cards').find(
    { set_id: legacySetId, tcgdex_id: { $in: [null, undefined] } },
    { projection: { _id: 1, number: 1 } },
  )
  const map = new Map<string, ObjectId>()
  for await (const doc of cursor) {
    if (typeof doc.number === 'string' && doc.number.length > 0) {
      map.set(doc.number, doc._id)
    }
  }
  return map
}

async function seedOneSet(brief: TcgdexSetBrief): Promise<SeedSetResult> {
  const db = await getDb()
  const detail = await fetchSet(brief.id)
  const seriesName = detail.serie?.name ?? 'Other'
  const series = resolveSeries(brief.id, seriesName)
  const seriesSlug = toSeriesSlug(series)
  const lang = language()

  const legacySet = await findLegacySet(brief)

  const setMergeFields = {
    tcgdex_id: brief.id,
    language: lang,
    name: brief.name,
    series,
    seriesSlug,
    releaseDate: detail.releaseDate ?? brief.releaseDate ?? '',
    totalCards: brief.cardCount?.total ?? detail.cards.length,
    printedTotal: brief.cardCount?.official ?? detail.cards.length,
    logoUrl: buildAssetUrl(detail.logo ?? brief.logo) ?? '',
    symbolUrl: buildAssetUrl(detail.symbol ?? brief.symbol) ?? '',
  }

  if (legacySet) {
    await db.collection('sets').updateOne(
      { _id: legacySet._id },
      { $set: setMergeFields },
    )
  } else {
    await db.collection('sets').updateOne(
      { tcgdex_id: brief.id },
      { $set: setMergeFields },
      { upsert: true },
    )
  }

  const legacyCardMap = legacySet ? await loadLegacyCardMap(legacySet.pokemontcg_id) : new Map<string, ObjectId>()

  const cardIds = detail.cards.map((c) => c.id)
  const cards = await fetchCardsConcurrent(cardIds, 5)

  const ops = cards.map((card) => {
    const imgs = buildCardImageUrls(card.image)
    const priceEUR = resolvePriceEUR(card)
    const cardMergeFields = {
      tcgdex_id: card.id,
      language: lang,
      name: card.name,
      number: card.localId,
      set_id: legacySet ? legacySet.pokemontcg_id : brief.id,
      setName: brief.name,
      series,
      seriesSlug,
      rarity: card.rarity ?? null,
      types: card.types ?? [],
      subtypes: [],
      supertype: card.category ?? '',
      variants: normaliseVariants(card),
      imageUrl: imgs.imageUrl ?? '',
      imageUrlHiRes: imgs.imageUrlHiRes ?? '',
      priceEUR,
      priceUSD: null,
      pricing: card.pricing ?? null,
    }

    const legacyCardId = legacyCardMap.get(card.localId)
    if (legacyCardId) {
      return {
        updateOne: {
          filter: { _id: legacyCardId },
          update: { $set: cardMergeFields },
        },
      }
    }

    return {
      updateOne: {
        filter: { tcgdex_id: card.id },
        update: { $set: cardMergeFields },
        upsert: true,
      },
    }
  })

  if (ops.length > 0) {
    await db.collection('cards').bulkWrite(ops, { ordered: false })
  }

  const prices = cards.map(resolvePriceEUR).filter((p): p is number => p !== null)
  const totalValueEUR = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) : null

  const setFilter = legacySet ? { _id: legacySet._id } : { tcgdex_id: brief.id }
  await db.collection('sets').updateOne(
    setFilter,
    { $set: { totalValue: totalValueEUR, totalValueEUR, totalValueUSD: null } },
  )

  return {
    setId: brief.id,
    setName: brief.name,
    cardsUpserted: cards.length,
    pricedCards: prices.length,
    totalValue: totalValueEUR,
  }
}

export async function seedSetIdsTcgdex(setIds: string[]): Promise<SeedReport> {
  if (setIds.length === 0) {
    return { results: [], errors: [], setsTouched: 0, cardsUpserted: 0, pricedCards: 0 }
  }

  await ensureIndexes()
  const all = await fetchAllSets()
  const wanted = new Set(setIds)
  const targets = all.filter((s) => wanted.has(s.id))

  const results: SeedSetResult[] = []
  const errors: { setId: string; message: string }[] = []

  for (const id of setIds) {
    if (!targets.find((t) => t.id === id)) {
      errors.push({ setId: id, message: 'Set not found in TCGdex API' })
    }
  }

  for (let i = 0; i < targets.length; i++) {
    const set = targets[i]
    try {
      results.push(await seedOneSet(set))
    } catch (err) {
      errors.push({
        setId: set.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, INTER_SET_DELAY_MS))
    }
  }

  return {
    results,
    errors,
    setsTouched: results.length,
    cardsUpserted: results.reduce((s, r) => s + r.cardsUpserted, 0),
    pricedCards: results.reduce((s, r) => s + r.pricedCards, 0),
  }
}
