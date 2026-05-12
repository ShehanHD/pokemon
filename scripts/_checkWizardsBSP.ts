import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const sets = await db.collection('sets').find({ name: /Wizards Black Star/i }).toArray()
  console.log('matching sets:', sets.length)
  for (const s of sets) {
    console.log('---')
    console.log({
      name: s.name,
      tcgdex_id: s.tcgdex_id,
      pokemontcg_id: s.pokemontcg_id,
      printedTotal: s.printedTotal,
      releaseDate: s.releaseDate,
      seriesSlug: s.seriesSlug,
    })
    const total = await db.collection('cards').countDocuments({ set_id: s.tcgdex_id })
    const priced = await db.collection('cards').countDocuments({ set_id: s.tcgdex_id, priceEUR: { $ne: null } })
    const withTcgdex = await db.collection('cards').countDocuments({ set_id: s.tcgdex_id, tcgdex_id: { $ne: null } })
    console.log({ total, priced, withTcgdex })
    const sample = await db.collection('cards').find({ set_id: s.tcgdex_id }).limit(10).project({ name:1, number:1, priceEUR:1, pokemontcg_id:1, tcgdex_id:1, cardmarketPrice:1 }).toArray()
    console.log('sample:', sample)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
