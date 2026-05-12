import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const sets = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; name?: string }>('sets')
  const cards = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; set_id?: string; number?: string; name?: string }>('cards')

  const mergedSets = await sets
    .find({ pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } }, { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1 } })
    .toArray()

  // Strict definitions:
  //  - "legacyOrphan": doc at set_id=legacy with pokemontcg_id != null AND tcgdex_id is null
  //  - "tcgdexOrphan": doc at set_id=(legacy or tcgdex) with pokemontcg_id IS null AND tcgdex_id != null
  // Real merged docs have both keys set.

  const samples: { legacy: string; tcgdex: string; name: string; legacyOrphan: number; tcgdexOrphan: number }[] = []
  let totalLegacyOrphans = 0
  let totalTcgdexOrphans = 0

  for (const s of mergedSets) {
    const legacy = s.pokemontcg_id!
    const tcgdex = s.tcgdex_id!
    const legacyOrphans = await cards.countDocuments({
      set_id: legacy,
      pokemontcg_id: { $ne: null },
      tcgdex_id: { $in: [null, undefined] },
    })
    // tcgdex orphans: search at both possible set_ids (legacy and tcgdex)
    const setIdQ = legacy === tcgdex ? legacy : { $in: [legacy, tcgdex] }
    const tcgdexOrphans = await cards.countDocuments({
      set_id: setIdQ as string,
      pokemontcg_id: { $in: [null, undefined] },
      tcgdex_id: { $ne: null },
    })
    totalLegacyOrphans += legacyOrphans
    totalTcgdexOrphans += tcgdexOrphans
    if (legacyOrphans + tcgdexOrphans > 0) {
      samples.push({ legacy, tcgdex, name: s.name ?? '', legacyOrphan: legacyOrphans, tcgdexOrphan: tcgdexOrphans })
    }
  }

  console.log(`Merged sets: ${mergedSets.length}`)
  console.log(`Total LEGACY orphans (pokemontcg_id set, tcgdex_id missing): ${totalLegacyOrphans}`)
  console.log(`Total TCGDEX orphans (tcgdex_id set, pokemontcg_id missing): ${totalTcgdexOrphans}`)
  console.log(`\nProblematic sets (${samples.length}):`)
  for (const s of samples.sort((a, b) => (b.legacyOrphan + b.tcgdexOrphan) - (a.legacyOrphan + a.tcgdexOrphan)).slice(0, 30)) {
    console.log(`  ${s.legacy} <-> ${s.tcgdex} "${s.name}": legacyOrphan=${s.legacyOrphan} tcgdexOrphan=${s.tcgdexOrphan}`)
  }

  // Also check userCards remap-target coverage: how many distinct pokemontcg_id values in userCards have no card doc with tcgdex_id?
  const userCards = db.collection<{ cardId?: string }>('userCards')
  const distinctUserCardIds = (await userCards.distinct('cardId')) as string[]
  let mappable = 0
  let unmappable = 0
  for (const cid of distinctUserCardIds) {
    const doc = await cards.findOne({ pokemontcg_id: cid }, { projection: { tcgdex_id: 1 } })
    if (doc?.tcgdex_id) mappable++
    else unmappable++
  }
  console.log(`\nuserCards.cardId remap preview:`)
  console.log(`  distinct cardIds: ${distinctUserCardIds.length}`)
  console.log(`  mappable (legacy doc has tcgdex_id): ${mappable}`)
  console.log(`  un-mappable: ${unmappable}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
