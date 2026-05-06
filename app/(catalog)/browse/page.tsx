import { auth } from '@/lib/auth'
import { getSeriesWithSets } from '@/lib/sets'
import { getOwnedCountsBySet } from '@/lib/userCards'
import { ERA_ORDER, seriesToEra, type Era } from '@/lib/taxonomy/era'
import { EraSection } from '@/components/catalog/EraAccordion'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import SetCard from '@/components/catalog/SetCard'

export const metadata = { title: 'Browse — PokeVault' }

type SeriesWithSets = Awaited<ReturnType<typeof getSeriesWithSets>>[number]

export default async function BrowsePage() {
  const session = await auth()
  const userId = session?.user?.id

  const [series, countsBySet] = await Promise.all([
    getSeriesWithSets(),
    userId ? getOwnedCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
  ])

  const grouped = new Map<Era, SeriesWithSets[]>()
  for (const s of series) {
    const era = seriesToEra(s.name)
    if (!grouped.has(era)) grouped.set(era, [])
    grouped.get(era)!.push(s)
  }

  const erasInOrder = ERA_ORDER.filter((e) => grouped.has(e))
  const mostRecentEra = erasInOrder[0]

  return (
    <div>
      <Breadcrumb segments={[{ label: 'Browse' }]} />

      {series.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay0 text-sm mb-2">No series yet.</p>
          <p className="text-overlay0 text-xs">Run <code className="text-mauve">npm run seed</code> to import card data.</p>
        </div>
      ) : (
        erasInOrder.map((era) => (
          <EraSection key={era} era={era} defaultOpen={era === mostRecentEra}>
            <div className="space-y-6">
              {grouped.get(era)!.map((s) => (
                <section key={s.slug}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h2 className="text-sm font-russo text-text">{s.name}</h2>
                    <span className="text-[10px] text-overlay0 tabular-nums">{s.releaseRange}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {s.sets.map((set) => (
                      <SetCard
                        key={set.pokemontcg_id}
                        set={set}
                        seriesSlug={s.slug}
                        ownedCount={userId ? (countsBySet.get(set.pokemontcg_id) ?? 0) : undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </EraSection>
        ))
      )}
    </div>
  )
}
