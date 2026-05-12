import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const cards = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; set_id?: string; number?: string; name?: string }>('cards')

  const setId = 'swsh8'
  const total = await cards.countDocuments({ set_id: setId })
  const withBoth = await cards.countDocuments({ set_id: setId, pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } })
  const legacyOnly = await cards.countDocuments({ set_id: setId, pokemontcg_id: { $ne: null }, tcgdex_id: { $in: [null, undefined] } })
  const tcgdexOnly = await cards.countDocuments({ set_id: setId, pokemontcg_id: { $in: [null, undefined] }, tcgdex_id: { $ne: null } })

  console.log(`set_id=${setId}: total=${total} mergedDocs=${withBoth} legacyOnly=${legacyOnly} tcgdexOnly=${tcgdexOnly}`)

  // Pick a duplicate: take a tcgdex-only doc and see if its tcgdex_id appears elsewhere
  const tcgdexOnlySample = await cards.find(
    { set_id: setId, pokemontcg_id: { $in: [null, undefined] }, tcgdex_id: { $ne: null } },
    { projection: { tcgdex_id: 1, number: 1, name: 1 }, limit: 3 },
  ).toArray()
  console.log('\nSample tcgdex-only docs at swsh8:')
  for (const t of tcgdexOnlySample) {
    console.log(`  ${JSON.stringify(t)}`)
    // Look for another doc with the same tcgdex_id
    const matches = await cards.find(
      { tcgdex_id: t.tcgdex_id },
      { projection: { _id: 1, pokemontcg_id: 1, tcgdex_id: 1, set_id: 1, number: 1, name: 1 } },
    ).toArray()
    console.log(`    docs sharing tcgdex_id=${t.tcgdex_id}: ${matches.length}`)
    for (const m of matches) console.log(`      ${JSON.stringify(m)}`)
    // Look for a doc at same set_id with same NUMBER
    const numberMatches = await cards.find(
      { set_id: setId, number: t.number },
      { projection: { _id: 1, pokemontcg_id: 1, tcgdex_id: 1, number: 1, name: 1 } },
    ).toArray()
    console.log(`    docs at set_id=${setId} number=${t.number}: ${numberMatches.length}`)
    for (const m of numberMatches) console.log(`      ${JSON.stringify(m)}`)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
