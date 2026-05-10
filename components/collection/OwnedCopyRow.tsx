'use client'

import { useState } from 'react'
import { Pencil, Tag, Trash2 } from 'lucide-react'
import { updateUserCard, markUserCardAsSold, removeUserCard } from '@/app/(catalog)/cards/[id]/actions'
import { userCardInputSchema, markAsSoldInputSchema } from '@/lib/schemas/userCard'
import type { CardCondition, GradingCompany, UserCard } from '@/lib/types'

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
const inputCls = 'w-full bg-base border border-surface0 rounded px-2 py-1 text-xs text-text'

export type RowMode = 'read' | 'edit' | 'sell' | 'delete'

interface Props {
  copy: UserCard
  cardId: string
  mode: RowMode
  onEnterMode: (mode: 'edit' | 'sell' | 'delete') => void
  onLeaveMode: () => void
}

function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d)
  return date.toISOString().slice(0, 10)
}

export default function OwnedCopyRow({ copy, cardId, mode, onEnterMode, onLeaveMode }: Props) {
  if (!copy._id) return null
  const userCardId = copy._id
  const acquired = formatDate(copy.acquiredAt)

  const summary =
    copy.type === 'raw'
      ? `Raw · ${CONDITION_LABEL[copy.condition]}${copy.cost != null ? ` · €${copy.cost.toFixed(2)}` : ''} · ${acquired}`
      : `${copy.gradingCompany} ${copy.grade}${copy.gradedValue != null ? ` · €${copy.gradedValue.toFixed(2)}` : ''} · ${acquired}`

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5 rounded bg-mantle border border-surface0">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs text-text">{summary}</span>
        {mode === 'delete' ? (
          <DeleteStrip userCardId={userCardId} cardId={cardId} onLeave={onLeaveMode} />
        ) : mode === 'read' ? (
          <>
            <button
              type="button"
              onClick={() => onEnterMode('edit')}
              className="text-overlay0 hover:text-blue"
              aria-label="Edit"
              title="Edit"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onEnterMode('sell')}
              className="text-overlay0 hover:text-green"
              aria-label="Mark as sold"
              title="Mark as sold"
            >
              <Tag size={13} />
            </button>
            <button
              type="button"
              onClick={() => onEnterMode('delete')}
              className="text-overlay0 hover:text-red"
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onLeaveMode}
            className="text-[10px] text-overlay1 hover:text-text"
          >
            Cancel
          </button>
        )}
      </div>
      {mode === 'edit' && <EditForm copy={copy} userCardId={userCardId} cardId={cardId} onDone={onLeaveMode} />}
      {mode === 'sell' && <SellForm userCardId={userCardId} cardId={cardId} onDone={onLeaveMode} />}
    </div>
  )
}

function DeleteStrip({ userCardId, cardId, onLeave }: { userCardId: string; cardId: string; onLeave: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setError(null)
    setSubmitting(true)
    try {
      await removeUserCard(userCardId, cardId)
      onLeave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-overlay1">Are you sure?</span>
      <button
        type="button"
        onClick={confirm}
        disabled={submitting}
        className="text-[10px] text-red px-1.5 py-0.5 rounded border border-red/40 hover:bg-red/10 disabled:opacity-50"
      >
        {submitting ? 'Deleting…' : 'Delete'}
      </button>
      <button
        type="button"
        onClick={onLeave}
        disabled={submitting}
        className="text-[10px] text-overlay1 hover:text-text"
      >
        Cancel
      </button>
      {error && <span className="text-[10px] text-red">{error}</span>}
    </div>
  )
}

function SellForm({ userCardId, cardId, onDone }: { userCardId: string; cardId: string; onDone: () => void }) {
  const [soldPrice, setSoldPrice] = useState('')
  const [soldDate, setSoldDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const price = Number(soldPrice)
    const d = new Date(soldDate)
    const parsed = markAsSoldInputSchema.safeParse({ soldPrice: price, soldAt: d })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input')
      return
    }
    setSubmitting(true)
    try {
      await markUserCardAsSold(userCardId, cardId, parsed.data)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sold')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
        onClick={submit}
        disabled={submitting}
        className="ml-auto text-[11px] bg-green text-white px-3 py-1 rounded font-russo disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Mark sold'}
      </button>
      {error && <p className="text-[10px] text-red w-full">{error}</p>}
    </div>
  )
}

function EditForm({ copy, userCardId, cardId, onDone }: { copy: UserCard; userCardId: string; cardId: string; onDone: () => void }) {
  const [cost, setCost] = useState(copy.cost != null ? String(copy.cost) : '')
  const [acquiredAt, setAcquiredAt] = useState(formatDate(copy.acquiredAt))
  const [notes, setNotes] = useState(copy.notes ?? '')
  const [condition, setCondition] = useState<CardCondition>(copy.type === 'raw' ? copy.condition : 'NM')
  const [centering, setCentering] = useState(copy.type === 'raw' ? (copy.centering ?? '') : '')
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>(
    copy.type === 'graded' ? copy.gradingCompany : 'PSA',
  )
  const [grade, setGrade] = useState(copy.type === 'graded' ? String(copy.grade) : '9')
  const [gradedValue, setGradedValue] = useState(copy.type === 'graded' ? String(copy.gradedValue) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const base = {
      cardId,
      variant: copy.variant,
      acquiredAt,
      cost: cost !== '' ? Number(cost) : undefined,
      notes: notes.trim() || undefined,
    }
    const candidate =
      copy.type === 'raw'
        ? { ...base, type: 'raw' as const, condition, centering: centering.trim() || undefined }
        : {
            ...base,
            type: 'graded' as const,
            gradingCompany,
            grade: Number(grade),
            gradedValue: Number(gradedValue),
          }
    const parsed = userCardInputSchema.safeParse(candidate)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input')
      return
    }
    setSubmitting(true)
    try {
      await updateUserCard(userCardId, cardId, parsed.data)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 p-3 rounded bg-mantle border border-blue/30">
      <div className="grid grid-cols-2 gap-2">
        <SmallField label="Cost (€)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={inputCls}
          />
        </SmallField>
        <SmallField label="Acquired">
          <input
            type="date"
            required
            value={acquiredAt}
            onChange={(e) => setAcquiredAt(e.target.value)}
            className={inputCls}
          />
        </SmallField>
      </div>
      {copy.type === 'raw' ? (
        <div className="grid grid-cols-2 gap-2">
          <SmallField label="Condition">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as CardCondition)}
              className={inputCls}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABEL[c]}
                </option>
              ))}
            </select>
          </SmallField>
          <SmallField label="Centering">
            <select
              value={centering}
              onChange={(e) => setCentering(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {CENTERINGS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </SmallField>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <SmallField label="Company">
            <select
              value={gradingCompany}
              onChange={(e) => setGradingCompany(e.target.value as GradingCompany)}
              className={inputCls}
            >
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </SmallField>
          <SmallField label="Grade">
            <input
              type="number"
              required
              min={1}
              max={10}
              step={0.5}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={inputCls}
            />
          </SmallField>
          <SmallField label="Value (€)">
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={gradedValue}
              onChange={(e) => setGradedValue(e.target.value)}
              className={inputCls}
            />
          </SmallField>
        </div>
      )}
      <SmallField label="Notes">
        <input
          type="text"
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
        />
      </SmallField>
      {error && <p className="text-[10px] text-red">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onDone}
          className="text-[11px] text-overlay1 hover:text-text px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="text-[11px] bg-blue text-white px-3 py-1 rounded font-russo disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
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
