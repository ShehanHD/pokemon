# Collection Data Model + Add-to-Collection Flow Design

**Date:** 2026-05-06
**Sub-project:** 1 of 4 (foundation for collection analytics, theme customization, marketplace)

## Goal

Let a signed-in user track every physical copy of a Pokémon card they own — raw or graded — with the metadata needed to power future analytics (cost basis, P/L, condition breakdowns, grade distributions) and a future marketplace integration. This sub-project delivers the data model, validation, API, and the add/remove UX on the card detail page. It does **not** deliver dashboards, charts, or analytics — those are downstream sub-projects that consume this data.

## Architecture

A new MongoDB collection `userCards` stores **one document per physical copy**. Each document is scoped to a `userId` (multi-tenant) and references a `cardId` (the existing `pokemontcg_id`). The shape is a **tagged discriminated union** on `type: 'raw' | 'graded'` — raw copies carry condition/centering, graded copies carry grading company/grade/manually-entered value. The two states are mutually exclusive per-document, but a user can own any mix of raw and graded copies of the same card.

Zod schemas at the API boundary validate every write. The card detail page gains a +/- counter: `+` opens an add dialog, `−` opens a list of existing copies for removal. Server actions handle persistence; auth comes from the existing session helpers.

## Tech Stack

- MongoDB (existing `getDb()` helper) — new `userCards` collection
- Next.js 15 App Router server actions for mutations
- Zod for boundary validation
- Existing auth: `lib/auth.ts`, `lib/auth.config.ts`, `middleware.ts`
- Tailwind v4 with the established light Pokémon design tokens (`bg-blue` = Pokéball red, `text-mauve` = Pikachu amber)
- lucide-react icons

---

## Data Model

### `userCards` Collection — Document Shape

```ts
// lib/types.ts (additions)

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
  _id: ObjectId
  userId: string         // from session
  cardId: string         // pokemontcg_id of the card
  variant: CardVariant
  acquiredAt: Date       // when the user got this copy
  cost: number           // EUR — what the user paid for this copy (>= 0)
  notes?: string         // free-form, max 500 chars
  createdAt: Date        // server-assigned
  updatedAt: Date        // server-assigned
}

export type UserCardRaw = UserCardBase & {
  type: 'raw'
  condition: CardCondition
  centering?: string     // free-form e.g. "55/45", validated by regex
}

export type UserCardGraded = UserCardBase & {
  type: 'graded'
  gradingCompany: GradingCompany
  grade: number          // 1–10, half-points allowed (1, 1.5, 2, ..., 10)
  gradedValue: number    // EUR — manually entered (>= 0)
}

export type UserCard = UserCardRaw | UserCardGraded
```

### Indexes

```ts
// scripts/migrate-userCards-indexes.ts (or one-off in seed)
db.userCards.createIndex({ userId: 1, cardId: 1 })  // primary access pattern
db.userCards.createIndex({ userId: 1 })             // user-scoped lookups
db.userCards.createIndex({ userId: 1, type: 1 })    // future analytics: split raw vs graded
```

### Why this shape

- **One doc per copy** — supports per-copy cost basis, per-copy grading, per-copy notes. Required for marketplace listings later (you list a specific copy, not "card X").
- **Tagged union** — raw cards can't have grades, graded slabs can't have raw conditions. The schema makes invalid states unrepresentable.
- **Manually-entered `gradedValue`** — the Pokémon TCG API and Cardmarket only provide raw prices. PriceCharting/eBay sold-listings integration is deferred to a later sub-project. For now the user types in the value they think their slab is worth.
- **`userId` on every doc** — multi-tenant isolation. Every query must filter by `userId`.

---

## Validation (Zod)

