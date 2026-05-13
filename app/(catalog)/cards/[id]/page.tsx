import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCardById } from '@/lib/cards'
import { getSetById } from '@/lib/sets'
import { getUserCardsForCard } from '@/lib/userCards'
import { getWishlistContext } from '@/lib/wishlist'
import { auth } from '@/lib/auth'
import OwnedCounter from '@/components/collection/OwnedCounter'
import OwnedCopiesList from '@/components/collection/OwnedCopiesList'
import WishlistStar from '@/components/wishlist/WishlistStar'
import { normaliseRarity, rarityShortLabel } from '@/lib/taxonomy/rarity'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params
  const card = await getCardById(id)

  if (!card) notFound()

  const set = await getSetById(card.set_id)

  const session = await auth()
  const userId = session?.user?.id
  const [copies, wishlistCtx] = await Promise.all([
    userId ? getUserCardsForCard(userId, card.pokemontcg_id) : Promise.resolve([]),
    getWishlistContext(userId, session?.user?.tier),
  ])
  const wishlistInitialState =
    wishlistCtx.userState === 'logged-out' ? 'logged-out'
    : wishlistCtx.wishlistedIds.has(card.pokemontcg_id) ? 'filled'
    : wishlistCtx.userState === 'free-capped' ? 'capped'
    : 'unfilled'

  const normalised = normaliseRarity(card.rarity)

  const rows: { label: string; value: string | null }[] = [
    { label: 'Set', value: card.setName },
    { label: 'Series', value: card.series },
    { label: 'Number', value: card.number },
    { label: 'Supertype', value: card.supertype },
    { label: 'Subtypes', value: card.subtypes.length ? card.subtypes.join(', ') : null },
    { label: 'Types', value: card.types.length ? card.types.join(', ') : null },
    { label: 'Rarity', value: normalised },
    {
      label: 'Cardmarket Price',
      value: card.priceEUR != null ? `€${card.priceEUR.toFixed(2)}` : null,
    },
  ]

  return (
    <div>

      <div className="flex gap-6 flex-col sm:flex-row">
        {/* Card image */}
        <div className="flex-shrink-0">
          <div className="relative w-[245px] aspect-[245/342] rounded-xl overflow-hidden border border-surface0">
            <Image
              src={card.imageUrlHiRes}
              alt={card.name}
              fill
              sizes="245px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Card details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h1 className="font-russo text-xl text-text flex-1">{card.name}</h1>
            <WishlistStar cardId={card.pokemontcg_id} initialState={wishlistInitialState} />
          </div>
          {card.priceEUR != null && (
            <p className="text-2xl font-russo text-blue mb-4">€{card.priceEUR.toFixed(2)}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              title={normalised}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue/20 text-blue"
            >
              {rarityShortLabel(normalised)}
            </span>
          </div>

          {userId && <OwnedCounter cardId={card.pokemontcg_id} card={card} copies={copies} set={set} />}

          <div className="bg-base border border-surface0 rounded-xl overflow-hidden">
            {rows
              .filter((r) => r.value !== null)
              .map((row, i) => (
                <div
                  key={row.label}
                  className={[
                    'flex items-center px-4 py-2.5 gap-4',
                    i > 0 ? 'border-t border-surface0' : '',
                  ].join(' ')}
                >
                  <span className="text-[11px] text-overlay0 uppercase tracking-wider w-28 flex-shrink-0">
                    {row.label}
                  </span>
                  <span className="text-sm text-text flex-1 min-w-0 break-words">{row.value}</span>
                </div>
              ))}
          </div>

          {userId && copies.length > 0 && (
            <OwnedCopiesList
              cardId={card.pokemontcg_id}
              card={card}
              set={set}
              copies={copies}
            />
          )}

          {set && (
            <Link
              href={`/browse/${set.seriesSlug}/${set.tcgdex_id}`}
              className="inline-flex items-center gap-2 mt-4 text-[11px] text-blue hover:underline"
            >
              {'\u2190'} Back to {set.name}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
