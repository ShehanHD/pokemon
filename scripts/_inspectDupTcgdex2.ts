import 'dotenv/config'
import { getDb } from '../lib/db'

const IDS = [
  'hgssp', '2011bw', 'sm3.5', 'sm7.5', 'swsh3.5', 'swsh4.5', 'swsh12.5',
  'sv01', 'sv02', 'sv04.5', 'sv05', 'sv06', 'sv06.5', 'sv07', 'sv08',
  'sv10.5b', 'me02',
]

async function main() {
  const db = await getDb()
  for (const id of IDS) {
    const byTcgdex = await db.collection('sets').find({ tcgdex_id: id }).toArray()
    const byPokemontcg = await db.collection('sets').find({ pokemontcg_id: id }).toArray()
    console.log(`=== ${id} ===`)
    console.log(`  byTcgdex: ${byTcgdex.length}, byPokemontcg: ${byPokemontcg.length}`)
    for (const d of byTcgdex) {
      const dd = d as { _id: unknown; name?: string; tcgdex_id?: string; pokemontcg_id?: string; series?: string }
      console.log(`    [t] _id=${dd._id} name=${dd.name} tcgdex=${dd.tcgdex_id} pokemontcg=${dd.pokemontcg_id} series=${dd.series}`)
    }
    for (const d of byPokemontcg) {
      const dd = d as { _id: unknown; name?: string; tcgdex_id?: string; pokemontcg_id?: string; series?: string }
      console.log(`    [p] _id=${dd._id} name=${dd.name} tcgdex=${dd.tcgdex_id} pokemontcg=${dd.pokemontcg_id} series=${dd.series}`)
    }
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
