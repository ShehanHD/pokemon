import 'dotenv/config'
import { getDb } from '../lib/db'

const PAIRS: Array<{ tcgdex: string; pokemontcg: string }> = [
  { tcgdex: 'hgssp', pokemontcg: 'hgss1' }, // placeholder, will resolve from DB
]

const TCGDEX_IDS = [
  'hgssp', '2011bw', 'sm3.5', 'sm7.5', 'swsh3.5', 'swsh4.5', 'swsh12.5',
  'sv01', 'sv02', 'sv04.5', 'sv05', 'sv06', 'sv06.5', 'sv07', 'sv08',
  'sv10.5b', 'me02',
]

async function main() {
  const db = await getDb()
  let totalItalianCards = 0
  let totalLegacyCards = 0
  let totalUserCardsOnItalian = 0
  let totalUserCardsOnLegacy = 0
  for (const tid of TCGDEX_IDS) {
    const tdoc = await db.collection('sets').findOne({ tcgdex_id: tid }, { projection: { name: 1 } })
    const tdocName = (tdoc as { name?: string } | null)?.name ?? ''
    const legacyDoc = await db.collection('sets').findOne({
      pokemontcg_id: { $ne: null },
      tcgdex_id: { $in: [null, undefined] },
      $or: [{ name: tdocName }, { name: { $regex: tdocName, $options: 'i' } }],
    }, { projection: { _id: 1, name: 1, pokemontcg_id: 1 } })
    const pid = (legacyDoc as { pokemontcg_id?: string } | null)?.pokemontcg_id ?? null
    const italianCards = await db.collection('cards').countDocuments({ set_id: tid })
    const legacyCards = pid ? await db.collection('cards').countDocuments({ set_id: pid }) : 0
    const userCardsOnItalian = await db.collection('userCards').countDocuments({ set_id: tid })
    const userCardsOnLegacy = pid ? await db.collection('userCards').countDocuments({ set_id: pid }) : 0
    totalItalianCards += italianCards
    totalLegacyCards += legacyCards
    totalUserCardsOnItalian += userCardsOnItalian
    totalUserCardsOnLegacy += userCardsOnLegacy
    console.log(`${tid} (${tdocName}) ↔ ${pid ?? '?'} | IT cards=${italianCards} | legacy cards=${legacyCards} | uc(IT)=${userCardsOnItalian} | uc(legacy)=${userCardsOnLegacy}`)
  }
  console.log('---')
  console.log(`Totals: IT cards=${totalItalianCards}, legacy cards=${totalLegacyCards}, uc(IT)=${totalUserCardsOnItalian}, uc(legacy)=${totalUserCardsOnLegacy}`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
