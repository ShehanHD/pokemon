import 'dotenv/config'
import { getDb } from '../lib/db'
async function main() {
  const db = await getDb()
  const sets = db.collection<{ tcgdex_id?: string | null; name?: string; pokemontcg_id?: string | null; totalCards?: number }>('sets')
  const docs = await sets.find(
    { tcgdex_id: { $ne: null }, pokemontcg_id: { $in: [null, undefined] } },
    { projection: { tcgdex_id: 1, name: 1, totalCards: 1 } },
  ).sort({ tcgdex_id: 1 }).toArray()
  console.log('TCGdex-only set IDs and Italian names:')
  for (const s of docs) console.log(`  ${s.tcgdex_id?.padEnd(15)} | totalCards=${s.totalCards?.toString().padStart(4)} | "${s.name}"`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
