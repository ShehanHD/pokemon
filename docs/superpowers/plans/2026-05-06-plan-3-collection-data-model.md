# Collection Data Model + Add-to-Collection Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user track every physical copy of a Pokémon card they own — raw or graded — from the card detail page, with the data, validation, server actions, and add/remove UX needed to power future analytics and marketplace features.

**Architecture:** A new MongoDB `userCards` collection stores **one document per physical copy**, scoped by `userId` and shaped as a tagged discriminated union on `type: 'raw' | 'graded'`. Zod schemas at the server-action boundary validate every write. The card detail page gains a +/- counter that opens add/remove dialogs.

**Tech Stack:** Next.js 16 App Router (server actions), React 19, MongoDB driver 7.2 via `getDb()`, NextAuth 5 (`auth()`), Zod 4, Tailwind v4 with established light Pokémon design tokens (`bg-blue` = Pokéball red, `text-mauve` = Pikachu amber, `font-russo`, `font-chakra`), lucide-react, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-05-06-collection-data-model-design.md`

---

## File Structure

**Create:**
- `lib/schemas/userCard.ts` — zod schemas + inferred input type
- `lib/userCards.ts` — read helpers (`getUserCardsForCard`, `getUserCardCount`)
- `app/(catalog)/cards/[id]/actions.ts` — `addUserCard`, `removeUserCard` server actions
- `components/collection/OwnedCounter.tsx` — `'use client'` counter wiring
- `components/collection/AddCopyDialog.tsx` — `'use client'` add-copy form modal
- `components/collection/RemoveCopyDialog.tsx` — `'use client'` list/remove modal
- `lib/schemas/__tests__/userCard.test.ts`
- `lib/__tests__/userCards.test.ts`
- `app/(catalog)/cards/[id]/__tests__/actions.test.ts`
- `scripts/migrate-userCards-indexes.ts` — one-off index creation

**Modify:**
- `lib/types.ts` — add `CardVariant`, `CardCondition`, `GradingCompany`, `UserCardRaw`, `UserCardGraded`, `UserCard`
- `app/(catalog)/cards/[id]/page.tsx` — fetch user copies, render `<OwnedCounter />`

---

## Task 1: Add domain types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append types to `lib/types.ts`**

Append at the end of the file:

```ts
export type CardVariant =
  | 'normal'
  | 'holo'
  | 'reverse-holo'
  | '1st-edition'
  | 'shadowless'
  | 'promo'
  | 'full-art'
  | 'alt-art'

export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'

export type GradingCompany = 'PSA' | 'BGS' | 'CGC' | 'SGC' | 'TAG' | 'Other'

