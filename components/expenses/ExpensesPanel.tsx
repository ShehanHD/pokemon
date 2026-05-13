'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type { ExpenseCategory, UnifiedExpenseRow } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import {
  addExpenseAction,
  updateExpenseAction,
  removeExpenseAction,
} from '@/app/(app)/expenses/actions'

interface Props {
  rows: UnifiedExpenseRow[]
}

interface FormState {
  mode: 'add' | 'edit'
  id?: string
  amount: string
  date: string
  category: ExpenseCategory
  note: string
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'grading', label: 'Grading' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  purchase: 'Purchase',
  grading: 'Grading',
  shipping: 'Shipping',
  supplies: 'Supplies',
  other: 'Other',
}

const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  purchase: 'bg-blue/10 text-blue',
  grading: 'bg-mauve/10 text-mauve',
  shipping: 'bg-peach/10 text-peach',
  supplies: 'bg-green/10 text-green',
  other: 'bg-mantle text-overlay1',
}

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const emptyForm = (): FormState => ({
  mode: 'add',
  amount: '',
  date: toDateInput(new Date()),
  category: 'other',
  note: '',
})

export default function ExpensesPanel({ rows }: Props) {
  const [form, setForm] = useState<FormState | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [rows],
  )

  const openAdd = () => {
    setError(null)
    setForm(emptyForm())
  }

  const openEdit = (row: UnifiedExpenseRow) => {
    if (row.source !== 'expense') return
    setError(null)
    setForm({
      mode: 'edit',
      id: row.id,
      amount: row.amount.toString(),
      date: toDateInput(row.date),
      category: row.category,
      note: row.note ?? '',
    })
  }

  const close = () => {
    if (pending) return
    setForm(null)
    setError(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Amount must be a non-negative number')
      return
    }
    if (!form.date) {
      setError('Date is required')
      return
    }
    setError(null)
    startTransition(async () => {
      const payload = {
        amount,
        date: new Date(form.date),
        category: form.category,
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }
      const res =
        form.mode === 'add'
          ? await addExpenseAction(payload)
          : await updateExpenseAction({ id: form.id!, ...payload })
      if (!res.ok) {
        setError(
          res.reason === 'invalid_input'
            ? 'Invalid input — please check the values'
            : res.reason === 'not_found'
              ? 'Expense not found'
              : 'You must be signed in',
        )
        return
      }
      setForm(null)
    })
  }

  const remove = (id: string) => {
    setError(null)
    startTransition(async () => {
      const res = await removeExpenseAction(id)
      if (!res.ok) {
        setError('Could not delete expense')
        return
      }
      setConfirmId(null)
    })
  }

  return (
    <section className="bg-base border border-surface0 rounded-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface0">
        <h2 className="text-xs uppercase tracking-widest text-overlay1 font-bold">
          Ledger
        </h2>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue/15 border border-blue/40 text-blue rounded-lg hover:bg-blue/25 transition-colors"
        >
          <Plus size={14} /> Add expense
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-overlay0 text-sm">
            No expenses yet. Add one or set a cost on cards in your collection.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-surface0">
          {sorted.map((row) => {
            const isCard = row.source === 'card'
            const isConfirming = confirmId === row.id
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="w-20 shrink-0 text-xs text-overlay1 tabular-nums">
                  {formatDate(row.date)}
                </div>

                <span
                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_COLOR[row.category]}`}
                >
                  {CATEGORY_LABEL[row.category]}
                </span>

                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {row.cardId && row.cardImageUrl && (
                    <div className="relative w-7 h-10 rounded overflow-hidden bg-surface0 shrink-0">
                      <Image
                        src={row.cardImageUrl}
                        alt={row.cardName ?? ''}
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    {row.cardId ? (
                      <Link
                        href={`/cards/${row.cardId}`}
                        className="text-sm text-text hover:text-blue truncate block"
                      >
                        {row.cardName ?? row.cardId}
                      </Link>
                    ) : (
                      <span className="text-sm text-text truncate block">
                        {row.note || '—'}
                      </span>
                    )}
                    {row.cardId && row.note && (
                      <span className="text-[10px] text-overlay0 truncate block">
                        {row.note}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-text tabular-nums shrink-0">
                  {formatCurrency(row.amount)}
                </div>

                <span
                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                    isCard
                      ? 'bg-mauve/10 text-mauve'
                      : 'bg-blue/10 text-blue'
                  }`}
                  title={isCard ? 'From an owned card cost' : 'Standalone expense'}
                >
                  {isCard ? 'Card' : 'Expense'}
                </span>

                <div className="w-16 flex justify-end shrink-0">
                  {isCard ? (
                    <span className="text-[10px] text-overlay0">read-only</span>
                  ) : isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={pending}
                        className="px-2 py-0.5 text-[11px] text-overlay1 hover:text-text"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        disabled={pending}
                        className="px-2 py-0.5 text-[11px] bg-red text-base rounded disabled:opacity-50"
                      >
                        {pending ? '…' : 'Delete'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-overlay0 hover:text-blue p-1"
                        aria-label="Edit expense"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(row.id)}
                        className="text-overlay0 hover:text-red p-1"
                        aria-label="Delete expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="bg-base border border-surface0 rounded-2xl p-6 w-[420px] max-w-[92vw] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-russo text-base text-text">
                {form.mode === 'add' ? 'Add expense' : 'Edit expense'}
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-overlay0 hover:text-text"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Field label="Amount">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  className="w-full bg-mantle border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue/60"
                />
              </Field>

              <Field label="Date">
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-mantle border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue/60"
                />
              </Field>

              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="w-full bg-mantle border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue/60"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Note (optional)">
                <input
                  type="text"
                  maxLength={500}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full bg-mantle border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue/60"
                />
              </Field>

              {error && <p className="text-xs text-red">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="px-4 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-1.5 text-sm bg-blue text-base rounded disabled:opacity-50"
                >
                  {pending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-overlay0 mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}
