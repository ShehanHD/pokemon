'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CardVariant, PokemonCard, PokemonSet } from '@/lib/types'
import { chipsForCard } from '@/lib/taxonomy/variant'
import { raritySymbol } from '@/lib/taxonomy/rarity'
import CopiesDialog from '@/components/collection/CopiesDialog'
import WishlistStar from '@/components/wishlist/WishlistStar'
import { CardSizeSlider, ResizableCardGrid } from './CardGridSize'

export default function CardsGrid({ cards, set, variantCounts, wishlistedIds, userState }: {
  cards: PokemonCard[]
  set: PokemonSet
  variantCounts?: Map<string, number>
  wishlistedIds?: Set<string>
  userState?: 'logged-out' | 'free-below-cap' | 'free-capped' | 'pro'
}) {
  const [dialog, setDialog] = useState<{ cardId: string; variant: CardVariant; rarity: string | null } | null>(null)

  return (
    <>
      {cards.length === 0 ? (
        <p className="text-overlay0 text-sm text-center py-8">No cards match this filter.</p>
      ) : (
      <>
      <div className="flex items-center gap-3 mb-2 px-0.5">
        <p className="text-[11px] text-overlay1 flex-1 min-w-0">
          Tip: click a variant tag (e.g. <span className="font-bold text-overlay2">N</span>, <span className="font-bold text-overlay2">H</span>, <span className="font-bold text-overlay2">RH</span>) under a card to add it to your collection.
        </p>
        <CardSizeSlider />
      </div>
      <ResizableCardGrid>
        {cards.map((card, idx) => {
          const chips = chipsForCard(card, set)
          const owned = variantCounts
            ? chips.some((c) => (variantCounts.get(`${card.pokemontcg_id}:${c.variant}`) ?? 0) > 0)
            : true
          const longestLabel = chips.reduce((m, c) => Math.max(m, c.label.length), 0)
          const perChipPx = Math.max(90, longestLabel * 8 + 20)
          const threshold = chips.length * perChipPx + (chips.length - 1) * 4
          const tw =
            threshold <= 100 ? '@[100px]'
            : threshold <= 130 ? '@[130px]'
            : threshold <= 170 ? '@[170px]'
            : threshold <= 200 ? '@[200px]'
            : threshold <= 230 ? '@[230px]'
            : threshold <= 260 ? '@[260px]'
            : threshold <= 300 ? '@[300px]'
            : threshold <= 360 ? '@[360px]'
            : '@[420px]'
          const labelClasses = { short: `${tw}:hidden`, long: `hidden ${tw}:inline` }
          return (
          <div key={card.pokemontcg_id ?? `card-${idx}`} id={card.pokemontcg_id ? `card-${card.pokemontcg_id}` : undefined} className="@container flex flex-col">
            <div className="relative">
              <Link href={`/cards/${card.pokemontcg_id}`} className="group block">
                <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
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
                    <span className="tabular-nums">{card.number}/{set.printedTotal}</span>
                    {(() => {
                      const symbol = raritySymbol(card.rarity)
                      return symbol && <span aria-label={card.rarity ?? 'Unknown rarity'} className="text-overlay2">{symbol}</span>
                    })()}
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
            <div className="mt-1 px-0.5 flex flex-nowrap gap-1">
              {chips.map((c) => {
                const count = variantCounts?.get(`${card.pokemontcg_id}:${c.variant}`) ?? 0
                return (
                  <button
                    key={c.short}
                    type="button"
                    onClick={() => setDialog({ cardId: card.pokemontcg_id, variant: c.variant, rarity: card.rarity })}
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
          </div>
          )
        })}
      </ResizableCardGrid>
      </>
      )}
      {dialog && (
        <CopiesDialog
          cardId={dialog.cardId}
          variant={dialog.variant}
          open
          onClose={() => setDialog(null)}
          set={set}
          rarity={dialog.rarity}
        />
      )}
    </>
  )
}
