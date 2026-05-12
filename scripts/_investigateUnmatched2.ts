import 'dotenv/config'
import { getDb } from '../lib/db'

const ORPHAN_LEGACY_SETS = ['me1', 'me2pt5', 'me3', 'rsv10pt5', 'sv3', 'sv4', 'sv8pt5', 'sv9']
const PARTIAL_SETS = ['basep', 'base1', 'svp']
const ORPHAN_CARD_NUMBERS: Record<string, string[]> = {
  basep: ['11'],
  base1: ['25', '4'],
  svp: ['85'],
}

async function main() {
  const db = await getDb()
  const sets = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; name?: string; releaseDate?: string }>('sets')
  const cards = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; set_id?: string; number?: string; name?: string }>('cards')

  console.log('=== TCGdex-only set docs (not merged with legacy) for orphan legacy set names ===')
  for (const legacyId of ORPHAN_LEGACY_SETS) {
    const legacyDoc = await sets.findOne({ pokemontcg_id: legacyId }, { projection: { name: 1, releaseDate: 1 } })
    if (!legacyDoc) continue
    console.log(`\nLegacy: ${legacyId} | name="${legacyDoc.name}" date="${legacyDoc.releaseDate}"`)
    // Search for any TCGdex-only set with similar name
    const matches = await sets.find(
      { tcgdex_id: { $ne: null }, pokemontcg_id: { $in: [null, undefined] }, name: legacyDoc.name },
      { projection: { tcgdex_id: 1, name: 1, releaseDate: 1 } },
    ).toArray()
    if (matches.length === 0) {
      console.log('  no TCGdex set with same name')
    } else {
      for (const m of matches) {
        console.log(`  TCGdex set: tcgdex_id="${m.tcgdex_id}" name="${m.name}" date="${m.releaseDate}"`)
      }
    }
  }

  console.log('\n=== Partial-merged sets — check the missing card numbers in TCGdex side ===')
  for (const sid of PARTIAL_SETS) {
    const setDoc = await sets.findOne({ pokemontcg_id: sid }, { projection: { tcgdex_id: 1, name: 1 } })
    console.log(`\nLegacy set ${sid} | TCGdex set id=${setDoc?.tcgdex_id}`)
    const numbers = ORPHAN_CARD_NUMBERS[sid]
    for (const num of numbers) {
      // Find any card with tcgdex_id whose number matches in this set
      const c = await cards.findOne(
        { set_id: sid, number: num, tcgdex_id: { $ne: null } },
        { projection: { tcgdex_id: 1, name: 1, number: 1 } },
      )
      console.log(`  Looking for set_id=${sid} number=${num}:`, c ? JSON.stringify(c) : 'NO MATCH IN COLLECTION')
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
