import 'dotenv/config'
import { getDb } from '../lib/db'

const TCGDEX_IDS = [
  'hgssp', '2011bw', 'sm3.5', 'sm7.5', 'swsh3.5', 'swsh4.5', 'swsh12.5',
  'sv01', 'sv02', 'sv04.5', 'sv05', 'sv06', 'sv06.5', 'sv07', 'sv08',
  'sv10.5b', 'me02',
]

async function main() {
  const db = await getDb()
  let totalItalianCards = 0
  let totalUserCardsRef = 0
  for (const tid of TCGDEX_IDS) {
    const cards = await db.collection('cards').find({ set_id: tid }, { projection: { tcgdex_id: 1, _id: 1 } }).toArray()
    const ids = cards.map((c) => (c as { tcgdex_id?: string }).tcgdex_id).filter((v): v is string => typeof v === 'string')
    const uc = ids.length > 0 ? await db.collection('userCards').countDocuments({ cardId: { $in: ids } }) : 0
    totalItalianCards += cards.length
    totalUserCardsRef += uc
    console.log(`${tid}: IT cards=${cards.length}, userCards referencing=${uc}`)
  }
  console.log(`Totals: IT cards=${totalItalianCards}, userCards referencing=${totalUserCardsRef}`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
