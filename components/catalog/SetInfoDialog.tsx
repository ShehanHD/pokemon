'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Info, X } from 'lucide-react'
import type { PokemonSet } from '@/lib/types'
import { applicableVariantsForSet, variantLabel, computeVariantTotalsFromRarities } from '@/lib/taxonomy/variant'
import { normalisedRaritySchema } from '@/lib/taxonomy/rarity'

const RARITY_ORDER = normalisedRaritySchema.options

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface Props {
  set: PokemonSet
  variantCounts?: Map<string, number>
  ownedUniqueCount?: number
  rarityTotals?: Map<string, number>
  rarityOwnedCounts?: Map<string, number>
  collectionValue?: number
  collectionCost?: number
  buttonClassName?: string
}

export default function SetInfoDialog({
  set,
  variantCounts,
  ownedUniqueCount,
  rarityTotals,
  rarityOwnedCounts,
  collectionValue,
  collectionCost,
  buttonClassName = 'text-overlay0 hover:text-blue transition-colors p-0.5',
}: Props) {
  const [showInfo, setShowInfo] = useState(false)

  const denom = set.totalCards
  const applicableVariants = applicableVariantsForSet(set).filter((v) => v !== 'promo')
  const overallPct = ownedUniqueCount !== undefined
    ? Math.min(100, Math.round((ownedUniqueCount / denom) * 100))
    : 0
  const variantTotals = rarityTotals ? computeVariantTotalsFromRarities(rarityTotals, set) : null
  const sortedRarities = rarityTotals
    ? RARITY_ORDER.filter((r) => (rarityTotals.get(r) ?? 0) > 0)
    : []

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(true) }}
        className={buttonClassName}
        aria-label={`Info for ${set.name}`}
      >
        <Info size={14} />
      </button>

      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-crust/70 backdrop-blur-sm p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-base border border-surface0 rounded-2xl shadow-2xl w-[780px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-5 border-b border-surface0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {set.symbolUrl && (
                    <Image src={set.symbolUrl} alt="" width={20} height={20} className="object-contain flex-shrink-0 opacity-70" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-russo text-base text-text leading-snug">{set.name}</h3>
                    <p className="text-[10px] text-overlay0 mt-0.5">{set.series}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="text-overlay0 hover:text-text transition-colors flex-shrink-0 mt-0.5"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              {set.logoUrl && (
                <div className="mt-4 flex justify-center">
                  <Image src={set.logoUrl} alt="" width={220} height={80} className="object-contain max-h-16" />
                </div>
              )}
            </div>

            {/* Card grid body */}
            <div className="p-5 space-y-3">

              {/* Row 1: Set Info + Progress */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface0/40 border border-surface0 rounded-xl p-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-overlay0 mb-3">Set Info</p>
                  <dl className="space-y-2 text-[11px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-overlay0 shrink-0">Released</dt>
                      <dd className="text-text tabular-nums text-right">{formatDate(set.releaseDate)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-overlay0 shrink-0">Total cards</dt>
                      <dd className="text-text tabular-nums text-right">{set.totalCards}</dd>
                    </div>
                    {set.printedTotal !== set.totalCards && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-overlay0 shrink-0">Printed total</dt>
                        <dd className="text-text tabular-nums text-right">{set.printedTotal}</dd>
                      </div>
                    )}
                    {set.printedTotal !== set.totalCards && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-overlay0 shrink-0">Secret rares</dt>
                        <dd className="text-peach tabular-nums text-right">+{set.totalCards - set.printedTotal}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="bg-surface0/40 border border-surface0 rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-overlay0 mb-3">Collection Progress</p>
                  {ownedUniqueCount !== undefined ? (
                    <>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-[11px] text-overlay1">Overall</span>
                        <span className="text-[11px] text-text tabular-nums font-medium">
                          {ownedUniqueCount}/{denom}
                          <span className="text-overlay0 ml-1">({overallPct}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-surface0 rounded-full overflow-hidden">
                        <div className="h-full bg-blue rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-overlay0">Sign in to track progress</p>
                  )}
                </div>
              </div>

              {/* Financials card */}
              {(set.totalValueEUR != null || collectionValue !== undefined || collectionCost !== undefined) && (
                <div className="bg-surface0/40 border border-surface0 rounded-xl p-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-overlay0 mb-3">Financials</p>
                  <div className="grid grid-cols-4 divide-x divide-surface0">
                    {set.totalValueEUR != null && (
                      <div className="px-4 first:pl-0">
                        <p className="text-[9px] text-overlay0 mb-1">Market Price</p>
                        <p className="text-[18px] text-text tabular-nums font-bold">€{set.totalValueEUR.toFixed(2)}</p>
                      </div>
                    )}
                    {collectionValue !== undefined && (
                      <div className="px-4 first:pl-0">
                        <p className="text-[9px] text-overlay0 mb-1">Value Collected</p>
                        <p className="text-[18px] text-mauve tabular-nums font-bold">€{collectionValue.toFixed(2)}</p>
                      </div>
                    )}
                    {collectionCost !== undefined && (
                      <div className="px-4 first:pl-0">
                        <p className="text-[9px] text-overlay0 mb-1">Total Cost</p>
                        <p className="text-[18px] text-peach tabular-nums font-bold">€{collectionCost.toFixed(2)}</p>
                      </div>
                    )}
                    {collectionValue !== undefined && collectionCost !== undefined && (() => {
                      const profit = collectionValue - collectionCost
                      return (
                        <div className="px-4 first:pl-0">
                          <p className="text-[9px] text-overlay0 mb-1">Profit</p>
                          <p className={`text-[18px] tabular-nums font-bold ${profit >= 0 ? 'text-green' : 'text-red'}`}>
                            {profit >= 0 ? '+' : ''}€{profit.toFixed(2)}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Row 3: Variants + Rarities */}
              {(variantCounts && applicableVariants.length > 0 || sortedRarities.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {variantCounts && applicableVariants.length > 0 && (
                    <div className="bg-surface0/40 border border-surface0 rounded-xl p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-overlay0 mb-3">Variants</p>
                      <div className="space-y-2.5">
                        {applicableVariants.map((v) => {
                          const count = variantCounts.get(v) ?? 0
                          const total = variantTotals?.get(v) ?? denom
                          const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0
                          return (
                            <div key={v}>
                              <div className="flex justify-between items-baseline mb-1">
                                <span className="text-[10px] text-overlay1">{variantLabel(v)}</span>
                                <span className="text-[10px] tabular-nums">
                                  <span className={count > 0 ? 'text-text font-medium' : 'text-overlay0'}>{count}</span>
                                  <span className="text-overlay0">/{total}</span>
                                </span>
                              </div>
                              <div className="h-1.5 bg-surface0 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${count > 0 ? 'bg-blue' : ''}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {sortedRarities.length > 0 && rarityTotals && (
                    <div className="bg-surface0/40 border border-surface0 rounded-xl p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-overlay0 mb-3">Rarities</p>
                      <div className="space-y-2.5">
                        {sortedRarities.map((rarity) => {
                          const total = rarityTotals.get(rarity) ?? 0
                          const owned = rarityOwnedCounts?.get(rarity) ?? 0
                          const pct = total > 0 ? Math.min(100, Math.round((owned / total) * 100)) : 0
                          return (
                            <div key={rarity}>
                              <div className="flex justify-between items-baseline mb-1">
                                <span className="text-[10px] text-overlay1">{rarity}</span>
                                <span className="text-[10px] tabular-nums">
                                  <span className={owned > 0 ? 'text-text font-medium' : 'text-overlay0'}>{owned}</span>
                                  <span className="text-overlay0">/{total}</span>
                                </span>
                              </div>
                              <div className="h-1.5 bg-surface0 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${owned > 0 ? 'bg-mauve' : ''}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
