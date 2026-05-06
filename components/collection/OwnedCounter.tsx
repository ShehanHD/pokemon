'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import AddCopyDialog from './AddCopyDialog'
import RemoveCopyDialog from './RemoveCopyDialog'
import type { UserCard } from '@/lib/types'

interface Props {
  cardId: string
  copies: UserCard[]
}

export default function OwnedCounter({ cardId, copies }: Props) {
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(false)

  const count = copies.length
  const totalCost = copies.reduce((sum, c) => sum + (c.cost ?? 0), 0)
  const rawCount = copies.filter((c) => c.type === 'raw').length
  const gradedCount = count - rawCount

  return (
    <div className="bg-base border border-surface0 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-overlay0 uppercase tracking-wider">Owned</span>
        <button
          type="button"
          onClick={() => setRemoving(true)}
          disabled={count === 0}
          className="w-7 h-7 flex items-center justify-center bg-base border border-surface0 rounded hover:border-blue/50 disabled:opacity-40 disabled:hover:border-surface0"
          aria-label="Remove a copy"
        >
          <Minus size={14} />
        </button>
        <span className="font-russo text-2xl text-text tabular-nums min-w-[2ch] text-center">
          {count}
        </span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-7 h-7 flex items-center justify-center bg-base border border-surface0 rounded hover:border-blue/50"
          aria-label="Add a copy"
        >
          <Plus size={14} />
        </button>
      </div>
      {count > 0 && (
        <p className="text-xs text-overlay0 mt-2">
          €{totalCost.toFixed(2)} cost · {rawCount} raw · {gradedCount} graded
        </p>
      )}

      <AddCopyDialog cardId={cardId} open={adding} onClose={() => setAdding(false)} />
      <RemoveCopyDialog
        cardId={cardId}
        copies={copies}
        open={removing}
        onClose={() => setRemoving(false)}
      />
    </div>
  )
}
