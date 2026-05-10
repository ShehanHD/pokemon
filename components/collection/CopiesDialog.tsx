'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil, Trash2, Tag } from 'lucide-react'
import type { CardVariant, CardCondition, GradingCompany, PokemonSet } from '@/lib/types'
import {
  addUserCard,
  removeUserCard,
  updateUserCard,
  fetchUserCardsForVariant,
  markUserCardAsSold,
} from '@/app/(catalog)/cards/[id]/actions'
import { applicableVariantsForSet, variantLabel } from '@/lib/taxonomy/variant'

type SerializedCopy = {
  _id?: string
  cardId: string
  variant: CardVariant
  acquiredAt: string
  cost?: number
  notes?: string
  createdAt: string
  updatedAt: string
} & (
  | { type: 'raw'; condition: CardCondition; centering?: string }
  | { type: 'graded'; gradingCompany: GradingCompany; grade: number; gradedValue: number }
)

interface Props {
  cardId: string
  variant: CardVariant
  open: boolean
  onClose: () => void
  set: PokemonSet | null
  rarity?: string | null
  mode?: 'full' | 'add'
}

const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']
const CONDITION_LABEL: Record<CardCondition, string> = {
  NM: 'Near Mint',
  LP: 'Lightly Played',
  MP: 'Moderately Played',
  HP: 'Heavily Played',
  DMG: 'Damaged',
}
const COMPANIES: GradingCompany[] = ['PSA', 'GRAAD', 'BGS', 'CGC', 'SGC', 'TAG', 'Ace', 'GMA', 'Other']
const CENTERINGS = ['Perfect', 'Good', 'Poor', 'Error Print'] as const

export default function CopiesDialog({ cardId, variant, open, onClose, set, rarity, mode = 'full' }: Props) {
  const router = useRouter()
  const [copies, setCopies] = useState<SerializedCopy[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchUserCardsForVariant(cardId, variant)
      setCopies(data as SerializedCopy[])
    } finally {
      setLoading(false)
    }
  }, [cardId, variant])

  useEffect(() => {
    if (open) reload()
  }, [open, reload])

  if (!open) return null

  async function handleDelete(copyId: string) {
    await removeUserCard(copyId, cardId)
    router.refresh()
    reload()
  }

  async function handleMarkSold(copyId: string, soldPrice: number, soldAt: Date) {
    await markUserCardAsSold(copyId, cardId, { soldPrice, soldAt })
    router.refresh()
    reload()
  }

  async function handleAdded() {
    router.refresh()
    await reload()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-base border border-surface0 rounded-2xl p-6 w-[460px] max-w-[92vw] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-russo text-base text-text">{variantLabel(variant)}</h2>
          <button type="button" onClick={onClose} className="text-overlay0 hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {mode === 'full' && !loading && copies.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-[11px] text-overlay0 uppercase tracking-wider">In your collection</p>
            {copies.map((copy) =>
              editingId === copy._id ? (
                <EditForm
                  key={copy._id}
                  copy={copy}
                  cardId={cardId}
                  set={set}
                  onDone={() => { setEditingId(null); router.refresh(); reload() }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <CopyRow
                  key={copy._id}
                  copy={copy}
                  onEdit={() => setEditingId(copy._id!)}
                  onDelete={() => handleDelete(copy._id!)}
                  onMarkSold={(price, date) => handleMarkSold(copy._id!, price, date)}
                />
              )
            )}
            <div className="border-t border-surface0 my-1" />
          </div>
        )}

        {mode === 'full' && (
          <p className="text-[11px] text-overlay0 uppercase tracking-wider mb-2">Add a copy</p>
        )}
        <AddForm
          cardId={cardId}
          variant={variant}
          set={set}
          rarity={rarity}
          onAdded={handleAdded}
        />
      </div>
    </div>
  )
}

