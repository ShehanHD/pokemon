import type { CollectionStats } from '@/lib/types'

export default function KpiCards({ stats }: { stats: CollectionStats }) {
  const items = [
    { label: 'Total copies', value: stats.totalCopies.toLocaleString() },
    { label: 'Unique cards', value: stats.uniqueCards.toLocaleString() },
    { label: 'Total spend', value: `€${stats.totalSpend.toFixed(2)}` },
    { label: 'Estimated value', value: `€${stats.estValue.toFixed(2)}` },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl bg-mantle border border-surface0 p-4">
          <p className="text-xs text-overlay0 uppercase tracking-wider">{i.label}</p>
          <p className="text-2xl font-russo text-text mt-1 tabular-nums">{i.value}</p>
        </div>
      ))}
      <p className="text-[10px] text-overlay0 col-span-2 md:col-span-4">
        Value tracking is acquisition-based (graded value or purchase cost). Live market data is not used.
      </p>
    </div>
  )
}
