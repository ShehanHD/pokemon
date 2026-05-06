import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { fetchAllSets, fetchCardsBySet } from '../lib/pokemontcg'
import { toSeriesSlug } from '../lib/sets'

const MONGODB_URI = process.env.MONGODB_URI!
const DB_NAME = process.env.MONGODB_DB ?? 'pokevault'

async function seed() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI env var is not set')

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  console.log('Fetching all sets from pokemontcg.io…')
  const sets = await fetchAllSets()
  console.log(`  Found ${sets.length} sets`)

  for (const ptcgSet of sets) {
    const seriesSlug = toSeriesSlug(ptcgSet.series)
    const setDoc = {
      pokemontcg_id: ptcgSet.id,
      name: ptcgSet.name,
      series: ptcgSet.series,
      seriesSlug,
      releaseDate: ptcgSet.releaseDate,
      totalCards: ptcgSet.total,
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
        series: ptcgSet.series,
        seriesSlug,
        rarity: card.rarity ?? null,
        types: card.types ?? [],
        subtypes: card.subtypes ?? [],
        supertype: card.supertype,
        imageUrl: card.images.small,
        imageUrlHiRes: card.images.large,
        cardmarketPrice: card.cardmarket?.prices?.averageSellPrice ?? null,
      }

      await db.collection('cards').updateOne(
        { pokemontcg_id: card.id },
        { $set: cardDoc },
        { upsert: true }
      )
    }

    console.log(`    Upserted ${cards.length} cards for ${ptcgSet.id}`)
  }

  // Create indexes
  await db.collection('sets').createIndex({ pokemontcg_id: 1 }, { unique: true })
  await db.collection('sets').createIndex({ seriesSlug: 1 })
  await db.collection('cards').createIndex({ pokemontcg_id: 1 }, { unique: true })
  await db.collection('cards').createIndex({ set_id: 1 })
  console.log('Indexes ensured.')

  await client.close()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
