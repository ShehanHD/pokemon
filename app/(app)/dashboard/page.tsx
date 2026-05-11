import Link from 'next/link'
import { auth } from '@/lib/auth'
import {
  getOwnedCountsBySet,
  getCollectionValueBySet,
  getCollectionCostBySet,
  getOwnedCountsBySeries,
} from '@/lib/userCards'
import { getSetsByIds } from '@/lib/sets'

function sumMap(m: Map<string, number>): number {
  let total = 0
  for (const v of m.values()) total += v
  return total
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  const isPro = session?.user?.tier === 'pro'

  const [countsBySet, valueBySet, costBySet, countsBySeries] = userId
    ? await Promise.all([
        getOwnedCountsBySet(userId),
        getCollectionValueBySet(userId),
        getCollectionCostBySet(userId),
        getOwnedCountsBySeries(userId),
      ])
    : [
        new Map<string, number>(),
        new Map<string, number>(),
        new Map<string, number>(),
        new Map<string, number>(),
      ]

  const setIds = Array.from(countsBySet.keys())
  const sets = setIds.length > 0 ? await getSetsByIds(setIds) : []
  const setNameById = new Map(sets.map((s) => [s.tcgdex_id, s.name]))
  const setSeriesSlugById = new Map(sets.map((s) => [s.tcgdex_id, s.seriesSlug]))

  const topSetsByValue = Array.from(valueBySet.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, value]) => ({
      id,
      name: setNameById.get(id) ?? id,
      seriesSlug: setSeriesSlugById.get(id),
      value,
      count: countsBySet.get(id) ?? 0,
    }))
  const topSetsMax = topSetsByValue[0]?.value ?? 0

  const seriesBars = Array.from(countsBySeries.entries())
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => ({ slug, count }))
  const seriesMax = seriesBars[0]?.count ?? 0

  const cardsOwned = sumMap(countsBySet)
  const collectionValue = sumMap(valueBySet)
  const collectionCost = sumMap(costBySet)
  const gainLoss = collectionValue - collectionCost
  const setsTracked = countsBySet.size

  const gainLossPct = collectionCost > 0 ? (gainLoss / collectionCost) * 100 : 0
  const gainLossSign = gainLoss > 0 ? '+' : gainLoss < 0 ? '−' : ''
  const gainLossColor = gainLoss > 0 ? 'text-green' : gainLoss < 0 ? 'text-red' : 'text-text'

  const stats: {
    label: string
    value: string
    sub: string
    locked?: boolean
    valueClass?: string
  }[] = [
    {
      label: 'Cards Owned',
      value: cardsOwned.toLocaleString(),
      sub: cardsOwned === 0 ? 'Start your collection' : `${cardsOwned} cop${cardsOwned === 1 ? 'y' : 'ies'}`,
    },
    {
      label: 'Collection Value',
      value: `€${collectionValue.toFixed(2)}`,
      sub: collectionValue === 0 ? 'Add cards to track value' : 'Cardmarket prices',
    },
    {
      label: 'Collection Cost',
      value: `€${collectionCost.toFixed(2)}`,
      sub: collectionCost === 0 ? 'Set cost when adding copies' : 'What you paid',
    },
    isPro
      ? {
          label: 'Gain / Loss',
          value: collectionCost === 0 ? '—' : `${gainLossSign}€${Math.abs(gainLoss).toFixed(2)}`,
          sub: collectionCost === 0 ? 'Add cost to track P/L' : `${gainLossSign}${Math.abs(gainLossPct).toFixed(1)}%`,
          valueClass: gainLossColor,
        }
      : { label: 'Gain / Loss', value: '—', sub: 'Pro feature', locked: true },
    {
      label: 'Sets Tracked',
      value: setsTracked.toLocaleString(),
      sub: setsTracked === 0 ? '—' : `${setsTracked} set${setsTracked === 1 ? '' : 's'} with owned cards`,
    },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-base border border-surface0 rounded-xl p-4">
            <div className="text-[9px] uppercase tracking-widest text-overlay0 mb-2">
              {stat.label}
            </div>
            <div
              className={[
                'text-2xl font-black',
                stat.locked ? 'text-overlay0' : stat.valueClass ?? 'text-text',
              ].join(' ')}
            >
              {stat.value}
            </div>
            <div className="text-[10px] text-overlay0 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {topSetsByValue.length === 0 && seriesBars.length === 0 ? (
        <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
          <p className="text-overlay0 text-sm">
            Browse sets and add cards to your collection to see your dashboard come alive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-base border border-surface0 rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-overlay1 font-bold">Top Sets by Value</h2>
              <span className="text-[10px] text-overlay0">Top {topSetsByValue.length}</span>
            </div>
            {topSetsByValue.length === 0 ? (
              <p className="text-overlay0 text-xs">No valued cards yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {topSetsByValue.map((s) => {
                  const pct = topSetsMax > 0 ? (s.value / topSetsMax) * 100 : 0
                  const href = s.seriesSlug ? `/browse/${s.seriesSlug}/${s.id}` : '/browse'
                  return (
                    <li key={s.id}>
                      <Link href={href} className="block group">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-xs text-text truncate group-hover:text-blue transition-colors">{s.name}</span>
                          <span className="text-xs text-mauve tabular-nums shrink-0">€{s.value.toFixed(2)}</span>
                        </div>
                        <div className="relative h-2 bg-surface0 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue/70 group-hover:bg-blue transition-colors"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-overlay0 mt-1 tabular-nums">
                          {s.count} cop{s.count === 1 ? 'y' : 'ies'}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="bg-base border border-surface0 rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-overlay1 font-bold">Cards by Series</h2>
              <span className="text-[10px] text-overlay0">{seriesBars.length} series</span>
            </div>
            {seriesBars.length === 0 ? (
              <p className="text-overlay0 text-xs">No cards owned yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {seriesBars.map((s) => {
                  const pct = seriesMax > 0 ? (s.count / seriesMax) * 100 : 0
                  return (
                    <li key={s.slug}>
                      <Link href={`/browse/${s.slug}`} className="block group">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-xs text-text truncate group-hover:text-mauve transition-colors capitalize">
                            {s.slug.replace(/-/g, ' ')}
                          </span>
                          <span className="text-xs text-mauve tabular-nums shrink-0">{s.count}</span>
                        </div>
                        <div className="relative h-2 bg-surface0 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-mauve/70 group-hover:bg-mauve transition-colors"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
