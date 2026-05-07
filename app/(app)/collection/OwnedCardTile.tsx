import Image from 'next/image'
import Link from 'next/link'
import type { OwnedCardGroup } from '@/lib/types'

export default function OwnedCardTile({ group }: { group: OwnedCardGroup }) {
  const { card, copyCount, rawCount, gradedCount, totalCost } = group
  const homogeneous =
    (rawCount === 0 && gradedCount > 0) ? 'G' :
    (gradedCount === 0 && rawCount > 0) ? 'R' : null

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
      </div>
      <div className="mt-1 px-0.5">
        <p className="text-[10px] text-overlay2 truncate leading-tight">{card.name}</p>
        <p className="text-[9px] text-overlay0 tabular-nums">
          {card.setName} · {card.number}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px] font-bold text-overlay1">
            {homogeneous ?? `R ${rawCount} · G ${gradedCount}`}
          </span>
          {totalCost > 0 && (
            <span className="text-[9px] text-mauve tabular-nums">€{totalCost.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
