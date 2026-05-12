import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()

  const userCards = await db.collection('userCards').find({}).toArray()
  const distinctCardIds = Array.from(new Set(userCards.map((u) => u.cardId as string)))

  const cards = await db.collection('cards').find({
    $or: [
      { pokemontcg_id: { $in: distinctCardIds } },
      { tcgdex_id: { $in: distinctCardIds } },
    ],
  }, { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1 } }).toArray()

  const byPokemontcg = new Map<string, { pokemontcg_id: string; name: string }>()
  const byTcgdex = new Map<string, { pokemontcg_id?: string; tcgdex_id: string; name: string }>()
  for (const c of cards) {
    const pid = c.pokemontcg_id as string | undefined
    const tid = c.tcgdex_id as string | undefined
    const name = c.name as string
    if (pid) byPokemontcg.set(pid, { pokemontcg_id: pid, name })
    if (tid) byTcgdex.set(tid, { pokemontcg_id: pid, tcgdex_id: tid, name })
  }

  const renames: { from: string; to: string; name: string }[] = []
  for (const id of distinctCardIds) {
    const p = byPokemontcg.get(id)
    const t = byTcgdex.get(id)
    if (p) continue // already correct
    if (t && t.pokemontcg_id) {
      renames.push({ from: id, to: t.pokemontcg_id, name: t.name })
    }
  }

  console.log(`Renames to apply: ${renames.length}`)
  let total = 0
  for (const r of renames) {
    const res = await db.collection('userCards').updateMany(
      { cardId: r.from },
      { $set: { cardId: r.to } },
    )
    console.log(` ${r.from.padEnd(15)} -> ${r.to.padEnd(20)} | ${r.name}  [updated ${res.modifiedCount}]`)
    total += res.modifiedCount
  }
  console.log(`\nTotal userCards updated: ${total}`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