```ts
// lib/schemas/userCard.ts

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

`userId`, `_id`, `createdAt`, `updatedAt` are server-assigned — they are not in the input schema and clients cannot set them.

---

## Server Actions

```ts
// app/(catalog)/cards/[id]/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { userCardInputSchema } from '@/lib/schemas/userCard'
import { ObjectId } from 'mongodb'

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
    userId: session.user.id,    // tenant guard
  })

  revalidatePath(`/cards/${cardId}`)
}
```

Both actions enforce auth and parse input through zod. `removeUserCard` includes `userId` in the delete filter so a user can never remove another user's copy even with a guessed `_id`.

---

## Read API

```ts
// lib/userCards.ts
export async function getUserCardsForCard(userId: string, cardId: string): Promise<UserCard[]>
export async function getUserCardCount(userId: string, cardId: string): Promise<number>
```

Used by the card detail page to render the counter and the remove-picker dialog.

---

## UX: Card Detail Page Counter

The existing card detail page (`app/(catalog)/cards/[id]/page.tsx`) gains an **owned-copies counter** placed prominently below the card title/image area.

### Layout

```
┌─────────────────────────────────┐
│         [card image]            │
│                                 │
│         Card Name               │
│         Set · #045              │
│                                 │
│   Owned   [ − ]   3   [ + ]     │
│                                 │
│   €127.50 cost · 2 raw · 1 PSA  │  ← summary row (small text)
└─────────────────────────────────┘
```

- `+` button → opens **Add Copy Dialog**
- `−` button → opens **Remove Copy Dialog** (disabled when count is 0)
- Counter number is large, tabular-nums, `text-text`
- Buttons use the design system: `bg-base border border-surface0`, hover `border-blue/50`
- Summary row uses `text-overlay0 text-xs` and shows total cost + breakdown by type

### Add Copy Dialog (`+`)

A modal (matching the `SetCard` info modal pattern: fixed inset-0, backdrop-blur, centered card on `bg-base`).

**Fields:**
1. **Type** — segmented control: `[ Raw ] [ Graded ]` (defaults to Raw)
2. **Variant** — dropdown of 8 values, defaults to `normal`
3. **Cost (€)** — number input, required, min 0
4. **Acquired** — date picker, defaults to today
5. **Conditional block:**
   - If **Raw**: Condition dropdown (NM/LP/MP/HP/DMG), optional Centering text input (placeholder `"55/45"`)
   - If **Graded**: Grading Company dropdown, Grade number input (1–10, step 0.5), Graded Value (€) number input
6. **Notes** — optional textarea, 500 char max with counter

**Actions:** `Cancel` (subtext-style) and `Add Copy` (`bg-blue text-white`, primary CTA). On submit, calls `addUserCard` server action; on success closes dialog and the page revalidates so the counter increments.

**Validation:** Client-side mirrors the zod schema; server-side zod is the source of truth. Errors render inline below each field.

### Remove Copy Dialog (`−`)

A modal listing every owned copy of this card, newest first.

**Each row shows:**
- Type pill (`Raw` / `Graded` — graded uses `bg-mauve/10 text-mauve`)
- Variant + condition or grade (e.g. `Holo · NM` or `PSA 9 · Full Art`)
- Cost (e.g. `€42.00`)
- Acquired date
- Trash icon button on the right (lucide `Trash2`)

Clicking the trash icon shows an inline confirm (`Delete? [Cancel] [Confirm]`) on that row to prevent accidents — no separate confirm modal. On confirm, calls `removeUserCard`; the row disappears and the counter decrements.

The dialog stays open after a delete so the user can remove multiple copies in one session. A `Done` button at the bottom closes it.

---

## File Structure

**Create:**
- `lib/schemas/userCard.ts` — zod schemas + inferred types
- `lib/userCards.ts` — read helpers (`getUserCardsForCard`, `getUserCardCount`)
- `app/(catalog)/cards/[id]/actions.ts` — `addUserCard`, `removeUserCard` server actions
- `components/collection/OwnedCounter.tsx` — `'use client'` counter + dialog wiring on card detail page
- `components/collection/AddCopyDialog.tsx` — `'use client'` add-copy form modal
- `components/collection/RemoveCopyDialog.tsx` — `'use client'` list/remove modal

**Modify:**
- `lib/types.ts` — add `UserCard`, `UserCardRaw`, `UserCardGraded`, `CardVariant`, `CardCondition`, `GradingCompany` exports
- `app/(catalog)/cards/[id]/page.tsx` — fetch user copies via `getUserCardsForCard`, render `<OwnedCounter />`

**Tests:**
- `lib/schemas/__tests__/userCard.test.ts` — zod schema unit tests (raw, graded, invalid grade, invalid centering, missing fields, mutual exclusion)
- `lib/__tests__/userCards.test.ts` — read-helper integration test against in-memory Mongo
- `app/(catalog)/cards/[id]/__tests__/actions.test.ts` — auth guard + tenant isolation tests

---

## Auth & Tenant Isolation

- Every server action calls `auth()` and rejects on missing session.
- Every read helper takes `userId` as the first parameter — never derived inside the helper.
- Every Mongo query filters by `userId` — including deletes (defense in depth: even with a leaked `_id`, a user can't touch another tenant's data).
- The middleware (already in place) protects `/cards/*` routes from unauthenticated access; server actions add a second layer because middleware alone is not enough.

---

## Out of Scope (deferred to later sub-projects)

- **Analytics dashboards** — total collection value, cost basis vs current value, P/L, breakdowns by set/series/type/grade. Sub-project 2.
- **Theme customization** — sub-project 3.
- **Marketplace + eBay integration** — sub-project 4. Will use per-copy granularity to list specific copies.
- **Bulk add / CSV import** — useful but not core. Defer until per-copy add is proven.
- **Auto-fetched graded prices** — no reliable free feed. PriceCharting + eBay sold-listings evaluated when sub-project 4 lands.
- **Editing an existing copy** — v1 is add + remove. Edit comes when users complain about typos.
- **Card list view of "my collection"** — comes with the analytics dashboard.

---

## Success Criteria

- [ ] A signed-in user can add a raw copy of a card from the card detail page.
- [ ] A signed-in user can add a graded copy of the same card; both coexist.
- [ ] The counter accurately reflects total copies owned, scoped to the current user.
- [ ] A user can remove a specific copy via the remove dialog.
- [ ] User A cannot see, add to, or remove copies belonging to user B.
- [ ] All inputs are validated server-side via zod; invalid input returns an error and never reaches Mongo.
- [ ] The UI matches the existing light Pokémon design system (Russo One headings, Chakra Petch body, `bg-blue` primary, `bg-base` surfaces).
- [ ] Unit tests cover the zod schemas; integration tests cover the read helpers and server actions including tenant isolation.
