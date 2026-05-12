import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)

  console.log('--- All series in DB ---')
  const series = await db.collection('sets').aggregate([
    { $group: { _id: '$series', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray()
  for (const s of series) console.log(`  ${s._id} (${s.count} sets)`)

  console.log('\n--- Mega Evolution sets (any series matching /mega/i) ---')
  const megaSets = await db.collection('sets').find({ series: /mega/i }).sort({ releaseDate: 1 }).toArray()
  for (const s of megaSets) {
    console.log(`  ${s.pokemontcg_id} | ${s.name} | series="${s.series}" | release=${s.releaseDate} | total=${s.totalCards} | totalValue=${s.totalValue}`)
  }

  for (const s of megaSets) {
    console.log(`\n--- ${s.pokemontcg_id} (${s.name}) breakdown ---`)
    const cards = await db.collection('cards').find({ set_id: s.pokemontcg_id }).project({ number: 1, name: 1, rarity: 1, supertype: 1, cardmarketPrice: 1 }).toArray()
    console.log(`  total cards in DB: ${cards.length}`)
    const withPrice = cards.filter((c) => c.cardmarketPrice != null).length
    console.log(`  with price: ${withPrice}`)
    console.log(`  without price: ${cards.length - withPrice}`)
    const bySupertype: Record<string, number> = {}
    for (const c of cards) {
      const k = String(c.supertype ?? 'unknown')
      bySupertype[k] = (bySupertype[k] ?? 0) + 1
    }
    console.log(`  by supertype:`, bySupertype)
    const energies = cards.filter((c) => c.supertype === 'Energy')
    if (energies.length > 0) {
      console.log(`  energies (${energies.length}):`)
      for (const e of energies.slice(0, 8)) console.log(`    #${e.number} ${e.name} | ${e.rarity} | price=${e.cardmarketPrice}`)
    } else {
      console.log(`  energies: NONE`)
    }
    const promos = cards.filter((c) => c.rarity === 'Promo' || /promo/i.test(String(c.rarity ?? '')))
    console.log(`  rarity=Promo count: ${promos.length}`)

    const numericMax = Math.max(...cards.map((c) => parseInt(String(c.number), 10)).filter((n) => Number.isFinite(n)), 0)
    console.log(`  max numeric #: ${numericMax}`)
    console.log(`  printedTotal: ${s.printedTotal} / totalCards: ${s.totalCards}`)

    // sample missing-price entries
    const noPrice = cards.filter((c) => c.cardmarketPrice == null).slice(0, 10)
    if (noPrice.length > 0) {
      console.log(`  sample missing-price cards:`)
      for (const c of noPrice) console.log(`    #${c.number} ${c.name} | ${c.rarity} | ${c.supertype}`)
    }
  }

  await c.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
