import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const rows = await db
    .collection('cards')
    .find({ set_id: 'svp', $or: [{ imageUrl: null }, { imageUrl: { $exists: false } }, { imageUrl: '' }] })
    .project({ _id: 0, pokemontcg_id: 1, number: 1, name: 1 })
    .toArray()

  let updated = 0
  let skipped = 0
  for (const r of rows) {
    const pid = r.pokemontcg_id as string | undefined
    if (!pid) { skipped++; continue }
    const api = await fetch(`https://api.pokemontcg.io/v2/cards/${pid}`)
    if (!api.ok) { skipped++; continue }
    const j = await api.json()
    const small = j?.data?.images?.small as string | undefined
    if (!small) { skipped++; continue }
    const head = await fetch(small, { method: 'HEAD' })
    if (head.status !== 200) { skipped++; continue }
    const res = await db.collection('cards').updateOne(
      { set_id: 'svp', pokemontcg_id: pid },
      { $set: { imageUrl: small } }
    )
    if (res.modifiedCount === 1) {
      updated++
      console.log(`updated ${pid} #${r.number} ${r.name} → ${small}`)
    } else {
      skipped++
    }
  }
  console.log(`\nupdated: ${updated}`)
  console.log(`skipped: ${skipped}`)
  await c.close()
}

main().catch(e => { console.error(e); process.exit(1) })
