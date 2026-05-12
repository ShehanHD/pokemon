import 'dotenv/config'
import { getDb } from '../lib/db'
import { seedSetIdsTcgdex } from '../lib/seedSeriesTcgdex'

async function main() {
  const db = await getDb()
  const docs = await db.collection('sets')
    .find({ tcgdex_id: { $exists: true, $ne: null } }, { projection: { tcgdex_id: 1 } })
    .toArray()
  const ids = docs.map((d) => d.tcgdex_id as string)
  console.log(`Re-seeding ${ids.length} TCGdex sets in lang=${process.env.TCGDEX_LANG ?? 'en'}…`)
  const report = await seedSetIdsTcgdex(ids)
  console.log(JSON.stringify({
    setsTouched: report.setsTouched,
    cardsUpserted: report.cardsUpserted,
    pricedCards: report.pricedCards,
    errors: report.errors,
  }, null, 2))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
