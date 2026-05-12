import Link from 'next/link'
import Image from 'next/image'
import { Receipt } from 'lucide-react'
import { auth } from '@/lib/auth'
import {
  getOwnedCountsBySet,
  getCollectionValueBySet,
  getOwnedCountsBySeries,
} from '@/lib/userCards'
import { getSetsByIds } from '@/lib/sets'
import { getRecentUnifiedExpenses, getTotalSpend } from '@/lib/expenses'
import { formatCurrency } from '@/lib/currency'
import { DEFAULT_CURRENCY, type Currency, type ExpenseCategory } from '@/lib/types'

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  purchase: 'Purchase',
  grading: 'Grading',
  shipping: 'Shipping',
  supplies: 'Supplies',
  other: 'Other',
}

function sumMap(m: Map<string, number>): number {
  let total = 0
  for (const v of m.values()) total += v
  return total
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  const isPro = session?.user?.tier === 'pro'
  const currency: Currency = session?.user?.currency ?? DEFAULT_CURRENCY

  const [countsBySet, valueBySet, countsBySeries, totalSpend, recentExpenses] =
    userId
      ? await Promise.all([
          getOwnedCountsBySet(userId),
          getCollectionValueBySet(userId),
          getOwnedCountsBySeries(userId),
          getTotalSpend(userId),
          getRecentUnifiedExpenses(userId, 5),
        ])
      : ([
          new Map<string, number>(),
          new Map<string, number>(),
          new Map<string, number>(),
          0,
          [] as Awaited<ReturnType<typeof getRecentUnifiedExpenses>>,
        ] as const)

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
  const gainLoss = collectionValue - totalSpend
  const setsTracked = countsBySet.size

  const gainLossPct = totalSpend > 0 ? (gainLoss / totalSpend) * 100 : 0
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
      value: formatCurrency(collectionValue, currency),
      sub: collectionValue === 0 ? 'Add cards to track value' : 'Cardmarket prices',
    },
    {
      label: 'Total Spend',
      value: formatCurrency(totalSpend, currency),
      sub: totalSpend === 0 ? 'Cards & expenses' : 'Cards + expenses',
    },
    isPro
      ? {
          label: 'Gain / Loss',
          value:
            totalSpend === 0
              ? '—'
              : `${gainLossSign}${formatCurrency(Math.abs(gainLoss), currency)}`,
          sub: totalSpend === 0 ? 'Add cost to track P/L' : `${gainLossSign}${Math.abs(gainLossPct).toFixed(1)}%`,
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
                          <span className="text-xs text-mauve tabular-nums shrink-0">{formatCurrency(s.value, currency)}</span>
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

      {recentExpenses.length > 0 && (
        <div className="mt-4 bg-base border border-surface0 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-overlay1 font-bold flex items-center gap-2">
              <Receipt size={12} className="text-blue" />
              Recent Expenses
            </h2>
            <Link href="/expenses" className="text-[10px] text-overlay0 hover:text-blue transition-colors">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-surface0">
            {recentExpenses.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-2.5">
                <div className="w-20 shrink-0 text-[11px] text-overlay1 tabular-nums">
                  {row.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-overlay0 shrink-0 w-16">
                  {CATEGORY_LABEL[row.category]}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {row.cardId && row.cardImageUrl && (
                    <div className="relative w-6 h-8 rounded overflow-hidden bg-surface0 shrink-0">
                      <Image
                        src={row.cardImageUrl}
                        alt={row.cardName ?? ''}
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="text-xs text-text truncate">
                    {row.cardId ? (row.cardName ?? row.cardId) : (row.note || '—')}
                  </span>
                </div>
                <div className="text-xs text-text tabular-nums shrink-0">
                  {formatCurrency(row.amount, currency)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
