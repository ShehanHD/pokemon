import 'dotenv/config'
import { MongoClient } from 'mongodb'
const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'
async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const total = await db.collection('cards').countDocuments({ set_id: 'svp' })
  const withImg = await db.collection('cards').countDocuments({ set_id: 'svp', imageUrl: { $ne: null, $exists: true } })
  const missing = await db.collection('cards').countDocuments({ set_id: 'svp', $or: [{ imageUrl: null }, { imageUrl: { $exists: false } }, { imageUrl: '' }] })
  console.log('svp total:', total)
  console.log('svp with imageUrl:', withImg)
  console.log('svp missing imageUrl:', missing)
  console.log('\n--- sample missing ---')
  const samples = await db.collection('cards').find({ set_id: 'svp', $or: [{ imageUrl: null }, { imageUrl: { $exists: false } }, { imageUrl: '' }] }).limit(8).project({ number: 1, name: 1, imageUrl: 1, pokemontcg_id: 1, tcgdex_id: 1 }).toArray()
  for (const s of samples) console.log(JSON.stringify(s))
  console.log('\n--- sample with image ---')
  const ok = await db.collection('cards').find({ set_id: 'svp', imageUrl: { $ne: null, $exists: true, $ne: '' } }).limit(3).project({ number: 1, name: 1, imageUrl: 1, pokemontcg_id: 1, tcgdex_id: 1 }).toArray()
  for (const s of ok) console.log(JSON.stringify(s))
  await c.close()
}
main().catch(e => { console.error(e); process.exit(1) })
