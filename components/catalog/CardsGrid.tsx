'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CardVariant, PokemonCard, PokemonSet } from '@/lib/types'
import { chipsForCard } from '@/lib/taxonomy/variant'
import CopiesDialog from '@/components/collection/CopiesDialog'

export default function CardsGrid({ cards, set, variantCounts }: { cards: PokemonCard[]; set: PokemonSet; variantCounts?: Map<string, number> }) {
  const [dialog, setDialog] = useState<{ cardId: string; variant: CardVariant; rarity: string | null } | null>(null)

  return (
    <>
      {cards.length === 0 ? (
        <p className="text-overlay0 text-sm text-center py-8">No cards match this filter.</p>
      ) : (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
        {cards.map((card) => {
          const chips = chipsForCard(card, set)
          return (
          <div key={card.pokemontcg_id} className="flex flex-col">
            <Link href={`/cards/${card.pokemontcg_id}`} className="group">
              <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-1 px-0.5">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-[10px] text-overlay2 truncate leading-tight flex-1 min-w-0">{card.name}</p>
                  {card.cardmarketPrice !== null && (
                    <span className="text-[10px] text-mauve tabular-nums shrink-0">€{card.cardmarketPrice.toFixed(2)}</span>
                  )}
                </div>
                <p className="text-[10px] text-overlay0 tabular-nums">{card.number}/{set.printedTotal}</p>
              </div>
            </Link>
            <div className="mt-1 px-0.5 flex flex-wrap gap-1">
              {chips.map((c) => {
                const count = variantCounts?.get(`${card.pokemontcg_id}:${c.variant}`) ?? 0
                return (
                  <button
                    key={c.short}
                    type="button"
                    onClick={() => setDialog({ cardId: card.pokemontcg_id, variant: c.variant, rarity: card.rarity })}
                    title={`Add ${c.label} copy`}
                    aria-label={`Add ${c.label} copy of ${card.name}`}
                    className="text-[9px] font-bold tabular-nums px-1 py-0.5 rounded border border-surface0 bg-base text-overlay1 hover:border-blue/50 hover:text-blue transition-colors"
                  >
                    {c.short}{count > 0 ? ` ×${count}` : ''}
                  </button>
                )
              })}
            </div>
          </div>
          )
        })}
      </div>
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
