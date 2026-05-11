import { getDb } from './db'
import type { CollectionStats, OwnedCardGroup, OwnedCardsQuery, PokemonCard, UserCard } from './types'
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
        foreignField: 'tcgdex_id',
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
        foreignField: 'tcgdex_id',
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
        foreignField: 'tcgdex_id',
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
        foreignField: 'tcgdex_id',
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
          foreignField: 'tcgdex_id',
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
        foreignField: 'tcgdex_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    {
      $group: {
        _id: '$card.set_id',
        value: { $sum: { $ifNull: ['$card.priceEUR', 0] } },
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
        foreignField: 'tcgdex_id',
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
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'tcgdex_id', as: 'card' } },
    { $unwind: '$card' },
    { $match: { 'card.set_id': setId } },
    { $group: { _id: null, value: { $sum: { $ifNull: ['$card.priceEUR', 0] } } } },
  ]).toArray()
  return rows[0]?.value ?? 0
}

export async function getCollectionCostForSet(userId: string, setId: string): Promise<number> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: null; cost: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'tcgdex_id', as: 'card' } },
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
        foreignField: 'tcgdex_id',
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

export async function getOwnedCardsGrouped(
  userId: string,
  query: OwnedCardsQuery,
): Promise<OwnedCardGroup[]> {
  const db = await getDb()

  const sortStage: Record<string, 1 | -1> =
    query.sort === 'name' ? { 'card.name': 1 }
    : query.sort === 'release' ? { 'set.releaseDate': -1 }
    : query.sort === 'count' ? { copyCount: -1 }
    : query.sort === 'cost' ? { totalCost: -1 }
    : { lastAcquiredAt: -1 }

  const pipeline: Record<string, unknown>[] = [
    { $match: { userId } },
  ]

  if (query.type) pipeline.push({ $match: { type: query.type } })
  if (query.condition) pipeline.push({ $match: { type: 'raw', condition: query.condition } })
  if (query.variant) pipeline.push({ $match: { variant: query.variant } })

  pipeline.push(
    {
      $group: {
        _id: '$cardId',
        copyCount: { $sum: 1 },
        rawCount: { $sum: { $cond: [{ $eq: ['$type', 'raw'] }, 1, 0] } },
        gradedCount: { $sum: { $cond: [{ $eq: ['$type', 'graded'] }, 1, 0] } },
        totalCost: { $sum: { $ifNull: ['$cost', 0] } },
        estValue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'graded'] },
              { $ifNull: ['$gradedValue', 0] },
              { $ifNull: ['$cost', 0] },
            ],
          },
        },
        lastAcquiredAt: { $max: '$acquiredAt' },
        variants: { $addToSet: '$variant' },
      },
    },
    {
      $lookup: {
        from: 'cards',
        localField: '_id',
        foreignField: 'tcgdex_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    {
      $lookup: {
        from: 'sets',
        localField: 'card.set_id',
        foreignField: 'tcgdex_id',
        as: 'set',
      },
    },
    { $unwind: { path: '$set', preserveNullAndEmptyArrays: true } },
  )

  if (query.series) pipeline.push({ $match: { 'card.seriesSlug': query.series } })
  if (query.set) pipeline.push({ $match: { 'card.set_id': query.set } })
  if (query.rarity) pipeline.push({ $match: { 'card.rarity': query.rarity } })
  if (query.q) {
    const re = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    pipeline.push({ $match: { $or: [{ 'card.name': re }, { 'card.number': re }] } })
  }

  pipeline.push({ $sort: sortStage })

  const rows = await db.collection('userCards').aggregate<{
    _id: string
    copyCount: number
    rawCount: number
    gradedCount: number
    totalCost: number
    estValue: number
    lastAcquiredAt: Date
    variants: string[]
    card: Record<string, unknown> & { _id: unknown }
  }>(pipeline).toArray()

  return rows.map((r) => {
    const { _id: cardDocId, ...cardRest } = r.card
    return {
      cardId: r._id,
      card: { _id: String(cardDocId), ...cardRest } as unknown as PokemonCard,
      copyCount: r.copyCount,
      rawCount: r.rawCount,
      gradedCount: r.gradedCount,
      totalCost: r.totalCost,
      estValue: r.estValue,
      lastAcquiredAt: r.lastAcquiredAt,
      variants: r.variants as OwnedCardGroup['variants'],
    }
  })
}

