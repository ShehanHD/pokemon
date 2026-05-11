'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { PokemonSet } from '@/lib/types'
import SetInfoDialog from './SetInfoDialog'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface Props {
  set: PokemonSet
  seriesSlug: string
  variantCounts?: Map<string, number>
  ownedUniqueCount?: number
  rarityTotals?: Map<string, number>
  rarityOwnedCounts?: Map<string, number>
  collectionValue?: number
  collectionCost?: number
}

export default function SetCard({ set, seriesSlug, variantCounts, ownedUniqueCount, rarityTotals, rarityOwnedCounts, collectionValue, collectionCost }: Props) {
  const isPromo = set.name.toLowerCase().includes('promo')
  const denom = set.totalCards

  const overallPct = ownedUniqueCount !== undefined
    ? Math.min(100, Math.round((ownedUniqueCount / denom) * 100))
    : 0

  return (
    <Link
      href={`/browse/${seriesSlug}/${set.tcgdex_id}`}
      className="relative bg-base border border-surface0 rounded-xl px-4 py-8 hover:border-blue/50 hover:bg-surface0/30 transition-colors group flex flex-col"
    >
      <div className="absolute top-2 right-2">
        <SetInfoDialog
          set={set}
          variantCounts={variantCounts}
          ownedUniqueCount={ownedUniqueCount}
          rarityTotals={rarityTotals}
          rarityOwnedCounts={rarityOwnedCounts}
          collectionValue={collectionValue}
          collectionCost={collectionCost}
          buttonClassName="text-overlay0 hover:text-blue transition-colors p-0.5"
        />
      </div>
      {set.logoUrl && (
        <div className={`flex items-center justify-center w-full overflow-hidden mb-3 ${isPromo ? 'h-8' : 'h-14'}`}>
          <Image
            src={set.logoUrl}
            alt=""
            width={isPromo ? 72 : 140}
            height={isPromo ? 28 : 52}
            className="object-contain max-w-full max-h-full"
          />
        </div>
      )}
      <p className="text-[10px] text-overlay0 text-center mb-1">{formatDate(set.releaseDate)}</p>
      <div className="flex items-center justify-center gap-2">
        {set.symbolUrl && (
          <Image src={set.symbolUrl} alt="" width={16} height={16} className="object-contain flex-shrink-0 opacity-60" />
        )}
        <span className="text-sm font-russo text-text group-hover:text-blue transition-colors leading-tight text-center">
          {set.name}
        </span>
      </div>
      {set.totalValueEUR != null && (
        <p className="text-[10px] font-semibold text-blue tabular-nums text-center mt-1">€{set.totalValueEUR.toFixed(2)}</p>
      )}

      {ownedUniqueCount !== undefined && (
        <div className="mt-2">
          <div className="h-1 bg-surface0 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue rounded-full transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-[9px] text-overlay0 tabular-nums text-right mt-1">{ownedUniqueCount}/{denom}</p>
        </div>
      )}
    </Link>
  )
}
