import { getDb } from './db'
import type { PokemonSet } from './types'

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

export async function getSetsBySeries(seriesSlug: string): Promise<PokemonSet[]> {
  const db = await getDb()
  return db
    .collection<PokemonSet>('sets')
    .find({ seriesSlug })
    .sort({ releaseDate: -1 })
    .toArray()
}

export async function getSetById(pokemontcg_id: string): Promise<PokemonSet | null> {
  const db = await getDb()
  return db.collection<PokemonSet>('sets').findOne({ pokemontcg_id }) ?? null
}
