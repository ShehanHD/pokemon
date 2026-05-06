import { getDb } from './db'
import type { PokemonSet } from './types'

function serializeSet(doc: Record<string, unknown>): PokemonSet {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as PokemonSet
}

export function toSeriesSlug(series: string): string {
  return series.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function getSeries(): Promise<{
  name: string
  slug: string
  setCount: number
  releaseRange: string
}[]> {
  const db = await getDb()
  const result = await db.collection('sets').aggregate([
    {
      $group: {
        _id: '$series',
        setCount: { $sum: 1 },
        minRelease: { $min: '$releaseDate' },
        maxRelease: { $max: '$releaseDate' },
      },
    },
    { $sort: { maxRelease: -1 } },
  ]).toArray()

  return result.map((r) => ({
    name: r._id as string,
    slug: toSeriesSlug(r._id as string),
    setCount: r.setCount as number,
    releaseRange: `${(r.minRelease as string).slice(0, 4)} – ${(r.maxRelease as string).slice(0, 4)}`,
  }))
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
    .find({})
    .sort({ releaseDate: -1 })
    .toArray()).map(serializeSet)

  const map = new Map<string, { name: string; slug: string; minRelease: string; maxRelease: string; sets: PokemonSet[] }>()
  for (const set of sets) {
    if (!map.has(set.series)) {
      map.set(set.series, { name: set.series, slug: set.seriesSlug, minRelease: set.releaseDate, maxRelease: set.releaseDate, sets: [] })
    }
    const entry = map.get(set.series)!
    entry.sets.push(set)
    if (set.releaseDate < entry.minRelease) entry.minRelease = set.releaseDate
    if (set.releaseDate > entry.maxRelease) entry.maxRelease = set.releaseDate
  }

  return Array.from(map.values())
    .sort((a, b) => b.maxRelease.localeCompare(a.maxRelease))
    .map(({ name, slug, minRelease, maxRelease, sets }) => ({
      name,
      slug,
      releaseRange: `${minRelease.slice(0, 4)} – ${maxRelease.slice(0, 4)}`,
      sets,
    }))
}

export async function getSetsBySeries(seriesSlug: string): Promise<PokemonSet[]> {
  const db = await getDb()
  const docs = await db
    .collection('sets')
    .find({ seriesSlug })
    .sort({ releaseDate: -1 })
    .toArray()
  return docs.map(serializeSet)
}

export async function getSetById(pokemontcg_id: string): Promise<PokemonSet | null> {
  const db = await getDb()
  const doc = await db.collection('sets').findOne({ pokemontcg_id })
  return doc ? serializeSet(doc as Record<string, unknown>) : null
}
