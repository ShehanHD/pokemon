'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { PokemonCard } from '@/lib/types'
import { normaliseRarity } from '@/lib/taxonomy/rarity'

export default function CardsGrid({ cards, printedTotal }: { cards: PokemonCard[]; printedTotal: number }) {
  if (cards.length === 0) {
    return <p className="text-overlay0 text-sm text-center py-8">No cards match this filter.</p>
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
      {cards.map((card) => {
        const rarity = normaliseRarity(card.rarity)
        return (
          <Link key={card.pokemontcg_id} href={`/cards/${card.pokemontcg_id}`} className="group">
            <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
                className="object-cover"
              />
              <span className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded bg-base/80 text-mauve border border-surface0">
                {rarity}
              </span>
            </div>
            <div className="mt-1 px-0.5">
              <p className="text-[10px] text-overlay2 truncate leading-tight">{card.name}</p>
              <p className="text-[10px] text-overlay0 tabular-nums">
                {card.number}/{printedTotal}
                {card.cardmarketPrice !== null && (
                  <span className="text-mauve"> · €{card.cardmarketPrice.toFixed(2)}</span>
                )}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
