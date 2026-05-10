import { fetchAllSets } from '@/lib/pokemontcg'
import { toSeriesSlug } from '@/lib/sets'
import { getDb } from '@/lib/db'
import { resolveSeries } from '@/lib/seedSeries'
import SeedClient, { type SeriesGroup, type SetRow } from './SeedClient'

export const metadata = { title: 'Admin · Seed' }

type DbSetMeta = { pokemontcg_id: string; cardCount: number; totalValue: number | null; updatedAt?: Date | null }

async function getDbSetsMeta(): Promise<Map<string, DbSetMeta>> {
  const db = await getDb()
  const sets = await db
    .collection('sets')
    .find({}, { projection: { pokemontcg_id: 1, totalValue: 1 } })
    .toArray()
  const counts = await db
    .collection('cards')
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$set_id', count: { $sum: 1 } } },
    ])
    .toArray()
  const countMap = new Map(counts.map((c) => [c._id, c.count]))
  const map = new Map<string, DbSetMeta>()
  for (const s of sets) {
    const id = s.pokemontcg_id as string
    map.set(id, {
      pokemontcg_id: id,
      cardCount: countMap.get(id) ?? 0,
      totalValue: (s.totalValue as number | null | undefined) ?? null,
    })
  }
  return map
}

export default async function AdminSeedPage() {
  const [apiSets, dbMeta] = await Promise.all([fetchAllSets(), getDbSetsMeta()])

  const groups = new Map<string, SeriesGroup>()
  for (const s of apiSets) {
    const series = resolveSeries(s.id, s.series)
    const slug = toSeriesSlug(series)
    const meta = dbMeta.get(s.id)
    const row: SetRow = {
      setId: s.id,
      setName: s.name,
      releaseDate: s.releaseDate,
      apiTotal: s.total,
      printedTotal: s.printedTotal,
      logoUrl: s.images.logo,
      inDb: !!meta,
      dbCardCount: meta?.cardCount ?? 0,
      dbTotalValue: meta?.totalValue ?? null,
    }
    if (!groups.has(series)) {
      groups.set(series, { name: series, slug, sets: [] })
    }
    groups.get(series)!.sets.push(row)
  }

  const BOTTOM_SERIES = ['other', 'pop series']
  const groupList = Array.from(groups.values())
    .map((g) => ({
      ...g,
      sets: g.sets.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    }))
    .sort((a, b) => {
      const aBottom = BOTTOM_SERIES.some((s) => a.name.toLowerCase().includes(s))
      const bBottom = BOTTOM_SERIES.some((s) => b.name.toLowerCase().includes(s))
      if (aBottom !== bBottom) return aBottom ? 1 : -1
      const aLatest = a.sets[0]?.releaseDate ?? ''
      const bLatest = b.sets[0]?.releaseDate ?? ''
      return bLatest.localeCompare(aLatest)
    })

  const totalSets = apiSets.length
  const dbSetCount = dbMeta.size
  const newSetCount = totalSets - groupList.reduce((acc, g) => acc + g.sets.filter((s) => s.inDb).length, 0)

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-russo">Admin · Seed</h1>
        <p className="text-sm text-overlay1">
          Re-seed individual sets or whole series from the pokemontcg.io API.
          {' '}<span className="tabular-nums">{dbSetCount}</span> in DB ·
          {' '}<span className="tabular-nums">{newSetCount}</span> new ·
          {' '}<span className="tabular-nums">{totalSets}</span> total.
        </p>
        <p className="text-xs text-overlay0">Dev-only. Hidden in production.</p>
      </header>

      <SeedClient groups={groupList} />
    </main>
  )
}
