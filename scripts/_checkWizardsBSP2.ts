import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const all = await db.collection('cards').find({ set_id: 'basep' })
    .project({ name:1, number:1, priceEUR:1, pokemontcg_id:1, tcgdex_id:1, cardmarketPrice:1 })
    .toArray()
  console.log('total docs:', all.length)
  const withTcgdex = all.filter((c) => c.tcgdex_id)
  const withoutTcgdex = all.filter((c) => !c.tcgdex_id)
  console.log('with tcgdex_id:', withTcgdex.length, '— sample:', withTcgdex.slice(0, 3))
  console.log('without tcgdex_id:', withoutTcgdex.length, '— sample:', withoutTcgdex.slice(0, 3))
  console.log('priced (TCGdex docs):', withTcgdex.filter((c) => c.priceEUR != null).length)
  console.log('priced (legacy docs):', withoutTcgdex.filter((c) => c.priceEUR != null).length)
  console.log('legacy with cardmarketPrice:', withoutTcgdex.filter((c) => c.cardmarketPrice != null).length)
  // Check duplicate numbers
  const byNum = new Map<string, number>()
  for (const c of all) byNum.set(String(c.number), (byNum.get(String(c.number)) ?? 0) + 1)
  const dups = Array.from(byNum.entries()).filter(([, n]) => n > 1)
  console.log('duplicate numbers:', dups.length, 'sample:', dups.slice(0, 5))
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
