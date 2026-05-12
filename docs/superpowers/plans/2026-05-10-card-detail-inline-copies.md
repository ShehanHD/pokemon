# Card Detail Inline Owned Copies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the user's owned copies directly on the card detail page, grouped by variant, with inline edit / sell / delete — so users no longer need to open `CopiesDialog` to modify existing copies.

**Architecture:** A new `<OwnedCopiesList>` client component is rendered server-side beneath the details panel on `app/(catalog)/cards/[id]/page.tsx`, fed the `copies` array already fetched by the page (no extra DB calls). It groups copies by variant in the same order produced by `chipsForCard` and renders one `<OwnedCopyRow>` per copy. Each row is a single-line summary that expands inline into edit / sell / delete modes; `<OwnedCopiesList>` owns a `mode` state so opening one row collapses any other open row. `CopiesDialog` gains an opt-in `mode?: 'full' | 'add'` prop and `OwnedCounter` passes `'add'` to slim the dialog down to the add-form only. All three server actions (`updateUserCard`, `markUserCardAsSold`, `removeUserCard`) already exist with proper `revalidatePath` calls — no schema or action changes.

**Tech Stack:** Next.js (App Router), React (client components), TypeScript (strict), Zod (validation), Tailwind (catppuccin theme), lucide-react (icons).

---

## File Structure

**Create:**
- `components/collection/OwnedCopiesList.tsx` — client component, groups copies by variant in chip order, owns single-row mode state.
- `components/collection/OwnedCopyRow.tsx` — client component, renders read view + edit form + inline-sell strip + delete confirm strip for one copy.

**Modify:**
- `components/collection/CopiesDialog.tsx` — add optional `mode?: 'full' | 'add'` prop (default `'full'`); when `'add'`, hide the existing-copies block and the "Add a copy" sub-header (just show the add form).
- `components/collection/OwnedCounter.tsx` — pass `mode='add'` when opening `<CopiesDialog>`.
- `app/(catalog)/cards/[id]/page.tsx` — render `<OwnedCopiesList>` between the details panel and the back-to-set link, gated by `userId && copies.length > 0`.

**Reuse unchanged:**
- `app/(catalog)/cards/[id]/actions.ts` — `updateUserCard`, `markUserCardAsSold`, `removeUserCard` (all revalidate `/cards/[id]` + layout; sold also revalidates `/sold`).
- `lib/schemas/userCard.ts` — `userCardInputSchema` (discriminated union), `markAsSoldInputSchema`.
- `lib/taxonomy/variant.ts` — `chipsForCard(card, set)`, `variantLabel(variant)`.

---

## Task 1: Add `mode` prop to `CopiesDialog`

Add an opt-in prop that lets callers slim the dialog to the add-form only. Default behavior is unchanged (`'full'`).

**Files:**
- Modify: `components/collection/CopiesDialog.tsx`

- [ ] **Step 1: Extend the `Props` interface**

In `components/collection/CopiesDialog.tsx`, change:

```typescript
interface Props {
  cardId: string
  variant: CardVariant
  open: boolean
  onClose: () => void
  set: PokemonSet | null
  rarity?: string | null
}
```

to:

```typescript
interface Props {
  cardId: string
  variant: CardVariant
  open: boolean
  onClose: () => void
  set: PokemonSet | null
  rarity?: string | null
  mode?: 'full' | 'add'
}
```

- [ ] **Step 2: Destructure `mode` with default `'full'`**

Change the component signature:

```typescript
export default function CopiesDialog({ cardId, variant, open, onClose, set, rarity }: Props) {
```

to:

```typescript
export default function CopiesDialog({ cardId, variant, open, onClose, set, rarity, mode = 'full' }: Props) {
```

- [ ] **Step 3: Gate the existing-copies block on `mode === 'full'`**

Find this block:

```tsx
{!loading && copies.length > 0 && (
  <div className="mb-4 flex flex-col gap-2">
    <p className="text-[11px] text-overlay0 uppercase tracking-wider">In your collection</p>
    {copies.map((copy) =>
      editingId === copy._id ? (
        <EditForm ... />
      ) : (
        <CopyRow ... />
      )
    )}
    <div className="border-t border-surface0 my-1" />
  </div>
)}
```

Wrap the condition:

