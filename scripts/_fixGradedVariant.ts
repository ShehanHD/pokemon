import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'
const USER_ID = '69fb026f1f2aff0f2fb5927d'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const userCards = db.collection('userCards')

  const before = await userCards.find({
    userId: USER_ID,
    type: 'graded',
    gradingCompany: 'GRAAD',
    variant: 'holo',
  }).toArray()
  console.log(`Found ${before.length} graded GRAAD docs with variant='holo' (legacy)`)

  if (before.length === 0) {
    console.log('Nothing to fix.')
    await c.close()
    return
  }

  const res = await userCards.updateMany(
    { userId: USER_ID, type: 'graded', gradingCompany: 'GRAAD', variant: 'holo' },
    { $set: { variant: 'holofoil', updatedAt: new Date() } },
  )
  console.log(`Updated ${res.modifiedCount} docs to variant='holofoil'`)

  const after = await userCards.find({ userId: USER_ID, type: 'graded', gradingCompany: 'GRAAD' }).toArray()
  const stillHolo = after.filter((d) => d.variant === 'holo').length
  const nowHolofoil = after.filter((d) => d.variant === 'holofoil').length
  console.log(`After: ${after.length} graded GRAAD docs total — variant='holo': ${stillHolo}, variant='holofoil': ${nowHolofoil}`)

  await c.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
