import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getSetsBySeries } from '@/lib/sets'
import { getOwnedVariantCountsBySet, getOwnedUniqueCardCountsBySet, getOwnedRarityCountsBySet, getCollectionValueBySet, getCollectionCostBySet } from '@/lib/userCards'
import { getRarityTotalsBySet } from '@/lib/cards'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import SetCard from '@/components/catalog/SetCard'

interface Props {
  params: Promise<{ series: string }>
}

export default async function SeriesPage({ params }: Props) {
  const { series: seriesSlug } = await params
  const session = await auth()
  const userId = session?.user?.id

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

  return (
    <div>
      <Breadcrumb
        segments={[
          { label: 'Browse', href: '/browse' },
          { label: seriesName },
        ]}
      />

      <header className="mb-4">
        <h1 className="text-2xl font-russo text-text">{seriesName}</h1>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {sets.map((set) => (
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
    </div>
  )
}
