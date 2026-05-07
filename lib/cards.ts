import { getDb } from './db'
import type { PokemonCard } from './types'
import { normaliseRarity } from './taxonomy/rarity'

function serializeCard(doc: Record<string, unknown>): PokemonCard {
  const { _id, ...rest } = doc
  return (_id !== undefined ? { _id: String(_id), ...rest } : rest) as unknown as PokemonCard
}

function parseCardNumber(num: string): number {
  const n = parseInt(num, 10)
  return isNaN(n) ? Infinity : n
}

export async function getCardsBySet(setId: string): Promise<PokemonCard[]> {
  const db = await getDb()
  const docs = await db.collection('cards').find({ set_id: setId }).toArray()
  return docs
    .map(serializeCard)
    .sort((a, b) => parseCardNumber(a.number) - parseCardNumber(b.number) || a.number.localeCompare(b.number))
}

export async function getCardById(pokemontcg_id: string): Promise<PokemonCard | null> {
  const db = await getDb()
  const doc = await db.collection('cards').findOne({ pokemontcg_id })
  return doc ? serializeCard(doc as Record<string, unknown>) : null
}

export async function getRarityTotalsBySet(): Promise<Map<string, Map<string, number>>> {
  const db = await getDb()
  const rows = await db
    .collection('cards')
    .aggregate<{ _id: { setId: string; rarity: string | null }; count: number }>([
      { $group: { _id: { setId: '$set_id', rarity: '$rarity' }, count: { $sum: 1 } } },
    ])
    .toArray()

  const map = new Map<string, Map<string, number>>()
  for (const r of rows) {
    const setId = r._id.setId
    const rarity = normaliseRarity(r._id.rarity)
    if (!map.has(setId)) map.set(setId, new Map())
    const inner = map.get(setId)!
    inner.set(rarity, (inner.get(rarity) ?? 0) + r.count)
  }
  return map
}
