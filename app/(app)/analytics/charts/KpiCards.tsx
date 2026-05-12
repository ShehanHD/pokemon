import type { CollectionStats } from '@/lib/types'

interface KpiItem {
  label: string
  value: string
  accent: string
  icon: React.ReactNode
}

export default function KpiCards({ stats }: { stats: CollectionStats }) {
  const items: KpiItem[] = [
    {
      label: 'Total copies',
      value: stats.totalCopies.toLocaleString(),
      accent: 'var(--color-blue)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect x="3" y="3" width="14" height="14" rx="2" />
          <path d="M7 7h10M7 11h10M7 15h6" />
        </svg>
      ),
    },
    {
      label: 'Unique cards',
      value: stats.uniqueCards.toLocaleString(),
      accent: 'var(--color-sapphire)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect x="4" y="3" width="12" height="16" rx="2" />
          <path d="M9 7h2M8 12h4" />
        </svg>
      ),
    },
    {
      label: 'Total spend',
      value: `€${stats.totalSpend.toFixed(2)}`,
      accent: 'var(--color-mauve)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12 3v18M7 7h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" />
        </svg>
      ),
    },
    {
      label: 'Estimated value',
      value: `€${stats.estValue.toFixed(2)}`,
      accent: 'var(--color-teal)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M3 17l5-5 4 4 8-8" />
          <path d="M14 8h6v6" />
        </svg>
      ),
    },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((i) => (
        <div
          key={i.label}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-mantle to-base border border-surface0 p-4 shadow-sm hover:shadow-md hover:border-surface1 transition-all"
        >
          <div
            aria-hidden
            className="absolute -top-px left-4 right-4 h-px opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${i.accent}, transparent)` }}
          />
          <div
            aria-hidden
            className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
            style={{ background: i.accent }}
          />
          <div className="flex items-center gap-2 text-overlay1">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: `color-mix(in oklab, ${i.accent} 18%, transparent)`, color: i.accent }}
            >
              {i.icon}
            </span>
            <p className="text-[10px] uppercase tracking-wider">{i.label}</p>
          </div>
          <p className="text-2xl font-russo text-text mt-2 tabular-nums">{i.value}</p>
        </div>
      ))}
      <p className="text-[10px] text-overlay0 col-span-2 md:col-span-4">
        Value tracking is acquisition-based (graded value or purchase cost). Live market data is not used.
      </p>
    </div>
  )
}
