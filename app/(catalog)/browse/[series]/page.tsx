import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getSetsBySeries } from '@/lib/sets'
import { getOwnedCountsBySet } from '@/lib/userCards'
import { seriesToEra } from '@/lib/taxonomy/era'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import SetCard from '@/components/catalog/SetCard'

interface Props {
  params: Promise<{ series: string }>
}

export default async function SeriesPage({ params }: Props) {
  const { series: seriesSlug } = await params
  const session = await auth()
  const userId = session?.user?.id

  const [sets, counts] = await Promise.all([
    getSetsBySeries(seriesSlug),
    userId ? getOwnedCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
  ])

  if (sets.length === 0) notFound()

  const seriesName = sets[0].series
  const era = seriesToEra(seriesName)

  return (
    <div>
      <Breadcrumb
        segments={[
          { label: 'Browse', href: '/browse' },
          { label: seriesName },
        ]}
      />

      <header className="mb-4">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-mauve/20 text-mauve mb-2">
          {era} era
        </span>
        <h1 className="text-2xl font-russo text-text">{seriesName}</h1>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {sets.map((set) => (
          <SetCard
            key={set.pokemontcg_id}
            set={set}
            seriesSlug={seriesSlug}
            ownedCount={userId ? (counts.get(set.pokemontcg_id) ?? 0) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
