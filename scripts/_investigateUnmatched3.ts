import 'dotenv/config'
import { getDb } from '../lib/db'

const LEGACY_BY_DATE = [
  { legacy: 'me1', name: 'Mega Evolution', date: '2025/09/26' },
  { legacy: 'me2pt5', name: 'Ascended Heroes', date: '2026/01/30' },
  { legacy: 'me3', name: 'Perfect Order', date: '2026/03/27' },
  { legacy: 'rsv10pt5', name: 'White Flare', date: '2025/07/18' },
  { legacy: 'sv3', name: 'Obsidian Flames', date: '2023/08/11' },
  { legacy: 'sv4', name: 'Paradox Rift', date: '2023/11/03' },
  { legacy: 'sv8pt5', name: 'Prismatic Evolutions', date: '2025/01/17' },
  { legacy: 'sv9', name: 'Journey Together', date: '2025/03/28' },
]

async function main() {
  const db = await getDb()
  const sets = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; name?: string; releaseDate?: string; totalCards?: number }>('sets')

  console.log('=== TCGdex-only sets matching by releaseDate (legacy uses 2025/09/26; TCGdex likely uses 2025-09-26) ===')
  for (const row of LEGACY_BY_DATE) {
    const isoDate = row.date.replaceAll('/', '-')
    const matches = await sets.find(
      {
        tcgdex_id: { $ne: null },
        pokemontcg_id: { $in: [null, undefined] },
        $or: [{ releaseDate: row.date }, { releaseDate: isoDate }],
      },
      { projection: { tcgdex_id: 1, name: 1, releaseDate: 1, totalCards: 1 } },
    ).toArray()
    console.log(`\nLegacy ${row.legacy} | ${row.name} | ${row.date}:`)
    if (matches.length === 0) {
      console.log('  no TCGdex set with same date — maybe TCGdex uses different date format')
    } else {
      for (const m of matches) {
        console.log(`  -> tcgdex_id=${m.tcgdex_id} name="${m.name}" date="${m.releaseDate}" totalCards=${m.totalCards}`)
      }
    }
  }

  console.log('\n=== Sample releaseDate format in TCGdex-only sets ===')
  const sample = await sets.find(
    { tcgdex_id: { $ne: null }, pokemontcg_id: { $in: [null, undefined] } },
    { projection: { tcgdex_id: 1, name: 1, releaseDate: 1 }, limit: 5 },
  ).toArray()
  for (const s of sample) console.log(' ', JSON.stringify(s))

  console.log('\n=== Count TCGdex-only sets total ===')
  const tcgdexOnly = await sets.countDocuments({ tcgdex_id: { $ne: null }, pokemontcg_id: { $in: [null, undefined] } })
  const merged = await sets.countDocuments({ tcgdex_id: { $ne: null }, pokemontcg_id: { $ne: null } })
  const legacyOnly = await sets.countDocuments({ pokemontcg_id: { $ne: null }, tcgdex_id: { $in: [null, undefined] } })
  console.log(`  TCGdex-only (no pokemontcg_id): ${tcgdexOnly}`)
  console.log(`  Merged (both keys):             ${merged}`)
  console.log(`  Legacy-only (no tcgdex_id):     ${legacyOnly}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