```tsx
{mode === 'full' && !loading && copies.length > 0 && (
  <div className="mb-4 flex flex-col gap-2">
    {/* unchanged children */}
  </div>
)}
```

- [ ] **Step 4: Hide the "Add a copy" label when `mode === 'add'`**

The dialog title (`variantLabel(variant)`) already names the variant; in `'add'` mode the section label is redundant. Find:

```tsx
<p className="text-[11px] text-overlay0 uppercase tracking-wider mb-2">Add a copy</p>
<AddForm ... />
```

Change to:

```tsx
{mode === 'full' && (
  <p className="text-[11px] text-overlay0 uppercase tracking-wider mb-2">Add a copy</p>
)}
<AddForm ... />
```

- [ ] **Step 5: Manual smoke test**

Run `npm run dev` and verify:
- Open browse grid, click an "owned" badge → dialog opens with full layout (existing copies list + add form). No regression.
- Open card search results, click a result → same full layout. No regression.

Expected: All existing call sites still see the full dialog because `mode` defaults to `'full'`.

- [ ] **Step 6: Commit**

```bash
git add components/collection/CopiesDialog.tsx
git commit -m "feat(copies-dialog): add 'add' mode to slim dialog to add-form only"
```

---

## Task 2: Update `OwnedCounter` to open dialog in `'add'` mode

The detail page's variant chips should now open the slim add-only dialog, since edit / sell / delete moves to the inline list below.

**Files:**
- Modify: `components/collection/OwnedCounter.tsx`

- [ ] **Step 1: Pass `mode='add'` to `CopiesDialog`**

In `components/collection/OwnedCounter.tsx`, change:

```tsx
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
```

to:

```tsx
{activeVariant && (
  <CopiesDialog
    cardId={cardId}
    variant={activeVariant}
    open={true}
    onClose={() => setActiveVariant(null)}
    set={set}
    rarity={card.rarity}
    mode="add"
  />
)}
```

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`. Open a card detail page. Click any variant chip. Expected: dialog opens with **only** the add form (no "In your collection" list, no "Add a copy" sub-header). Title still shows the variant name.

- [ ] **Step 3: Commit**

```bash
git add components/collection/OwnedCounter.tsx
git commit -m "feat(owned-counter): open variant dialog in 'add' mode"
```

---

## Task 3: Create `OwnedCopyRow` component

Single client component that renders a copy summary row with edit / sell / delete affordances. Mode is controlled by the parent via props (mirrors how `CopiesDialog` controls `editingId`). Edit form structure mirrors `EditForm` from `CopiesDialog.tsx` exactly so the user's mental model carries over.

**Files:**
- Create: `components/collection/OwnedCopyRow.tsx`

- [ ] **Step 1: Write the file**

Create `components/collection/OwnedCopyRow.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Tag, Trash2 } from 'lucide-react'
import type { CardVariant, CardCondition, GradingCompany, PokemonSet, UserCard } from '@/lib/types'
import {
  removeUserCard,
  updateUserCard,
  markUserCardAsSold,
} from '@/app/(catalog)/cards/[id]/actions'
import { applicableVariantsForSet, variantLabel } from '@/lib/taxonomy/variant'

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
  set: PokemonSet | null
  mode: RowMode
  onEnterMode: (mode: Exclude<RowMode, 'read'>) => void
  onLeaveMode: () => void
}

