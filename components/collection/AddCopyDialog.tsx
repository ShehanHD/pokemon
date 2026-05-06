'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { addUserCard } from '@/app/(catalog)/cards/[id]/actions'
import type { CardVariant, CardCondition, GradingCompany, PokemonSet } from '@/lib/types'

interface Props {
  cardId: string
  open: boolean
  onClose: () => void
  set: PokemonSet | null
}

const VARIANTS: CardVariant[] = [
  'normal', 'holo', 'reverse-holo', '1st-edition',
  'shadowless', 'promo', 'full-art', 'alt-art',
]
const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']
const COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'SGC', 'TAG', 'Other']

export default function AddCopyDialog({ cardId, open, onClose, set: _set }: Props) {
  const [type, setType] = useState<'raw' | 'graded'>('raw')
  const [variant, setVariant] = useState<CardVariant>('normal')
  const [cost, setCost] = useState('')
  const [acquiredAt, setAcquiredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [condition, setCondition] = useState<CardCondition>('NM')
  const [centering, setCentering] = useState('')
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>('PSA')
  const [grade, setGrade] = useState('9')
  const [gradedValue, setGradedValue] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const base = {
        cardId,
        variant,
        acquiredAt,
        cost: Number(cost),
        notes: notes.trim() ? notes.trim() : undefined,
      }
      const input =
        type === 'raw'
          ? { ...base, type: 'raw' as const, condition, centering: centering.trim() || undefined }
          : {
              ...base,
              type: 'graded' as const,
              gradingCompany,
              grade: Number(grade),
              gradedValue: Number(gradedValue),
            }
      await addUserCard(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add copy')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-base border border-surface0 rounded-2xl p-6 w-[420px] max-w-[92vw] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-russo text-base text-text">Add a copy</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-overlay0 hover:text-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex gap-1 p-1 bg-mantle border border-surface0 rounded-lg">
            {(['raw', 'graded'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  'flex-1 py-1.5 text-xs uppercase tracking-wider rounded',
                  type === t ? 'bg-blue text-white' : 'text-overlay1 hover:text-text',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>

          <Field label="Variant">
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as CardVariant)}
              className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
            >
              {VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>

          <Field label="Cost (€)">
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
            />
          </Field>

          <Field label="Acquired">
            <input
              type="date"
              required
              value={acquiredAt}
              onChange={(e) => setAcquiredAt(e.target.value)}
              className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
            />
          </Field>

          {type === 'raw' ? (
            <>
              <Field label="Condition">
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as CardCondition)}
                  className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
                >
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Centering (optional)">
                <input
                  type="text"
                  placeholder="55/45"
                  value={centering}
                  onChange={(e) => setCentering(e.target.value)}
                  className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Grading company">
                <select
                  value={gradingCompany}
                  onChange={(e) => setGradingCompany(e.target.value as GradingCompany)}
                  className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
                >
                  {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Grade">
                <input
                  type="number"
                  required
                  min={1}
                  max={10}
                  step={0.5}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
                />
              </Field>
              <Field label="Graded value (€)">
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={gradedValue}
                  onChange={(e) => setGradedValue(e.target.value)}
                  className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text"
                />
              </Field>
            </>
          )}

          <Field label={`Notes (${notes.length}/500)`}>
            <textarea
              maxLength={500}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-base border border-surface0 rounded px-2 py-1.5 text-sm text-text resize-none"
            />
          </Field>

          {error && <p className="text-xs text-blue">{error}</p>}

          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-overlay1 hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-sm bg-blue text-white rounded font-russo disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add copy'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