export async function getCollectionStats(userId: string): Promise<CollectionStats> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{
    totalCopies: number
    uniqueCards: number
    totalSpend: number
    estValue: number
  }>([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalCopies: { $sum: 1 },
        uniqueCards: { $addToSet: '$cardId' },
        totalSpend: { $sum: { $ifNull: ['$cost', 0] } },
        estValue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'graded'] },
              { $ifNull: ['$gradedValue', 0] },
              { $ifNull: ['$cost', 0] },
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalCopies: 1,
        uniqueCards: { $size: '$uniqueCards' },
        totalSpend: 1,
        estValue: 1,
      },
    },
  ]).toArray()
  return rows[0] ?? { totalCopies: 0, uniqueCards: 0, totalSpend: 0, estValue: 0 }
}

export async function getRawVsGradedSplit(userId: string): Promise<{ raw: { copies: number; spend: number }; graded: { copies: number; spend: number } }> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: 'raw' | 'graded'; copies: number; spend: number }>([
    { $match: { userId } },
    { $group: { _id: '$type', copies: { $sum: 1 }, spend: { $sum: { $ifNull: ['$cost', 0] } } } },
  ]).toArray()
  const raw = rows.find((r) => r._id === 'raw') ?? { copies: 0, spend: 0 }
  const graded = rows.find((r) => r._id === 'graded') ?? { copies: 0, spend: 0 }
  return {
    raw: { copies: raw.copies ?? 0, spend: raw.spend ?? 0 },
    graded: { copies: graded.copies ?? 0, spend: graded.spend ?? 0 },
  }
}

export async function getBySeriesBreakdown(userId: string): Promise<Array<{ series: string; copies: number; spend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; copies: number; spend: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'tcgdex_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.series', copies: { $sum: 1 }, spend: { $sum: { $ifNull: ['$cost', 0] } } } },
    { $sort: { copies: -1 } },
  ]).toArray()
  return rows.map((r) => ({ series: r._id, copies: r.copies, spend: r.spend }))
}

export async function getBySetBreakdown(userId: string, limit = 10): Promise<Array<{ setCode: string; setName: string; copies: number; spend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; setName: string; copies: number; spend: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'tcgdex_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.set_id', setName: { $first: '$card.setName' }, copies: { $sum: 1 }, spend: { $sum: { $ifNull: ['$cost', 0] } } } },
    { $sort: { copies: -1 } },
    { $limit: limit },
  ]).toArray()
  return rows.map((r) => ({ setCode: r._id, setName: r.setName, copies: r.copies, spend: r.spend }))
}

export async function getRarityBreakdown(userId: string): Promise<Array<{ rarity: string; copies: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string | null; copies: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'tcgdex_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.rarity', copies: { $sum: 1 } } },
    { $sort: { copies: -1 } },
  ]).toArray()
  return rows.map((r) => ({ rarity: r._id ?? 'Unknown', copies: r.copies }))
}

export async function getCollectionTimeseries(userId: string): Promise<Array<{ month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; copies: number; spend: number }>([
    { $match: { userId } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: '$acquiredAt' },
        },
        copies: { $sum: 1 },
        spend: { $sum: { $ifNull: ['$cost', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]).toArray()
  let cumCopies = 0
  let cumSpend = 0
  return rows.map((r) => {
    cumCopies += r.copies
    cumSpend += r.spend
    return { month: r._id, copiesAdded: r.copies, cumulativeCopies: cumCopies, cumulativeSpend: cumSpend }
  })
}
