import Link from 'next/link'
import { Layers } from 'lucide-react'
import { getSeries } from '@/lib/sets'
import Breadcrumb from '@/components/catalog/Breadcrumb'

export const metadata = { title: 'Browse — PokeVault' }

export default async function BrowsePage() {
  const series = await getSeries()

  return (
    <div>
      <Breadcrumb segments={[{ label: 'Browse' }]} />

      {series.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay0 text-sm mb-2">No series yet.</p>
          <p className="text-overlay0 text-xs">Run <code className="text-mauve">npm run seed</code> to import card data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {series.map((s) => (
            <Link
              key={s.slug}
              href={`/browse/${s.slug}`}
              className="bg-base border border-surface0 rounded-xl p-4 hover:border-blue/50 hover:bg-surface0/30 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue/10 border border-blue/20 flex items-center justify-center flex-shrink-0">
                  <Layers size={13} className="text-blue" />
                </div>
                <span className="text-[10px] text-overlay0 tabular-nums">{s.releaseRange}</span>
              </div>
              <h2 className="text-sm font-russo text-text leading-tight mb-1 group-hover:text-blue transition-colors">
                {s.name}
              </h2>
              <p className="text-[10px] text-overlay0">
                {s.setCount} {s.setCount === 1 ? 'set' : 'sets'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
