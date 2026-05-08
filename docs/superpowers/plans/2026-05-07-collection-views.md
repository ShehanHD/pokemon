# Collection Views (My Cards + Wishlist + Analytics) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three sidebar stubs (`/collection`, `/wishlist`, `/analytics`) with a coordinated v1 of "collection-centric" views over the existing `userCards` data model, plus a new `wishlist` collection.

**Architecture:** Three phases, each independently shippable. Phase 1 adds aggregation helpers in `lib/userCards.ts` and the My Cards page (lowest risk, no schema changes). Phase 2 layers Recharts + analytics on top of the same helpers. Phase 3 introduces the new `wishlist` MongoDB collection plus a `WishlistStar` integrated into browse/detail pages and the dedicated wishlist page. Filter/sort URLs follow the existing `FilterBar`/`SortMenu` contract; server actions parse with Zod at the boundary; aggregation perf is mitigated with `unstable_cache` and lazy-loaded chart bundles.

**Tech Stack:** Next.js 16 App Router (server components + server actions), React 19, MongoDB driver 7.2 via `getDb()`, NextAuth 5 (`auth()`), Zod 4 discriminated unions, Tailwind v4 light Pokémon palette tokens (`bg-blue` = Pokéball red, `bg-mauve` = Pikachu amber, `font-russo`, `font-chakra`), Recharts (lazy-loaded), lucide-react, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-05-07-collection-views-design.md`

---

## File Structure

**Phase 1 — My Cards**

Create:
- `lib/userCards.aggregations.test.ts` — tests for new helpers
- `app/(app)/collection/page.tsx` — My Cards page
- `app/(app)/collection/CollectionFilters.tsx` — URL-driven filter bar
- `app/(app)/collection/OwnedCardTile.tsx` — owned-card grid tile
- `components/collection/__tests__/CollectionFilters.test.tsx`

Modify:
- `lib/types.ts` — add `OwnedCardGroup`, `OwnedCardsQuery`
- `lib/userCards.ts` — add `getOwnedCardsGrouped`, `getCollectionStats`, `getCollectionTimeseries`, `getRawVsGradedSplit`, `getBySeriesBreakdown`, `getBySetBreakdown`, `getRarityBreakdown`
- `lib/schemas/ownedCardsQuery.ts` — new Zod schema for URL params

**Phase 2 — Analytics**

Create:
- `app/(app)/analytics/page.tsx`
- `app/(app)/analytics/charts/KpiCards.tsx`
- `app/(app)/analytics/charts/RawVsGradedDonut.tsx`
- `app/(app)/analytics/charts/RarityChart.tsx`
- `app/(app)/analytics/charts/BySeriesChart.tsx`
- `app/(app)/analytics/charts/BySetChart.tsx`
- `app/(app)/analytics/charts/AcquisitionTimeline.tsx`
- `app/(app)/analytics/charts/SpendTimeline.tsx`
- `app/(app)/analytics/AnalyticsTeaser.tsx`

Modify:
- `package.json` — add `recharts`
- `components/layout/Sidebar.tsx` — change Analytics rendering to navigate-to-teaser

**Phase 3 — Wishlist**

Create:
- `lib/schemas/wishlist.ts`
- `lib/schemas/wishlist.test.ts`
- `lib/wishlist.ts`
- `lib/wishlist.test.ts`
- `app/(app)/wishlist/page.tsx`
- `app/(app)/wishlist/actions.ts`
- `app/(app)/wishlist/actions.test.ts`
- `components/wishlist/WishlistStar.tsx`
- `components/wishlist/__tests__/WishlistStar.test.tsx`
- `scripts/migrate-wishlist-indexes.ts`

Modify:
- `lib/types.ts` — add `WishlistItem`, `WishlistPriority`
- `components/catalog/CardsGrid.tsx` — accept optional `wishlistedIds: Set<string>`, render `WishlistStar` overlay
- `app/(catalog)/cards/[id]/page.tsx` — render `WishlistStar` next to `OwnedCounter`
- `app/(catalog)/browse/page.tsx` — load `wishlistedIds`, pass to grids
- `app/(catalog)/browse/[series]/page.tsx` — same
- `app/(catalog)/browse/[series]/[set]/page.tsx` — same
- `components/layout/Sidebar.tsx` — drop `pro: true` from Wishlist

---

# PHASE 1 — My Cards

## Task 1.1: Add `OwnedCardGroup` and `OwnedCardsQuery` types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append types to `lib/types.ts`**

```ts
export interface OwnedCardGroup {
  cardId: string
  card: PokemonCard
  copyCount: number
  rawCount: number
  gradedCount: number
  totalCost: number
  estValue: number
  lastAcquiredAt: Date
  variants: CardVariant[]
}

export type OwnedCardsSort =
  | 'recent'
  | 'name'
  | 'release'
  | 'count'
  | 'cost'

export interface OwnedCardsQuery {
  series?: string
  set?: string
  rarity?: string
  variant?: CardVariant
  type?: 'raw' | 'graded'
  condition?: CardCondition
  q?: string
  sort: OwnedCardsSort
}

export interface CollectionStats {
  totalCopies: number
  uniqueCards: number
  totalSpend: number
  estValue: number
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add OwnedCardGroup, OwnedCardsQuery, CollectionStats"
```

---

## Task 1.2: Add `OwnedCardsQuery` Zod schema

**Files:**
- Create: `lib/schemas/ownedCardsQuery.ts`

- [ ] **Step 1: Create schema file**

```ts
import { z } from 'zod'
import { cardVariantSchema, cardConditionSchema } from './userCard'

export const ownedCardsSortSchema = z.enum(['recent', 'name', 'release', 'count', 'cost'])

export const ownedCardsQuerySchema = z.object({
  series: z.string().min(1).optional(),
  set: z.string().min(1).optional(),
  rarity: z.string().min(1).optional(),
  variant: cardVariantSchema.optional(),
  type: z.enum(['raw', 'graded']).optional(),
  condition: cardConditionSchema.optional(),
  q: z.string().min(1).max(80).optional(),
  sort: ownedCardsSortSchema.default('recent'),
})

export type OwnedCardsQueryInput = z.input<typeof ownedCardsQuerySchema>
export type OwnedCardsQueryParsed = z.output<typeof ownedCardsQuerySchema>

export function parseOwnedCardsQuery(searchParams: Record<string, string | string[] | undefined>): OwnedCardsQueryParsed {
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string') flat[k] = v
    else if (Array.isArray(v) && v.length > 0) flat[k] = v[0]
  }
  return ownedCardsQuerySchema.parse(flat)
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/schemas/ownedCardsQuery.ts
git commit -m "feat(schemas): ownedCardsQuery URL-param schema"
```

---

## Task 1.3: Add failing test for `getOwnedCardsGrouped`

**Files:**
- Create: `lib/userCards.aggregations.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getDb } from './db'
import { getOwnedCardsGrouped } from './userCards'

const userId = 'user-test-aggs'

async function seed() {
  const db = await getDb()
  await db.collection('userCards').deleteMany({ userId })
  await db.collection('cards').deleteMany({ pokemontcg_id: { $in: ['c1', 'c2'] } })
  await db.collection('cards').insertMany([
    { pokemontcg_id: 'c1', name: 'Pikachu', number: '25', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Common', types: ['Lightning'], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', cardmarketPrice: null },
    { pokemontcg_id: 'c2', name: 'Charizard', number: '4', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Rare Holo', types: ['Fire'], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', cardmarketPrice: null },
  ])
  await db.collection('userCards').insertMany([
    { userId, cardId: 'c1', type: 'raw', variant: 'normal', condition: 'NM', cost: 5, acquiredAt: new Date('2026-01-01'), createdAt: new Date(), updatedAt: new Date() },
    { userId, cardId: 'c1', type: 'raw', variant: 'holo', condition: 'NM', cost: 10, acquiredAt: new Date('2026-02-01'), createdAt: new Date(), updatedAt: new Date() },
    { userId, cardId: 'c2', type: 'graded', variant: 'normal', gradingCompany: 'PSA', grade: 9, gradedValue: 200, cost: 150, acquiredAt: new Date('2026-03-01'), createdAt: new Date(), updatedAt: new Date() },
  ])
}

