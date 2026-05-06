import { getDb } from '../lib/db'

async function run() {
  const db = await getDb()
  const col = db.collection('userCards')
  await col.createIndex({ userId: 1, cardId: 1 }, { name: 'userId_cardId' })
  await col.createIndex({ userId: 1 }, { name: 'userId' })
  await col.createIndex({ userId: 1, type: 1 }, { name: 'userId_type' })
  console.log('userCards indexes created')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
