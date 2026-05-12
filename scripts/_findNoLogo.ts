import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const docs = await db.collection('sets').find(
    {
      tcgdex_id: { $exists: true, $ne: null },
      $or: [{ logoUrl: '' }, { logoUrl: null }, { logoUrl: { $exists: false } }],
    },
    { projection: { tcgdex_id: 1, name: 1, series: 1, seriesSlug: 1, releaseDate: 1, symbolUrl: 1, _id: 0 } },
  ).sort({ seriesSlug: 1, releaseDate: 1 }).toArray()
  console.log(`No-logo sets: ${docs.length}`)
  for (const d of docs) console.log(JSON.stringify(d))
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
