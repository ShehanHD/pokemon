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
  return process.env.TCGDEX_LANG ?? 'it'
}

function resolvePriceEUR(card: TcgdexCard): number | null {
  const v = card.pricing?.cardmarket?.prices?.averageSellPrice
  return typeof v === 'number' && Number.isFinite(v) ? v : null
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

async function ensureIndexes() {
  const db = await getDb()
  await db.collection('sets').createIndex({ tcgdex_id: 1 }, { unique: true, sparse: true })
  await db.collection('sets').createIndex({ pokemontcg_id: 1 }, { sparse: true })
  await db.collection('sets').createIndex({ seriesSlug: 1 })
  await db.collection('cards').createIndex({ tcgdex_id: 1 }, { unique: true, sparse: true })
  await db.collection('cards').createIndex({ pokemontcg_id: 1 }, { sparse: true })
  await db.collection('cards').createIndex({ set_id: 1 })
}

async function seedOneSet(brief: TcgdexSetBrief): Promise<SeedSetResult> {
  const db = await getDb()
  const detail = await fetchSet(brief.id)
  const seriesName = detail.serie?.name ?? 'Other'
  const series = resolveSeries(brief.id, seriesName)
  const seriesSlug = toSeriesSlug(series)
  const lang = language()

  const setDoc = {
    tcgdex_id: brief.id,
    pokemontcg_id: null,
    language: lang,
    name: brief.name,
    series,
    seriesSlug,
    releaseDate: brief.releaseDate ?? '',
    totalCards: brief.cardCount?.total ?? detail.cards.length,
    printedTotal: brief.cardCount?.official ?? detail.cards.length,
    logoUrl: buildAssetUrl(brief.logo) ?? '',
    symbolUrl: buildAssetUrl(brief.symbol) ?? '',
  }

  await db.collection('sets').updateOne(
    { tcgdex_id: brief.id },
    { $set: setDoc },
    { upsert: true },
  )

  const cardIds = detail.cards.map((c) => c.id)
  const cards = await fetchCardsConcurrent(cardIds, 5)

  const ops = cards.map((card) => {
    const imgs = buildCardImageUrls(card.image)
    const priceEUR = resolvePriceEUR(card)
    return {
      updateOne: {
        filter: { tcgdex_id: card.id },
        update: {
          $set: {
            tcgdex_id: card.id,
            pokemontcg_id: null,
            language: lang,
            name: card.name,
            number: card.localId,
            set_id: brief.id,
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
          },
        },
        upsert: true,
      },
    }
  })

  if (ops.length > 0) {
    await db.collection('cards').bulkWrite(ops, { ordered: false })
  }

  const prices = cards.map(resolvePriceEUR).filter((p): p is number => p !== null)
  const totalValueEUR = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) : null

  await db.collection('sets').updateOne(
    { tcgdex_id: brief.id },
    { $set: { totalValueEUR, totalValueUSD: null, totalValue: totalValueEUR } },
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
