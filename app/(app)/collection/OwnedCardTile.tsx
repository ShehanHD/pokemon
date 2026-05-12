import Image from 'next/image'
import Link from 'next/link'
import type { OwnedCardGroup } from '@/lib/types'
import { raritySymbol } from '@/lib/taxonomy/rarity'

export default function OwnedCardTile({ group }: { group: OwnedCardGroup }) {
  const { card, printedTotal, copyCount, gradedCount, gradedValue, totalCost } = group

  return (
    <Link href={`/cards/${card.pokemontcg_id}`} className="group flex flex-col">
      <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
        <Image
          src={card.imageUrl}
          alt={card.name}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
          className="object-cover"
        />
        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-blue text-base text-[10px] font-bold tabular-nums">
          ×{copyCount}
        </span>
        <div
          title={card.rarity ?? 'Unknown rarity'}
          className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-base/80 backdrop-blur-sm px-1.5 py-1 text-[11px] font-semibold text-text leading-none"
        >
          <span className="tabular-nums">
            {card.number}{printedTotal ? `/${printedTotal}` : ''}
          </span>
          {(() => {
            const symbol = raritySymbol(card.rarity)
            return symbol && <span aria-label={card.rarity ?? 'Unknown rarity'} className="text-overlay2">{symbol}</span>
          })()}
        </div>
        <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5 rounded bg-base/80 backdrop-blur-sm px-1.5 py-1 text-[11px] font-semibold tabular-nums leading-none">
          {card.priceEUR != null && <span className="text-blue">R: €{card.priceEUR.toFixed(2)}</span>}
          {gradedCount > 0 && <span className="text-blue">G: €{gradedValue.toFixed(2)}</span>}
          {totalCost > 0 && <span className="text-text">C: €{totalCost.toFixed(2)}</span>}
        </div>
      </div>
    </Link>
  )
}