describe('getOwnedCardsGrouped', () => {
  beforeEach(seed)

  it('groups copies by cardId with raw/graded counts and totals', async () => {
    const groups = await getOwnedCardsGrouped(userId, { sort: 'recent' })
    expect(groups).toHaveLength(2)
    const c1 = groups.find((g) => g.cardId === 'c1')!
    expect(c1.copyCount).toBe(2)
    expect(c1.rawCount).toBe(2)
    expect(c1.gradedCount).toBe(0)
    expect(c1.totalCost).toBe(15)
    expect(c1.variants.sort()).toEqual(['holo', 'normal'])
    const c2 = groups.find((g) => g.cardId === 'c2')!
    expect(c2.copyCount).toBe(1)
    expect(c2.gradedCount).toBe(1)
    expect(c2.estValue).toBe(200)
  })

  it('sorts by name ascending', async () => {
    const groups = await getOwnedCardsGrouped(userId, { sort: 'name' })
    expect(groups.map((g) => g.card.name)).toEqual(['Charizard', 'Pikachu'])
  })

  it('returns empty array for unknown user', async () => {
    const groups = await getOwnedCardsGrouped('no-such-user', { sort: 'recent' })
    expect(groups).toEqual([])
  })
})
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm test -- lib/userCards.aggregations.test.ts`
Expected: FAIL — `getOwnedCardsGrouped is not a function`.

---

## Task 1.4: Implement `getOwnedCardsGrouped`

**Files:**
- Modify: `lib/userCards.ts`

- [ ] **Step 1: Append implementation to `lib/userCards.ts`**

```ts
import type { OwnedCardGroup, OwnedCardsQuery, PokemonCard } from './types'

export async function getOwnedCardsGrouped(
  userId: string,
  query: OwnedCardsQuery,
): Promise<OwnedCardGroup[]> {
  const db = await getDb()

  const sortStage: Record<string, 1 | -1> =
    query.sort === 'name' ? { 'card.name': 1 }
    : query.sort === 'release' ? { 'set.releaseDate': -1 }
    : query.sort === 'count' ? { copyCount: -1 }
    : query.sort === 'cost' ? { totalCost: -1 }
    : { lastAcquiredAt: -1 }

  const pipeline: Record<string, unknown>[] = [
    { $match: { userId } },
  ]

  if (query.type) pipeline.push({ $match: { type: query.type } })
  if (query.condition) pipeline.push({ $match: { type: 'raw', condition: query.condition } })
  if (query.variant) pipeline.push({ $match: { variant: query.variant } })

  pipeline.push(
    {
      $group: {
        _id: '$cardId',
        copyCount: { $sum: 1 },
        rawCount: { $sum: { $cond: [{ $eq: ['$type', 'raw'] }, 1, 0] } },
        gradedCount: { $sum: { $cond: [{ $eq: ['$type', 'graded'] }, 1, 0] } },
        totalCost: { $sum: { $ifNull: ['$cost', 0] } },
        estValue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'graded'] },
              { $ifNull: ['$gradedValue', 0] },
              { $ifNull: ['$cost', 0] },
            ],
          },
        },
        lastAcquiredAt: { $max: '$acquiredAt' },
        variants: { $addToSet: '$variant' },
      },
    },
    {
      $lookup: {
        from: 'cards',
        localField: '_id',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    {
      $lookup: {
        from: 'sets',
        localField: 'card.set_id',
        foreignField: 'pokemontcg_id',
        as: 'set',
      },
    },
    { $unwind: { path: '$set', preserveNullAndEmptyArrays: true } },
  )

  if (query.series) pipeline.push({ $match: { 'card.seriesSlug': query.series } })
  if (query.set) pipeline.push({ $match: { 'card.set_id': query.set } })
  if (query.rarity) pipeline.push({ $match: { 'card.rarity': query.rarity } })
  if (query.q) {
    const re = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    pipeline.push({ $match: { $or: [{ 'card.name': re }, { 'card.number': re }] } })
  }

  pipeline.push({ $sort: sortStage })

  const rows = await db.collection('userCards').aggregate<{
    _id: string
    copyCount: number
    rawCount: number
    gradedCount: number
    totalCost: number
    estValue: number
    lastAcquiredAt: Date
    variants: string[]
    card: Record<string, unknown> & { _id: unknown }
  }>(pipeline).toArray()

  return rows.map((r) => {
    const { _id: cardDocId, ...cardRest } = r.card
    return {
      cardId: r._id,
      card: { _id: String(cardDocId), ...cardRest } as unknown as PokemonCard,
      copyCount: r.copyCount,
      rawCount: r.rawCount,
      gradedCount: r.gradedCount,
      totalCost: r.totalCost,
      estValue: r.estValue,
      lastAcquiredAt: r.lastAcquiredAt,
      variants: r.variants as OwnedCardGroup['variants'],
    }
  })
}
```

- [ ] **Step 2: Run test, expect pass**

Run: `npm test -- lib/userCards.aggregations.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/userCards.ts lib/userCards.aggregations.test.ts
git commit -m "feat(userCards): getOwnedCardsGrouped aggregation with filters and sort"
```

---

## Task 1.5: Add failing test for `getCollectionStats`

**Files:**
- Modify: `lib/userCards.aggregations.test.ts`

- [ ] **Step 1: Append test**

```ts
import { getCollectionStats } from './userCards'

describe('getCollectionStats', () => {
  beforeEach(seed)

  it('returns totals over all owned copies', async () => {
    const stats = await getCollectionStats(userId)
    expect(stats.totalCopies).toBe(3)
    expect(stats.uniqueCards).toBe(2)
    expect(stats.totalSpend).toBe(165)
    expect(stats.estValue).toBe(215)
  })

  it('returns zeros for empty user', async () => {
    expect(await getCollectionStats('nobody')).toEqual({
      totalCopies: 0, uniqueCards: 0, totalSpend: 0, estValue: 0,
    })
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- lib/userCards.aggregations.test.ts`
Expected: FAIL — `getCollectionStats is not a function`.

---

## Task 1.6: Implement `getCollectionStats`

**Files:**
- Modify: `lib/userCards.ts`

- [ ] **Step 1: Append**

```ts
import type { CollectionStats } from './types'

export async function getCollectionStats(userId: string): Promise<CollectionStats> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{
    totalCopies: number
    uniqueCards: number
    totalSpend: number
    estValue: number
  }>([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalCopies: { $sum: 1 },
        uniqueCards: { $addToSet: '$cardId' },
        totalSpend: { $sum: { $ifNull: ['$cost', 0] } },
        estValue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'graded'] },
              { $ifNull: ['$gradedValue', 0] },
              { $ifNull: ['$cost', 0] },
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalCopies: 1,
        uniqueCards: { $size: '$uniqueCards' },
        totalSpend: 1,
        estValue: 1,
      },
    },
  ]).toArray()
  return rows[0] ?? { totalCopies: 0, uniqueCards: 0, totalSpend: 0, estValue: 0 }
}
```

- [ ] **Step 2: Run, expect PASS**

Run: `npm test -- lib/userCards.aggregations.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/userCards.ts lib/userCards.aggregations.test.ts
git commit -m "feat(userCards): getCollectionStats KPI aggregation"
```

---

## Task 1.7: Implement remaining analytics aggregations (TDD bundle)

**Files:**
- Modify: `lib/userCards.ts`, `lib/userCards.aggregations.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import {
  getRawVsGradedSplit,
  getBySeriesBreakdown,
  getBySetBreakdown,
  getRarityBreakdown,
  getCollectionTimeseries,
} from './userCards'

