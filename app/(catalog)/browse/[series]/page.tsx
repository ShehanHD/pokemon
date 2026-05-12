import { notFound } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getSetsBySeries } from '@/lib/sets'
import { getOwnedVariantCountsBySet, getOwnedUniqueCardCountsBySet, getOwnedRarityCountsBySet, getCollectionValueBySet, getCollectionCostBySet } from '@/lib/userCards'
import { getRarityTotalsBySet } from '@/lib/cards'
import SetCard from '@/components/catalog/SetCard'
import CollectionFilter from '@/components/catalog/CollectionFilter'

const collectionSchema = z.enum(['all', 'owned', 'not-owned']).catch('all')

interface Props {
  params: Promise<{ series: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SeriesPage({ params, searchParams }: Props) {
  const { series: seriesSlug } = await params
  const sp = await searchParams
  const session = await auth()
  const userId = session?.user?.id
  const collection = collectionSchema.parse(typeof sp.collection === 'string' ? sp.collection : 'all')

  const [sets, variantCountsBySet, uniqueCountsBySet, rarityTotalsBySet, rarityOwnedBySet, collectionValueBySet, collectionCostBySet] = await Promise.all([
    getSetsBySeries(seriesSlug),
    userId ? getOwnedVariantCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
    userId ? getOwnedUniqueCardCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
    getRarityTotalsBySet(),
    userId ? getOwnedRarityCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
    userId ? getCollectionValueBySet(userId) : Promise.resolve(new Map<string, number>()),
    userId ? getCollectionCostBySet(userId) : Promise.resolve(new Map<string, number>()),
  ])

  if (sets.length === 0) notFound()

  const seriesName = sets[0].series

  const isSetOwned = (setId: string) => (uniqueCountsBySet.get(setId) ?? 0) > 0
  const visibleSets = sets.filter((set) => {
    if (!userId || collection === 'all') return true
    return collection === 'owned' ? isSetOwned(set.tcgdex_id) : !isSetOwned(set.tcgdex_id)
  })

  return (
    <div>
<header className="mb-4">
        <h1 className="text-2xl font-russo text-text">{seriesName}</h1>
      </header>

      {userId && (
        <div className="flex items-center gap-2 mb-4">
          <CollectionFilter value={collection} />
          {visibleSets.length < sets.length && (
            <span className="text-[11px] text-overlay0 tabular-nums">
              {visibleSets.length} of {sets.length}
            </span>
          )}
        </div>
      )}

      {visibleSets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay0 text-sm">No sets match this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visibleSets.map((set) => (
            <SetCard
              key={set.tcgdex_id}
              set={set}
              seriesSlug={seriesSlug}
              variantCounts={userId ? (variantCountsBySet.get(set.tcgdex_id) ?? new Map()) : undefined}
              ownedUniqueCount={userId ? (uniqueCountsBySet.get(set.tcgdex_id) ?? 0) : undefined}
              rarityTotals={rarityTotalsBySet.get(set.tcgdex_id)}
              rarityOwnedCounts={userId ? rarityOwnedBySet.get(set.tcgdex_id) : undefined}
              collectionValue={userId ? collectionValueBySet.get(set.tcgdex_id) : undefined}
              collectionCost={userId ? collectionCostBySet.get(set.tcgdex_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
