import { auth } from '@/lib/auth'
import { getSeriesWithSets } from '@/lib/sets'
import { getOwnedVariantCountsBySet, getOwnedUniqueCardCountsBySet, getOwnedRarityCountsBySet, getCollectionValueBySet, getCollectionCostBySet } from '@/lib/userCards'
import { getRarityTotalsBySet } from '@/lib/cards'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import SetCard from '@/components/catalog/SetCard'

export const metadata = { title: 'Browse — PokeVault' }

export default async function BrowsePage() {
  const session = await auth()
  const userId = session?.user?.id

  const [series, variantCountsBySet, uniqueCountsBySet, rarityTotalsBySet, rarityOwnedBySet, collectionValueBySet, collectionCostBySet] = await Promise.all([
    getSeriesWithSets(),
    userId ? getOwnedVariantCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
    userId ? getOwnedUniqueCardCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
    getRarityTotalsBySet(),
    userId ? getOwnedRarityCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
    userId ? getCollectionValueBySet(userId) : Promise.resolve(new Map<string, number>()),
    userId ? getCollectionCostBySet(userId) : Promise.resolve(new Map<string, number>()),
  ])

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
                  <SetCard
                    key={set.pokemontcg_id}
                    set={set}
                    seriesSlug={s.slug}
                    variantCounts={userId ? (variantCountsBySet.get(set.pokemontcg_id) ?? new Map()) : undefined}
                    ownedUniqueCount={userId ? (uniqueCountsBySet.get(set.pokemontcg_id) ?? 0) : undefined}
                    rarityTotals={rarityTotalsBySet.get(set.pokemontcg_id)}
                    rarityOwnedCounts={userId ? rarityOwnedBySet.get(set.pokemontcg_id) : undefined}
                    collectionValue={userId ? collectionValueBySet.get(set.pokemontcg_id) : undefined}
                    collectionCost={userId ? collectionCostBySet.get(set.pokemontcg_id) : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