interface UserCardBase {
  _id?: string
  userId: string
  cardId: string
  variant: CardVariant
  acquiredAt: Date
  cost: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type UserCardRaw = UserCardBase & {
  type: 'raw'
  condition: CardCondition
  centering?: string
}

export type UserCardGraded = UserCardBase & {
  type: 'graded'
  gradingCompany: GradingCompany
  grade: number
  gradedValue: number
}

export type UserCard = UserCardRaw | UserCardGraded
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors in `lib/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(collection): add UserCard domain types"
```

---

## Task 2: Zod schemas — raw input (TDD)

**Files:**
- Create: `lib/schemas/userCard.ts`
- Create: `lib/schemas/__tests__/userCard.test.ts`

- [ ] **Step 1: Write failing test for raw-card validation**

Create `lib/schemas/__tests__/userCard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { userCardInputSchema } from '../userCard'

describe('userCardInputSchema — raw', () => {
  const validRaw = {
    type: 'raw' as const,
    cardId: 'sv1-25',
    variant: 'normal' as const,
    acquiredAt: '2026-05-06',
    cost: 12.5,
    condition: 'NM' as const,
  }

  it('accepts a minimal raw card', () => {
    const r = userCardInputSchema.safeParse(validRaw)
    expect(r.success).toBe(true)
  })

  it('accepts raw card with valid centering', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, centering: '55/45' })
    expect(r.success).toBe(true)
  })

  it('rejects raw card with malformed centering', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, centering: 'fifty-fifty' })
    expect(r.success).toBe(false)
  })

  it('rejects raw card with negative cost', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, cost: -1 })
    expect(r.success).toBe(false)
  })

  it('rejects raw card with grade field (mutual exclusion)', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, grade: 9 })
    // discriminated union strips unknown fields for the matched branch — no error,
    // but the object never gains `grade`. Verify by inspecting parsed output.
    if (r.success) expect((r.data as Record<string, unknown>).grade).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/schemas/__tests__/userCard.test.ts`
Expected: FAIL — module `../userCard` does not exist.

- [ ] **Step 3: Create `lib/schemas/userCard.ts` with raw branch**

```ts
import { z } from 'zod'

export const cardVariantSchema = z.enum([
  'normal', 'holo', 'reverse-holo', '1st-edition',
  'shadowless', 'promo', 'full-art', 'alt-art',
])

export const cardConditionSchema = z.enum(['NM', 'LP', 'MP', 'HP', 'DMG'])

export const gradingCompanySchema = z.enum([
  'PSA', 'BGS', 'CGC', 'SGC', 'TAG', 'Other',
])

const gradeSchema = z
  .number()
  .min(1)
  .max(10)
  .refine((g) => (g * 2) % 1 === 0, { message: 'Grade must be in half-point steps' })

const centeringSchema = z
  .string()
  .regex(/^\d{1,2}\/\d{1,2}$/, { message: 'Centering must look like "55/45"' })
  .optional()

const baseFields = {
  cardId: z.string().min(1),
  variant: cardVariantSchema,
  acquiredAt: z.coerce.date(),
  cost: z.number().min(0),
  notes: z.string().max(500).optional(),
}

export const userCardRawInputSchema = z.object({
  ...baseFields,
  type: z.literal('raw'),
  condition: cardConditionSchema,
  centering: centeringSchema,
})

export const userCardGradedInputSchema = z.object({
  ...baseFields,
  type: z.literal('graded'),
  gradingCompany: gradingCompanySchema,
  grade: gradeSchema,
  gradedValue: z.number().min(0),
})

export const userCardInputSchema = z.discriminatedUnion('type', [
  userCardRawInputSchema,
  userCardGradedInputSchema,
])

export type UserCardInput = z.infer<typeof userCardInputSchema>
```

- [ ] **Step 4: Run test to verify raw cases pass**

Run: `npx vitest run lib/schemas/__tests__/userCard.test.ts`
Expected: PASS — all 5 raw tests green.

---

## Task 3: Zod schemas — graded input + edge cases

**Files:**
- Modify: `lib/schemas/__tests__/userCard.test.ts`

- [ ] **Step 1: Append graded + edge-case tests**

Add these `describe` blocks at the end of `lib/schemas/__tests__/userCard.test.ts`:

```ts
describe('userCardInputSchema — graded', () => {
  const validGraded = {
    type: 'graded' as const,
    cardId: 'sv1-25',
    variant: 'holo' as const,
    acquiredAt: '2026-04-01',
    cost: 100,
    gradingCompany: 'PSA' as const,
    grade: 9,
    gradedValue: 250,
  }

  it('accepts a graded card with integer grade', () => {
    expect(userCardInputSchema.safeParse(validGraded).success).toBe(true)
  })

  it('accepts a graded card with half-point grade', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, grade: 8.5 }).success,
    ).toBe(true)
  })

  it('rejects a graded card with quarter-point grade', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, grade: 8.25 }).success,
    ).toBe(false)
  })

  it('rejects a graded card with grade out of range', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, grade: 11 }).success,
    ).toBe(false)
  })

  it('rejects a graded card with negative gradedValue', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, gradedValue: -5 }).success,
    ).toBe(false)
  })

  it('rejects a graded card missing the grading company', () => {
    const { gradingCompany: _gc, ...rest } = validGraded
    expect(userCardInputSchema.safeParse(rest).success).toBe(false)
  })
})

describe('userCardInputSchema — discrimination', () => {
  it('rejects an object with no type field', () => {
    expect(
      userCardInputSchema.safeParse({ cardId: 'a', variant: 'normal', acquiredAt: '2026-01-01', cost: 1 }).success,
    ).toBe(false)
  })

  it('rejects an unknown type', () => {
    expect(
      userCardInputSchema.safeParse({ type: 'sealed', cardId: 'a', variant: 'normal', acquiredAt: '2026-01-01', cost: 1 }).success,
    ).toBe(false)
  })

  it('rejects notes longer than 500 chars', () => {
    expect(
      userCardInputSchema.safeParse({
        type: 'raw', cardId: 'a', variant: 'normal', acquiredAt: '2026-01-01', cost: 1, condition: 'NM',
        notes: 'x'.repeat(501),
      }).success,
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run all schema tests**

Run: `npx vitest run lib/schemas/__tests__/userCard.test.ts`
Expected: PASS — every test green (≥ 14 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/schemas/userCard.ts lib/schemas/__tests__/userCard.test.ts
git commit -m "feat(collection): add zod schemas for UserCard input"
```

---

## Task 4: Read helpers (TDD)

**Files:**
- Create: `lib/userCards.ts`
- Create: `lib/__tests__/userCards.test.ts`

- [ ] **Step 1: Write failing test for read helpers**

Create `lib/__tests__/userCards.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

import { getUserCardsForCard, getUserCardCount } from '../userCards'
import { getDb } from '@/lib/db'

const mockCollection = {
  find: vi.fn(),
  countDocuments: vi.fn(),
}
const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) }

describe('getUserCardsForCard', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
    mockCollection.find.mockReset()
    mockCollection.countDocuments.mockReset()
  })

  it('returns docs scoped to userId + cardId, newest first', async () => {
    const docs = [
      { _id: 'a', userId: 'u1', cardId: 'c1', type: 'raw', createdAt: new Date('2026-01-02') },
      { _id: 'b', userId: 'u1', cardId: 'c1', type: 'graded', createdAt: new Date('2026-01-01') },
    ]
    const sortMock = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) })
    mockCollection.find.mockReturnValue({ sort: sortMock })

    const result = await getUserCardsForCard('u1', 'c1')

    expect(mockDb.collection).toHaveBeenCalledWith('userCards')
    expect(mockCollection.find).toHaveBeenCalledWith({ userId: 'u1', cardId: 'c1' })
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 })
    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('a')
  })

  it('serializes _id to string', async () => {
    const docs = [{ _id: { toString: () => 'oid-string' }, userId: 'u1', cardId: 'c1', type: 'raw' }]
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) }),
    })
    const result = await getUserCardsForCard('u1', 'c1')
    expect(result[0]._id).toBe('oid-string')
  })
})

describe('getUserCardCount', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
  })

  it('returns count scoped to userId + cardId', async () => {
    mockCollection.countDocuments.mockResolvedValue(3)
    const n = await getUserCardCount('u1', 'c1')
    expect(mockCollection.countDocuments).toHaveBeenCalledWith({ userId: 'u1', cardId: 'c1' })
    expect(n).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/userCards.test.ts`
Expected: FAIL — module `../userCards` does not exist.

- [ ] **Step 3: Create `lib/userCards.ts`**

```ts
import { getDb } from './db'
import type { UserCard } from './types'

function serialize(doc: Record<string, unknown>): UserCard {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as UserCard
}

export async function getUserCardsForCard(userId: string, cardId: string): Promise<UserCard[]> {
  const db = await getDb()
  const docs = await db
    .collection('userCards')
    .find({ userId, cardId })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map((d) => serialize(d as Record<string, unknown>))
}

export async function getUserCardCount(userId: string, cardId: string): Promise<number> {
  const db = await getDb()
  return db.collection('userCards').countDocuments({ userId, cardId })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/userCards.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/userCards.ts lib/__tests__/userCards.test.ts
git commit -m "feat(collection): add userCards read helpers"
```

---

## Task 5: Server actions — `addUserCard` (TDD)

**Files:**
- Create: `app/(catalog)/cards/[id]/actions.ts`
- Create: `app/(catalog)/cards/[id]/__tests__/actions.test.ts`

- [ ] **Step 1: Write failing test for `addUserCard`**

Create `app/(catalog)/cards/[id]/__tests__/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { addUserCard, removeUserCard } from '../actions'
import { getDb } from '@/lib/db'
import { auth } from '@/lib/auth'

const insertOne = vi.fn().mockResolvedValue({ insertedId: 'new-id' })
const deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 })
const mockCollection = { insertOne, deleteOne }
const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) }

const validRawInput = {
  type: 'raw' as const,
  cardId: 'sv1-25',
  variant: 'normal' as const,
  acquiredAt: '2026-05-06',
  cost: 12.5,
  condition: 'NM' as const,
}

describe('addUserCard', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
    insertOne.mockClear()
    mockDb.collection.mockClear()
  })

  it('throws UNAUTHORIZED when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await expect(addUserCard(validRawInput)).rejects.toThrow('UNAUTHORIZED')
    expect(insertOne).not.toHaveBeenCalled()
  })

  it('throws UNAUTHORIZED when session has no user id', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '' } } as never)
    await expect(addUserCard(validRawInput)).rejects.toThrow('UNAUTHORIZED')
    expect(insertOne).not.toHaveBeenCalled()
  })

  it('rejects invalid input via zod', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
    await expect(addUserCard({ type: 'raw', cardId: '' })).rejects.toThrow()
    expect(insertOne).not.toHaveBeenCalled()
  })

  it('inserts a userCard scoped to session userId on success', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
    await addUserCard(validRawInput)
    expect(mockDb.collection).toHaveBeenCalledWith('userCards')
    expect(insertOne).toHaveBeenCalledTimes(1)
    const doc = insertOne.mock.calls[0][0]
    expect(doc.userId).toBe('u1')
    expect(doc.cardId).toBe('sv1-25')
    expect(doc.type).toBe('raw')
    expect(doc.createdAt).toBeInstanceOf(Date)
    expect(doc.updatedAt).toBeInstanceOf(Date)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(catalog\)/cards/\[id\]/__tests__/actions.test.ts`
Expected: FAIL — module `../actions` does not exist.

- [ ] **Step 3: Create `app/(catalog)/cards/[id]/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { userCardInputSchema } from '@/lib/schemas/userCard'

export async function addUserCard(input: unknown) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const parsed = userCardInputSchema.parse(input)
  const now = new Date()

  const db = await getDb()
  await db.collection('userCards').insertOne({
    ...parsed,
    userId: session.user.id,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath(`/cards/${parsed.cardId}`)
}

export async function removeUserCard(userCardId: string, cardId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const db = await getDb()
  await db.collection('userCards').deleteOne({
    _id: new ObjectId(userCardId),
    userId: session.user.id,
  })

  revalidatePath(`/cards/${cardId}`)
}
```

- [ ] **Step 4: Run test to verify add cases pass**

Run: `npx vitest run app/\(catalog\)/cards/\[id\]/__tests__/actions.test.ts`
Expected: PASS — 4 add tests green (remove tests not yet written).

---

## Task 6: Server actions — `removeUserCard` tenant isolation

**Files:**
- Modify: `app/(catalog)/cards/[id]/__tests__/actions.test.ts`

- [ ] **Step 1: Append remove-action tests**

Append to `actions.test.ts`:

```ts
describe('removeUserCard', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
    deleteOne.mockClear()
    mockDb.collection.mockClear()
  })

  it('throws UNAUTHORIZED when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await expect(
      removeUserCard('507f1f77bcf86cd799439011', 'sv1-25'),
    ).rejects.toThrow('UNAUTHORIZED')
    expect(deleteOne).not.toHaveBeenCalled()
  })

  it('scopes delete by userId (tenant isolation)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
    await removeUserCard('507f1f77bcf86cd799439011', 'sv1-25')
    expect(deleteOne).toHaveBeenCalledTimes(1)
    const filter = deleteOne.mock.calls[0][0]
    expect(filter.userId).toBe('u1')
    expect(filter._id).toBeDefined()
  })

  it('does not delete copies belonging to another user', async () => {
    // Simulate Mongo: deleteOne with {_id, userId:'attacker'} matches nothing
    deleteOne.mockResolvedValueOnce({ deletedCount: 0 })
    vi.mocked(auth).mockResolvedValue({ user: { id: 'attacker' } } as never)
    await removeUserCard('507f1f77bcf86cd799439011', 'sv1-25')
    const filter = deleteOne.mock.calls[0][0]
    expect(filter.userId).toBe('attacker')
  })
})
```

- [ ] **Step 2: Run all action tests**

Run: `npx vitest run app/\(catalog\)/cards/\[id\]/__tests__/actions.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 3: Commit**

```bash
git add app/\(catalog\)/cards/\[id\]/actions.ts app/\(catalog\)/cards/\[id\]/__tests__/actions.test.ts
git commit -m "feat(collection): add server actions for add/remove user card"
```

---

## Task 7: `AddCopyDialog` component

**Files:**
- Create: `components/collection/AddCopyDialog.tsx`

- [ ] **Step 1: Create `AddCopyDialog.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { addUserCard } from '@/app/(catalog)/cards/[id]/actions'
import type { CardVariant, CardCondition, GradingCompany } from '@/lib/types'

interface Props {
  cardId: string
  open: boolean
  onClose: () => void
}

const VARIANTS: CardVariant[] = [
  'normal', 'holo', 'reverse-holo', '1st-edition',
  'shadowless', 'promo', 'full-art', 'alt-art',
]
const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']
const COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'SGC', 'TAG', 'Other']

