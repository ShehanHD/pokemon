'use client'

import { useState, useMemo } from 'react'
import type { PokemonCard, PokemonSet, UserCard } from '@/lib/types'
import { chipsForCard, variantLabel, variantShortLabel } from '@/lib/taxonomy/variant'
import OwnedCopyRow, { type RowMode } from './OwnedCopyRow'

interface Props {
  cardId: string
  card: PokemonCard
  set: PokemonSet | null
  copies: UserCard[]
}

type ActiveMode = { type: Exclude<RowMode, 'read'>; userCardId: string } | null

export default function OwnedCopiesList({ cardId, card, set, copies }: Props) {
  const [active, setActive] = useState<ActiveMode>(null)

  const groups = useMemo(() => {
    const baseChips = set ? chipsForCard(card, set) : []
    const baseVariants = new Set(baseChips.map((c) => c.variant))
    const ownedVariants = new Set(copies.map((c) => c.variant))
    const extraChips = [...ownedVariants]
      .filter((v) => !baseVariants.has(v))
      .map((v) => ({ variant: v, short: variantShortLabel(v), label: variantLabel(v) }))
    const orderedVariants = [...baseChips, ...extraChips]
      .map((c) => c.variant)
      .filter((v) => ownedVariants.has(v))
    return orderedVariants.map((variant) => ({
      variant,
      label: variantLabel(variant),
      copies: copies.filter((c) => c.variant === variant),
    }))
  }, [card, set, copies])

  if (copies.length === 0) return null

  return (
    <div className="bg-base border border-surface0 rounded-xl px-4 py-3 mt-4">
      <p className="text-[11px] text-overlay0 uppercase tracking-wider mb-2">Your copies</p>
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.variant} className="flex flex-col gap-1.5">
            <p className="text-[10px] text-overlay0 uppercase tracking-wider">
              {group.label} · ×{group.copies.length}
            </p>
            {group.copies.map((copy) => {
              const id = String(copy._id)
              const mode: RowMode = active && active.userCardId === id ? active.type : 'read'
              return (
                <OwnedCopyRow
                  key={id}
                  copy={copy}
                  cardId={cardId}
                  mode={mode}
                  onEnterMode={(m) => setActive({ type: m, userCardId: id })}
                  onLeaveMode={() => setActive(null)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
