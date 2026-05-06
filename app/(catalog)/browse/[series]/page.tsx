import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSetsBySeries } from '@/lib/sets'
import Breadcrumb from '@/components/catalog/Breadcrumb'

interface Props {
  params: Promise<{ series: string }>
}

export default async function SeriesPage({ params }: Props) {
  const { series: seriesSlug } = await params
  const sets = await getSetsBySeries(seriesSlug)

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

      <div className="space-y-2">
        {sets.map((set) => (
          <Link
            key={set.pokemontcg_id}
            href={`/browse/${seriesSlug}/${set.pokemontcg_id}`}
            className="flex items-center gap-4 bg-base border border-surface0 rounded-xl px-4 py-3 hover:border-blue/50 hover:bg-surface0/30 transition-colors group"
          >
            {set.symbolUrl && (
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                <Image
                  src={set.symbolUrl}
                  alt={`${set.name} symbol`}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-russo text-text group-hover:text-blue transition-colors truncate">
                {set.name}
              </h2>
              <p className="text-[10px] text-overlay0 mt-0.5">
                {set.releaseDate.slice(0, 4)} · {set.totalCards} cards
              </p>
            </div>
            {set.logoUrl && (
              <div className="hidden sm:flex w-24 h-10 items-center justify-end flex-shrink-0">
                <Image
                  src={set.logoUrl}
                  alt={set.name}
                  width={96}
                  height={40}
                  className="object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
