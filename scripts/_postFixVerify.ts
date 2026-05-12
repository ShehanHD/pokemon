import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const cards = db.collection<{ pokemontcg_id?: string|null; tcgdex_id?: string|null; set_id?: string; number?: string; name?: string }>('cards')
  const userCards = db.collection<{ _id: unknown; userId?: string; cardId?: string; copies?: unknown[] }>('userCards')

  // sv3pt5 state
  const sv3pt5Total = await cards.countDocuments({ set_id: 'sv3pt5' })
  const sv3pt5Merged = await cards.countDocuments({ set_id: 'sv3pt5', pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } })
  const sv3pt5LegacyOnly = await cards.countDocuments({ set_id: 'sv3pt5', pokemontcg_id: { $ne: null }, tcgdex_id: { $in: [null, undefined] } })
  const sv3pt5TcgdexOnly = await cards.countDocuments({ set_id: 'sv3pt5', pokemontcg_id: { $in: [null, undefined] }, tcgdex_id: { $ne: null } })
  console.log(`sv3pt5: total=${sv3pt5Total} merged=${sv3pt5Merged} legacyOnly=${sv3pt5LegacyOnly} tcgdexOnly=${sv3pt5TcgdexOnly}`)

  // Inspect anomalies: c1, c2
  console.log('\n=== userCards docs for c1, c2 ===')
  const docs = await userCards.find({ cardId: { $in: ['c1', 'c2'] } }).toArray()
  for (const d of docs) console.log(' ', JSON.stringify(d))

  // Inspect basep-11, svp-85 — are they real TCGdex orphans?
  console.log('\n=== unmappable card docs ===')
  for (const cid of ['basep-11', 'svp-85']) {
    const c = await cards.findOne({ pokemontcg_id: cid }, { projection: { pokemontcg_id: 1, tcgdex_id: 1, set_id: 1, number: 1, name: 1 } })
    console.log(`  ${cid}:`, JSON.stringify(c))
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