describe('getRawVsGradedSplit', () => {
  beforeEach(seed)
  it('splits copies and spend by raw/graded', async () => {
    const r = await getRawVsGradedSplit(userId)
    expect(r.raw).toEqual({ copies: 2, spend: 15 })
    expect(r.graded).toEqual({ copies: 1, spend: 150 })
  })
})

describe('getBySeriesBreakdown', () => {
  beforeEach(seed)
  it('aggregates copies and spend per series', async () => {
    const rows = await getBySeriesBreakdown(userId)
    expect(rows).toEqual([{ series: 'Original', copies: 3, spend: 165 }])
  })
})

describe('getBySetBreakdown', () => {
  beforeEach(seed)
  it('aggregates per set with name', async () => {
    const rows = await getBySetBreakdown(userId)
    expect(rows[0]).toMatchObject({ setCode: 'base1', setName: 'Base', copies: 3, spend: 165 })
  })
})

describe('getRarityBreakdown', () => {
  beforeEach(seed)
  it('aggregates copies per rarity', async () => {
    const rows = await getRarityBreakdown(userId)
    expect(rows.find((r) => r.rarity === 'Common')?.copies).toBe(2)
    expect(rows.find((r) => r.rarity === 'Rare Holo')?.copies).toBe(1)
  })
})

describe('getCollectionTimeseries', () => {
  beforeEach(seed)
  it('returns monthly cumulative copies and spend', async () => {
    const rows = await getCollectionTimeseries(userId)
    expect(rows).toEqual([
      { month: '2026-01', copiesAdded: 1, cumulativeCopies: 1, cumulativeSpend: 5 },
      { month: '2026-02', copiesAdded: 1, cumulativeCopies: 2, cumulativeSpend: 15 },
      { month: '2026-03', copiesAdded: 1, cumulativeCopies: 3, cumulativeSpend: 165 },
    ])
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- lib/userCards.aggregations.test.ts`
Expected: FAIL on each new helper.

- [ ] **Step 3: Append implementations to `lib/userCards.ts`**

```ts
export async function getRawVsGradedSplit(userId: string): Promise<{ raw: { copies: number; spend: number }; graded: { copies: number; spend: number } }> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: 'raw' | 'graded'; copies: number; spend: number }>([
    { $match: { userId } },
    { $group: { _id: '$type', copies: { $sum: 1 }, spend: { $sum: { $ifNull: ['$cost', 0] } } } },
  ]).toArray()
  const raw = rows.find((r) => r._id === 'raw') ?? { copies: 0, spend: 0 }
  const graded = rows.find((r) => r._id === 'graded') ?? { copies: 0, spend: 0 }
  return {
    raw: { copies: raw.copies ?? 0, spend: raw.spend ?? 0 },
    graded: { copies: graded.copies ?? 0, spend: graded.spend ?? 0 },
  }
}

export async function getBySeriesBreakdown(userId: string): Promise<Array<{ series: string; copies: number; spend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; copies: number; spend: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.series', copies: { $sum: 1 }, spend: { $sum: { $ifNull: ['$cost', 0] } } } },
    { $sort: { copies: -1 } },
  ]).toArray()
  return rows.map((r) => ({ series: r._id, copies: r.copies, spend: r.spend }))
}

export async function getBySetBreakdown(userId: string, limit = 10): Promise<Array<{ setCode: string; setName: string; copies: number; spend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; setName: string; copies: number; spend: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.set_id', setName: { $first: '$card.setName' }, copies: { $sum: 1 }, spend: { $sum: { $ifNull: ['$cost', 0] } } } },
    { $sort: { copies: -1 } },
    { $limit: limit },
  ]).toArray()
  return rows.map((r) => ({ setCode: r._id, setName: r.setName, copies: r.copies, spend: r.spend }))
}

export async function getRarityBreakdown(userId: string): Promise<Array<{ rarity: string; copies: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string | null; copies: number }>([
    { $match: { userId } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
    { $group: { _id: '$card.rarity', copies: { $sum: 1 } } },
    { $sort: { copies: -1 } },
  ]).toArray()
  return rows.map((r) => ({ rarity: r._id ?? 'Unknown', copies: r.copies }))
}

export async function getCollectionTimeseries(userId: string): Promise<Array<{ month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; copies: number; spend: number }>([
    { $match: { userId } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: '$acquiredAt' },
        },
        copies: { $sum: 1 },
        spend: { $sum: { $ifNull: ['$cost', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]).toArray()
  let cumCopies = 0
  let cumSpend = 0
  return rows.map((r) => {
    cumCopies += r.copies
    cumSpend += r.spend
    return { month: r._id, copiesAdded: r.copies, cumulativeCopies: cumCopies, cumulativeSpend: cumSpend }
  })
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- lib/userCards.aggregations.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/userCards.ts lib/userCards.aggregations.test.ts
git commit -m "feat(userCards): analytics aggregations (raw/graded, series, set, rarity, timeseries)"
```

---

## Task 1.8: Add `CollectionFilters` client component with URL serialisation test

**Files:**
- Create: `app/(app)/collection/CollectionFilters.tsx`
- Create: `components/collection/__tests__/CollectionFilters.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CollectionFilters from '@/app/(app)/collection/CollectionFilters'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams('series=original&sort=name'),
  usePathname: () => '/collection',
}))

