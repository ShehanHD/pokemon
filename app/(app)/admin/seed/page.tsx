import { fetchAllSets, buildAssetUrl } from '@/lib/tcgdex'
import { toSeriesSlug } from '@/lib/sets'
import { getDb } from '@/lib/db'
import { resolveSeries } from '@/lib/seedSeries'
import SeedClient, { type SeriesGroup, type SetRow } from './SeedClient'

export const metadata = { title: 'Admin · Seed' }

type DbSetMeta = {
  tcgdex_id: string
  cardCount: number
  totalValueEUR?: number | null
  totalValue?: number | null
  series?: string
}

async function getDbSetsMeta(): Promise<Map<string, DbSetMeta>> {
  const db = await getDb()
  const sets = await db
    .collection('sets')
    .find({}, { projection: { tcgdex_id: 1, totalValueEUR: 1, totalValue: 1, series: 1 } })
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
    const id = s.tcgdex_id as string
    if (!id) continue
    map.set(id, {
      tcgdex_id: id,
      cardCount: countMap.get(id) ?? 0,
      totalValueEUR: (s.totalValueEUR as number | null | undefined) ?? null,
      totalValue: (s.totalValue as number | null | undefined) ?? null,
      series: (s.series as string | undefined) ?? undefined,
    })
  }
  return map
}

export default async function AdminSeedPage() {
  const [apiSets, dbMeta] = await Promise.all([fetchAllSets(), getDbSetsMeta()])

  const groups = new Map<string, SeriesGroup>()
  for (const s of apiSets) {
    const meta = dbMeta.get(s.id)
    // Series resolution: prefer DB-stored series (already populated by seeder),
    // fall back to resolveSeries override map for known IDs, then 'Other'.
    // We cannot use set.serie?.name here because fetchAllSets() returns TcgdexSetBrief
    // which does not include the serie field (only fetchSet() returns TcgdexSetDetail).
    const dbSeries = meta?.series ?? ''
    const series = resolveSeries(s.id, dbSeries || 'Other')
    const slug = toSeriesSlug(series)
    const dbTotalValue =
      (meta?.totalValueEUR ?? meta?.totalValue) !== undefined
        ? (meta?.totalValueEUR ?? meta?.totalValue ?? null)
        : null
    const row: SetRow = {
      setId: s.id,
      setName: s.name,
      releaseDate: s.releaseDate ?? '',
      apiTotal: s.cardCount?.total ?? 0,
      printedTotal: s.cardCount?.official ?? 0,
      logoUrl: buildAssetUrl(s.logo) ?? '',
      inDb: !!meta,
      dbCardCount: meta?.cardCount ?? 0,
      dbTotalValue,
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
          Re-seed individual sets or whole series from the TCGdex API.
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
