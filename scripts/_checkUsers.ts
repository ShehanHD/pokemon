import 'dotenv/config'
import { MongoClient } from 'mongodb'
const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const users = await db.collection('users').find({}).project({ email: 1, _id: 1 }).toArray()
  console.log('--- Users ---')
  for (const u of users) {
    console.log(`  _id=${typeof u._id}:${String(u._id)} email=${u.email}`)
  }

  console.log('\n--- userCards count per userId ---')
  const counts = await db.collection('userCards').aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 }, uniqueCards: { $addToSet: '$cardId' } } },
  ]).toArray()
  for (const r of counts) {
    console.log(`  userId=${typeof r._id}:${String(r._id)} count=${r.count} unique=${r.uniqueCards.length}`)
  }

  await c.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
