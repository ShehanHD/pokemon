'use client'

import { useState } from 'react'
import { Trash2, X, Tag } from 'lucide-react'
import { removeUserCard, markUserCardAsSold } from '@/app/(catalog)/cards/[id]/actions'
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

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function RemoveCopyDialog({ cardId, copies, open, onClose }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [sellingId, setSellingId] = useState<string | null>(null)
  const [soldPrice, setSoldPrice] = useState<string>('')
  const [soldDate, setSoldDate] = useState<string>(todayISO())
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

  function startSelling(id: string) {
    setError(null)
    setConfirmingId(null)
    setSoldPrice('')
    setSoldDate(todayISO())
    setSellingId(id)
  }

  async function onMarkSold(id: string) {
    setError(null)
    const price = Number(soldPrice)
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid sold price')
      return
    }
    const d = new Date(soldDate)
    if (Number.isNaN(d.getTime())) {
      setError('Enter a valid sold date')
      return
    }
    setPendingId(id)
    try {
      await markUserCardAsSold(id, cardId, { soldPrice: price, soldAt: d })
      setSellingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sold')
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
        className="bg-base border border-surface0 rounded-2xl p-6 w-[520px] max-w-[92vw] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-russo text-base text-text">Remove or sell a copy</h2>
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
              const isSelling = sellingId === id
              return (
                <li key={id} className="flex flex-col gap-2 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                        c.type === 'graded' ? 'bg-mauve/10 text-mauve' : 'bg-mantle text-overlay1',
                      ].join(' ')}
                    >
                      {c.type}
                    </span>
                    <span className="flex-1 text-sm text-text truncate">{describeCopy(c)}</span>
                    {c.cost != null && c.cost > 0 && (
                      <span className="text-xs text-overlay0">€{c.cost.toFixed(2)}</span>
                    )}
                    {!isConfirming && !isSelling && (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startSelling(id)}
                          className="text-overlay0 hover:text-green focus:outline-none"
                          aria-label="Mark as sold"
                          title="Mark as sold"
                        >
                          <Tag size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSellingId(null)
                            setConfirmingId(id)
                          }}
                          className="text-overlay0 hover:text-blue focus:outline-none"
                          aria-label="Remove copy"
                          title="Remove copy"
                        >
                          <Trash2 size={16} />
                        </button>
                      </span>
                    )}
                    {isConfirming && (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="px-2 py-0.5 text-xs text-overlay1 hover:text-text focus:outline-none"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === id}
                          onClick={() => onDelete(id)}
                          className="px-2 py-0.5 text-xs bg-blue text-white rounded disabled:opacity-50 focus:outline-none"
                        >
                          {pendingId === id ? '…' : 'Confirm'}
                        </button>
                      </span>
                    )}
                  </div>
                  {isSelling && (
                    <div className="flex flex-wrap items-center gap-2 pl-1">
                      <label className="flex items-center gap-1 text-xs text-overlay1">
                        <span>Sold price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={soldPrice}
                          onChange={(e) => setSoldPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-24 px-2 py-1 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
                          autoFocus
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-overlay1">
                        <span>Date</span>
                        <input
                          type="date"
                          value={soldDate}
                          onChange={(e) => setSoldDate(e.target.value)}
                          className="px-2 py-1 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
                        />
                      </label>
                      <span className="ml-auto flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSellingId(null)}
                          className="px-2 py-0.5 text-xs text-overlay1 hover:text-text focus:outline-none"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === id}
                          onClick={() => onMarkSold(id)}
                          className="px-2 py-0.5 text-xs bg-green text-white rounded disabled:opacity-50 focus:outline-none"
                        >
                          {pendingId === id ? '…' : 'Mark sold'}
                        </button>
                      </span>
                    </div>
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
            className="px-4 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