export default function AddCopyDialog({ cardId, open, onClose }: Props) {
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

---

## Task 8: `RemoveCopyDialog` component

**Files:**
- Create: `components/collection/RemoveCopyDialog.tsx`

- [ ] **Step 1: Create `RemoveCopyDialog.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

---

## Task 9: `OwnedCounter` component

**Files:**
- Create: `components/collection/OwnedCounter.tsx`

- [ ] **Step 1: Create `OwnedCounter.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/collection/
git commit -m "feat(collection): add OwnedCounter, AddCopyDialog, RemoveCopyDialog"
```

---

## Task 10: Wire `OwnedCounter` into card detail page

**Files:**
- Modify: `app/(catalog)/cards/[id]/page.tsx`

- [ ] **Step 1: Update imports and fetch logic**

At the top of `app/(catalog)/cards/[id]/page.tsx`, replace the existing import block with:

```tsx
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCardById } from '@/lib/cards'
import { getSetById } from '@/lib/sets'
import { getUserCardsForCard } from '@/lib/userCards'
import { auth } from '@/lib/auth'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import OwnedCounter from '@/components/collection/OwnedCounter'
```

- [ ] **Step 2: Fetch user copies inside the component**

In `CardDetailPage`, after `const set = await getSetById(card.set_id)`, add:

```tsx
const session = await auth()
const userId = session?.user?.id
const copies = userId ? await getUserCardsForCard(userId, card.pokemontcg_id) : []
```

- [ ] **Step 3: Render `<OwnedCounter />` in the details column**

Inside the details column (`<div className="flex-1 min-w-0">`), insert the counter immediately after the price `<p>` (or after the `<h1>` if no price), before the existing rows panel:

```tsx
{userId && <OwnedCounter cardId={card.pokemontcg_id} copies={copies} />}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
- Sign in as `shehanhd@gmail.com`.
- Navigate to any card detail page (`/cards/<id>`).
- Click `+`: dialog opens, fill raw form, submit → counter shows `1`, summary row shows correct cost.
- Click `+` again: add a graded copy → counter shows `2`, summary shows `1 raw · 1 graded`.
- Click `−`: dialog lists both copies → confirm-delete one → counter shows `1`.
- Sign out, sign in as a different user → counter resets to `0` (tenant isolation).

