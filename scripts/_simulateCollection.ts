import 'dotenv/config'
import { MongoClient } from 'mongodb'
const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'
const USER_ID = '69fb026f1f2aff0f2fb5927d'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)

  const pipeline = [
    { $match: { userId: USER_ID } },
    {
      $group: {
        _id: '$cardId',
        copyCount: { $sum: 1 },
        rawCount: { $sum: { $cond: [{ $eq: ['$type', 'raw'] }, 1, 0] } },
        gradedCount: { $sum: { $cond: [{ $eq: ['$type', 'graded'] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'cards',
        localField: '_id',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: { path: '$card', preserveNullAndEmptyArrays: true } },
  ]

  const rows = await db.collection('userCards').aggregate(pipeline).toArray()
  console.log(`Pipeline produced ${rows.length} rows:`)
  for (const r of rows) {
    console.log(`  cardId=${r._id} copies=${r.copyCount} raw=${r.rawCount} graded=${r.gradedCount} cardFound=${!!r.card} cardName=${r.card?.name ?? '(no card doc)'}`)
  }
  await c.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
