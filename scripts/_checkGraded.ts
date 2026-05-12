import 'dotenv/config'
import { MongoClient } from 'mongodb'
const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'
const USER_ID = '69fb026f1f2aff0f2fb5927d'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const userCards = db.collection('userCards')
  const all = await userCards.find({ userId: USER_ID }).toArray()
  console.log(`Total userCards for user: ${all.length}`)
  for (const d of all) {
    console.log(`  _id=${typeof d._id}:${String(d._id)} type=${d.type ?? 'raw'} cardId=${d.cardId} variant=${d.variant} grade=${d.grade ?? '-'} company=${d.gradingCompany ?? '-'} acquired=${d.acquiredAt?.toISOString?.().slice(0,10) ?? '-'}`)
  }
  await c.close()
}
main().catch((e)=>{console.error(e);process.exit(1)})
