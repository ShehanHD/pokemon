import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'
const USER_ID = '69fb026f1f2aff0f2fb5927d'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const userCards = db.collection('userCards')

  // Find graded GRAAD docs whose _id is a string (the broken ones)
  const broken = await userCards.find({
    userId: USER_ID,
    type: 'graded',
    gradingCompany: 'GRAAD',
  }).toArray()

  const stringIdDocs = broken.filter((d) => typeof d._id === 'string')
  console.log(`Found ${stringIdDocs.length} graded docs with string _id (broken)`)
  console.log(`Found ${broken.length - stringIdDocs.length} with proper ObjectId (already ok)`)

  if (stringIdDocs.length === 0) {
    console.log('Nothing to fix.')
    await c.close()
    return
  }

  // Re-insert without _id (Mongo will auto-generate ObjectId), then delete originals
  const reinsert = stringIdDocs.map(({ _id, ...rest }) => rest)
  const ins = await userCards.insertMany(reinsert)
  console.log(`Re-inserted ${ins.insertedCount} docs with ObjectId _id`)

  const oldIds = stringIdDocs.map((d) => d._id)
  const del = await userCards.deleteMany({ _id: { $in: oldIds } })
  console.log(`Deleted ${del.deletedCount} broken docs`)

  // Verify
  const after = await userCards.find({ userId: USER_ID, type: 'graded', gradingCompany: 'GRAAD' }).toArray()
  const stillBroken = after.filter((d) => typeof d._id === 'string').length
  console.log(`\nAfter fix: ${after.length} graded GRAAD docs total, ${stillBroken} still string-id`)

  await c.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
