import { getDb } from './db'
import type { PokemonCard } from './types'

export async function getCardsBySet(setId: string): Promise<PokemonCard[]> {
  const db = await getDb()
  return db.collection<PokemonCard>('cards').find({ set_id: setId }).sort({ number: 1 }).toArray()
}

export async function getCardById(pokemontcg_id: string): Promise<PokemonCard | null> {
  const db = await getDb()
  return db.collection<PokemonCard>('cards').findOne({ pokemontcg_id }) ?? null
}
