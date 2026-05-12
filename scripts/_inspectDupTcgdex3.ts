import 'dotenv/config'
import { getDb } from '../lib/db'
import { fetchAllSets } from '../lib/tcgdex'

const IDS = [
  'hgssp', '2011bw', 'sm3.5', 'sm7.5', 'swsh3.5', 'swsh4.5', 'swsh12.5',
  'sv01', 'sv02', 'sv04.5', 'sv05', 'sv06', 'sv06.5', 'sv07', 'sv08',
  'sv10.5b', 'me02',
]

async function main() {
  const db = await getDb()
  const all = await fetchAllSets()
  const briefs = new Map(all.map((s) => [s.id, s]))
  for (const id of IDS) {
    const brief = briefs.get(id)
    if (!brief) { console.log(`!! ${id} not in API`); continue }
    const sameTcgdex = await db.collection('sets').find({ tcgdex_id: id }).project({ _id: 1, name: 1, tcgdex_id: 1, pokemontcg_id: 1, releaseDate: 1 }).toArray()
    const legacyDirect = await db.collection('sets').find({
      pokemontcg_id: brief.id,
      tcgdex_id: { $in: [null, undefined] },
    }).project({ _id: 1, name: 1, tcgdex_id: 1, pokemontcg_id: 1, releaseDate: 1 }).toArray()
    const legacyByName = await db.collection('sets').find({
      name: brief.name,
      pokemontcg_id: { $ne: null },
      tcgdex_id: { $in: [null, undefined] },
    }).project({ _id: 1, name: 1, tcgdex_id: 1, pokemontcg_id: 1, releaseDate: 1 }).toArray()
    console.log(`=== ${id} (en name="${brief.name}", date=${brief.releaseDate ?? ''}) ===`)
    console.log(`  sameTcgdex(${sameTcgdex.length}):`, sameTcgdex)
    console.log(`  legacyDirect(${legacyDirect.length}):`, legacyDirect)
    console.log(`  legacyByName(${legacyByName.length}):`, legacyByName)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
