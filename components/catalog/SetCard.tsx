'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Info, X } from 'lucide-react'
import type { PokemonSet } from '@/lib/types'
import { setCodeFor } from '@/lib/taxonomy/setCode'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface Props {
  set: PokemonSet
  seriesSlug: string
  ownedCount?: number
  totalCards?: number
}

export default function SetCard({ set, seriesSlug, ownedCount, totalCards }: Props) {
  const [showInfo, setShowInfo] = useState(false)
  const isPromo = set.name.toLowerCase().includes('promo')
  const code = setCodeFor(set)
  const denom = totalCards ?? set.totalCards

  return (
    <>
      <Link
        href={`/browse/${seriesSlug}/${set.pokemontcg_id}`}
        className="relative bg-base border border-surface0 rounded-xl px-4 py-8 hover:border-blue/50 hover:bg-surface0/30 transition-colors group flex flex-col"
      >
        <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-base/80 text-mauve border border-surface0">
          {code}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(true) }}
          className="absolute top-2 right-2 text-overlay0 hover:text-blue transition-colors p-0.5"
          aria-label={`Info for ${set.name}`}
        >
          <Info size={14} />
        </button>
        {ownedCount !== undefined && (
          <span className="absolute bottom-1 right-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue/80 text-white">
            {ownedCount} / {denom} owned
          </span>
        )}

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
        {set.totalValue != null && (
          <p className="text-[10px] text-mauve tabular-nums text-center mt-1">€{set.totalValue.toFixed(2)}</p>
        )}
      </Link>

      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-base border border-surface0 rounded-2xl p-6 w-80 max-w-[90vw] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-russo text-sm text-text leading-snug pr-2">{set.name}</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="text-overlay0 hover:text-text transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {set.logoUrl && (
              <div className="flex justify-center mb-4">
                <Image
                  src={set.logoUrl}
                  alt=""
                  width={160}
                  height={60}
                  className="object-contain max-h-14"
                />
              </div>
            )}

            <dl className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-overlay0">Series</dt>
                <dd className="text-text font-medium">{set.series}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-overlay0">Released</dt>
                <dd className="text-text tabular-nums">{set.releaseDate.slice(0, 10)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-overlay0">Cards</dt>
                <dd className="text-text tabular-nums">{set.totalCards}</dd>
              </div>
              {set.totalValue != null && (
                <div className="flex justify-between">
                  <dt className="text-overlay0">Collection value</dt>
                  <dd className="text-mauve tabular-nums font-medium">€{set.totalValue.toFixed(2)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </>
  )
}
