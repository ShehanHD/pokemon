import { getDb } from './db'
import type { PokemonCard } from './types'
import { normaliseRarity, getRawRaritiesFor, type NormalisedRarity } from './taxonomy/rarity'

export type CardsSort = 'name' | 'name-desc' | 'price-desc' | 'price-asc' | 'release-desc' | 'release-asc'

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

export async function getCardById(id: string): Promise<PokemonCard | null> {
  const db = await getDb()
  const doc = await db.collection('cards').findOne({
    $or: [{ pokemontcg_id: id }, { tcgdex_id: id }],
  })
  return doc ? serializeCard(doc as Record<string, unknown>) : null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function buildCardQueryFilter(
  trimmed: string,
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<Record<string, unknown> | null> {
  if (trimmed.includes('/')) {
    const [rawNumPart, totalPart] = trimmed.split('/', 2).map((s) => s.trim())
    const rawNum = rawNumPart ?? ''
    const totalStr = totalPart ?? ''
    const hasValidTotal = totalStr.length > 0 && /^\d+$/.test(totalStr)

    const numAsInt = rawNum ? parseInt(rawNum, 10) : NaN
    const numRe = rawNum
      ? (!isNaN(numAsInt) && /^\d+$/.test(rawNum)
          ? new RegExp(`^0*${numAsInt}`)
          : new RegExp(`^${escapeRegex(rawNum)}`, 'i'))
      : null

    let matchingSetIds: string[] | null = null
    if (hasValidTotal) {
      const totalPrefix = totalStr.replace(/^0+(?=\d)/, '')
      const allSets = await db
        .collection('sets')
        .find({})
        .project({ tcgdex_id: 1, printedTotal: 1 })
        .toArray()
      matchingSetIds = allSets
        .filter((s) => {
          const doc = s as { printedTotal?: number }
          const pt = doc.printedTotal != null ? String(doc.printedTotal) : ''
          return pt.startsWith(totalPrefix)
        })
        .map((s) => String((s as { tcgdex_id: string }).tcgdex_id))
    }

    if (numRe && matchingSetIds && matchingSetIds.length > 0) {
      const probe = await db
        .collection('cards')
        .findOne({ number: numRe, set_id: { $in: matchingSetIds } })
      if (probe) return { number: numRe, set_id: { $in: matchingSetIds } }
    }
    if (numRe) return { number: numRe }
    if (matchingSetIds && matchingSetIds.length > 0) return { set_id: { $in: matchingSetIds } }
    return null
  }
  const re = new RegExp(escapeRegex(trimmed), 'i')
  return { $or: [{ name: re }, { number: re }] }
}

export async function searchCards(query: string, limit = 60): Promise<PokemonCard[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const db = await getDb()
  const filter = await buildCardQueryFilter(trimmed, db)
  if (!filter) return []
  const docs = await db
    .collection('cards')
    .find(filter)
    .limit(limit)
    .toArray()
  return docs
    .map((d) => serializeCard(d as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listAllCards(opts: {
  q?: string
  limit: number
  skip: number
  sort?: CardsSort
  rarity?: NormalisedRarity | null
  supertype?: string | null
  ownedIds?: Set<string> | null
  collection?: 'all' | 'owned' | 'not-owned'
}): Promise<{ cards: PokemonCard[]; total: number }> {
  const db = await getDb()
  const filter: Record<string, unknown> = {}
  const trimmed = opts.q?.trim()
  if (trimmed) {
    const queryFilter = await buildCardQueryFilter(trimmed, db)
    if (!queryFilter) return { cards: [], total: 0 }
    Object.assign(filter, queryFilter)
  }
  if (opts.rarity) {
    if (opts.rarity === 'Unknown') filter.rarity = null
    else {
      const rawValues = getRawRaritiesFor(opts.rarity)
      if (rawValues.length > 0) filter.rarity = { $in: rawValues }
    }
  }
  if (opts.supertype) filter.supertype = opts.supertype
  if (opts.sort === 'price-asc' || opts.sort === 'price-desc') {
    filter.priceEUR = { $ne: null }
  }
  if (opts.ownedIds && opts.collection === 'owned') {
    filter.tcgdex_id = { $in: Array.from(opts.ownedIds) }
  } else if (opts.ownedIds && opts.collection === 'not-owned') {
    filter.tcgdex_id = { $nin: Array.from(opts.ownedIds) }
  }

  const useReleaseSort = opts.sort === 'release-desc' || opts.sort === 'release-asc'

  if (useReleaseSort) {
    const dir = opts.sort === 'release-asc' ? 1 : -1
    const pipeline: Record<string, unknown>[] = [
      { $match: filter },
      { $lookup: { from: 'sets', localField: 'set_id', foreignField: 'tcgdex_id', as: '_set' } },
      { $unwind: { path: '$_set', preserveNullAndEmptyArrays: true } },
      { $sort: { '_set.releaseDate': dir, name: 1 } },
      { $skip: opts.skip },
      { $limit: opts.limit },
      { $project: { _set: 0 } },
    ]
    const [docs, total] = await Promise.all([
      db.collection('cards').aggregate(pipeline).toArray(),
      db.collection('cards').countDocuments(filter),
    ])
    return {
      cards: docs.map((d) => serializeCard(d as Record<string, unknown>)),
      total,
    }
  }

  const sortSpec: Record<string, 1 | -1> =
    opts.sort === 'name-desc' ? { name: -1 }
    : opts.sort === 'price-desc' ? { priceEUR: -1, name: 1 }
    : opts.sort === 'price-asc' ? { priceEUR: 1, name: 1 }
    : { name: 1 }

  const [docs, total] = await Promise.all([
    db.collection('cards').find(filter).sort(sortSpec).skip(opts.skip).limit(opts.limit).toArray(),
    db.collection('cards').countDocuments(filter),
  ])
  return {
    cards: docs.map((d) => serializeCard(d as Record<string, unknown>)),
    total,
  }
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