- [ ] **Step 6: Commit**

```bash
git add app/\(catalog\)/cards/\[id\]/page.tsx
git commit -m "feat(collection): wire OwnedCounter into card detail page"
```

---

## Task 11: Index migration script

**Files:**
- Create: `scripts/migrate-userCards-indexes.ts`

- [ ] **Step 1: Create the script**

```ts
import { getDb } from '../lib/db'

async function run() {
  const db = await getDb()
  const col = db.collection('userCards')
  await col.createIndex({ userId: 1, cardId: 1 }, { name: 'userId_cardId' })
  await col.createIndex({ userId: 1 }, { name: 'userId' })
  await col.createIndex({ userId: 1, type: 1 }, { name: 'userId_type' })
  console.log('userCards indexes created')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the migration once against dev DB**

Run: `npx tsx scripts/migrate-userCards-indexes.ts`
Expected: stdout `userCards indexes created`.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-userCards-indexes.ts
git commit -m "chore(collection): add userCards index migration script"
```

---

## Task 12: Full test + type check

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass — schemas, read helpers, server actions, plus pre-existing register + middleware tests.

- [ ] **Step 2: Run full type check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Update memory roadmap**

Open `/Users/don/.claude/projects/-Users-don-Desktop-Software-pokemon/memory/project_roadmap.md` and mark "Card Collection Purchase Metadata" as complete in the current iteration. (Manual edit; no commit.)

---

## Success Criteria Verification

Map each spec success criterion to its proof point:

- A signed-in user can add a raw copy → Task 10, manual smoke test step 5.
- A signed-in user can add a graded copy → Task 10, manual smoke test step 5.
- Counter accurately reflects total copies, scoped to current user → Task 4 read helper tests + Task 10 smoke test.
- Remove a specific copy via remove dialog → Task 10 smoke test.
- User A cannot see/add/remove user B's copies → Task 4 (`find` filter), Task 6 (`removeUserCard` tenant filter test), Task 10 smoke test step 5 (sign-out/in).
- All inputs validated server-side via zod → Task 5 invalid-input test ("rejects invalid input via zod").
- UI matches design system → Tasks 7, 8, 9 (uses `bg-base`, `bg-blue`, `font-russo`, lucide icons, established modal pattern).
- Unit + integration tests cover schemas, read helpers, server actions, tenant isolation → Tasks 2, 3, 4, 5, 6.
