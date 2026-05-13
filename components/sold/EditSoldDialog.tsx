'use client'

import { useState } from 'react'
import { Pencil, X, RotateCcw } from 'lucide-react'
import { updateSoldUserCard, unsellUserCard } from '@/app/(app)/sold/actions'

interface Props {
  userCardId: string
  cardName: string
  initialSoldPrice: number
  initialSoldAt: Date
  initialCost: number | null
  initialExtraCost: number | null
}

function toDateInput(d: Date): string {
  const dd = new Date(d)
  const m = String(dd.getMonth() + 1).padStart(2, '0')
  const day = String(dd.getDate()).padStart(2, '0')
  return `${dd.getFullYear()}-${m}-${day}`
}

export default function EditSoldDialog({
  userCardId,
  cardName,
  initialSoldPrice,
  initialSoldAt,
  initialCost,
  initialExtraCost,
}: Props) {
  const [open, setOpen] = useState(false)
  const [soldPrice, setSoldPrice] = useState<string>(String(initialSoldPrice))
  const [soldDate, setSoldDate] = useState<string>(toDateInput(initialSoldAt))
  const [cost, setCost] = useState<string>(initialCost != null ? String(initialCost) : '')
  const [extraCost, setExtraCost] = useState<string>(initialExtraCost != null ? String(initialExtraCost) : '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openDialog() {
    setSoldPrice(String(initialSoldPrice))
    setSoldDate(toDateInput(initialSoldAt))
    setCost(initialCost != null ? String(initialCost) : '')
    setExtraCost(initialExtraCost != null ? String(initialExtraCost) : '')
    setError(null)
    setOpen(true)
  }

  async function onSave() {
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
    let costValue: number | undefined
    if (cost.trim() !== '') {
      const c = Number(cost)
      if (!Number.isFinite(c) || c < 0) {
        setError('Enter a valid card cost')
        return
      }
      costValue = c
    }
    let extraCostValue: number | undefined
    if (extraCost.trim() !== '') {
      const c = Number(extraCost)
      if (!Number.isFinite(c) || c < 0) {
        setError('Enter a valid other-expenses amount')
        return
      }
      extraCostValue = c
    }

    setPending(true)
    try {
      await updateSoldUserCard(userCardId, { soldPrice: price, soldAt: d, cost: costValue, extraCost: extraCostValue })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sold copy')
    } finally {
      setPending(false)
    }
  }

  async function onUnsell() {
    setError(null)
    setPending(true)
    try {
      await unsellUserCard(userCardId)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert sale')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-overlay0 hover:text-blue focus:outline-none"
        aria-label="Edit sold copy"
        title="Edit sold copy"
      >
        <Pencil size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-base border border-surface0 rounded-2xl p-6 w-[460px] max-w-[92vw] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-russo text-base text-text">Edit sold copy</h2>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                className="text-overlay0 hover:text-text"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-overlay0 mb-3 truncate">{cardName}</p>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-overlay1">
                <span>Sold price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  className="px-2 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-overlay1">
                <span>Sold date</span>
                <input
                  type="date"
                  value={soldDate}
                  onChange={(e) => setSoldDate(e.target.value)}
                  className="px-2 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-overlay1">
                <span>Card cost <span className="text-overlay0">(optional)</span></span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="px-2 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-overlay1">
                <span>Other expenses <span className="text-overlay0">(optional)</span></span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraCost}
                  onChange={(e) => setExtraCost(e.target.value)}
                  placeholder="Grading, shipping, supplies…"
                  className="px-2 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
                />
              </label>
            </div>

            {error && <p className="text-xs text-red mt-3">{error}</p>}

            <div className="flex items-center justify-between gap-2 mt-5">
              <button
                type="button"
                onClick={onUnsell}
                disabled={pending}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-overlay1 hover:text-text focus:outline-none disabled:opacity-50"
                title="Revert sale (mark as owned again)"
              >
                <RotateCcw size={14} />
                Revert sale
              </button>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="px-3 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={pending}
                  className="px-3 py-1.5 text-sm bg-blue text-white rounded focus:outline-none disabled:opacity-50"
                >
                  {pending ? '…' : 'Save'}
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