export default function OwnedCopyRow({ copy, cardId, set, mode, onEnterMode, onLeaveMode }: Props) {
  const router = useRouter()
  const acquired = formatDate(copy.acquiredAt)
  const summary =
    copy.type === 'raw'
      ? `Raw · ${CONDITION_LABEL[copy.condition]}${copy.cost != null ? ` · €${copy.cost.toFixed(2)}` : ''} · ${acquired}`
      : `${copy.gradingCompany} ${copy.grade}${copy.gradedValue != null ? ` · €${copy.gradedValue.toFixed(2)}` : ''} · ${acquired}`

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5 rounded bg-mantle border border-surface0">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs text-text">{summary}</span>
        {mode === 'read' && (
          <>
            <button type="button" onClick={() => onEnterMode('edit')} className="text-overlay0 hover:text-blue" aria-label="Edit" title="Edit">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={() => onEnterMode('sell')} className="text-overlay0 hover:text-green" aria-label="Mark as sold" title="Mark as sold">
              <Tag size={13} />
            </button>
            <button type="button" onClick={() => onEnterMode('delete')} className="text-overlay0 hover:text-red" aria-label="Delete" title="Delete">
              <Trash2 size={13} />
            </button>
          </>
        )}
        {mode === 'delete' && (
          <DeleteStrip
            onConfirm={async () => {
              await removeUserCard(String(copy._id), cardId)
              router.refresh()
              onLeaveMode()
            }}
            onCancel={onLeaveMode}
          />
        )}
        {(mode === 'edit' || mode === 'sell') && (
          <button type="button" onClick={onLeaveMode} className="text-[10px] text-overlay1 hover:text-text">
            Cancel
          </button>
        )}
      </div>
      {mode === 'edit' && (
        <EditForm
          copy={copy}
          cardId={cardId}
          set={set}
          onDone={() => { router.refresh(); onLeaveMode() }}
        />
      )}
      {mode === 'sell' && (
        <SellStrip
          onSubmit={async (price, date) => {
            await markUserCardAsSold(String(copy._id), cardId, { soldPrice: price, soldAt: date })
            router.refresh()
            onLeaveMode()
          }}
        />
      )}
    </div>
  )
}

function formatDate(value: UserCard['acquiredAt']): string {
  const iso = value instanceof Date ? value.toISOString() : String(value)
  return iso.slice(0, 10)
}

