import { getDb } from './db'
import type { CollectionStats, OwnedCardGroup, OwnedCardsQuery, PokemonCard, SoldCardRow, UserCard } from './types'
import { normaliseRarity } from './taxonomy/rarity'

const NOT_SOLD = { status: { $ne: 'sold' as const } }

function serialize(doc: Record<string, unknown>): UserCard {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as UserCard
}

export async function getUserCardsForCard(userId: string, cardId: string): Promise<UserCard[]> {
  const db = await getDb()
  const docs = await db
    .collection('userCards')
    .find({ userId, cardId, ...NOT_SOLD })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map((d) => serialize(d as Record<string, unknown>))
}

export async function getUserCardCount(userId: string, cardId: string): Promise<number> {
  const db = await getDb()
  return db.collection('userCards').countDocuments({ userId, cardId, ...NOT_SOLD })
}

export async function getOwnedCardIds(userId: string): Promise<Set<string>> {
  const db = await getDb()
  const rows = await db
    .collection('userCards')
    .aggregate<{ _id: string }>([
      { $match: { userId, ...NOT_SOLD } },
      { $group: { _id: '$cardId' } },
    ])
    .toArray()
  return new Set(rows.map((r) => r._id))
}

export async function getOwnedCountsBySet(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; count: number }>([
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
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

export async function getOwnedCountsByCardVariantForCards(
  userId: string,
  cardIds: string[],
): Promise<Map<string, number>> {
  if (cardIds.length === 0) return new Map()
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: { cardId: string; variant: string }; count: number }>([
    { $match: { userId, cardId: { $in: cardIds }, ...NOT_SOLD } },
    { $group: { _id: { cardId: '$cardId', variant: '$variant' }, count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(`${r._id.cardId}:${r._id.variant}`, r.count)
  return map
}

export async function getOwnedVariantCountsBySet(userId: string): Promise<Map<string, Map<string, number>>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: { setId: string; variant: string }; count: number }>([
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
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
      { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $match: { 'card.set_id': setId } },
    { $group: { _id: null, value: { $sum: { $ifNull: ['$card.priceEUR', 0] } } } },
  ]).toArray()
  return rows[0]?.value ?? 0
}

export async function getCollectionCostForSet(userId: string, setId: string): Promise<number> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: null; cost: number }>([
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
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
        gradedValue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'graded'] }, { $ifNull: ['$gradedValue', 0] }, 0],
          },
        },
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
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    {
      $lookup: {
        from: 'sets',
        localField: 'card.set_id',
        foreignField: 'pokemontcg_id',
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
    gradedValue: number
    totalCost: number
    estValue: number
    lastAcquiredAt: Date
    variants: string[]
    card: Record<string, unknown> & { _id: unknown }
    set?: { printedTotal?: number } | null
  }>(pipeline).toArray()

  return rows.map((r) => {
    const { _id: cardDocId, ...cardRest } = r.card
    return {
      cardId: r._id,
      card: { _id: String(cardDocId), ...cardRest } as unknown as PokemonCard,
      printedTotal: r.set?.printedTotal ?? null,
      copyCount: r.copyCount,
      rawCount: r.rawCount,
      gradedCount: r.gradedCount,
      gradedValue: r.gradedValue,
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
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
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
    { $match: { userId, ...NOT_SOLD } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.series', copies: { $sum: 1 }, spend: { $sum: { $ifNull: ['$cost', 0] } } } },
    { $sort: { copies: -1 } },
  ]).toArray()
  return rows.map((r) => ({ series: r._id, copies: r.copies, spend: r.spend }))
}

export async function getBySetBreakdown(userId: string, limit = 10): Promise<Array<{ setCode: string; setName: string; copies: number; spend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; setName: string; copies: number; spend: number }>([
    { $match: { userId, ...NOT_SOLD } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
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
    { $match: { userId, ...NOT_SOLD } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.rarity', copies: { $sum: 1 } } },
    { $sort: { copies: -1 } },
  ]).toArray()
  return rows.map((r) => ({ rarity: r._id ?? 'Unknown', copies: r.copies }))
}

export async function getSoldCardsForUser(userId: string): Promise<SoldCardRow[]> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{
    _id: unknown
    cardId: string
    variant: string
    type: 'raw' | 'graded'
    cost?: number
    soldPrice: number
    soldAt: Date
    acquiredAt: Date
    card: Record<string, unknown> & { _id: unknown }
  }>([
    { $match: { userId, status: 'sold' } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $sort: { soldAt: -1 } },
  ]).toArray()

  return rows.map((r) => {
    const { _id: cardDocId, ...cardRest } = r.card
    const cost = typeof r.cost === 'number' ? r.cost : null
    return {
      _id: String(r._id),
      cardId: r.cardId,
      card: { _id: String(cardDocId), ...cardRest } as unknown as PokemonCard,
      variant: r.variant as SoldCardRow['variant'],
      type: r.type,
      cost,
      soldPrice: r.soldPrice,
      soldAt: r.soldAt,
      acquiredAt: r.acquiredAt,
      pnl: r.soldPrice - (cost ?? 0),
    }
  })
}

export async function getCollectionTimeseries(userId: string): Promise<Array<{ month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; copies: number; spend: number }>([
    { $match: { userId, ...NOT_SOLD } },
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
