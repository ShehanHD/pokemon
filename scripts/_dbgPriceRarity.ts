import 'dotenv/config'
import { getDb } from '../lib/db'

const run = async () => {
  const db = await getDb()
  const sample = await db.collection('cards').aggregate([
    { $sample: { size: 10 } },
    { $project: { tcgdex_id: 1, name: 1, rarity: 1, cardmarketPrice: 1, priceEUR: 1, set_id: 1 } },
  ]).toArray()
  console.log(JSON.stringify(sample, null, 2))

  console.log('\n--- counts ---')
  const total = await db.collection('cards').countDocuments({})
  const hasCardMarket = await db.collection('cards').countDocuments({ cardmarketPrice: { $ne: null } })
  const hasPriceEUR = await db.collection('cards').countDocuments({ priceEUR: { $ne: null } })
  console.log({ total, hasCardMarket, hasPriceEUR })

  console.log('\n--- rarity distribution (top 30) ---')
  const rarities = await db.collection('cards').aggregate([
    { $group: { _id: '$rarity', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray()
  console.log(JSON.stringify(rarities, null, 2))
  process.exit(0)
}
run().catch((e) => { console.error(e); process.exit(1) })
