import { getDb } from './db'
import { fetchAllSets, fetchCardsBySet } from './pokemontcg'
import { toSeriesSlug } from './sets'
import type { PtcgCard, PtcgSet } from './schemas/pokemontcg'

export const SERIES_OVERRIDES: Record<string, string> = {
  'dv1': 'Black & White',
}

export function resolveSeries(setId: string, apiSeries: string): string {
  if (SERIES_OVERRIDES[setId]) return SERIES_OVERRIDES[setId]
  return apiSeries
}

function resolvePrice(card: PtcgCard): number | null {
  const cm = card.cardmarket?.prices?.averageSellPrice
  if (cm != null) return cm
  const tp = card.tcgplayer?.prices
  if (!tp) return null
  return (
    tp.holofoil?.market ??
    tp.reverseHolofoil?.market ??
    tp.normal?.market ??
    tp['1stEditionHolofoil']?.market ??
    tp['1stEditionNormal']?.market ??
    null
  )
}

export type SeedSetResult = {
  setId: string
  setName: string
  cardsUpserted: number
  pricedCards: number
  totalValue: number | null
}

export type SeedReport = {
  results: SeedSetResult[]
  errors: { setId: string; message: string }[]
  setsTouched: number
  cardsUpserted: number
  pricedCards: number
}

async function ensureIndexes() {
  const db = await getDb()
  await db.collection('sets').createIndex({ pokemontcg_id: 1 }, { unique: true })
  await db.collection('sets').createIndex({ seriesSlug: 1 })
  await db.collection('cards').createIndex({ pokemontcg_id: 1 }, { unique: true })
  await db.collection('cards').createIndex({ set_id: 1 })
}

async function seedOneSet(ptcgSet: PtcgSet): Promise<SeedSetResult> {
  const db = await getDb()
  const series = resolveSeries(ptcgSet.id, ptcgSet.series)
  const seriesSlug = toSeriesSlug(series)

  const setDoc = {
    pokemontcg_id: ptcgSet.id,
    name: ptcgSet.name,
    series,
    seriesSlug,
    releaseDate: ptcgSet.releaseDate,
    totalCards: ptcgSet.total,
    printedTotal: ptcgSet.printedTotal,
    logoUrl: ptcgSet.images.logo,
    symbolUrl: ptcgSet.images.symbol,
  }

  await db.collection('sets').updateOne(
    { pokemontcg_id: ptcgSet.id },
    { $set: setDoc },
    { upsert: true }
  )

  const cards = await fetchCardsBySet(ptcgSet.id)

  const ops = cards.map((card) => ({
    updateOne: {
      filter: { pokemontcg_id: card.id },
      update: {
        $set: {
          pokemontcg_id: card.id,
          name: card.name,
          number: card.number,
          set_id: ptcgSet.id,
          setName: ptcgSet.name,
          series,
          seriesSlug,
          rarity: card.rarity ?? null,
          types: card.types ?? [],
          subtypes: card.subtypes ?? [],
          supertype: card.supertype,
          imageUrl: card.images.small,
          imageUrlHiRes: card.images.large,
          priceEUR: resolvePrice(card),
        },
      },
      upsert: true,
    },
  }))

  if (ops.length > 0) {
    await db.collection('cards').bulkWrite(ops, { ordered: false })
  }

  const prices = cards
    .map((c) => resolvePrice(c))
    .filter((p): p is number => p !== null)
  const totalValueEUR = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) : null

  await db.collection('sets').updateOne(
    { pokemontcg_id: ptcgSet.id },
    { $set: { totalValueEUR } }
  )

  return {
    setId: ptcgSet.id,
    setName: ptcgSet.name,
    cardsUpserted: cards.length,
    pricedCards: prices.length,
    totalValue: totalValueEUR,
  }
}

async function seedSetIdsLegacy(setIds: string[]): Promise<SeedReport> {
  if (setIds.length === 0) {
    return { results: [], errors: [], setsTouched: 0, cardsUpserted: 0, pricedCards: 0 }
  }

  await ensureIndexes()
  const allSets = await fetchAllSets()
  const wanted = new Set(setIds)
  const targets = allSets.filter((s) => wanted.has(s.id))

  const results: SeedSetResult[] = []
  const errors: { setId: string; message: string }[] = []

  for (const id of setIds) {
    if (!targets.find((t) => t.id === id)) {
      errors.push({ setId: id, message: 'Set not found in pokemontcg.io API' })
    }
  }

  const INTER_SET_DELAY_MS = 250
  for (let i = 0; i < targets.length; i++) {
    const set = targets[i]
    try {
      const result = await seedOneSet(set)
      results.push(result)
    } catch (err) {
      errors.push({
        setId: set.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
    if (i < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, INTER_SET_DELAY_MS))
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

export async function seedSetIds(setIds: string[]): Promise<SeedReport> {
  const source = (process.env.SEED_SOURCE ?? 'pokemontcg').toLowerCase()
  if (source === 'tcgdex') {
    const { seedSetIdsTcgdex } = await import('./seedSeriesTcgdex')
    return seedSetIdsTcgdex(setIds)
  }
  return seedSetIdsLegacy(setIds)
}
