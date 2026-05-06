import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getSetById } from '@/lib/sets'
import { getCardsBySet } from '@/lib/cards'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import CardsGrid from '@/components/catalog/CardsGrid'

interface Props {
  params: Promise<{ series: string; set: string }>
}

export default async function SetPage({ params }: Props) {
  const { series: seriesSlug, set: setId } = await params
  const [set, cards] = await Promise.all([getSetById(setId), getCardsBySet(setId)])

  if (!set) notFound()

  return (
    <div>
      <Breadcrumb
        segments={[
          { label: 'Browse', href: '/browse' },
          { label: set.series, href: `/browse/${seriesSlug}` },
          { label: set.name },
        ]}
      />

      {/* Set header */}
      <div className="flex items-center gap-4 mb-6">
        {set.logoUrl && (
          <Image
            src={set.logoUrl}
            alt={set.name}
            width={160}
            height={60}
            className="object-contain"
          />
        )}
        <div>
          <h1 className="font-russo text-lg text-text">{set.name}</h1>
          <p className="text-[11px] text-overlay0 mt-0.5">
            {set.releaseDate.slice(0, 4)} · {set.totalCards} cards
          </p>
        </div>
      </div>

      <CardsGrid cards={cards} />
    </div>
  )
}
