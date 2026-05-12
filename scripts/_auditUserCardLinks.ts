import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()

  const totalUserCards = await db.collection('userCards').countDocuments({})
  console.log('total user_cards:', totalUserCards)

  // Distinct cardIds in user_cards
  const distinctCardIds = await db.collection('userCards').distinct('cardId')
  console.log('distinct cardIds in user_cards:', distinctCardIds.length)

  // How many of those exist as a card.pokemontcg_id?
  const matchesByPokemontcg = await db.collection('cards').countDocuments({ pokemontcg_id: { $in: distinctCardIds } })
  // How many match by tcgdex_id?
  const matchesByTcgdex = await db.collection('cards').countDocuments({ tcgdex_id: { $in: distinctCardIds } })
  console.log({ matchesByPokemontcg, matchesByTcgdex })

  // Orphans: distinct cardIds with no card doc by EITHER id
  const allCardIdsInCards = new Set<string>()
  const cardDocs = await db.collection('cards').find({
    $or: [{ pokemontcg_id: { $in: distinctCardIds } }, { tcgdex_id: { $in: distinctCardIds } }],
  }, { projection: { pokemontcg_id: 1, tcgdex_id: 1 } }).toArray()
  for (const d of cardDocs) {
    if (d.pokemontcg_id) allCardIdsInCards.add(d.pokemontcg_id as string)
    if (d.tcgdex_id) allCardIdsInCards.add(d.tcgdex_id as string)
  }
  const orphans = distinctCardIds.filter((id) => !allCardIdsInCards.has(id))
  console.log('orphan cardIds (no card doc):', orphans.length)
  for (const o of orphans.slice(0, 20)) console.log(' -', o)

  // Also: how many cardIds resolve only via pokemontcg_id?
  const onlyPokemon: string[] = []
  const onlyTcgdex: string[] = []
  const bothMatch: string[] = []
  const idToFound = new Map<string, { p: boolean; t: boolean }>()
  for (const id of distinctCardIds) idToFound.set(id, { p: false, t: false })
  for (const d of cardDocs) {
    const p = d.pokemontcg_id as string | undefined
    const t = d.tcgdex_id as string | undefined
    if (p && idToFound.has(p)) idToFound.get(p)!.p = true
    if (t && idToFound.has(t)) idToFound.get(t)!.t = true
  }
  for (const [id, flags] of idToFound) {
    if (flags.p && flags.t) bothMatch.push(id)
    else if (flags.p) onlyPokemon.push(id)
    else if (flags.t) onlyTcgdex.push(id)
  }
  console.log({
    bothMatch: bothMatch.length,
    onlyMatchByPokemontcgId: onlyPokemon.length,
    onlyMatchByTcgdexId: onlyTcgdex.length,
  })
  console.log('sample onlyTcgdex:', onlyTcgdex.slice(0, 5))
  console.log('sample onlyPokemon:', onlyPokemon.slice(0, 5))

  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
