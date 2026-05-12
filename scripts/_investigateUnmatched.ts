import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()

  // Pull all unmatched legacy IDs by replicating the dry-run logic
  const userCards = db.collection<{ cardId: string }>('userCards')
  const cards = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; set_id?: string; number?: string; name?: string }>('cards')

  const legacyIds = await userCards.distinct('cardId')
  const tcgdexSet = new Set(
    (await cards.distinct('tcgdex_id')).filter((v): v is string => typeof v === 'string'),
  )

  const pairs = await cards
    .find({ pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } }, { projection: { pokemontcg_id: 1, tcgdex_id: 1 } })
    .toArray()
  const remap = new Map<string, string>()
  for (const p of pairs) {
    if (typeof p.pokemontcg_id === 'string' && typeof p.tcgdex_id === 'string') {
      remap.set(p.pokemontcg_id, p.tcgdex_id)
    }
  }

  const unmatched: string[] = []
  for (const id of legacyIds) {
    if (tcgdexSet.has(id)) continue
    if (remap.has(id)) continue
    unmatched.push(id)
  }

  console.log('=== Unmatched legacy userCards.cardId values ===')
  console.log('count:', unmatched.length)
  console.log('ids:', unmatched)

  // For each unmatched legacy ID, find what the card document looks like
  console.log('\n=== Legacy card documents for each unmatched ID ===')
  for (const id of unmatched) {
    const doc = await cards.findOne(
      { pokemontcg_id: id },
      { projection: { pokemontcg_id: 1, tcgdex_id: 1, set_id: 1, number: 1, name: 1 } },
    )
    console.log(`  ${id} ->`, doc ? JSON.stringify(doc) : 'NOT FOUND in cards collection')
  }

  // Collect set_ids of these unmatched cards
  const setIds = new Set<string>()
  for (const id of unmatched) {
    const doc = await cards.findOne({ pokemontcg_id: id }, { projection: { set_id: 1 } })
    if (doc?.set_id) setIds.add(doc.set_id)
  }

  console.log('\n=== Sets involved ===')
  const sets = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; name?: string; releaseDate?: string }>('sets')
  for (const sid of setIds) {
    const setDoc = await sets.findOne(
      { pokemontcg_id: sid },
      { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1, releaseDate: 1 } },
    )
    console.log(`  set_id=${sid} ->`, setDoc ? JSON.stringify(setDoc) : 'NO SET DOC')
    if (setDoc) {
      const cardsInSet = await cards.countDocuments({ set_id: sid })
      const cardsInSetWithTcgdex = await cards.countDocuments({ set_id: sid, tcgdex_id: { $ne: null } })
      console.log(`    cards total: ${cardsInSet}, with tcgdex_id: ${cardsInSetWithTcgdex}`)
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
