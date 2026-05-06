'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { removeUserCard } from '@/app/(catalog)/cards/[id]/actions'
import type { UserCard } from '@/lib/types'

interface Props {
  cardId: string
  copies: UserCard[]
  open: boolean
  onClose: () => void
}

function describeCopy(c: UserCard): string {
  const head = c.variant.replace('-', ' ')
  if (c.type === 'graded') return `${c.gradingCompany} ${c.grade} · ${head}`
  return `${head} · ${c.condition}${c.centering ? ` · ${c.centering}` : ''}`
}

export default function RemoveCopyDialog({ cardId, copies, open, onClose }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function onDelete(id: string) {
    setError(null)
    setPendingId(id)
    try {
      await removeUserCard(id, cardId)
      setConfirmingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove copy')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-base border border-surface0 rounded-2xl p-6 w-[480px] max-w-[92vw] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-russo text-base text-text">Remove a copy</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-overlay0 hover:text-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {copies.length === 0 ? (
          <p className="text-sm text-overlay0">No copies to remove.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-surface0 border border-surface0 rounded-xl overflow-hidden">
            {copies.map((c) => {
              const id = String(c._id)
              const isConfirming = confirmingId === id
              return (
                <li key={id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className={[
                      'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                      c.type === 'graded' ? 'bg-mauve/10 text-mauve' : 'bg-mantle text-overlay1',
                    ].join(' ')}
                  >
                    {c.type}
                  </span>
                  <span className="flex-1 text-sm text-text truncate">{describeCopy(c)}</span>
                  <span className="text-xs text-overlay0">€{c.cost.toFixed(2)}</span>
                  {isConfirming ? (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="px-2 py-0.5 text-xs text-overlay1 hover:text-text"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={pendingId === id}
                        onClick={() => onDelete(id)}
                        className="px-2 py-0.5 text-xs bg-blue text-white rounded disabled:opacity-50"
                      >
                        {pendingId === id ? '…' : 'Confirm'}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(id)}
                      className="text-overlay0 hover:text-blue"
                      aria-label="Remove copy"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {error && <p className="text-xs text-blue mt-3">{error}</p>}

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
