import { getDb } from './db'
import type { PokemonCard } from './types'

function serializeCard(doc: Record<string, unknown>): PokemonCard {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as PokemonCard
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
