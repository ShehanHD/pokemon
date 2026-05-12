import 'dotenv/config'
import { getDb } from '../lib/db'
import { fetchAllSets } from '../lib/tcgdex'
import { seedSetIdsTcgdex } from '../lib/seedSeriesTcgdex'

const ORPHAN_IDS = [
  'hgssp', '2011bw', 'sm3.5', 'sm7.5', 'swsh3.5', 'swsh4.5', 'swsh12.5',
  'sv01', 'sv02', 'sv04.5', 'sv05', 'sv06', 'sv06.5', 'sv07', 'sv08',
  'sv10.5b', 'me02',
]

async function main() {
  const db = await getDb()

  console.log('Step 1: deleting 17 Italian orphan set docs (tcgdex-only, no pokemontcg_id)...')
  const setDel = await db.collection('sets').deleteMany({
    tcgdex_id: { $in: ORPHAN_IDS },
    pokemontcg_id: { $in: [null, undefined] },
  })
  console.log(`  deleted sets: ${setDel.deletedCount}`)

  console.log('Step 2: deleting cards with set_id in orphan ids...')
  const cardDel = await db.collection('cards').deleteMany({ set_id: { $in: ORPHAN_IDS } })
  console.log(`  deleted cards: ${cardDel.deletedCount}`)

  console.log('Step 3: fetching full TCGdex set list and re-seeding all 181...')
  const all = await fetchAllSets()
  const ids = all.map((s) => s.id)
  console.log(`  seeding ${ids.length} sets in lang=${process.env.TCGDEX_LANG ?? 'en'}`)
  const report = await seedSetIdsTcgdex(ids)
  console.log(JSON.stringify({
    setsTouched: report.setsTouched,
    cardsUpserted: report.cardsUpserted,
    pricedCards: report.pricedCards,
    errorCount: report.errors.length,
    errors: report.errors,
  }, null, 2))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
