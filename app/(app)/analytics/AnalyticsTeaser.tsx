import Link from 'next/link'

export default function AnalyticsTeaser() {
  return (
    <div className="relative">
      <div className="filter blur-md pointer-events-none select-none grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-mantle border border-surface0" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center bg-base/95 border border-surface0 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl text-text mb-2">Unlock collection analytics</h2>
          <p className="text-sm text-overlay1 mb-4">Upgrade to Pro to see charts of your collection.</p>
          <Link href="/upgrade" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold hover:bg-blue/90 transition-colors">
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  )
}
