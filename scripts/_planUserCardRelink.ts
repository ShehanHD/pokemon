import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()

  const userCards = await db.collection('userCards').find({}).toArray()
  const distinctCardIds = Array.from(new Set(userCards.map((u) => u.cardId as string)))

  // Find all card docs matching by either id
  const cards = await db.collection('cards').find({
    $or: [
      { pokemontcg_id: { $in: distinctCardIds } },
      { tcgdex_id: { $in: distinctCardIds } },
    ],
  }, { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1 } }).toArray()

  const byPokemontcg = new Map<string, { pokemontcg_id: string; tcgdex_id?: string; name: string }>()
  const byTcgdex = new Map<string, { pokemontcg_id: string; tcgdex_id?: string; name: string }>()
  for (const c of cards) {
    const rec = { pokemontcg_id: c.pokemontcg_id as string, tcgdex_id: c.tcgdex_id as string | undefined, name: c.name as string }
    if (rec.pokemontcg_id) byPokemontcg.set(rec.pokemontcg_id, rec)
    if (rec.tcgdex_id) byTcgdex.set(rec.tcgdex_id, rec)
  }

  type Plan = { cardId: string; status: 'ok' | 'rename' | 'orphan' | 'ambiguous'; to?: string; name?: string; note?: string }
  const plans: Plan[] = []

  for (const id of distinctCardIds) {
    const p = byPokemontcg.get(id)
    const t = byTcgdex.get(id)

    if (p && !t) {
      plans.push({ cardId: id, status: 'ok', name: p.name })
    } else if (p && t) {
      // Same id is both a pokemontcg_id of one card and a tcgdex_id of another → conflict
      if (p.pokemontcg_id === t.pokemontcg_id) {
        plans.push({ cardId: id, status: 'ok', name: p.name, note: 'same doc on both fields' })
      } else {
        plans.push({ cardId: id, status: 'ambiguous', name: `${p.name} vs ${t.name}`, note: `pokemontcg_id match ${p.pokemontcg_id}; tcgdex_id match ${t.pokemontcg_id}` })
      }
    } else if (!p && t) {
      // Stored by tcgdex_id; rename cardId to its pokemontcg_id so $lookup works
      plans.push({ cardId: id, status: 'rename', to: t.pokemontcg_id, name: t.name })
    } else {
      plans.push({ cardId: id, status: 'orphan' })
    }
  }

  const counts = {
    ok: plans.filter((p) => p.status === 'ok').length,
    rename: plans.filter((p) => p.status === 'rename').length,
    ambiguous: plans.filter((p) => p.status === 'ambiguous').length,
    orphan: plans.filter((p) => p.status === 'orphan').length,
  }
  console.log('counts:', counts)

  console.log('\n--- RENAME plan (cardId  ->  newCardId  | name) ---')
  for (const p of plans.filter((x) => x.status === 'rename')) {
    const docsAffected = userCards.filter((u) => u.cardId === p.cardId).length
    console.log(` ${p.cardId.padEnd(15)} -> ${(p.to ?? '').padEnd(20)} | ${p.name}   [${docsAffected} userCards docs]`)
  }

  if (counts.orphan > 0 || counts.ambiguous > 0) {
    console.log('\n--- BLOCKERS ---')
    for (const p of plans.filter((x) => x.status === 'orphan' || x.status === 'ambiguous')) {
      console.log(` ${p.status}: ${p.cardId} (${p.note ?? ''})`)
    }
  }

  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
