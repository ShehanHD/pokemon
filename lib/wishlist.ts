import { getDb } from './db'
import type { WishlistItem, PokemonCard, Tier } from './types'
import { addToWishlistInputSchema, type AddToWishlistInput } from './schemas/wishlist'

export const FREE_TIER_WISHLIST_CAP = 25

type AddResult = { ok: true; item: WishlistItem } | { ok: false; reason: 'cap_reached' | 'invalid_input' }

function serialize(doc: Record<string, unknown>): WishlistItem {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as WishlistItem
}

export async function addToWishlist(userId: string, input: AddToWishlistInput, tier: Tier): Promise<AddResult> {
  const parsed = addToWishlistInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  const db = await getDb()

  const existing = await db.collection('wishlist').findOne({ userId, cardId: parsed.data.cardId })
  if (existing) return { ok: true, item: serialize(existing as Record<string, unknown>) }

  if (tier === 'free') {
    const count = await db.collection('wishlist').countDocuments({ userId })
    if (count >= FREE_TIER_WISHLIST_CAP) return { ok: false, reason: 'cap_reached' }
  }

  const doc = {
    userId,
    cardId: parsed.data.cardId,
    addedAt: new Date(),
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
    ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
  }
  const res = await db.collection('wishlist').insertOne(doc)
  return { ok: true, item: { ...doc, _id: String(res.insertedId) } }
}

export async function removeFromWishlist(userId: string, cardId: string): Promise<{ ok: true }> {
  const db = await getDb()
  await db.collection('wishlist').deleteOne({ userId, cardId })
  return { ok: true }
}

export async function isOnWishlist(userId: string, cardId: string): Promise<boolean> {
  const db = await getDb()
  return (await db.collection('wishlist').countDocuments({ userId, cardId }, { limit: 1 })) > 0
}

export async function countWishlist(userId: string): Promise<number> {
  const db = await getDb()
  return db.collection('wishlist').countDocuments({ userId })
}

export async function getWishlistedIdsForUser(userId: string): Promise<Set<string>> {
  const db = await getDb()
  const docs = await db.collection('wishlist').find({ userId }, { projection: { cardId: 1 } }).toArray()
  return new Set(docs.map((d) => d.cardId as string))
}

export async function getWishlistForUser(userId: string): Promise<Array<WishlistItem & { card: PokemonCard }>> {
  const db = await getDb()
  const rows = await db.collection('wishlist').aggregate<Record<string, unknown>>([
    { $match: { userId } },
    { $sort: { addedAt: -1 } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
  ]).toArray()
  return rows.map((r) => {
    const { _id, card, ...rest } = r as { _id: unknown; card: Record<string, unknown> & { _id: unknown } }
    const { _id: cId, ...cardRest } = card
    return {
      _id: String(_id),
      ...(rest as Omit<WishlistItem, '_id'>),
      card: { _id: String(cId), ...cardRest } as unknown as PokemonCard,
    }
  })
}
