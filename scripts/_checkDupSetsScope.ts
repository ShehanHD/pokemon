import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  // For each set_id, count tcgdex-sourced vs legacy
  const rows = await db.collection('cards').aggregate<{ _id: string; total: number; withTcgdex: number; withoutTcgdex: number }>([
    { $group: {
      _id: '$set_id',
      total: { $sum: 1 },
      withTcgdex: { $sum: { $cond: [{ $ifNull: ['$tcgdex_id', false] }, 1, 0] } },
      withoutTcgdex: { $sum: { $cond: [{ $ifNull: ['$tcgdex_id', false] }, 0, 1] } },
    } },
    { $match: { withTcgdex: { $gt: 0 }, withoutTcgdex: { $gt: 0 } } },
    { $sort: { total: -1 } },
  ]).toArray()
  console.log('sets with BOTH tcgdex + legacy docs:', rows.length)
  for (const r of rows.slice(0, 20)) {
    console.log(` ${r._id.padEnd(12)} total=${r.total}  tcgdex=${r.withTcgdex}  legacy=${r.withoutTcgdex}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
