import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { fetchAllSets, fetchCardsBySet } from '../lib/pokemontcg'
import { toSeriesSlug } from '../lib/sets'
import type { PtcgCard } from '../lib/schemas/pokemontcg'

// Sets whose API series is wrong — keyed by set ID prefix or exact ID
const SERIES_OVERRIDES: Record<string, string> = {
  'dv1': 'Black & White',
}

function resolveSeries(setId: string, apiSeries: string): string {
  if (SERIES_OVERRIDES[setId]) return SERIES_OVERRIDES[setId]
  // Fall back to name-based detection for any set the API lumps into "Other"
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

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB ?? 'pokevault'

async function seed() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI env var is not set')

  const client = new MongoClient(MONGODB_URI)
  await client.connect()

  try {
    const db = client.db(DB_NAME)

    // Ensure indexes before writing
    await db.collection('sets').createIndex({ pokemontcg_id: 1 }, { unique: true })
    await db.collection('sets').createIndex({ seriesSlug: 1 })
    await db.collection('cards').createIndex({ pokemontcg_id: 1 }, { unique: true })
    await db.collection('cards').createIndex({ set_id: 1 })
    console.log('Indexes ensured.')

    console.log('Fetching all sets from pokemontcg.io…')
    const sets = await fetchAllSets()
    console.log(`  Found ${sets.length} sets`)

    for (const ptcgSet of sets) {
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
    console.log(`  Upserted set: ${ptcgSet.name} (${ptcgSet.id})`)

    console.log(`  Fetching cards for ${ptcgSet.id}…`)
    const cards = await fetchCardsBySet(ptcgSet.id)
    console.log(`    ${cards.length} cards found`)

    for (const card of cards) {
      const cardDoc = {
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
      }

      await db.collection('cards').updateOne(
        { pokemontcg_id: card.id },
        { $set: cardDoc },
        { upsert: true }
      )
    }

    console.log(`    Upserted ${cards.length} cards for ${ptcgSet.id}`)

    const prices = cards
      .map((c) => resolvePrice(c))
      .filter((p): p is number => p !== null)
    const totalValueEUR = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) : null
    await db.collection('sets').updateOne(
      { pokemontcg_id: ptcgSet.id },
      { $set: { totalValueEUR } }
    )
    }

    console.log('Seed complete.')
  } finally {
    await client.close()
  }
}

seed().catch((err) => {
  console.error(err instanceof Error ? err.stack : err)
  process.exit(1)
})