function DeleteStrip({ onConfirm, onCancel }: { onConfirm: () => Promise<void>; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  return (
    <>
      <button
        type="button"
        disabled={submitting}
        onClick={async () => { setSubmitting(true); try { await onConfirm() } finally { setSubmitting(false) } }}
        className="text-[10px] text-red px-1.5 py-0.5 rounded border border-red/40 hover:bg-red/10 disabled:opacity-50"
      >
        {submitting ? 'Deleting…' : 'Confirm'}
      </button>
      <button type="button" onClick={onCancel} className="text-[10px] text-overlay1 hover:text-text">
        Cancel
      </button>
    </>
  )
}

function SellStrip({ onSubmit }: { onSubmit: (price: number, date: Date) => Promise<void> }) {
  const [soldPrice, setSoldPrice] = useState('')
  const [soldDate, setSoldDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    const price = Number(soldPrice)
    if (!Number.isFinite(price) || price < 0) { setError('Enter a valid sold price'); return }
    const d = new Date(soldDate)
    if (Number.isNaN(d.getTime())) { setError('Enter a valid sold date'); return }
    setSubmitting(true)
    try {
      await onSubmit(price, d)
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
          type="number" min={0} step="0.01" value={soldPrice}
          onChange={(e) => setSoldPrice(e.target.value)} placeholder="0.00"
          className="w-24 bg-base border border-surface0 rounded px-2 py-1 text-xs text-text focus:outline-none"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] text-overlay0 uppercase tracking-wider">Sold on</span>
        <input
          type="date" value={soldDate}
          onChange={(e) => setSoldDate(e.target.value)}
          className="bg-base border border-surface0 rounded px-2 py-1 text-xs text-text focus:outline-none"
        />
      </label>
      <button
        type="button" onClick={handleSubmit} disabled={submitting}
        className="ml-auto text-[11px] bg-green text-white px-3 py-1 rounded font-russo disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Mark sold'}
      </button>
      {error && <p className="w-full text-[10px] text-red">{error}</p>}
    </div>
  )
}

function EditForm({
  copy, cardId, set, onDone,
}: {
  copy: UserCard
  cardId: string
  set: PokemonSet | null
  onDone: () => void
}) {
  const variants = set ? applicableVariantsForSet(set) : [copy.variant]
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(copy.variant)
  const [cost, setCost] = useState(copy.cost != null ? String(copy.cost) : '')
  const [acquiredAt, setAcquiredAt] = useState(formatDate(copy.acquiredAt))
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
        copy.type === 'raw'
          ? { ...base, type: 'raw' as const, condition, centering: centering.trim() || undefined }
          : { ...base, type: 'graded' as const, gradingCompany, grade: Number(grade), gradedValue: Number(gradedValue) }
      await updateUserCard(String(copy._id), cardId, input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 p-3 rounded bg-mantle border border-blue/30">
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
      {copy.type === 'raw' ? (
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
        <button type="submit" disabled={submitting} className="text-[11px] bg-blue text-white px-3 py-1 rounded font-russo disabled:opacity-50">
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
```

Notes:
- **No raw↔graded type tab.** Spec Section 4: "Type switching (raw↔graded) is not allowed". Edit form locks `type` to `copy.type`.
- **Cancel for edit/sell** lives in the row header (single Cancel button), removed from the form footer to avoid duplication.
- **Error rendering for sell** is full-width inside `SellStrip` so it doesn't compete with the input row.
- **`String(copy._id)`**: `UserCard._id` is `ObjectId | undefined` server-side. By the time we render here, `_id` exists; cast via `String()` to satisfy the action signature.

- [ ] **Step 2: Verify it compiles**

Run:

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: zero errors. Fix any issues before continuing.

- [ ] **Step 3: Commit**

```bash
git add components/collection/OwnedCopyRow.tsx
git commit -m "feat(owned-copies): add OwnedCopyRow with inline edit/sell/delete"
```

---

## Task 4: Create `OwnedCopiesList` component

Groups copies by variant in chip order, owns the single open-row state, and renders one `<OwnedCopyRow>` per copy.

**Files:**
- Create: `components/collection/OwnedCopiesList.tsx`

- [ ] **Step 1: Write the file**

Create `components/collection/OwnedCopiesList.tsx`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import type { CardVariant, PokemonCard, PokemonSet, UserCard } from '@/lib/types'
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
                  set={set}
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
```

Notes:
- **Variant ordering:** uses the same `chipsForCard` + `extraChips` merge as `OwnedCounter`, so chip order and section order match. Variants without copies are filtered out.
- **Single open-row state** lives in this list, not in each row. Opening row B's mode replaces row A's state automatically.
- **`copies.length === 0` early return** is a defensive belt — the page also gates on this — but keeps the component self-contained.

- [ ] **Step 2: Verify it compiles**

Run:

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/collection/OwnedCopiesList.tsx
git commit -m "feat(owned-copies): add OwnedCopiesList grouped by variant"
```

---

## Task 5: Render `<OwnedCopiesList>` on the card detail page

Place the list between the details panel and the back-to-set link, gated by `userId && copies.length > 0`. The `copies` array is already in scope from the existing `Promise.all` — no new fetch.

**Files:**
- Modify: `app/(catalog)/cards/[id]/page.tsx`

- [ ] **Step 1: Add the import**

In `app/(catalog)/cards/[id]/page.tsx`, after:

```tsx
import OwnedCounter from '@/components/collection/OwnedCounter'
```

add:

```tsx
import OwnedCopiesList from '@/components/collection/OwnedCopiesList'
```

- [ ] **Step 2: Render the list before the back-to-set link**

Find this region (lines ~89–115):

```tsx
<div className="bg-base border border-surface0 rounded-xl overflow-hidden">
  {rows
    .filter((r) => r.value !== null)
    .map((row, i) => (
      <div ...>...</div>
    ))}
</div>

{set && (
  <Link
    href={`/browse/${set.seriesSlug}/${set.pokemontcg_id}`}
    className="inline-flex items-center gap-2 mt-4 text-[11px] text-blue hover:underline"
  >
    {'←'} Back to {set.name}
  </Link>
)}
```

Insert `<OwnedCopiesList>` between the details panel and the back-to-set link:

```tsx
<div className="bg-base border border-surface0 rounded-xl overflow-hidden">
  {rows
    .filter((r) => r.value !== null)
    .map((row, i) => (
      <div ...>...</div>
    ))}
</div>

{userId && copies.length > 0 && (
  <OwnedCopiesList
    cardId={card.pokemontcg_id}
    card={card}
    set={set}
    copies={copies}
  />
)}

{set && (
  <Link
    href={`/browse/${set.seriesSlug}/${set.pokemontcg_id}`}
    className="inline-flex items-center gap-2 mt-4 text-[11px] text-blue hover:underline"
  >
    {'←'} Back to {set.name}
  </Link>
)}
```

- [ ] **Step 3: Verify it compiles**

Run:

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/(catalog)/cards/[id]/page.tsx
git commit -m "feat(card-detail): render inline OwnedCopiesList below details"
```

---

## Task 6: Manual end-to-end testing

Spec Section 8 lists the manual test cases. Run each and check off when verified.

**Files:** none modified — testing only.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Zero copies**

Sign in. Navigate to a card with no owned copies. Expected: page looks unchanged from before this feature — no "Your copies" section.

- [ ] **Step 3: Single-variant copies**

Add 2 copies via the variant chip dialog. Verify:
- One subsection appears titled with the variant label and `×2`.
- Both rows show the correct summary.

- [ ] **Step 4: Multi-variant copies**

Add a copy in a different variant. Verify:
- Two subsections appear, in the same order as the chips above.
- Each subsection has the correct count.

- [ ] **Step 5: Edit raw copy**

Click pencil on a raw row. Verify:
- Form expands inline below the row.
- Fields prefilled with current values.
- No raw/graded type tab shown.
- Change cost or condition, click Save. Row updates without a page reload.
- Open the same row again — new value is reflected.

- [ ] **Step 6: Edit graded copy**

Click pencil on a graded row. Verify:
- Form shows Company / Grade / Value fields (not Condition / Centering).
- Save updates the row.

- [ ] **Step 7: Sell**

Click the tag icon on a row. Enter price €10.00 and today's date, click Mark sold. Verify:
- Row disappears from the list.
- Navigate to `/sold` — the copy appears there.

- [ ] **Step 8: Delete**

Click trash on a row. Verify:
- Row's actions are replaced by `[Confirm] [Cancel]`.
- Cancel returns to read view.
- Confirm removes the row.

- [ ] **Step 9: Single open-row invariant**

Click pencil on row A. Then click pencil on row B. Verify:
- Row A collapses back to read view.
- Row B is now in edit mode.
- Same check across modes: open A in edit, then click sell on B — A collapses.

- [ ] **Step 10: Add-only dialog from variant chip**

Click any variant chip in the `OwnedCounter`. Verify:
- Dialog opens showing only the add form (no "In your collection" list, no "Add a copy" sub-header).
- Add a copy. Dialog closes (or stays open per existing behavior); the new copy appears in the inline list below.

- [ ] **Step 11: Regression — browse grid + search**

Go to `/browse/<series>/<set>`. Click an "owned" badge on a card tile (which opens `CopiesDialog` in `OwnedCounter`-style flow elsewhere). — *Wait*, that opens via `OwnedCounter` too, so it now uses `add` mode by design.

For surfaces using the **full** dialog: search a card via the topbar search, click the result. Expected: full dialog (existing copies list + add form). No regression.

- [ ] **Step 12: Validation guard**

Open edit on a graded row, clear the Grade input, click Save. Expected: action throws (Zod parse error caught in form), inline red error shown, form stays open.

- [ ] **Step 13: Logged-out**

Sign out. View any card detail page. Expected: no `OwnedCounter`, no "Your copies" section. Page renders cleanly.

---

## Spec Coverage Check

| Spec Section | Covered By |
|---|---|
| 1. Scope & Placement | Task 5 (page render gated on `userId && copies.length > 0`); Task 1+2 (dialog `mode='add'` from chip) |
| 2. Section Structure (group by variant in chip order, `×N` headers) | Task 4 (`OwnedCopiesList` grouping logic) |
| 3. Row Read View (raw vs graded summary, icon actions) | Task 3 (`OwnedCopyRow` summary + buttons) |
| 4. Edit / Sell / Delete inline | Task 3 (`EditForm`, `SellStrip`, `DeleteStrip`); Task 4 (single-mode state) |
| 5. Component Breakdown | Tasks 1, 3, 4, 5 (one task per file) |
| 6. Server Actions & Validation | Task 3 wires `updateUserCard`, `markUserCardAsSold`, `removeUserCard` — unchanged |
| 7. Empty / Error / Loading | Task 4 (`copies.length === 0` early return); Task 3 (inline error state, pending labels); Task 5 (server-rendered, no skeleton) |
| 8. Testing | Task 6 (manual checklist) |

---

## Out of Scope (per spec)

- Filter / sort controls on the inline list.
- Bulk select + bulk actions.
- Inline raw↔graded type switching.
- Per-row notes preview.
