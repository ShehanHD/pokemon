const stats = [
  { label: 'Cards Owned', value: '0', sub: 'Start your collection' },
  { label: 'Collection Value', value: '€0', sub: 'Add cards to track value' },
  { label: 'Sets Tracked', value: '0', sub: '—' },
  { label: 'Gain / Loss', value: '—', sub: 'Pro feature', locked: true },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-base border border-surface0 rounded-xl p-4">
            <div className="text-[9px] uppercase tracking-widest text-overlay0 mb-2">
              {stat.label}
            </div>
            <div
              className={[
                'text-2xl font-black',
                stat.locked ? 'text-overlay0' : 'text-text',
              ].join(' ')}
            >
              {stat.value}
            </div>
            <div className="text-[10px] text-overlay0 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
        <p className="text-overlay0 text-sm">
          Browse sets and add cards to your collection to see your dashboard come alive.
        </p>
      </div>
    </div>
  )
}
