import { getDb } from './db'
import type { PokemonSet } from './types'

function serializeSet(doc: Record<string, unknown>): PokemonSet {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as PokemonSet
}

export function toSeriesSlug(series: string): string {
  return series.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export const NON_MAIN_SERIES_SLUGS: ReadonlySet<string> = new Set([
  'pop',
  'trainer-kits',
  'mcdonald-s-collection',
  'pok-mon-tcg-pocket',
  'miscellaneous',
])

export function isMainSeries(seriesSlug: string): boolean {
  return !NON_MAIN_SERIES_SLUGS.has(seriesSlug)
}

export function isPromoSet(setName: string): boolean {
  return /black star promos/i.test(setName)
}

export function isMainSet(set: { seriesSlug: string; name: string }): boolean {
  return isMainSeries(set.seriesSlug) && !isPromoSet(set.name)
}

export async function getSeries(): Promise<{
  name: string
  slug: string
  setCount: number
  releaseRange: string
}[]> {
  const db = await getDb()
  const result = await db.collection('sets').aggregate([
    { $match: { tcgdex_id: { $exists: true, $ne: null } } },
    {
      $addFields: {
        _releaseDateNonEmpty: {
          $cond: [{ $and: [{ $ne: ['$releaseDate', null] }, { $ne: ['$releaseDate', ''] }] }, '$releaseDate', null],
        },
      },
    },
    {
      $group: {
        _id: '$seriesSlug',
        name: { $first: '$series' },
        names: { $addToSet: '$series' },
        setCount: { $sum: 1 },
        minRelease: { $min: '$_releaseDateNonEmpty' },
        maxRelease: { $max: '$_releaseDateNonEmpty' },
      },
    },
    { $sort: { maxRelease: -1 } },
  ]).toArray()

  return result
    .map((r) => {
      const candidates = (r.names as string[]).filter((n) => /^[\x00-\x7F]+$/.test(n))
      const name = (candidates[0] ?? r.name) as string
      const minY = ((r.minRelease as string | null) ?? '').slice(0, 4)
      const maxY = ((r.maxRelease as string | null) ?? '').slice(0, 4)
      const releaseRange = !minY && !maxY ? '' : minY === maxY ? minY : `${minY} – ${maxY}`
      return {
        name,
        slug: r._id as string,
        setCount: r.setCount as number,
        releaseRange,
      }
    })
    .sort((a, b) => {
      const aBottom = !isMainSeries(a.slug)
      const bBottom = !isMainSeries(b.slug)
      if (aBottom !== bBottom) return aBottom ? 1 : -1
      return 0
    })
}

export async function getSeriesWithSets(): Promise<{
  name: string
  slug: string
  releaseRange: string
  sets: PokemonSet[]
}[]> {
  const db = await getDb()
  const sets = (await db
    .collection('sets')
    .find({ tcgdex_id: { $exists: true, $ne: null } })
    .sort({ releaseDate: -1 })
    .toArray()).map(serializeSet)

  const map = new Map<string, { name: string; slug: string; names: Set<string>; minRelease: string; maxRelease: string; sets: PokemonSet[] }>()
  for (const set of sets) {
    if (!map.has(set.seriesSlug)) {
      map.set(set.seriesSlug, { name: set.series, slug: set.seriesSlug, names: new Set([set.series]), minRelease: '', maxRelease: '', sets: [] })
    }
    const entry = map.get(set.seriesSlug)!
    entry.names.add(set.series)
    entry.sets.push(set)
    if (set.releaseDate) {
      if (!entry.minRelease || set.releaseDate < entry.minRelease) entry.minRelease = set.releaseDate
      if (!entry.maxRelease || set.releaseDate > entry.maxRelease) entry.maxRelease = set.releaseDate
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const aBottom = !isMainSeries(a.slug)
      const bBottom = !isMainSeries(b.slug)
      if (aBottom !== bBottom) return aBottom ? 1 : -1
      if (!a.maxRelease && !b.maxRelease) return 0
      if (!a.maxRelease) return 1
      if (!b.maxRelease) return -1
      return b.maxRelease.localeCompare(a.maxRelease)
    })
    .map(({ name, slug, names, minRelease, maxRelease, sets }) => {
      const ascii = Array.from(names).filter((n) => /^[\x00-\x7F]+$/.test(n))
      const display = ascii[0] ?? name
      const minY = minRelease.slice(0, 4)
      const maxY = maxRelease.slice(0, 4)
      const releaseRange = !minY && !maxY ? '' : minY === maxY ? minY : `${minY} – ${maxY}`
      const orderedSets = isMainSeries(slug)
        ? [...sets].sort((a, b) => {
            const aPromo = isPromoSet(a.name)
            const bPromo = isPromoSet(b.name)
            if (aPromo !== bPromo) return aPromo ? 1 : -1
            return 0
          })
        : sets
      return {
        name: display,
        slug,
        releaseRange,
        sets: orderedSets,
      }
    })
}

export async function getSetsBySeries(seriesSlug: string): Promise<PokemonSet[]> {
  const db = await getDb()
  const docs = await db
    .collection('sets')
    .find({ seriesSlug, tcgdex_id: { $exists: true, $ne: null } })
    .sort({ releaseDate: -1 })
    .toArray()
  const sets = docs.map(serializeSet)
  if (!isMainSeries(seriesSlug)) return sets
  return sets.sort((a, b) => {
    const aPromo = isPromoSet(a.name)
    const bPromo = isPromoSet(b.name)
    if (aPromo !== bPromo) return aPromo ? 1 : -1
    return 0
  })
}

export async function getSetById(tcgdex_id: string): Promise<PokemonSet | null> {
  const db = await getDb()
  const doc = await db.collection('sets').findOne({ tcgdex_id })
  return doc ? serializeSet(doc as Record<string, unknown>) : null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function searchSets(query: string, limit = 24): Promise<PokemonSet[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const db = await getDb()
  const re = new RegExp(escapeRegex(trimmed), 'i')
  const docs = await db
    .collection('sets')
    .find({ $or: [{ name: re }, { series: re }] })
    .sort({ releaseDate: -1 })
    .limit(limit)
    .toArray()
  return docs.map((d) => serializeSet(d as Record<string, unknown>))
}

export async function getPrintedTotalsBySetId(): Promise<Map<string, number>> {
  const db = await getDb()
  const docs = await db
    .collection('sets')
    .find({}, { projection: { tcgdex_id: 1, printedTotal: 1 } })
    .toArray()
  const map = new Map<string, number>()
  for (const d of docs) {
    const doc = d as unknown as { tcgdex_id: string; printedTotal: number }
    map.set(doc.tcgdex_id, doc.printedTotal)
  }
  return map
}

export async function getSetsByIds(ids: string[]): Promise<PokemonSet[]> {
  if (ids.length === 0) return []
  const db = await getDb()
  const docs = await db
    .collection('sets')
    .find({ tcgdex_id: { $in: ids } })
    .toArray()
  return docs.map((d) => serializeSet(d as Record<string, unknown>))
}
