'use client'

import { useState } from 'react'
import CopiesDialog from './CopiesDialog'
import type { CardVariant, UserCard, PokemonCard, PokemonSet } from '@/lib/types'
import { chipsForCard } from '@/lib/taxonomy/variant'

interface Props {
  cardId: string
  card: PokemonCard
  copies: UserCard[]
  set: PokemonSet | null
}

export default function OwnedCounter({ cardId, card, copies, set }: Props) {
  const [activeVariant, setActiveVariant] = useState<CardVariant | null>(null)

  const chips = set ? chipsForCard(card, set) : []

  const countByVariant = new Map<string, number>()
  for (const c of copies) {
    countByVariant.set(c.variant, (countByVariant.get(c.variant) ?? 0) + 1)
  }

  const totalCount = copies.length
  const totalCost = copies.reduce((sum, c) => sum + (c.cost ?? 0), 0)
  const rawCount = copies.filter((c) => c.type === 'raw').length
  const gradedCount = totalCount - rawCount

  return (
    <div className="bg-base border border-surface0 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-overlay0 uppercase tracking-wider mr-1">Owned</span>
        {chips.map((chip) => {
          const count = countByVariant.get(chip.variant) ?? 0
          return (
            <button
              key={chip.variant}
              type="button"
              onClick={() => setActiveVariant(chip.variant)}
              className={[
                'px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
                count > 0
                  ? 'bg-blue/20 text-blue border-blue/30 hover:bg-blue/30'
                  : 'bg-mantle text-overlay1 border-surface0 hover:text-text',
              ].join(' ')}
            >
              {chip.label}{count > 0 ? ` ×${count}` : ''}
            </button>
          )
        })}
      </div>

      {totalCount > 0 && (
        <p className="text-xs text-overlay0 mt-2">
          €{totalCost.toFixed(2)} cost · {rawCount} raw · {gradedCount} graded
        </p>
      )}

      {activeVariant && (
        <CopiesDialog
          cardId={cardId}
          variant={activeVariant}
          open={true}
          onClose={() => setActiveVariant(null)}
          set={set}
          rarity={card.rarity}
        />
      )}
    </div>
  )
}
