'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CardVariant, PokemonCard, PokemonSet } from '@/lib/types'
import { chipsForCard } from '@/lib/taxonomy/variant'
import { raritySymbol } from '@/lib/taxonomy/rarity'
import CopiesDialog from '@/components/collection/CopiesDialog'
import WishlistStar from '@/components/wishlist/WishlistStar'

export default function CardSearchResult({
  card,
  set,
  variantCounts,
  wishlistedIds,
  userState,
  owned: ownedProp,
  printedTotal,
}: {
  card: PokemonCard
  set?: PokemonSet
  variantCounts?: Map<string, number>
  wishlistedIds?: Set<string>
  userState?: 'logged-out' | 'free-below-cap' | 'free-capped' | 'pro'
  owned?: boolean
  printedTotal?: number
}) {
  const [dialog, setDialog] = useState<{ variant: CardVariant; rarity: string | null } | null>(null)

  const chips = set ? chipsForCard(card, set) : []
  const owned =
    variantCounts && chips.length > 0
      ? chips.some((c) => (variantCounts.get(`${card.pokemontcg_id}:${c.variant}`) ?? 0) > 0)
      : ownedProp ?? true

  const labelClasses =
    chips.length <= 1
      ? { short: '@[100px]:hidden', long: 'hidden @[100px]:inline' }
      : chips.length === 2
      ? { short: '@[170px]:hidden', long: 'hidden @[170px]:inline' }
      : chips.length === 3
      ? { short: '@[260px]:hidden', long: 'hidden @[260px]:inline' }
      : { short: '@[360px]:hidden', long: 'hidden @[360px]:inline' }

  const total = set?.printedTotal ?? printedTotal
  const symbol = raritySymbol(card.rarity)

  return (
    <div className="@container flex flex-col">
      <div className="relative">
        <Link href={`/cards/${card.pokemontcg_id}`} className="group block">
          <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
            {card.imageUrl ? (
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                className={`object-cover transition-[filter] ${owned ? '' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-overlay0 text-[10px] text-center px-2">
                No image
              </div>
            )}
            <div
              title={card.rarity ?? 'Unknown rarity'}
              className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-base/80 backdrop-blur-sm px-1.5 py-1 text-[11px] font-semibold text-text leading-none"
            >
              <span className="tabular-nums">
                {card.number}
                {total ? `/${total}` : ''}
              </span>
              {symbol && <span aria-label={card.rarity ?? 'Unknown rarity'} className="text-overlay2">{symbol}</span>}
            </div>
            {card.priceEUR != null && (
              <div className="absolute bottom-1 right-1 rounded bg-base/80 backdrop-blur-sm px-1.5 py-1 text-[11px] font-semibold text-blue tabular-nums leading-none">
                €{card.priceEUR.toFixed(2)}
              </div>
            )}
          </div>
        </Link>
        {userState && (
          <WishlistStar
            cardId={card.pokemontcg_id}
            initialState={
              userState === 'logged-out' ? 'logged-out'
              : wishlistedIds?.has(card.pokemontcg_id) ? 'filled'
              : userState === 'free-capped' ? 'capped'
              : 'unfilled'
            }
            className="absolute top-1 left-1 z-10"
          />
        )}
      </div>
      {chips.length > 0 && (
        <div className="mt-1 px-0.5 flex flex-nowrap gap-1">
          {chips.map((c) => {
            const count = variantCounts?.get(`${card.pokemontcg_id}:${c.variant}`) ?? 0
            return (
              <button
                key={c.short}
                type="button"
                onClick={() => setDialog({ variant: c.variant, rarity: card.rarity })}
                title={count > 0 ? `Manage ${c.label} copies (${count})` : `Click to add ${c.label} copy to your collection`}
                aria-label={count > 0 ? `Manage ${c.label} copies of ${card.name}` : `Add ${c.label} copy of ${card.name} to collection`}
                className={`text-[11px] font-bold tabular-nums whitespace-nowrap px-2 py-1 rounded border cursor-pointer transition-colors ${
                  count > 0
                    ? 'border-blue/50 bg-blue/10 text-blue hover:bg-blue/20'
                    : 'border-surface0 bg-base text-overlay1 hover:border-blue/60 hover:bg-blue/10 hover:text-blue'
                }`}
              >
                {count === 0 && <span>+ </span>}
                <span className={labelClasses.short}>{c.short}</span>
                <span className={labelClasses.long}>{c.label}</span>
                {count > 0 && <span> ×{count}</span>}
              </button>
            )
          })}
        </div>
      )}
      {dialog && set && (
        <CopiesDialog
          cardId={card.pokemontcg_id}
          variant={dialog.variant}
          open
          onClose={() => setDialog(null)}
          set={set}
          rarity={dialog.rarity}
        />
      )}
    </div>
  )
}
