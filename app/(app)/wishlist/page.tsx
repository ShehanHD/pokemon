import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/lib/auth'
import { getWishlistForUser, FREE_TIER_WISHLIST_CAP } from '@/lib/wishlist'
import WishlistStar from '@/components/wishlist/WishlistStar'
import { raritySymbol } from '@/lib/taxonomy/rarity'
import type { Tier } from '@/lib/types'

export default async function WishlistPage() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return (
      <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
        <p className="text-overlay0 text-sm">Sign in to view your wishlist.</p>
      </div>
    )
  }

  const tier: Tier = (session?.user?.tier as Tier | undefined) ?? 'free'
  const items = await getWishlistForUser(userId)
  const isPro = tier === 'pro' || tier === 'adfree'

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-4 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-russo">Wishlist</h1>
        <span className="text-overlay0 text-xs tabular-nums">
          {isPro ? `${items.length} cards` : `${items.length}/${FREE_TIER_WISHLIST_CAP}`}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
          <p className="text-overlay0 text-sm">Your wishlist is empty. Tap the star on any card to add it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {items.map((item) => {
            const card = item.card
            return (
              <div key={item._id} className="flex flex-col">
                <div className="relative">
                  <Link href={`/cards/${card.pokemontcg_id}`} className="group block">
                    <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
                        className="object-cover"
                      />
                      <div
                        title={card.rarity ?? 'Unknown rarity'}
                        className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-base/80 backdrop-blur-sm px-1.5 py-1 text-[11px] font-semibold text-text leading-none"
                      >
                        <span className="tabular-nums">{card.number}</span>
                        <span aria-label={card.rarity ?? 'Unknown rarity'} className="text-overlay2">{raritySymbol(card.rarity)}</span>
                      </div>
                      {card.priceEUR != null && (
                        <div className="absolute bottom-1 right-1 rounded bg-base/80 backdrop-blur-sm px-1.5 py-1 text-[11px] font-semibold text-blue tabular-nums leading-none">
                          €{card.priceEUR.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </Link>
                  <WishlistStar
                    cardId={card.pokemontcg_id}
                    initialState="filled"
                    className="absolute top-1 left-1 z-10"
                  />
                </div>
                <div className="mt-1 px-0.5">
                  <p className="text-[11px] text-text truncate">{card.name}</p>
                  <p className="text-[10px] text-overlay0 truncate">{card.setName}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
