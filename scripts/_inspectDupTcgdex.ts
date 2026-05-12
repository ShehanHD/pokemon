import 'dotenv/config'
import { getDb } from '../lib/db'

const IDS = [
  'hgssp', '2011bw', 'sm3.5', 'sm7.5', 'swsh3.5', 'swsh4.5', 'swsh12.5',
  'sv01', 'sv02', 'sv04.5', 'sv05', 'sv06', 'sv06.5', 'sv07', 'sv08',
  'sv10.5b', 'me02',
]

async function main() {
  const db = await getDb()
  const out: Record<string, unknown> = {}
  for (const id of IDS) {
    const docs = await db.collection('sets').find({
      $or: [{ tcgdex_id: id }, { pokemontcg_id: id }],
    }).project({ _id: 1, tcgdex_id: 1, pokemontcg_id: 1, name: 1, series: 1, seriesSlug: 1, releaseDate: 1, totalCards: 1, totalValueEUR: 1 }).toArray()
    const stats: Record<string, number> = {}
    for (const d of docs) {
      const setIdForCards = (d as { pokemontcg_id?: string; tcgdex_id?: string }).pokemontcg_id ?? (d as { tcgdex_id?: string }).tcgdex_id
      if (setIdForCards) {
        stats[setIdForCards] = await db.collection('cards').countDocuments({ set_id: setIdForCards })
      }
    }
    out[id] = { docs, cardCounts: stats }
  }
  console.log(JSON.stringify(out, null, 2))
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
