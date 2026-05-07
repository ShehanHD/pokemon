import 'dotenv/config'
import { getDb } from '@/lib/db'

async function run() {
  const db = await getDb()
  await db.collection('wishlist').createIndex({ userId: 1, cardId: 1 }, { unique: true })
  await db.collection('wishlist').createIndex({ userId: 1, addedAt: -1 })
  console.log('wishlist indexes created')
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
