import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOwnedCardsGrouped, getCollectionStats } from '@/lib/userCards'
import { getSeries } from '@/lib/sets'
import { parseOwnedCardsQuery } from '@/lib/schemas/ownedCardsQuery'
import CollectionFilters from './CollectionFilters'
import OwnedCardTile from './OwnedCardTile'
import Link from 'next/link'

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/collection')

  const params = await searchParams
  const query = parseOwnedCardsQuery(params)

  const [groups, stats, allSeries] = await Promise.all([
    getOwnedCardsGrouped(session.user.id, query),
    getCollectionStats(session.user.id),
    getSeries(),
  ])

  const allRarities = Array.from(new Set(groups.map((g) => g.card.rarity).filter((r): r is string => !!r))).sort()

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-2xl text-text">My Cards</h1>
        <p className="text-sm text-overlay1 tabular-nums">
          {stats.uniqueCards} unique · {stats.totalCopies} copies
        </p>
      </div>

      <CollectionFilters
        allSeries={allSeries.map((s) => ({ slug: s.slug, name: s.name }))}
        allRarities={allRarities}
      />

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay1 mb-3">You don&apos;t own any cards yet.</p>
          <Link href="/browse" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold hover:bg-blue/90 transition-colors">
            Browse cards →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {groups.map((g) => <OwnedCardTile key={g.cardId} group={g} />)}
        </div>
      )}
    </div>
  )
}
