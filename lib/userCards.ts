import { getDb } from './db'
import type { UserCard } from './types'
import { normaliseRarity } from './taxonomy/rarity'

function serialize(doc: Record<string, unknown>): UserCard {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as UserCard
}

export async function getUserCardsForCard(userId: string, cardId: string): Promise<UserCard[]> {
  const db = await getDb()
  const docs = await db
    .collection('userCards')
    .find({ userId, cardId })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map((d) => serialize(d as Record<string, unknown>))
}

export async function getUserCardCount(userId: string, cardId: string): Promise<number> {
  const db = await getDb()
  return db.collection('userCards').countDocuments({ userId, cardId })
}

export async function getOwnedCountsBySet(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; count: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    { $group: { _id: '$card.set_id', count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id, r.count)
  return map
}

export async function getOwnedCountsByCardVariant(userId: string, setId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: { cardId: string; variant: string }; count: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    { $match: { 'card.set_id': setId } },
    { $group: { _id: { cardId: '$cardId', variant: '$variant' }, count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(`${r._id.cardId}:${r._id.variant}`, r.count)
  return map
}

export async function getOwnedVariantCountsBySet(userId: string): Promise<Map<string, Map<string, number>>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: { setId: string; variant: string }; count: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    { $group: { _id: { setId: '$card.set_id', variant: '$variant' }, count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (!map.has(r._id.setId)) map.set(r._id.setId, new Map())
    map.get(r._id.setId)!.set(r._id.variant, r.count)
  }
  return map
}

export async function getOwnedUniqueCardCountsBySet(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; count: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    { $group: { _id: { setId: '$card.set_id', cardId: '$cardId' } } },
    { $group: { _id: '$_id.setId', count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id, r.count)
  return map
}

export async function getOwnedRarityCountsBySet(userId: string): Promise<Map<string, Map<string, number>>> {
  const db = await getDb()
  const rows = await db
    .collection('userCards')
    .aggregate<{ _id: { setId: string; rarity: string | null }; count: number }>([
      { $match: { userId } },
      {
        $lookup: {
          from: 'cards',
          localField: 'cardId',
          foreignField: 'pokemontcg_id',
          as: 'card',
        },
      },
      { $unwind: '$card' },
      { $group: { _id: { setId: '$card.set_id', cardId: '$cardId', rarity: '$card.rarity' } } },
      { $group: { _id: { setId: '$_id.setId', rarity: '$_id.rarity' }, count: { $sum: 1 } } },
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

export async function getCollectionValueBySet(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; value: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    {
      $group: {
        _id: '$card.set_id',
        value: { $sum: { $ifNull: ['$card.cardmarketPrice', 0] } },
      },
    },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id, r.value)
  return map
}

export async function getCollectionCostBySet(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; cost: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    {
      $group: {
        _id: '$card.set_id',
        cost: { $sum: { $ifNull: ['$cost', 0] } },
      },
    },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id, r.cost)
  return map
}

export async function getCollectionValueForSet(userId: string, setId: string): Promise<number> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: null; value: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $match: { 'card.set_id': setId } },
    { $group: { _id: null, value: { $sum: { $ifNull: ['$card.cardmarketPrice', 0] } } } },
  ]).toArray()
  return rows[0]?.value ?? 0
}

export async function getCollectionCostForSet(userId: string, setId: string): Promise<number> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: null; cost: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $match: { 'card.set_id': setId } },
    { $group: { _id: null, cost: { $sum: { $ifNull: ['$cost', 0] } } } },
  ]).toArray()
  return rows[0]?.cost ?? 0
}

export async function getOwnedCountsBySeries(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; count: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    { $group: { _id: '$card.seriesSlug', count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id, r.count)
  return map
}
