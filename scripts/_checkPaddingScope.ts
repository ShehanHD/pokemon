import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const sets = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; name?: string; totalCards?: number }>('sets')
  const cards = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; set_id?: string; number?: string }>('cards')

  // Already-merged sets: both keys set
  const mergedSets = await sets.find({ pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } }).toArray()
  console.log(`Total merged sets: ${mergedSets.length}`)

  let problematicSets = 0
  let totalDupes = 0
  let totalMissingTcgdex = 0

  const samples: { legacy: string; tcgdex: string; legacyOnlyCards: number; tcgdexOnlyCards: number }[] = []

  for (const s of mergedSets) {
    const legacy = s.pokemontcg_id!
    const tcgdex = s.tcgdex_id!
    // Legacy-style: set_id=legacy, no tcgdex_id
    const legacyOnlyCount = await cards.countDocuments({ set_id: legacy, tcgdex_id: { $in: [null, undefined] } })
    // TCGdex-style: set_id=tcgdex (the unmerged duplicate), with tcgdex_id
    const tcgdexOnlyCount = await cards.countDocuments({ set_id: tcgdex, tcgdex_id: { $ne: null } })
    if (legacyOnlyCount > 0 || tcgdexOnlyCount > 0) {
      problematicSets++
      totalMissingTcgdex += legacyOnlyCount
      totalDupes += tcgdexOnlyCount
      if (samples.length < 8) {
        samples.push({ legacy, tcgdex, legacyOnlyCards: legacyOnlyCount, tcgdexOnlyCards: tcgdexOnlyCount })
      }
    }
  }

  console.log(`\nSets with padding/match issues: ${problematicSets} / ${mergedSets.length}`)
  console.log(`Legacy cards still missing tcgdex_id (in merged sets): ${totalMissingTcgdex}`)
  console.log(`TCGdex duplicate cards parked at set_id=tcgdex: ${totalDupes}`)
  console.log('\nSample problematic merged sets:')
  for (const s of samples) console.log(`  ${s.legacy} <-> ${s.tcgdex}: legacy-only=${s.legacyOnlyCards}, tcgdex-only=${s.tcgdexOnlyCards}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