function CopyRow({
  copy,
  onEdit,
  onDelete,
  onMarkSold,
}: {
  copy: SerializedCopy
  onEdit: () => void
  onDelete: () => void
  onMarkSold: (soldPrice: number, soldAt: Date) => Promise<void> | void
}) {
  const [confirming, setConfirming] = useState(false)
  const [selling, setSelling] = useState(false)
  const [soldPrice, setSoldPrice] = useState('')
  const [soldDate, setSoldDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const date = copy.acquiredAt.slice(0, 10)

  const summary =
    copy.type === 'raw'
      ? `Raw · ${CONDITION_LABEL[copy.condition]}${copy.cost != null ? ` · €${copy.cost.toFixed(2)}` : ''} · ${date}`
      : `${copy.gradingCompany} ${copy.grade}${copy.gradedValue != null ? ` · €${copy.gradedValue.toFixed(2)}` : ''} · ${date}`

  function startSelling() {
    setError(null)
    setConfirming(false)
    setSoldPrice('')
    setSoldDate(new Date().toISOString().slice(0, 10))
    setSelling(true)
  }

  async function submitSell() {
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
    setSubmitting(true)
    try {
      await onMarkSold(price, d)
      setSelling(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sold')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5 rounded bg-mantle border border-surface0">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs text-text">{summary}</span>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => { setConfirming(false); onDelete() }}
              className="text-[10px] text-red px-1.5 py-0.5 rounded border border-red/40 hover:bg-red/10"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[10px] text-overlay1 hover:text-text"
            >
              Cancel
            </button>
          </>
        ) : selling ? (
          <button
            type="button"
            onClick={() => setSelling(false)}
            className="text-[10px] text-overlay1 hover:text-text"
          >
            Cancel
          </button>
        ) : (
          <>
            <button type="button" onClick={onEdit} className="text-overlay0 hover:text-blue" aria-label="Edit" title="Edit">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={startSelling} className="text-overlay0 hover:text-green" aria-label="Mark as sold" title="Mark as sold">
              <Tag size={13} />
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="text-overlay0 hover:text-red" aria-label="Delete" title="Delete">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
      {selling && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-overlay0 uppercase tracking-wider">Sold price (€)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              placeholder="0.00"
              className="w-24 bg-base border border-surface0 rounded px-2 py-1 text-xs text-text focus:outline-none"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-overlay0 uppercase tracking-wider">Sold on</span>
            <input
              type="date"
              value={soldDate}
              onChange={(e) => setSoldDate(e.target.value)}
              className="bg-base border border-surface0 rounded px-2 py-1 text-xs text-text focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={submitSell}
            disabled={submitting}
            className="ml-auto text-[11px] bg-green text-white px-3 py-1 rounded font-russo disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Mark sold'}
          </button>
        </div>
      )}
      {error && <p className="text-[10px] text-red">{error}</p>}
    </div>
  )
}

function EditForm({
  copy,
  cardId,
  set,
  onDone,
  onCancel,
}: {
  copy: SerializedCopy
  cardId: string
  set: PokemonSet | null
  onDone: () => void
  onCancel: () => void
}) {
  const variants = set ? applicableVariantsForSet(set) : [copy.variant]
  const [type, setType] = useState<'raw' | 'graded'>(copy.type)
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(copy.variant)
  const [cost, setCost] = useState(copy.cost != null ? String(copy.cost) : '')
  const [acquiredAt, setAcquiredAt] = useState(copy.acquiredAt.slice(0, 10))
  const [notes, setNotes] = useState(copy.notes ?? '')
  const [condition, setCondition] = useState<CardCondition>(copy.type === 'raw' ? copy.condition : 'NM')
  const [centering, setCentering] = useState(copy.type === 'raw' ? (copy.centering ?? '') : '')
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>(copy.type === 'graded' ? copy.gradingCompany : 'PSA')
  const [grade, setGrade] = useState(copy.type === 'graded' ? String(copy.grade) : '9')
  const [gradedValue, setGradedValue] = useState(copy.type === 'graded' ? String(copy.gradedValue) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const base = { cardId, variant: selectedVariant, acquiredAt, cost: cost !== '' ? Number(cost) : undefined, notes: notes.trim() || undefined }
      const input =
        type === 'raw'
          ? { ...base, type: 'raw' as const, condition, centering: centering.trim() || undefined }
          : { ...base, type: 'graded' as const, gradingCompany, grade: Number(grade), gradedValue: Number(gradedValue) }
      await updateUserCard(copy._id!, cardId, input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 p-3 rounded bg-mantle border border-blue/30">
      <div className="flex gap-1 p-0.5 bg-surface0 rounded">
        {(['raw', 'graded'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={['flex-1 py-1 text-[10px] uppercase tracking-wider rounded', type === t ? 'bg-blue text-white' : 'text-overlay1 hover:text-text'].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>
      <SmallField label="Variant">
        <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value as CardVariant)} className={inputCls}>
          {variants.map((v) => <option key={v} value={v}>{variantLabel(v)}</option>)}
        </select>
      </SmallField>
      <div className="grid grid-cols-2 gap-2">
        <SmallField label="Cost (€)">
          <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputCls} />
        </SmallField>
        <SmallField label="Acquired">
          <input type="date" required value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} className={inputCls} />
        </SmallField>
      </div>
      {type === 'raw' ? (
        <div className="grid grid-cols-2 gap-2">
          <SmallField label="Condition">
            <select value={condition} onChange={(e) => setCondition(e.target.value as CardCondition)} className={inputCls}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
            </select>
          </SmallField>
          <SmallField label="Centering">
            <select value={centering} onChange={(e) => setCentering(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {CENTERINGS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </SmallField>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <SmallField label="Company">
            <select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value as GradingCompany)} className={inputCls}>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </SmallField>
          <SmallField label="Grade">
            <input type="number" required min={1} max={10} step={0.5} value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls} />
          </SmallField>
          <SmallField label="Value (€)">
            <input type="number" required min={0} step="0.01" value={gradedValue} onChange={(e) => setGradedValue(e.target.value)} className={inputCls} />
          </SmallField>
        </div>
      )}
      <SmallField label="Notes">
        <input type="text" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
      </SmallField>
      {error && <p className="text-[10px] text-red">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-[11px] text-overlay1 hover:text-text px-2 py-1">Cancel</button>
        <button type="submit" disabled={submitting} className="text-[11px] bg-blue text-white px-3 py-1 rounded font-russo disabled:opacity-50">
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function AddForm({
  cardId,
  variant,
  set,
  rarity,
  onAdded,
}: {
  cardId: string
  variant: CardVariant
  set: PokemonSet | null
  rarity?: string | null
  onAdded: () => void
}) {
  const variants = set ? applicableVariantsForSet(set) : [variant]
  const initialVariant = variants.includes(variant) ? variant : (variants[0] ?? variant)
  const [type, setType] = useState<'raw' | 'graded'>('raw')
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(initialVariant)
  const [cost, setCost] = useState('')
  const [acquiredAt, setAcquiredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [condition, setCondition] = useState<CardCondition>('NM')
  const [centering, setCentering] = useState('')
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>('PSA')
  const [grade, setGrade] = useState('9')
  const [gradedValue, setGradedValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const base = { cardId, variant: selectedVariant, acquiredAt, cost: cost !== '' ? Number(cost) : undefined, notes: notes.trim() || undefined }
      const input =
        type === 'raw'
          ? { ...base, type: 'raw' as const, condition, centering: centering.trim() || undefined }
          : { ...base, type: 'graded' as const, gradingCompany, grade: Number(grade), gradedValue: Number(gradedValue) }
      await addUserCard(input)
      setCost('')
      setNotes('')
      setCentering('')
      setGradedValue('')
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add copy')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex gap-1 p-1 bg-mantle border border-surface0 rounded-lg">
        {(['raw', 'graded'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={['flex-1 py-1.5 text-xs uppercase tracking-wider rounded', type === t ? 'bg-blue text-white' : 'text-overlay1 hover:text-text'].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      <Field label="Variant">
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value as CardVariant)}
          className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
        >
          {variants.map((v) => <option key={v} value={v}>{variantLabel(v)}</option>)}
        </select>
      </Field>

      {rarity && (
        <Field label="Rarity">
          <p className="px-2 py-1.5 text-sm text-text bg-mantle border border-surface0 rounded">{rarity}</p>
        </Field>
      )}

      <Field label="Cost (€)">
        <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text" />
      </Field>
      <Field label="Acquired">
        <input type="date" required value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text" />
      </Field>

      {type === 'raw' ? (
        <>
          <Field label="Condition">
            <select value={condition} onChange={(e) => setCondition(e.target.value as CardCondition)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text">
              {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Centering (optional)">
            <select value={centering} onChange={(e) => setCentering(e.target.value)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text">
              <option value="">—</option>
              {CENTERINGS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </>
      ) : (
        <>
          <Field label="Grading company">
            <select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value as GradingCompany)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text">
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Grade">
            <input type="number" required min={1} max={10} step={0.5} value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text" />
          </Field>
          <Field label="Graded value (€)">
            <input type="number" required min={0} step="0.01" value={gradedValue} onChange={(e) => setGradedValue(e.target.value)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text" />
          </Field>
        </>
      )}

      <Field label={`Notes (${notes.length}/500)`}>
        <textarea maxLength={500} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text resize-none" />
      </Field>

      {error && <p className="text-xs text-red">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={submitting} className="px-4 py-1.5 text-sm bg-blue text-white rounded font-russo disabled:opacity-50">
          {submitting ? 'Adding…' : 'Add copy'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-overlay0 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  )
}

function SmallField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-overlay0 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full bg-base border border-surface0 rounded px-2 py-1 text-xs text-text'
