import 'dotenv/config'
import { MongoClient } from 'mongodb'
const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const ids = ['swshp-SWSH234', 'sv8pt5-149', 'sv1-244', 'sv6-186', 'me3-118', 'me3-119', 'sv3pt5-173', 'sv4-251']
  for (const id of ids) {
    const d = await db.collection('cards').findOne({ pokemontcg_id: id })
    console.log(`${id}: name=${d?.name} setName=${d?.setName} seriesSlug=${d?.seriesSlug} imageUrl=${d?.imageUrl ? 'ok' : 'MISSING'}`)
  }
  await c.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
