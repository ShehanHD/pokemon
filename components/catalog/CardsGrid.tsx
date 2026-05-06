'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { PokemonCard } from '@/lib/types'

type Filter = 'all' | 'holo' | 'ex' | 'secret'

const RARITY_ABBR: Record<string, string> = {
  'Common':                    'Common',
  'Uncommon':                  'Uncommon',
  'Rare':                      'Rare',
  'Rare Holo':                 'Holo',
  'Rare Holo EX':              'Holo EX',
  'Rare Holo GX':              'Holo GX',
  'Rare Holo V':               'Holo V',
  'Rare Holo VMAX':            'Holo VMAX',
  'Rare Holo VSTAR':           'Holo VSTAR',
  'Double Rare':               'Double',
  'Ultra Rare':                'Ultra',
  'Illustration Rare':         'IR',
  'Special Illustration Rare': 'SIR',
  'Hyper Rare':                'Hyper',
  'Secret Rare':               'Secret',
  'Rare Secret':               'Secret',
  'Gold Rare':                 'Gold',
  'ACE SPEC Rare':             'ACE SPEC',
  'Shiny Rare':                'Shiny',
  'Promo':                     'Promo',
}

type VariantLabel = { text: string; className: string }

const LBL_RH: VariantLabel = { text: 'RH',   className: 'bg-surface2 text-subtext0' }
const LBL_H:  VariantLabel = { text: 'H',    className: 'bg-yellow/80 text-subtext1' }
const LBL_G:  VariantLabel = { text: 'G',    className: 'bg-mauve text-base' }

const SPECIAL_KEYWORDS = ['secret', 'hyper', 'ultra', 'illustration', 'gold', 'shiny', 'radiant', 'double']

function getVariantLabels(rarity: string | null): VariantLabel[] {
  const r = (rarity ?? '').toLowerCase()
  const text = rarity ? (RARITY_ABBR[rarity] ?? rarity) : '?'
  const rLabel: VariantLabel = { text, className: 'border border-surface2 text-overlay1 bg-transparent' }

  if (SPECIAL_KEYWORDS.some((k) => r.includes(k))) return [rLabel, LBL_G]
  if (r.includes('rare')) return [rLabel, LBL_RH, LBL_H, LBL_G]
  if (r === 'common' || r === 'uncommon') return [rLabel, LBL_RH, LBL_G]
  return [rLabel, LBL_G]
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'holo',   label: 'Holo' },
  { key: 'ex',     label: 'EX / GX / V' },
  { key: 'secret', label: 'Secret Rare' },
]

function matchFilter(card: PokemonCard, filter: Filter): boolean {
  if (filter === 'all') return true
  const rarity = (card.rarity ?? '').toLowerCase()
  const subtypes = card.subtypes.map((s) => s.toLowerCase())
  if (filter === 'holo') {
    return rarity.includes('holo') || subtypes.some((s) => ['v', 'vmax', 'vstar'].includes(s))
  }
  if (filter === 'ex') {
    return subtypes.some((s) => ['ex', 'gx', 'v', 'vmax', 'vstar'].includes(s))
  }
  if (filter === 'secret') {
    return rarity.includes('secret') || rarity.includes('special illustration')
  }
  return true
}

export default function CardsGrid({ cards, totalCards, printedTotal }: { cards: PokemonCard[]; totalCards: number; printedTotal: number }) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = cards.filter((c) => matchFilter(c, filter))

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={[
              'px-3 py-1 rounded-full text-[11px] font-medium transition-colors',
              filter === f.key
                ? 'bg-blue text-white'
                : 'bg-base border border-surface0 text-overlay1 hover:border-blue/50 hover:text-text',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-overlay0 self-center">
          {visible.length} {visible.length === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {/* Card grid */}
      {visible.length === 0 ? (
        <p className="text-overlay0 text-sm text-center py-8">No cards match this filter.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {visible.map((card) => (
            <Link
              key={card.pokemontcg_id}
              href={`/cards/${card.pokemontcg_id}`}
              className="group"
            >
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
                <p className="text-[10px] text-overlay2 truncate leading-tight">{card.name}</p>
                <p className="text-[10px] text-overlay0 tabular-nums">
                  {card.number}/{printedTotal}
                  {card.cardmarketPrice !== null && (
                    <span className="text-mauve"> · €{card.cardmarketPrice.toFixed(2)}</span>
                  )}
                </p>
                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                  {getVariantLabels(card.rarity).map((label) => (
                    <span key={label.text} className={`text-[8px] font-bold px-1 py-0.5 rounded ${label.className}`}>
                      {label.text}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