describe('CollectionFilters', () => {
  it('round-trips current params and updates URL on change', () => {
    render(<CollectionFilters allSeries={[{ slug: 'original', name: 'Original' }]} allRarities={['Common']} />)
    const select = screen.getByLabelText(/series/i) as HTMLSelectElement
    expect(select.value).toBe('original')
    fireEvent.change(select, { target: { value: '' } })
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/sort=name/))
    expect(push).toHaveBeenCalledWith(expect.not.stringMatching(/series=/))
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- components/collection/__tests__/CollectionFilters.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement component**

```tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface Props {
  allSeries: Array<{ slug: string; name: string }>
  allRarities: string[]
}

export default function CollectionFilters({ allSeries, allRarities }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        type="search"
        placeholder="Search name or number"
        defaultValue={sp.get('q') ?? ''}
        onBlur={(e) => update('q', e.target.value.trim())}
        className="px-3 py-1.5 rounded border border-surface0 bg-base text-sm"
        aria-label="Search"
      />
      <label className="text-xs text-overlay1">Series
        <select
          value={sp.get('series') ?? ''}
          onChange={(e) => update('series', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="">All</option>
          {allSeries.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </label>
      <label className="text-xs text-overlay1">Rarity
        <select
          value={sp.get('rarity') ?? ''}
          onChange={(e) => update('rarity', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="">All</option>
          {allRarities.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label className="text-xs text-overlay1">Type
        <select
          value={sp.get('type') ?? ''}
          onChange={(e) => update('type', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="">All</option>
          <option value="raw">Raw</option>
          <option value="graded">Graded</option>
        </select>
      </label>
      <label className="text-xs text-overlay1">Sort
        <select
          value={sp.get('sort') ?? 'recent'}
          onChange={(e) => update('sort', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="recent">Recently added</option>
          <option value="name">Name</option>
          <option value="release">Release date</option>
          <option value="count">Copy count</option>
          <option value="cost">Total cost</option>
        </select>
      </label>
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- components/collection/__tests__/CollectionFilters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/collection/CollectionFilters.tsx components/collection/__tests__/CollectionFilters.test.tsx
git commit -m "feat(collection): URL-driven CollectionFilters client component"
```

---

## Task 1.9: Add `OwnedCardTile`

**Files:**
- Create: `app/(app)/collection/OwnedCardTile.tsx`

- [ ] **Step 1: Implement**

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { OwnedCardGroup } from '@/lib/types'

export default function OwnedCardTile({ group }: { group: OwnedCardGroup }) {
  const { card, copyCount, rawCount, gradedCount, totalCost } = group
  const homogeneous =
    (rawCount === 0 && gradedCount > 0) ? 'G' :
    (gradedCount === 0 && rawCount > 0) ? 'R' : null

  return (
    <Link href={`/cards/${card.pokemontcg_id}`} className="group flex flex-col">
      <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
        <Image
          src={card.imageUrl}
          alt={card.name}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
          className="object-cover"
        />
        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-blue text-base text-[10px] font-bold tabular-nums">
          ×{copyCount}
        </span>
      </div>
      <div className="mt-1 px-0.5">
        <p className="text-[10px] text-overlay2 truncate leading-tight">{card.name}</p>
        <p className="text-[9px] text-overlay0 tabular-nums">
          {card.setName} · {card.number}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px] font-bold text-overlay1">
            {homogeneous ?? `R ${rawCount} · G ${gradedCount}`}
          </span>
          {totalCost > 0 && (
            <span className="text-[9px] text-mauve tabular-nums">€{totalCost.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/collection/OwnedCardTile.tsx
git commit -m "feat(collection): OwnedCardTile component"
```

---

## Task 1.10: Build `/collection` page

**Files:**
- Create: `app/(app)/collection/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOwnedCardsGrouped, getCollectionStats } from '@/lib/userCards'
import { getSeries } from '@/lib/sets'
import { parseOwnedCardsQuery } from '@/lib/schemas/ownedCardsQuery'
import CollectionFilters from './CollectionFilters'
import OwnedCardTile from './OwnedCardTile'
import Link from 'next/link'

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/collection')

  const params = await searchParams
  const query = parseOwnedCardsQuery(params)

  const [groups, stats, allSeries] = await Promise.all([
    getOwnedCardsGrouped(session.user.id, query),
    getCollectionStats(session.user.id),
    getSeries(),
  ])

  const allRarities = Array.from(new Set(groups.map((g) => g.card.rarity).filter((r): r is string => !!r))).sort()

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-2xl text-text">My Cards</h1>
        <p className="text-sm text-overlay1 tabular-nums">
          {stats.uniqueCards} unique · {stats.totalCopies} copies
        </p>
      </div>

      <CollectionFilters
        allSeries={allSeries.map((s) => ({ slug: s.slug, name: s.name }))}
        allRarities={allRarities}
      />

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay1 mb-3">You don&apos;t own any cards yet.</p>
          <Link href="/browse" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold hover:bg-blue/90 transition-colors">
            Browse cards →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {groups.map((g) => <OwnedCardTile key={g.cardId} group={g} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manually verify in dev server**

Run: `npm run dev` then visit `http://localhost:3000/collection`
Expected: page loads, lists owned cards, filters update URL.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/collection/page.tsx
git commit -m "feat(collection): /collection My Cards page"
```

---

# PHASE 2 — Analytics

## Task 2.1: Add Recharts dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run: `npm install recharts`
Expected: package added, lockfile updated.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts for analytics charts"
```

---

## Task 2.2: KPI cards component

**Files:**
- Create: `app/(app)/analytics/charts/KpiCards.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { CollectionStats } from '@/lib/types'

export default function KpiCards({ stats }: { stats: CollectionStats }) {
  const items = [
    { label: 'Total copies', value: stats.totalCopies.toLocaleString() },
    { label: 'Unique cards', value: stats.uniqueCards.toLocaleString() },
    { label: 'Total spend', value: `€${stats.totalSpend.toFixed(2)}` },
    { label: 'Estimated value', value: `€${stats.estValue.toFixed(2)}` },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl bg-mantle border border-surface0 p-4">
          <p className="text-xs text-overlay0 uppercase tracking-wider">{i.label}</p>
          <p className="text-2xl font-russo text-text mt-1 tabular-nums">{i.value}</p>
        </div>
      ))}
      <p className="text-[10px] text-overlay0 col-span-2 md:col-span-4">
        Value tracking is acquisition-based (graded value or purchase cost). Live market data is not used.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/(app)/analytics/charts/KpiCards.tsx
git commit -m "feat(analytics): KPI cards"
```

---

## Task 2.3: Chart components (Raw/Graded donut + Rarity bar)

**Files:**
- Create: `app/(app)/analytics/charts/RawVsGradedDonut.tsx`
- Create: `app/(app)/analytics/charts/RarityChart.tsx`

- [ ] **Step 1: RawVsGradedDonut**

```tsx
'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface Props {
  data: { raw: { copies: number; spend: number }; graded: { copies: number; spend: number } }
}

export default function RawVsGradedDonut({ data }: Props) {
  const chartData = [
    { name: 'Raw', value: data.raw.copies },
    { name: 'Graded', value: data.graded.copies },
  ]
  const colors = ['var(--color-sapphire)', 'var(--color-mauve)']
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">Raw vs Graded</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
            {chartData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: RarityChart**

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function RarityChart({ data }: { data: Array<{ rarity: string; copies: number }> }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">By Rarity</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 24 }}>
          <XAxis dataKey="rarity" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="copies" fill="var(--color-blue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/analytics/charts/RawVsGradedDonut.tsx app/(app)/analytics/charts/RarityChart.tsx
git commit -m "feat(analytics): raw/graded donut + rarity bar charts"
```

---

## Task 2.4: Series + Set bar charts

**Files:**
- Create: `app/(app)/analytics/charts/BySeriesChart.tsx`
- Create: `app/(app)/analytics/charts/BySetChart.tsx`

- [ ] **Step 1: BySeriesChart**

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function BySeriesChart({ data }: { data: Array<{ series: string; copies: number; spend: number }> }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">By Series</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 24 }}>
          <XAxis dataKey="series" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="copies" fill="var(--color-mauve)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: BySetChart**

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function BySetChart({ data }: { data: Array<{ setCode: string; setName: string; copies: number; spend: number }> }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">Top 10 Sets</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} layout="vertical" margin={{ left: 60, right: 8, top: 8, bottom: 8 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
          <YAxis type="category" dataKey="setName" tick={{ fontSize: 10 }} width={120} />
          <Tooltip />
          <Bar dataKey="copies" fill="var(--color-teal)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/analytics/charts/BySeriesChart.tsx app/(app)/analytics/charts/BySetChart.tsx
git commit -m "feat(analytics): series and set bar charts"
```

---

## Task 2.5: Acquisition + Spend timelines

**Files:**
- Create: `app/(app)/analytics/charts/AcquisitionTimeline.tsx`
- Create: `app/(app)/analytics/charts/SpendTimeline.tsx`

- [ ] **Step 1: AcquisitionTimeline**

```tsx
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

interface Row { month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }

export default function AcquisitionTimeline({ data }: { data: Row[] }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">Acquisitions over time</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-surface0)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="cumulativeCopies" stroke="var(--color-blue)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: SpendTimeline**

```tsx
'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

interface Row { month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }

export default function SpendTimeline({ data }: { data: Row[] }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">Spend over time</h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-surface0)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Area type="monotone" dataKey="cumulativeSpend" stroke="var(--color-mauve)" fill="var(--color-mauve)" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/analytics/charts/AcquisitionTimeline.tsx app/(app)/analytics/charts/SpendTimeline.tsx
git commit -m "feat(analytics): acquisition and spend timelines"
```

---

## Task 2.6: Free-tier teaser

**Files:**
- Create: `app/(app)/analytics/AnalyticsTeaser.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from 'next/link'

export default function AnalyticsTeaser() {
  return (
    <div className="relative">
      <div className="filter blur-md pointer-events-none select-none grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-mantle border border-surface0" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center bg-base/95 border border-surface0 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl text-text mb-2">Unlock collection analytics</h2>
          <p className="text-sm text-overlay1 mb-4">Upgrade to Pro to see charts of your collection.</p>
          <Link href="/upgrade" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold hover:bg-blue/90 transition-colors">
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/analytics/AnalyticsTeaser.tsx
git commit -m "feat(analytics): free-tier teaser"
```

---

## Task 2.7: `/analytics` page wiring (with `unstable_cache`)

**Files:**
- Create: `app/(app)/analytics/page.tsx`
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Implement page**

```tsx
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  getCollectionStats,
  getRawVsGradedSplit,
  getRarityBreakdown,
  getBySeriesBreakdown,
  getBySetBreakdown,
  getCollectionTimeseries,
} from '@/lib/userCards'
import KpiCards from './charts/KpiCards'
import RawVsGradedDonut from './charts/RawVsGradedDonut'
import RarityChart from './charts/RarityChart'
import BySeriesChart from './charts/BySeriesChart'
import BySetChart from './charts/BySetChart'
import AcquisitionTimeline from './charts/AcquisitionTimeline'
import SpendTimeline from './charts/SpendTimeline'
import AnalyticsTeaser from './AnalyticsTeaser'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/analytics')
  const userId = session.user.id
  const isPro = session.user.tier === 'pro'

  const cachedStats = unstable_cache(
    async (uid: string) => getCollectionStats(uid),
    ['collection-stats'],
    { revalidate: 60, tags: [`user:${userId}:stats`] },
  )
  const stats = await cachedStats(userId)

  if (stats.totalCopies === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl text-text mb-2">Analytics</h1>
        <p className="text-overlay1 mb-4">Add your first card to unlock collection analytics.</p>
        <Link href="/browse" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold">Browse cards →</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-text">Analytics</h1>
      <KpiCards stats={stats} />
      {isPro ? <ProCharts userId={userId} /> : <AnalyticsTeaser />}
    </div>
  )
}

async function ProCharts({ userId }: { userId: string }) {
  const [rg, rarity, series, sets, ts] = await Promise.all([
    getRawVsGradedSplit(userId),
    getRarityBreakdown(userId),
    getBySeriesBreakdown(userId),
    getBySetBreakdown(userId, 10),
    getCollectionTimeseries(userId),
  ])
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <RawVsGradedDonut data={rg} />
      <RarityChart data={rarity} />
      <BySeriesChart data={series} />
      <BySetChart data={sets} />
      <div className="md:col-span-2"><AcquisitionTimeline data={ts} /></div>
      <div className="md:col-span-2"><SpendTimeline data={ts} /></div>
    </div>
  )
}
```

- [ ] **Step 2: Update sidebar Analytics rendering**

In `components/layout/Sidebar.tsx`, locate the `NavItem` lock branch. Change Analytics so the link is always navigable (the page itself shows the teaser). Replace the Analytics-specific lock behaviour: drop the `pro: true` early-return for Analytics by leaving the link active even when locked.

Edit the block where `item.pro && !isPro` short-circuits. Render Analytics as a normal `<Link>` regardless of tier:

```tsx
// inside NavItem render:
if (item.pro && !isPro && item.href !== '/analytics') {
  return (
    <span className="...locked...">
      <item.Icon /> {item.label} <Lock className="ml-auto" size={12} />
    </span>
  )
}
return (
  <Link href={item.href} className="...">
    <item.Icon /> {item.label}
  </Link>
)
```

- [ ] **Step 3: Manually verify**

Run dev server, visit `/analytics` as free user (sees KPIs + blurred teaser), then as pro (sees all charts).

- [ ] **Step 4: Commit**

```bash
git add app/(app)/analytics/page.tsx components/layout/Sidebar.tsx
git commit -m "feat(analytics): /analytics page with KPIs, charts, and free-tier teaser"
```

---

# PHASE 3 — Wishlist

## Task 3.1: Wishlist Zod schemas + tests

**Files:**
- Create: `lib/schemas/wishlist.ts`
- Create: `lib/schemas/wishlist.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { addToWishlistInputSchema, wishlistItemSchema } from './wishlist'

describe('wishlist schemas', () => {
  it('accepts a minimal valid input', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c1' })).not.toThrow()
  })
  it('rejects empty cardId', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: '' })).toThrow()
  })
  it('coerces string addedAt to Date', () => {
    const r = wishlistItemSchema.parse({ userId: 'u', cardId: 'c', addedAt: '2026-01-01' })
    expect(r.addedAt).toBeInstanceOf(Date)
  })
  it('rejects oversize note', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c', note: 'x'.repeat(201) })).toThrow()
  })
  it('accepts priority enum', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c', priority: 'high' })).not.toThrow()
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c', priority: 'urgent' as never })).toThrow()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- lib/schemas/wishlist.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement schemas**

```ts
import { z } from 'zod'

export const wishlistPriorityEnum = z.enum(['low', 'med', 'high'])

export const wishlistItemSchema = z.object({
  userId: z.string().min(1),
  cardId: z.string().min(1),
  addedAt: z.coerce.date(),
  note: z.string().max(200).optional(),
  priority: wishlistPriorityEnum.optional(),
})

export const addToWishlistInputSchema = z.object({
  cardId: z.string().min(1),
  note: z.string().max(200).optional(),
  priority: wishlistPriorityEnum.optional(),
})

export type WishlistPriority = z.infer<typeof wishlistPriorityEnum>
export type AddToWishlistInput = z.infer<typeof addToWishlistInputSchema>
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- lib/schemas/wishlist.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/wishlist.ts lib/schemas/wishlist.test.ts
git commit -m "feat(schemas): wishlist zod schemas"
```

---

## Task 3.2: `WishlistItem` type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append**

```ts
export type WishlistPriority = 'low' | 'med' | 'high'

export interface WishlistItem {
  _id?: string
  userId: string
  cardId: string
  addedAt: Date
  note?: string
  priority?: WishlistPriority
}
```

- [ ] **Step 2: Compile + commit**

Run: `npx tsc --noEmit`

```bash
git add lib/types.ts
git commit -m "feat(types): WishlistItem"
```

---

## Task 3.3: `lib/wishlist.ts` read helpers + tests

**Files:**
- Create: `lib/wishlist.ts`
- Create: `lib/wishlist.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getDb } from './db'
import {
  addToWishlist,
  removeFromWishlist,
  isOnWishlist,
  getWishlistedIdsForUser,
  countWishlist,
  getWishlistForUser,
  FREE_TIER_WISHLIST_CAP,
} from './wishlist'

const userId = 'wishlist-test-user'

beforeEach(async () => {
  const db = await getDb()
  await db.collection('wishlist').deleteMany({ userId })
  await db.collection('cards').deleteMany({ pokemontcg_id: { $in: ['w1', 'w2'] } })
  await db.collection('cards').insertMany([
    { pokemontcg_id: 'w1', name: 'Mew', number: '151', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Promo', types: [], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', cardmarketPrice: null },
    { pokemontcg_id: 'w2', name: 'Mewtwo', number: '150', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Rare Holo', types: [], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', cardmarketPrice: null },
  ])
})

describe('wishlist helpers', () => {
  it('add → ok, idempotent', async () => {
    const r1 = await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    expect(r1.ok).toBe(true)
    const r2 = await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    expect(r2.ok).toBe(true)
    expect(await countWishlist(userId)).toBe(1)
  })

  it('isOnWishlist round-trip', async () => {
    expect(await isOnWishlist(userId, 'w1')).toBe(false)
    await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    expect(await isOnWishlist(userId, 'w1')).toBe(true)
    await removeFromWishlist(userId, 'w1')
    expect(await isOnWishlist(userId, 'w1')).toBe(false)
  })

  it('free-tier cap enforced', async () => {
    const db = await getDb()
    const docs = Array.from({ length: FREE_TIER_WISHLIST_CAP }).map((_, i) => ({
      userId, cardId: `f${i}`, addedAt: new Date(),
    }))
    await db.collection('wishlist').insertMany(docs)
    const r = await addToWishlist(userId, { cardId: 'overflow' }, 'free')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('cap_reached')
  })

  it('pro tier exceeds free cap', async () => {
    const db = await getDb()
    const docs = Array.from({ length: FREE_TIER_WISHLIST_CAP }).map((_, i) => ({
      userId, cardId: `f${i}`, addedAt: new Date(),
    }))
    await db.collection('wishlist').insertMany(docs)
    const r = await addToWishlist(userId, { cardId: 'extra' }, 'pro')
    expect(r.ok).toBe(true)
  })

  it('getWishlistedIdsForUser returns Set', async () => {
    await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    await addToWishlist(userId, { cardId: 'w2' }, 'pro')
    const ids = await getWishlistedIdsForUser(userId)
    expect(ids.has('w1')).toBe(true)
    expect(ids.has('w2')).toBe(true)
    expect(ids.size).toBe(2)
  })

  it('getWishlistForUser joins cards', async () => {
    await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    const items = await getWishlistForUser(userId)
    expect(items[0].card.name).toBe('Mew')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- lib/wishlist.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `lib/wishlist.ts`**

```ts
import { getDb } from './db'
import type { WishlistItem, PokemonCard, Tier } from './types'
import { addToWishlistInputSchema, type AddToWishlistInput } from './schemas/wishlist'

export const FREE_TIER_WISHLIST_CAP = 25

type AddResult = { ok: true; item: WishlistItem } | { ok: false; reason: 'cap_reached' | 'invalid_input' }

function serialize(doc: Record<string, unknown>): WishlistItem {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as WishlistItem
}

export async function addToWishlist(userId: string, input: AddToWishlistInput, tier: Tier): Promise<AddResult> {
  const parsed = addToWishlistInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  const db = await getDb()

  const existing = await db.collection('wishlist').findOne({ userId, cardId: parsed.data.cardId })
  if (existing) return { ok: true, item: serialize(existing as Record<string, unknown>) }

  if (tier === 'free') {
    const count = await db.collection('wishlist').countDocuments({ userId })
    if (count >= FREE_TIER_WISHLIST_CAP) return { ok: false, reason: 'cap_reached' }
  }

  const doc = {
    userId,
    cardId: parsed.data.cardId,
    addedAt: new Date(),
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
    ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
  }
  const res = await db.collection('wishlist').insertOne(doc)
  return { ok: true, item: { ...doc, _id: String(res.insertedId) } }
}

export async function removeFromWishlist(userId: string, cardId: string): Promise<{ ok: true }> {
  const db = await getDb()
  await db.collection('wishlist').deleteOne({ userId, cardId })
  return { ok: true }
}

export async function isOnWishlist(userId: string, cardId: string): Promise<boolean> {
  const db = await getDb()
  return (await db.collection('wishlist').countDocuments({ userId, cardId }, { limit: 1 })) > 0
}

export async function countWishlist(userId: string): Promise<number> {
  const db = await getDb()
  return db.collection('wishlist').countDocuments({ userId })
}

export async function getWishlistedIdsForUser(userId: string): Promise<Set<string>> {
  const db = await getDb()
  const docs = await db.collection('wishlist').find({ userId }, { projection: { cardId: 1 } }).toArray()
  return new Set(docs.map((d) => d.cardId as string))
}

export async function getWishlistForUser(userId: string): Promise<Array<WishlistItem & { card: PokemonCard }>> {
  const db = await getDb()
  const rows = await db.collection('wishlist').aggregate<Record<string, unknown>>([
    { $match: { userId } },
    { $sort: { addedAt: -1 } },
    { $lookup: { from: 'cards', localField: 'cardId', foreignField: 'pokemontcg_id', as: 'card' } },
    { $unwind: '$card' },
  ]).toArray()
  return rows.map((r) => {
    const { _id, card, ...rest } = r as { _id: unknown; card: Record<string, unknown> & { _id: unknown } }
    const { _id: cId, ...cardRest } = card
    return {
      _id: String(_id),
      ...(rest as Omit<WishlistItem, '_id'>),
      card: { _id: String(cId), ...cardRest } as unknown as PokemonCard,
    }
  })
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- lib/wishlist.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/wishlist.ts lib/wishlist.test.ts
git commit -m "feat(wishlist): lib/wishlist.ts with cap enforcement and tests"
```

---

## Task 3.4: Wishlist indexes migration

**Files:**
- Create: `scripts/migrate-wishlist-indexes.ts`

- [ ] **Step 1: Implement**

```ts
import 'dotenv/config'
import { getDb } from '@/lib/db'

async function run() {
  const db = await getDb()
  await db.collection('wishlist').createIndex({ userId: 1, cardId: 1 }, { unique: true })
  await db.collection('wishlist').createIndex({ userId: 1, addedAt: -1 })
  console.log('wishlist indexes created')
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Run once**

Run: `npx tsx scripts/migrate-wishlist-indexes.ts`
Expected: prints "wishlist indexes created".

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-wishlist-indexes.ts
git commit -m "chore(db): wishlist indexes migration script"
```

---

## Task 3.5: Wishlist server actions + tests

**Files:**
- Create: `app/(app)/wishlist/actions.ts`
- Create: `app/(app)/wishlist/actions.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDb } from '@/lib/db'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
import { auth } from '@/lib/auth'
import { addWishlistAction, removeWishlistAction } from './actions'

const userId = 'sa-wishlist-user'

beforeEach(async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId, tier: 'free' } } as never)
  const db = await getDb()
  await db.collection('wishlist').deleteMany({ userId })
})

describe('wishlist server actions', () => {
  it('addWishlistAction inserts item', async () => {
    const r = await addWishlistAction({ cardId: 'c1' })
    expect(r.ok).toBe(true)
  })
  it('addWishlistAction rejects when not signed in', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const r = await addWishlistAction({ cardId: 'c1' })
    expect(r.ok).toBe(false)
  })
  it('addWishlistAction rejects invalid input', async () => {
    const r = await addWishlistAction({ cardId: '' })
    expect(r.ok).toBe(false)
  })
  it('removeWishlistAction is owner-scoped', async () => {
    const db = await getDb()
    await db.collection('wishlist').insertOne({ userId: 'someone-else', cardId: 'c1', addedAt: new Date() })
    await removeWishlistAction('c1')
    const remains = await db.collection('wishlist').countDocuments({ userId: 'someone-else', cardId: 'c1' })
    expect(remains).toBe(1)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- app/\(app\)/wishlist/actions.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement actions**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { addToWishlist, removeFromWishlist } from '@/lib/wishlist'
import { addToWishlistInputSchema, type AddToWishlistInput } from '@/lib/schemas/wishlist'

type ActionResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' | 'invalid_input' | 'cap_reached' }

export async function addWishlistAction(input: AddToWishlistInput): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' }
  const parsed = addToWishlistInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  const r = await addToWishlist(session.user.id, parsed.data, session.user.tier ?? 'free')
  if (!r.ok) return { ok: false, reason: r.reason === 'cap_reached' ? 'cap_reached' : 'invalid_input' }
  revalidatePath('/wishlist')
  return { ok: true }
}

export async function removeWishlistAction(cardId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' }
  if (typeof cardId !== 'string' || cardId.length === 0) return { ok: false, reason: 'invalid_input' }
  await removeFromWishlist(session.user.id, cardId)
  revalidatePath('/wishlist')
  return { ok: true }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- app/\(app\)/wishlist/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/wishlist/actions.ts app/(app)/wishlist/actions.test.ts
git commit -m "feat(wishlist): server actions with auth + zod validation"
```

---

## Task 3.6: `WishlistStar` component + tests

**Files:**
- Create: `components/wishlist/WishlistStar.tsx`
- Create: `components/wishlist/__tests__/WishlistStar.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WishlistStar from '@/components/wishlist/WishlistStar'

vi.mock('@/app/(app)/wishlist/actions', () => ({
  addWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
  removeWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('WishlistStar', () => {
  it('hidden when logged out', () => {
    const { container } = render(<WishlistStar cardId="c1" initialState="logged-out" />)
    expect(container.firstChild).toBeNull()
  })
  it('toggles from unfilled → filled on click', async () => {
    render(<WishlistStar cardId="c1" initialState="unfilled" />)
    const btn = screen.getByRole('button', { name: /add to wishlist/i })
    fireEvent.click(btn)
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'))
  })
  it('shows cap dialog when capped', () => {
    render(<WishlistStar cardId="c1" initialState="capped" />)
    fireEvent.click(screen.getByRole('button', { name: /wishlist full/i }))
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- components/wishlist/__tests__/WishlistStar.test.tsx`

- [ ] **Step 3: Implement component**

```tsx
'use client'
import { useState, useTransition } from 'react'
import { Star, Lock } from 'lucide-react'
import Link from 'next/link'
import { addWishlistAction, removeWishlistAction } from '@/app/(app)/wishlist/actions'

type State = 'logged-out' | 'unfilled' | 'filled' | 'capped'

export default function WishlistStar({ cardId, initialState, className = '' }: { cardId: string; initialState: State; className?: string }) {
  const [state, setState] = useState<State>(initialState)
  const [, startTransition] = useTransition()
  const [showCapDialog, setShowCapDialog] = useState(false)

  if (state === 'logged-out') return null

  if (state === 'capped') {
    return (
      <>
        <button
          type="button"
          aria-label="Wishlist full — upgrade"
          className={`p-1.5 rounded-full bg-base/80 hover:bg-base transition-colors ${className}`}
          onClick={() => setShowCapDialog(true)}
        >
          <Star size={16} className="text-overlay0" />
        </button>
        {showCapDialog && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setShowCapDialog(false)}>
            <div className="bg-base rounded-xl p-6 max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg text-text mb-2 flex items-center gap-2"><Lock size={16} /> Wishlist full</h3>
              <p className="text-sm text-overlay1 mb-4">Free accounts can wishlist 25 cards. Upgrade to Pro for unlimited.</p>
              <Link href="/upgrade" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold">Upgrade</Link>
            </div>
          </div>
        )}
      </>
    )
  }

  const filled = state === 'filled'

  function toggle() {
    if (filled) {
      setState('unfilled')
      startTransition(async () => {
        const r = await removeWishlistAction(cardId)
        if (!r.ok) setState('filled')
      })
    } else {
      setState('filled')
      startTransition(async () => {
        const r = await addWishlistAction({ cardId })
        if (!r.ok) {
          if (r.reason === 'cap_reached') setState('capped')
          else setState('unfilled')
        }
      })
    }
  }

  return (
    <button
      type="button"
      aria-label={filled ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={filled}
      onClick={toggle}
      className={`p-1.5 rounded-full bg-base/80 hover:bg-base transition-colors ${className}`}
    >
      <Star size={16} className={filled ? 'fill-yellow text-yellow' : 'text-overlay1'} />
    </button>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- components/wishlist/__tests__/WishlistStar.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add components/wishlist/WishlistStar.tsx components/wishlist/__tests__/WishlistStar.test.tsx
git commit -m "feat(wishlist): WishlistStar toggle with cap dialog"
```

---

## Task 3.7: Wire `WishlistStar` into `CardsGrid`

**Files:**
- Modify: `components/catalog/CardsGrid.tsx`

- [ ] **Step 1: Update props and overlay**

Add prop `wishlistedIds?: Set<string>` and `userIsLoggedIn?: boolean` and `userIsCapped?: boolean`. Render `WishlistStar` overlay top-left of each card image.

```tsx
import WishlistStar from '@/components/wishlist/WishlistStar'

export default function CardsGrid({ cards, set, variantCounts, wishlistedIds, userState }: {
  cards: PokemonCard[]
  set: PokemonSet
  variantCounts?: Map<string, number>
  wishlistedIds?: Set<string>
  userState?: 'logged-out' | 'free-below-cap' | 'free-capped' | 'pro'
}) {
  // ...existing body...
  // Inside the card map, wrap the image div to add the star:
  // <div className="relative ...">
  //   <Image .../>
  //   {userState && (
  //     <WishlistStar
  //       cardId={card.pokemontcg_id}
  //       initialState={
  //         userState === 'logged-out' ? 'logged-out'
  //         : wishlistedIds?.has(card.pokemontcg_id) ? 'filled'
  //         : userState === 'free-capped' ? 'capped'
  //         : 'unfilled'
  //       }
  //       className="absolute top-1 left-1 z-10"
  //     />
  //   )}
  // </div>
}
```

Apply edit: locate the `<div className="relative aspect-[245/342] ...">` block and inject the `WishlistStar` after the `<Image />` element. Keep the click handler on `Star` from bubbling into the parent `<Link>` by wrapping the star outside the `<Link>` or stopping propagation. Cleanest fix: move the star out of `<Link>` by restructuring — put the `<Link>` only around the `<Image>` and the text block, and place the star as a sibling absolute element on the outer `relative` wrapper.

Restructure:

```tsx
<div key={card.pokemontcg_id} className="flex flex-col">
  <div className="relative">
    <Link href={`/cards/${card.pokemontcg_id}`} className="group block">
      <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
        <Image src={card.imageUrl} alt={card.name} fill sizes="..." className="object-cover" />
      </div>
    </Link>
    {userState && (
      <WishlistStar
        cardId={card.pokemontcg_id}
        initialState={
          userState === 'logged-out' ? 'logged-out'
          : wishlistedIds?.has(card.pokemontcg_id) ? 'filled'
          : userState === 'free-capped' ? 'capped'
          : 'unfilled'
        }
        className="absolute top-1 left-1 z-10"
      />
    )}
  </div>
  <Link href={`/cards/${card.pokemontcg_id}`} className="group">
    <div className="mt-1 px-0.5">{/* existing name/price/number block */}</div>
  </Link>
  {/* existing variant chips block */}
</div>
```

- [ ] **Step 2: Compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/catalog/CardsGrid.tsx
git commit -m "feat(catalog): WishlistStar overlay on CardsGrid"
```

---

## Task 3.8: Pass `wishlistedIds` from browse pages

**Files:**
- Modify: `app/(catalog)/browse/page.tsx`
- Modify: `app/(catalog)/browse/[series]/page.tsx`
- Modify: `app/(catalog)/browse/[series]/[set]/page.tsx`

- [ ] **Step 1: Browse root**

In each page, after `auth()`, add:

```tsx
import { getWishlistedIdsForUser, countWishlist, FREE_TIER_WISHLIST_CAP } from '@/lib/wishlist'

// in server component:
const userId = session?.user?.id
const tier = session?.user?.tier ?? 'free'
const [wishlistedIds, wishlistCount] = userId
  ? await Promise.all([getWishlistedIdsForUser(userId), countWishlist(userId)])
  : [new Set<string>(), 0]
const userState: 'logged-out' | 'free-below-cap' | 'free-capped' | 'pro' =
  !userId ? 'logged-out'
  : tier === 'pro' ? 'pro'
  : wishlistCount >= FREE_TIER_WISHLIST_CAP ? 'free-capped'
  : 'free-below-cap'
```

Pass `wishlistedIds` and `userState` props through to any `<CardsGrid />` usage.

- [ ] **Step 2: Repeat for `[series]/page.tsx`**

Same pattern — add the lookup and pass through.

- [ ] **Step 3: Repeat for `[series]/[set]/page.tsx`**

Same pattern. Locate the existing `<CardsGrid cards={...} set={...} variantCounts={...} />` call and add the two new props.

- [ ] **Step 4: Manually verify**

Visit `/browse` as logged-in user — stars appear, click toggles.

- [ ] **Step 5: Commit**

```bash
git add app/(catalog)/browse/page.tsx 'app/(catalog)/browse/[series]/page.tsx' 'app/(catalog)/browse/[series]/[set]/page.tsx'
git commit -m "feat(catalog): thread wishlistedIds + userState into browse pages"
```

---

## Task 3.9: Add `WishlistStar` on card detail page

**Files:**
- Modify: `app/(catalog)/cards/[id]/page.tsx`

- [ ] **Step 1: Edit**

Import:

```tsx
import WishlistStar from '@/components/wishlist/WishlistStar'
import { isOnWishlist, countWishlist, FREE_TIER_WISHLIST_CAP } from '@/lib/wishlist'
```

In the page body, after `auth()`:

```tsx
const userId = session?.user?.id
const tier = session?.user?.tier ?? 'free'
const [onWishlist, wlCount] = userId
  ? await Promise.all([isOnWishlist(userId, params.id), countWishlist(userId)])
  : [false, 0]
const wlState: 'logged-out' | 'unfilled' | 'filled' | 'capped' =
  !userId ? 'logged-out'
  : onWishlist ? 'filled'
  : tier === 'free' && wlCount >= FREE_TIER_WISHLIST_CAP ? 'capped'
  : 'unfilled'
```

In JSX, near the `<OwnedCounter />`:

```tsx
<div className="flex items-center gap-2">
  <OwnedCounter ... />
  <WishlistStar cardId={params.id} initialState={wlState} />
</div>
```

- [ ] **Step 2: Compile + manual verify**

Run: `npx tsc --noEmit`
Visit a card page — star appears beside owned counter.

- [ ] **Step 3: Commit**

```bash
git add app/(catalog)/cards/[id]/page.tsx
git commit -m "feat(card-detail): WishlistStar next to OwnedCounter"
```

---

## Task 3.10: `/wishlist` page

**Files:**
- Create: `app/(app)/wishlist/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/lib/auth'
import { getWishlistForUser, countWishlist, FREE_TIER_WISHLIST_CAP } from '@/lib/wishlist'

export default async function WishlistPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/wishlist')
  const userId = session.user.id
  const tier = session.user.tier ?? 'free'
  const [items, count] = await Promise.all([getWishlistForUser(userId), countWishlist(userId)])

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-2xl text-text">Wishlist</h1>
        <p className="text-sm text-overlay1 tabular-nums">
          {tier === 'free' ? `${count} / ${FREE_TIER_WISHLIST_CAP}` : `${count}`}
          {tier === 'free' && count >= FREE_TIER_WISHLIST_CAP && (
            <Link href="/upgrade" className="ml-2 text-blue hover:underline">Upgrade for unlimited</Link>
          )}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay1 mb-3">Star cards from <Link href="/browse" className="text-blue hover:underline">Browse →</Link> to add them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {items.map((it) => (
            <Link key={it._id} href={`/cards/${it.cardId}`} className="group flex flex-col">
              <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
                <Image src={it.card.imageUrl} alt={it.card.name} fill sizes="(max-width: 640px) 33vw, 14vw" className="object-cover" />
              </div>
              <p className="mt-1 px-0.5 text-[10px] text-overlay2 truncate">{it.card.name}</p>
              <p className="px-0.5 text-[9px] text-overlay0">{it.card.setName}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manually verify**

Run dev server, visit `/wishlist` after starring a few cards.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/wishlist/page.tsx
git commit -m "feat(wishlist): /wishlist page"
```

---

## Task 3.11: Drop `pro: true` from sidebar Wishlist

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Edit**

Find the Wishlist entry in `navItems`:

```tsx
{ href: '/wishlist', label: 'Wishlist', Icon: Star, section: 'collection', pro: true, matchPrefix: false },
```

Change to:

```tsx
{ href: '/wishlist', label: 'Wishlist', Icon: Star, section: 'collection', pro: false, matchPrefix: false },
```

- [ ] **Step 2: Manually verify**

As a free user, sidebar shows Wishlist as a normal link.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(sidebar): wishlist no longer pro-gated"
```

---

## Task 3.12: Final test sweep + finish branch

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Manual smoke**

Verify all three pages:
- `/collection` — owned cards grid, filters work, sort works
- `/analytics` — KPIs render; pro shows charts; free shows teaser; empty state if no copies
- `/wishlist` — empty + filled states; cap indicator for free
- Stars on browse + card detail; cap dialog on overflow attempt

- [ ] **Step 4: Hand off to finishing-a-development-branch skill**

Per the executing-plans skill, complete development by invoking superpowers:finishing-a-development-branch.

---

## Self-Review Notes

- All seven planned aggregations implemented (`getOwnedCardsGrouped`, `getCollectionStats`, `getRawVsGradedSplit`, `getBySeriesBreakdown`, `getBySetBreakdown`, `getRarityBreakdown`, `getCollectionTimeseries`).
- Spec-required URL params (`series, set, rarity, variant, type, condition, sort, q`) all parsed via `parseOwnedCardsQuery` and applied in `getOwnedCardsGrouped`.
- Free-tier 25-cap enforced server-side in `lib/wishlist.ts` (Task 3.3) and surfaced through `WishlistStar` capped state.
- N+1 avoided via `getWishlistedIdsForUser` single-query (Task 3.3) called once per browse page (Task 3.8).
- `unstable_cache` (60s) wraps `getCollectionStats` on the analytics page (Task 2.7).
- Sidebar gating: Analytics drops the lock branch but keeps the `pro` flag (Task 2.7); Wishlist drops `pro: true` entirely (Task 3.11).
- Recharts is the only new dependency (Task 2.1); chart components are `'use client'` so they lazy-bundle on the analytics route only.
- Tests follow CLAUDE.md "no mocks" rule: aggregation tests hit real DB; only auth is mocked in server-action tests because it's the boundary.
