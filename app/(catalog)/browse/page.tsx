import { getSeriesWithSets } from '@/lib/sets'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import SetCard from '@/components/catalog/SetCard'

export const metadata = { title: 'Browse — PokeVault' }

export default async function BrowsePage() {
  const series = await getSeriesWithSets()

  return (
    <div>
      <Breadcrumb segments={[{ label: 'Browse' }]} />

      {series.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay0 text-sm mb-2">No series yet.</p>
          <p className="text-overlay0 text-xs">Run <code className="text-mauve">npm run seed</code> to import card data.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {series.map((s) => (
            <section key={s.slug}>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-sm font-russo text-text">{s.name}</h2>
                <span className="text-[10px] text-overlay0 tabular-nums">{s.releaseRange}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {s.sets.map((set) => (
                  <SetCard key={set.pokemontcg_id} set={set} seriesSlug={s.slug} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
