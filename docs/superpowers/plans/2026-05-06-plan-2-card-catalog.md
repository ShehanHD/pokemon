# Plan 2: Card Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public SSR card catalog with pokemontcg.io data — a local seed script, series → sets → cards browse hierarchy, and a card detail page.

**Architecture:** Public routes live in a new `(catalog)` route group with an optional-auth layout (session may be null — no redirect). Data is fetched from MongoDB (seeded from pokemontcg.io). Cards grid is a client component for filter chips; all browse pages are server-rendered for SEO.

**Tech Stack:** Next.js 15 App Router (SSR), MongoDB (getDb pattern), pokemontcg.io v2 API, Zod v4 (schema validation at API boundary), tsx + dotenv (seed script), lucide-react (icons), Tailwind CSS (design system tokens from globals.css).

---

## File Map

**New files:**
- `lib/schemas/pokemontcg.ts` — Zod schemas for pokemontcg.io API responses
- `lib/schemas/__tests__/pokemontcg.test.ts` — schema parse/reject tests
- `lib/pokemontcg.ts` — API client (fetchAllSets, fetchCardsBySet, fetchCard)
- `lib/__tests__/pokemontcg.test.ts` — API client tests (fetch stub)
- `lib/sets.ts` — MongoDB queries for sets collection
- `lib/__tests__/sets.test.ts` — sets query tests (MongoDB mock)
- `lib/cards.ts` — MongoDB queries for cards collection
- `lib/__tests__/cards.test.ts` — cards query tests (MongoDB mock)
- `scripts/seed.ts` — local seed script (tsx + dotenv)
- `app/(catalog)/layout.tsx` — optional-auth layout (session may be null)
- `app/(catalog)/browse/page.tsx` — series list SSR page
- `app/(catalog)/browse/[series]/page.tsx` — sets list SSR page
- `app/(catalog)/browse/[series]/[set]/page.tsx` — cards in set SSR page
- `app/(catalog)/cards/[id]/page.tsx` — card detail SSR page
- `components/catalog/Breadcrumb.tsx` — reusable breadcrumb component
- `components/catalog/CardsGrid.tsx` — client component (filter chips + card grid)

**Modified files:**
- `lib/types.ts` — append PokemonSet and PokemonCard interfaces
- `middleware.ts` — remove `/browse` and `/cards` from protectedPrefixes
- `next.config.ts` — add images.remotePatterns for images.pokemontcg.io
- `package.json` — add tsx + dotenv devDependencies, add `seed` script
- `components/layout/Topbar.tsx` — prefix match instead of exact match
- `components/layout/Sidebar.tsx` — startsWith active check for browse/cards

**Deleted files:**
- `app/(app)/browse/page.tsx` — stub replaced by (catalog) group

---

### Task 1: Extend `lib/types.ts` with PokemonSet and PokemonCard

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append PokemonSet and PokemonCard to `lib/types.ts`**

Open `lib/types.ts` and append after the existing `User` interface:

```typescript
export interface PokemonSet {
  _id?: string
  pokemontcg_id: string
  name: string
  series: string
  seriesSlug: string
  releaseDate: string       // "YYYY/MM/DD"
  totalCards: number
  logoUrl: string
  symbolUrl: string
}

export interface PokemonCard {
  _id?: string
  pokemontcg_id: string
  name: string
  number: string
  set_id: string            // pokemontcg_id of parent set
  setName: string
  series: string
  seriesSlug: string
  rarity: string | null
  types: string[]
  subtypes: string[]
  supertype: string
  imageUrl: string          // small image
  imageUrlHiRes: string     // large image
  cardmarketPrice: number | null  // EUR averageSellPrice
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add PokemonSet and PokemonCard types"
```

---

### Task 2: Zod schemas for pokemontcg.io API

**Files:**
- Create: `lib/schemas/pokemontcg.ts`
- Create: `lib/schemas/__tests__/pokemontcg.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/schemas/__tests__/pokemontcg.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  PtcgSetSchema,
  PtcgCardSchema,
  PtcgSetsResponseSchema,
  PtcgCardsResponseSchema,
  PtcgCardResponseSchema,
} from '../pokemontcg'

const validSet = {
  id: 'sv1',
  name: 'Scarlet & Violet',
  series: 'Scarlet & Violet',
  releaseDate: '2023/03/31',
  total: 198,
  images: {
    symbol: 'https://images.pokemontcg.io/sv1/symbol.png',
    logo: 'https://images.pokemontcg.io/sv1/logo.png',
  },
}

const validCard = {
  id: 'sv1-1',
  name: 'Sprigatito',
  number: '1',
  supertype: 'Pokémon',
  images: {
    small: 'https://images.pokemontcg.io/sv1/1.png',
    large: 'https://images.pokemontcg.io/sv1/1_hires.png',
  },
  set: { id: 'sv1', name: 'Scarlet & Violet', series: 'Scarlet & Violet' },
}

describe('PtcgSetSchema', () => {
  it('parses valid set data', () => {
    const result = PtcgSetSchema.parse(validSet)
    expect(result.id).toBe('sv1')
    expect(result.total).toBe(198)
  })

  it('rejects set missing required fields', () => {
    expect(() => PtcgSetSchema.parse({ id: 'sv1' })).toThrow()
  })

  it('rejects set with invalid image URL', () => {
    expect(() =>
      PtcgSetSchema.parse({ ...validSet, images: { symbol: 'not-url', logo: 'not-url' } })
    ).toThrow()
  })
})

describe('PtcgCardSchema', () => {
  it('parses minimal valid card', () => {
    const result = PtcgCardSchema.parse(validCard)
    expect(result.id).toBe('sv1-1')
    expect(result.rarity).toBeUndefined()
    expect(result.types).toBeUndefined()
  })

  it('parses card with all optional fields', () => {
    const raw = {
      ...validCard,
      rarity: 'Common',
      types: ['Grass'],
      subtypes: ['Basic'],
      cardmarket: { prices: { averageSellPrice: 0.15 } },
    }
    const result = PtcgCardSchema.parse(raw)
    expect(result.rarity).toBe('Common')
    expect(result.cardmarket?.prices?.averageSellPrice).toBe(0.15)
  })

  it('rejects card with invalid image URL', () => {
    const bad = { ...validCard, images: { small: 'bad', large: 'bad' } }
    expect(() => PtcgCardSchema.parse(bad)).toThrow()
  })
})

describe('PtcgSetsResponseSchema', () => {
  it('parses sets list response', () => {
    const result = PtcgSetsResponseSchema.parse({ data: [validSet] })
    expect(result.data).toHaveLength(1)
  })
})

describe('PtcgCardsResponseSchema', () => {
  it('parses paginated cards response', () => {
    const result = PtcgCardsResponseSchema.parse({
      data: [validCard],
      totalCount: 198,
      count: 1,
      pageSize: 250,
      page: 1,
    })
    expect(result.totalCount).toBe(198)
  })
})

describe('PtcgCardResponseSchema', () => {
  it('parses single card response', () => {
    const result = PtcgCardResponseSchema.parse({ data: validCard })
    expect(result.data.id).toBe('sv1-1')
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test lib/schemas/__tests__/pokemontcg.test.ts
```

Expected: FAIL — "Cannot find module '../pokemontcg'"

- [ ] **Step 3: Create `lib/schemas/pokemontcg.ts`**

```typescript
import { z } from 'zod'

const PtcgCardPricesSchema = z.object({
  averageSellPrice: z.number().nullable().optional(),
  lowPrice: z.number().nullable().optional(),
  trendPrice: z.number().nullable().optional(),
}).optional()

export const PtcgSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  series: z.string(),
  releaseDate: z.string(),
  total: z.number(),
  images: z.object({
    symbol: z.string().url(),
    logo: z.string().url(),
  }),
})

export const PtcgCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.string(),
  rarity: z.string().optional(),
  types: z.array(z.string()).optional(),
  subtypes: z.array(z.string()).optional(),
  supertype: z.string(),
  images: z.object({
    small: z.string().url(),
    large: z.string().url(),
  }),
  set: z.object({
    id: z.string(),
    name: z.string(),
    series: z.string(),
  }),
  cardmarket: z.object({
    prices: PtcgCardPricesSchema,
  }).optional(),
})

export const PtcgSetsResponseSchema = z.object({
  data: z.array(PtcgSetSchema),
})

export const PtcgCardsResponseSchema = z.object({
  data: z.array(PtcgCardSchema),
  totalCount: z.number(),
  count: z.number(),
  pageSize: z.number(),
  page: z.number(),
})

export const PtcgCardResponseSchema = z.object({
  data: PtcgCardSchema,
})

export type PtcgSet = z.infer<typeof PtcgSetSchema>
export type PtcgCard = z.infer<typeof PtcgCardSchema>
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test lib/schemas/__tests__/pokemontcg.test.ts
```

Expected: PASS — 9 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/pokemontcg.ts lib/schemas/__tests__/pokemontcg.test.ts
git commit -m "feat: add Zod schemas for pokemontcg.io API"
```

---

### Task 3: pokemontcg.io API client

**Files:**
- Create: `lib/pokemontcg.ts`
- Create: `lib/__tests__/pokemontcg.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/pokemontcg.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { fetchAllSets, fetchCardsBySet, fetchCard } from '../pokemontcg'

const validSet = {
  id: 'sv1', name: 'Scarlet & Violet', series: 'Scarlet & Violet',
  releaseDate: '2023/03/31', total: 198,
  images: {
    symbol: 'https://images.pokemontcg.io/sv1/symbol.png',
    logo: 'https://images.pokemontcg.io/sv1/logo.png',
  },
}

function makeCard(id: string) {
  const num = id.split('-')[1]
  return {
    id, name: `Card ${num}`, number: num, supertype: 'Pokémon',
    images: {
      small: `https://images.pokemontcg.io/sv1/${num}.png`,
      large: `https://images.pokemontcg.io/sv1/${num}_hires.png`,
    },
    set: { id: 'sv1', name: 'Scarlet & Violet', series: 'Scarlet & Violet' },
  }
}

describe('fetchAllSets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns parsed sets array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [validSet] }),
    })
    const sets = await fetchAllSets()
    expect(sets).toHaveLength(1)
    expect(sets[0].id).toBe('sv1')
  })

  it('calls the correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })
    await fetchAllSets()
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pokemontcg.io/v2/sets',
      expect.objectContaining({ next: { revalidate: 3600 } })
    )
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    await expect(fetchAllSets()).rejects.toThrow('pokemontcg.io /v2/sets failed: 429')
  })
})

describe('fetchCardsBySet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all cards across multiple pages', async () => {
    // Page 1: 2 cards, totalCount 3
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [makeCard('sv1-1'), makeCard('sv1-2')],
        totalCount: 3, count: 2, pageSize: 2, page: 1,
      }),
    })
    // Page 2: 1 card
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [makeCard('sv1-3')],
        totalCount: 3, count: 1, pageSize: 2, page: 2,
      }),
    })
    const cards = await fetchCardsBySet('sv1', 2)
    expect(cards).toHaveLength(3)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('stops after one page when all cards fit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [makeCard('sv1-1')],
        totalCount: 1, count: 1, pageSize: 250, page: 1,
      }),
    })
    const cards = await fetchCardsBySet('sv1')
    expect(cards).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(fetchCardsBySet('sv1')).rejects.toThrow('pokemontcg.io /v2/cards failed: 500')
  })
})

describe('fetchCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a single card by id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: makeCard('sv1-1') }),
    })
    const card = await fetchCard('sv1-1')
    expect(card.id).toBe('sv1-1')
  })

  it('throws on 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(fetchCard('bad-id')).rejects.toThrow('pokemontcg.io /v2/cards/bad-id failed: 404')
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test lib/__tests__/pokemontcg.test.ts
```

Expected: FAIL — "Cannot find module '../pokemontcg'"

- [ ] **Step 3: Create `lib/pokemontcg.ts`**

```typescript
import {
  PtcgSetsResponseSchema,
  PtcgCardsResponseSchema,
  PtcgCardResponseSchema,
  type PtcgSet,
  type PtcgCard,
} from '@/lib/schemas/pokemontcg'

const BASE = 'https://api.pokemontcg.io/v2'

function headers(): HeadersInit {
  const key = process.env.POKEMONTCG_API_KEY
  return key ? { 'X-Api-Key': key } : {}
}

export async function fetchAllSets(): Promise<PtcgSet[]> {
  const res = await fetch(`${BASE}/sets`, { headers: headers(), next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`pokemontcg.io /v2/sets failed: ${res.status}`)
  const json = await res.json()
  return PtcgSetsResponseSchema.parse(json).data
}

export async function fetchCardsBySet(setId: string, pageSize = 250): Promise<PtcgCard[]> {
  const all: PtcgCard[] = []
  let page = 1

  while (true) {
    const url = `${BASE}/cards?q=set.id:${setId}&pageSize=${pageSize}&page=${page}`
    const res = await fetch(url, { headers: headers(), next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`pokemontcg.io /v2/cards failed: ${res.status}`)
    const json = await res.json()
    const parsed = PtcgCardsResponseSchema.parse(json)
    all.push(...parsed.data)
    if (all.length >= parsed.totalCount) break
    page++
  }

  return all
}

export async function fetchCard(id: string): Promise<PtcgCard> {
  const res = await fetch(`${BASE}/cards/${id}`, { headers: headers(), next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`pokemontcg.io /v2/cards/${id} failed: ${res.status}`)
  const json = await res.json()
  return PtcgCardResponseSchema.parse(json).data
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test lib/__tests__/pokemontcg.test.ts
```

Expected: PASS — 8 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/pokemontcg.ts lib/__tests__/pokemontcg.test.ts
git commit -m "feat: add pokemontcg.io API client with pagination"
```

---

### Task 4: MongoDB queries for sets

**Files:**
- Create: `lib/sets.ts`
- Create: `lib/__tests__/sets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/sets.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

import { toSeriesSlug, getSeries, getSetsBySeries, getSetById } from '../sets'
import { getDb } from '@/lib/db'

const mockGetDb = vi.mocked(getDb)

function makeDbWithCollection(collectionMock: object) {
  return { collection: vi.fn().mockReturnValue(collectionMock) } as unknown as Db
}

describe('toSeriesSlug', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(toSeriesSlug('Scarlet & Violet')).toBe('scarlet-violet')
    expect(toSeriesSlug('Sun & Moon')).toBe('sun-moon')
    expect(toSeriesSlug('Base Set')).toBe('base-set')
    expect(toSeriesSlug('XY')).toBe('xy')
  })

  it('collapses consecutive separators and trims hyphens', () => {
    expect(toSeriesSlug('  Base  Set  ')).toBe('base-set')
    expect(toSeriesSlug('A -- B')).toBe('a-b')
  })
})

describe('getSeries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggregates series and maps to name/slug/setCount/releaseRange', async () => {
    const toArray = vi.fn().mockResolvedValue([
      { _id: 'Scarlet & Violet', setCount: 5, minRelease: '2023/03/31', maxRelease: '2024/05/01' },
      { _id: 'Sword & Shield', setCount: 12, minRelease: '2020/02/07', maxRelease: '2022/09/09' },
    ])
    const col = { aggregate: vi.fn().mockReturnValue({ toArray }) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getSeries()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Scarlet & Violet')
    expect(result[0].slug).toBe('scarlet-violet')
    expect(result[0].setCount).toBe(5)
    expect(result[0].releaseRange).toBe('2023 – 2024')
    expect(col.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ $group: expect.any(Object) })])
    )
  })

  it('returns empty array when no sets in DB', async () => {
    const toArray = vi.fn().mockResolvedValue([])
    const col = { aggregate: vi.fn().mockReturnValue({ toArray }) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getSeries()
    expect(result).toHaveLength(0)
  })
})

describe('getSetsBySeries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('finds sets by seriesSlug sorted by releaseDate descending', async () => {
    const toArray = vi.fn().mockResolvedValue([
      { pokemontcg_id: 'sv1', name: 'Scarlet & Violet', series: 'Scarlet & Violet', seriesSlug: 'scarlet-violet', releaseDate: '2023/03/31', totalCards: 198, logoUrl: 'https://example.com/logo.png', symbolUrl: 'https://example.com/symbol.png' },
    ])
    const sort = vi.fn().mockReturnValue({ toArray })
    const col = { find: vi.fn().mockReturnValue({ sort }) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const sets = await getSetsBySeries('scarlet-violet')
    expect(sets).toHaveLength(1)
    expect(sets[0].pokemontcg_id).toBe('sv1')
    expect(col.find).toHaveBeenCalledWith({ seriesSlug: 'scarlet-violet' })
    expect(sort).toHaveBeenCalledWith({ releaseDate: -1 })
  })
})

describe('getSetById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('finds set by pokemontcg_id', async () => {
    const set = { pokemontcg_id: 'sv1', name: 'Scarlet & Violet', series: 'Scarlet & Violet', seriesSlug: 'scarlet-violet', releaseDate: '2023/03/31', totalCards: 198, logoUrl: '', symbolUrl: '' }
    const col = { findOne: vi.fn().mockResolvedValue(set) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getSetById('sv1')
    expect(result?.pokemontcg_id).toBe('sv1')
    expect(col.findOne).toHaveBeenCalledWith({ pokemontcg_id: 'sv1' })
  })

  it('returns null for unknown id', async () => {
    const col = { findOne: vi.fn().mockResolvedValue(null) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getSetById('unknown')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test lib/__tests__/sets.test.ts
```

Expected: FAIL — "Cannot find module '../sets'"

- [ ] **Step 3: Create `lib/sets.ts`**

```typescript
import { getDb } from '@/lib/db'
import type { PokemonSet } from '@/lib/types'

export function toSeriesSlug(series: string): string {
  return series
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getSeries(): Promise<{
  name: string
  slug: string
  setCount: number
  releaseRange: string
}[]> {
  const db = await getDb()
  const rows = await db.collection('sets').aggregate<{
    _id: string
    setCount: number
    minRelease: string
    maxRelease: string
  }>([
    {
      $group: {
        _id: '$series',
        setCount: { $sum: 1 },
        minRelease: { $min: '$releaseDate' },
        maxRelease: { $max: '$releaseDate' },
      },
    },
    { $sort: { maxRelease: -1 } },
  ]).toArray()

  return rows.map((r) => ({
    name: r._id,
    slug: toSeriesSlug(r._id),
    setCount: r.setCount,
    releaseRange: `${r.minRelease.slice(0, 4)} – ${r.maxRelease.slice(0, 4)}`,
  }))
}

export async function getSetsBySeries(seriesSlug: string): Promise<PokemonSet[]> {
  const db = await getDb()
  return db
    .collection<PokemonSet>('sets')
    .find({ seriesSlug })
    .sort({ releaseDate: -1 })
    .toArray()
}

export async function getSetById(pokemontcg_id: string): Promise<PokemonSet | null> {
  const db = await getDb()
  return db.collection<PokemonSet>('sets').findOne({ pokemontcg_id }) ?? null
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test lib/__tests__/sets.test.ts
```

Expected: PASS — 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/sets.ts lib/__tests__/sets.test.ts
git commit -m "feat: add MongoDB sets queries (getSeries, getSetsBySeries, getSetById)"
```

---

### Task 5: MongoDB queries for cards

**Files:**
- Create: `lib/cards.ts`
- Create: `lib/__tests__/cards.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/cards.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

import { getCardsBySet, getCardById } from '../cards'
import { getDb } from '@/lib/db'

const mockGetDb = vi.mocked(getDb)

function makeDbWithCollection(collectionMock: object) {
  return { collection: vi.fn().mockReturnValue(collectionMock) } as unknown as Db
}

describe('getCardsBySet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('finds cards by set_id sorted by number ascending', async () => {
    const cards = [
      { pokemontcg_id: 'sv1-1', name: 'Sprigatito', number: '1', set_id: 'sv1', setName: 'Scarlet & Violet', series: 'Scarlet & Violet', seriesSlug: 'scarlet-violet', rarity: 'Common', types: ['Grass'], subtypes: ['Basic'], supertype: 'Pokémon', imageUrl: 'https://example.com/1.png', imageUrlHiRes: 'https://example.com/1_hires.png', cardmarketPrice: 0.15 },
    ]
    const toArray = vi.fn().mockResolvedValue(cards)
    const sort = vi.fn().mockReturnValue({ toArray })
    const col = { find: vi.fn().mockReturnValue({ sort }) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getCardsBySet('sv1')
    expect(result).toHaveLength(1)
    expect(result[0].pokemontcg_id).toBe('sv1-1')
    expect(col.find).toHaveBeenCalledWith({ set_id: 'sv1' })
    expect(sort).toHaveBeenCalledWith({ number: 1 })
  })

  it('returns empty array when set has no cards', async () => {
    const toArray = vi.fn().mockResolvedValue([])
    const sort = vi.fn().mockReturnValue({ toArray })
    const col = { find: vi.fn().mockReturnValue({ sort }) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getCardsBySet('empty-set')
    expect(result).toHaveLength(0)
  })
})

describe('getCardById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('finds a card by pokemontcg_id', async () => {
    const card = { pokemontcg_id: 'sv1-1', name: 'Sprigatito' }
    const col = { findOne: vi.fn().mockResolvedValue(card) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getCardById('sv1-1')
    expect(result?.pokemontcg_id).toBe('sv1-1')
    expect(col.findOne).toHaveBeenCalledWith({ pokemontcg_id: 'sv1-1' })
  })

  it('returns null for unknown id', async () => {
    const col = { findOne: vi.fn().mockResolvedValue(null) }
    mockGetDb.mockResolvedValue(makeDbWithCollection(col))

    const result = await getCardById('unknown')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test lib/__tests__/cards.test.ts
```

Expected: FAIL — "Cannot find module '../cards'"

- [ ] **Step 3: Create `lib/cards.ts`**

```typescript
import { getDb } from '@/lib/db'
import type { PokemonCard } from '@/lib/types'

export async function getCardsBySet(setId: string): Promise<PokemonCard[]> {
  const db = await getDb()
  return db
    .collection<PokemonCard>('cards')
    .find({ set_id: setId })
    .sort({ number: 1 })
    .toArray()
}

export async function getCardById(pokemontcg_id: string): Promise<PokemonCard | null> {
  const db = await getDb()
  return db.collection<PokemonCard>('cards').findOne({ pokemontcg_id }) ?? null
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test lib/__tests__/cards.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/cards.ts lib/__tests__/cards.test.ts
git commit -m "feat: add MongoDB cards queries (getCardsBySet, getCardById)"
```

---

### Task 6: Seed script

**Files:**
- Modify: `package.json`
- Create: `scripts/seed.ts`

- [ ] **Step 1: Install tsx and dotenv**

```bash
npm install --save-dev tsx dotenv
```

Expected: tsx and dotenv added to devDependencies in package.json.

- [ ] **Step 2: Add seed script to `package.json`**

In `package.json`, add to the `scripts` object:

```json
"seed": "tsx scripts/seed.ts"
```

Final scripts block:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "seed": "tsx scripts/seed.ts"
}
```

- [ ] **Step 3: Create `scripts/seed.ts`**

```typescript
import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { fetchAllSets, fetchCardsBySet } from '../lib/pokemontcg'
import { toSeriesSlug } from '../lib/sets'

const MONGODB_URI = process.env.MONGODB_URI!
const DB_NAME = process.env.MONGODB_DB ?? 'pokevault'

async function seed() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI env var is not set')

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  console.log('Fetching all sets from pokemontcg.io…')
  const sets = await fetchAllSets()
  console.log(`  Found ${sets.length} sets`)

  for (const ptcgSet of sets) {
    const seriesSlug = toSeriesSlug(ptcgSet.series)
    const setDoc = {
      pokemontcg_id: ptcgSet.id,
      name: ptcgSet.name,
      series: ptcgSet.series,
      seriesSlug,
      releaseDate: ptcgSet.releaseDate,
      totalCards: ptcgSet.total,
      logoUrl: ptcgSet.images.logo,
      symbolUrl: ptcgSet.images.symbol,
    }

    await db.collection('sets').updateOne(
      { pokemontcg_id: ptcgSet.id },
      { $set: setDoc },
      { upsert: true }
    )
    console.log(`  Upserted set: ${ptcgSet.name} (${ptcgSet.id})`)

    console.log(`  Fetching cards for ${ptcgSet.id}…`)
    const cards = await fetchCardsBySet(ptcgSet.id)
    console.log(`    ${cards.length} cards found`)

    for (const card of cards) {
      const cardDoc = {
        pokemontcg_id: card.id,
        name: card.name,
        number: card.number,
        set_id: ptcgSet.id,
        setName: ptcgSet.name,
        series: ptcgSet.series,
        seriesSlug,
        rarity: card.rarity ?? null,
        types: card.types ?? [],
        subtypes: card.subtypes ?? [],
        supertype: card.supertype,
        imageUrl: card.images.small,
        imageUrlHiRes: card.images.large,
        cardmarketPrice: card.cardmarket?.prices?.averageSellPrice ?? null,
      }

      await db.collection('cards').updateOne(
        { pokemontcg_id: card.id },
        { $set: cardDoc },
        { upsert: true }
      )
    }

    console.log(`    Upserted ${cards.length} cards for ${ptcgSet.id}`)
  }

  // Create indexes
  await db.collection('sets').createIndex({ pokemontcg_id: 1 }, { unique: true })
  await db.collection('sets').createIndex({ seriesSlug: 1 })
  await db.collection('cards').createIndex({ pokemontcg_id: 1 }, { unique: true })
  await db.collection('cards').createIndex({ set_id: 1 })
  console.log('Indexes ensured.')

  await client.close()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 4: Verify the script compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Add POKEMONTCG_API_KEY to .env (if not already present)**

Open `.env` and add (get key from https://dev.pokemontcg.io):
```
POKEMONTCG_API_KEY=your_api_key_here
```

The seed script works without a key (unauthenticated, rate-limited to 1000 req/day). With a key, rate limit is 20,000/day.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed.ts package.json package-lock.json
git commit -m "feat: add seed script to populate sets and cards from pokemontcg.io"
```

---

### Task 7: Route restructuring

**Files:**
- Modify: `middleware.ts`
- Modify: `next.config.ts`
- Modify: `components/layout/Topbar.tsx`
- Modify: `components/layout/Sidebar.tsx`
- Create: `app/(catalog)/layout.tsx`
- Delete: `app/(app)/browse/page.tsx`

- [ ] **Step 1: Remove `/browse` from middleware protectedPrefixes**

Open `middleware.ts`. Change line 7 from:

```typescript
const protectedPrefixes = ['/dashboard', '/browse', '/collection', '/wishlist', '/analytics', '/settings']
```

to:

```typescript
const protectedPrefixes = ['/dashboard', '/collection', '/wishlist', '/analytics', '/settings']
```

- [ ] **Step 2: Add image domain to `next.config.ts`**

Replace the contents of `next.config.ts` with:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 3: Fix Topbar to use prefix matching**

Replace the full contents of `components/layout/Topbar.tsx` with:

```typescript
'use client'

import { usePathname } from 'next/navigation'
import { Search, Globe } from 'lucide-react'

const routeTitles: [string, string][] = [
  ['/dashboard', 'Dashboard'],
  ['/browse', 'Browse'],
  ['/cards', 'Card Detail'],
  ['/collection', 'My Cards'],
  ['/wishlist', 'Wishlist'],
  ['/analytics', 'Analytics'],
  ['/settings', 'Settings'],
]

export default function Topbar() {
  const pathname = usePathname()
  const title =
    routeTitles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'PokeVault'

  return (
    <header className="bg-mantle border-b border-surface0 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
      <h1 className="text-sm font-russo text-text flex-1 tracking-wide">{title}</h1>
      <div className="bg-base border border-surface0 rounded-md px-3 py-1.5 text-[11px] text-overlay0 w-48 flex items-center gap-2">
        <Search size={11} className="flex-shrink-0" />
        <span>Search cards, sets…</span>
      </div>
      <div className="bg-base border border-surface0 rounded px-2 py-1 text-[10px] text-overlay2 flex items-center gap-1.5">
        <Globe size={10} className="flex-shrink-0" />
        <span>IT · EUR</span>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Fix Sidebar active check to use startsWith for browse/cards**

In `components/layout/Sidebar.tsx`, find the `NavItem` component and change the `active` prop usage. The parent currently passes `active={pathname === item.href}`. Change it to:

```typescript
// In the Sidebar component's render, change both NavItem usages:
// Before:
active={pathname === item.href}
// After:
active={item.href === '/browse' ? pathname.startsWith('/browse') : pathname === item.href}
```

Both `mainItems.map` and `collectionItems.map` calls pass `active` — update both:

```typescript
{mainItems.map((item) => (
  <NavItem
    key={item.href}
    item={item}
    active={item.href === '/browse' ? pathname.startsWith('/browse') : pathname === item.href}
    isPro={isPro}
  />
))}

{collectionItems.map((item) => (
  <NavItem
    key={item.href}
    item={item}
    active={item.href === '/browse' ? pathname.startsWith('/browse') : pathname === item.href}
    isPro={isPro}
  />
))}
```

- [ ] **Step 5: Create `app/(catalog)/layout.tsx`**

```typescript
import type { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default async function CatalogLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  // Intentionally no redirect — catalog routes are public

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-crust">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
```

- [ ] **Step 6: Delete the old browse stub**

```bash
rm app/\(app\)/browse/page.tsx
```

- [ ] **Step 7: Verify TypeScript and run all tests**

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add middleware.ts next.config.ts components/layout/Topbar.tsx components/layout/Sidebar.tsx app/\(catalog\)/layout.tsx
git rm app/\(app\)/browse/page.tsx
git commit -m "feat: move browse to public (catalog) route group, fix prefix matching in nav"
```

---

### Task 8: Breadcrumb component

**Files:**
- Create: `components/catalog/Breadcrumb.tsx`

- [ ] **Step 1: Create `components/catalog/Breadcrumb.tsx`**

```typescript
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbSegment {
  label: string
  href?: string
}

export default function Breadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <nav className="flex items-center gap-1 text-[11px] mb-4">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="text-overlay0 flex-shrink-0" />}
          {seg.href ? (
            <Link href={seg.href} className="text-overlay1 hover:text-text transition-colors">
              {seg.label}
            </Link>
          ) : (
            <span className="text-text font-medium">{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/catalog/Breadcrumb.tsx
git commit -m "feat: add Breadcrumb component for catalog navigation"
```

---

### Task 9: Series list page (`/browse`)

**Files:**
- Create: `app/(catalog)/browse/page.tsx`

- [ ] **Step 1: Create `app/(catalog)/browse/page.tsx`**

```typescript
import Link from 'next/link'
import { Layers } from 'lucide-react'
import { getSeries } from '@/lib/sets'
import Breadcrumb from '@/components/catalog/Breadcrumb'

export const metadata = { title: 'Browse — PokeVault' }

export default async function BrowsePage() {
  const series = await getSeries()

  return (
    <div>
      <Breadcrumb segments={[{ label: 'Browse' }]} />

      {series.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay0 text-sm mb-2">No series yet.</p>
          <p className="text-overlay0 text-xs">Run <code className="text-mauve">npm run seed</code> to import card data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {series.map((s) => (
            <Link
              key={s.slug}
              href={`/browse/${s.slug}`}
              className="bg-base border border-surface0 rounded-xl p-4 hover:border-blue/50 hover:bg-surface0/30 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue/10 border border-blue/20 flex items-center justify-center flex-shrink-0">
                  <Layers size={13} className="text-blue" />
                </div>
                <span className="text-[10px] text-overlay0 tabular-nums">{s.releaseRange}</span>
              </div>
              <h2 className="text-sm font-russo text-text leading-tight mb-1 group-hover:text-blue transition-colors">
                {s.name}
              </h2>
              <p className="text-[10px] text-overlay0">
                {s.setCount} {s.setCount === 1 ? 'set' : 'sets'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(catalog\)/browse/page.tsx
git commit -m "feat: add series list browse page (SSR)"
```

---

### Task 10: Sets list page (`/browse/[series]`)

**Files:**
- Create: `app/(catalog)/browse/[series]/page.tsx`

- [ ] **Step 1: Create `app/(catalog)/browse/[series]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSetsBySeries } from '@/lib/sets'
import Breadcrumb from '@/components/catalog/Breadcrumb'

interface Props {
  params: Promise<{ series: string }>
}

export default async function SeriesPage({ params }: Props) {
  const { series: seriesSlug } = await params
  const sets = await getSetsBySeries(seriesSlug)

  if (sets.length === 0) notFound()

  const seriesName = sets[0].series

  return (
    <div>
      <Breadcrumb
        segments={[
          { label: 'Browse', href: '/browse' },
          { label: seriesName },
        ]}
      />

      <div className="space-y-2">
        {sets.map((set) => (
          <Link
            key={set.pokemontcg_id}
            href={`/browse/${seriesSlug}/${set.pokemontcg_id}`}
            className="flex items-center gap-4 bg-base border border-surface0 rounded-xl px-4 py-3 hover:border-blue/50 hover:bg-surface0/30 transition-colors group"
          >
            {set.symbolUrl && (
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                <Image
                  src={set.symbolUrl}
                  alt={`${set.name} symbol`}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-russo text-text group-hover:text-blue transition-colors truncate">
                {set.name}
              </h2>
              <p className="text-[10px] text-overlay0 mt-0.5">
                {set.releaseDate.slice(0, 4)} · {set.totalCards} cards
              </p>
            </div>
            {set.logoUrl && (
              <div className="hidden sm:flex w-24 h-10 items-center justify-end flex-shrink-0">
                <Image
                  src={set.logoUrl}
                  alt={set.name}
                  width={96}
                  height={40}
                  className="object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(catalog\)/browse/\[series\]/page.tsx
git commit -m "feat: add sets list page per series (SSR)"
```

---

### Task 11: Cards grid page + CardsGrid client component

**Files:**
- Create: `app/(catalog)/browse/[series]/[set]/page.tsx`
- Create: `components/catalog/CardsGrid.tsx`

- [ ] **Step 1: Create `components/catalog/CardsGrid.tsx`**

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { PokemonCard } from '@/lib/types'

type Filter = 'all' | 'holo' | 'ex' | 'secret'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'holo', label: 'Holo' },
  { key: 'ex', label: 'EX / GX / V' },
  { key: 'secret', label: 'Secret Rare' },
]

function matchFilter(card: PokemonCard, filter: Filter): boolean {
  if (filter === 'all') return true
  const rarity = (card.rarity ?? '').toLowerCase()
  const subtypes = card.subtypes.map((s) => s.toLowerCase())
  if (filter === 'holo') {
    return rarity.includes('holo') || subtypes.some((s) => ['v', 'vmax', 'vstar'].includes(s))
  }
  if (filter === 'ex') {
    return subtypes.some((s) => ['ex', 'gx', 'v', 'vmax', 'vstar'].includes(s))
  }
  if (filter === 'secret') {
    return rarity.includes('secret') || rarity.includes('special illustration')
  }
  return true
}

export default function CardsGrid({ cards }: { cards: PokemonCard[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = cards.filter((c) => matchFilter(c, filter))

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              'px-3 py-1 rounded-full text-[11px] font-medium transition-colors',
              filter === f.key
                ? 'bg-blue text-white'
                : 'bg-base border border-surface0 text-overlay1 hover:border-blue/50 hover:text-text',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-overlay0 self-center">
          {visible.length} {visible.length === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {/* Card grid */}
      {visible.length === 0 ? (
        <p className="text-overlay0 text-sm text-center py-8">No cards match this filter.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {visible.map((card) => (
            <Link
              key={card.pokemontcg_id}
              href={`/cards/${card.pokemontcg_id}`}
              className="group"
            >
              <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-1 px-0.5">
                <p className="text-[10px] text-overlay2 truncate leading-tight">{card.name}</p>
                {card.cardmarketPrice !== null && (
                  <p className="text-[10px] text-mauve tabular-nums">
                    €{card.cardmarketPrice.toFixed(2)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(catalog)/browse/[series]/[set]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getSetById } from '@/lib/sets'
import { getCardsBySet } from '@/lib/cards'
import Breadcrumb from '@/components/catalog/Breadcrumb'
import CardsGrid from '@/components/catalog/CardsGrid'

interface Props {
  params: Promise<{ series: string; set: string }>
}

export default async function SetPage({ params }: Props) {
  const { series: seriesSlug, set: setId } = await params
  const [set, cards] = await Promise.all([getSetById(setId), getCardsBySet(setId)])

  if (!set) notFound()

  return (
    <div>
      <Breadcrumb
        segments={[
          { label: 'Browse', href: '/browse' },
          { label: set.series, href: `/browse/${seriesSlug}` },
          { label: set.name },
        ]}
      />

      {/* Set header */}
      <div className="flex items-center gap-4 mb-6">
        {set.logoUrl && (
          <Image
            src={set.logoUrl}
            alt={set.name}
            width={160}
            height={60}
            className="object-contain"
          />
        )}
        <div>
          <h1 className="font-russo text-lg text-text">{set.name}</h1>
          <p className="text-[11px] text-overlay0 mt-0.5">
            {set.releaseDate.slice(0, 4)} · {set.totalCards} cards
          </p>
        </div>
      </div>

      <CardsGrid cards={cards} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/catalog/CardsGrid.tsx app/\(catalog\)/browse/\[series\]/\[set\]/page.tsx
git commit -m "feat: add cards grid page with client-side filter chips"
```

---

### Task 12: Card detail page (`/cards/[id]`)

**Files:**
- Create: `app/(catalog)/cards/[id]/page.tsx`

- [ ] **Step 1: Create `app/(catalog)/cards/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCardById } from '@/lib/cards'
import { getSetById } from '@/lib/sets'
import Breadcrumb from '@/components/catalog/Breadcrumb'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params
  const card = await getCardById(id)

  if (!card) notFound()

  const set = await getSetById(card.set_id)

  const rows: { label: string; value: string | null }[] = [
    { label: 'Set', value: card.setName },
    { label: 'Series', value: card.series },
    { label: 'Number', value: card.number },
    { label: 'Supertype', value: card.supertype },
    { label: 'Subtypes', value: card.subtypes.length ? card.subtypes.join(', ') : null },
    { label: 'Types', value: card.types.length ? card.types.join(', ') : null },
    { label: 'Rarity', value: card.rarity },
    { label: 'Cardmarket Price', value: card.cardmarketPrice !== null ? `€${card.cardmarketPrice.toFixed(2)}` : null },
  ]

  return (
    <div>
      <Breadcrumb
        segments={[
          { label: 'Browse', href: '/browse' },
          ...(set
            ? [
                { label: set.series, href: `/browse/${set.seriesSlug}` },
                { label: set.name, href: `/browse/${set.seriesSlug}/${set.pokemontcg_id}` },
              ]
            : []),
          { label: card.name },
        ]}
      />

      <div className="flex gap-6 flex-col sm:flex-row">
        {/* Card image */}
        <div className="flex-shrink-0">
          <div className="relative w-[245px] aspect-[245/342] rounded-xl overflow-hidden border border-surface0">
            <Image
              src={card.imageUrlHiRes}
              alt={card.name}
              fill
              sizes="245px"
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Card details */}
        <div className="flex-1 min-w-0">
          <h1 className="font-russo text-xl text-text mb-1">{card.name}</h1>
          {card.cardmarketPrice !== null && (
            <p className="text-2xl font-russo text-mauve mb-4">
              €{card.cardmarketPrice.toFixed(2)}
            </p>
          )}

          <div className="bg-base border border-surface0 rounded-xl overflow-hidden">
            {rows.filter((r) => r.value !== null).map((row, i) => (
              <div
                key={row.label}
                className={[
                  'flex items-center px-4 py-2.5 gap-4',
                  i > 0 ? 'border-t border-surface0' : '',
                ].join(' ')}
              >
                <span className="text-[11px] text-overlay0 uppercase tracking-wider w-28 flex-shrink-0">
                  {row.label}
                </span>
                <span className="text-sm text-text">{row.value}</span>
              </div>
            ))}
          </div>

          {set && (
            <Link
              href={`/browse/${set.seriesSlug}/${set.pokemontcg_id}`}
              className="inline-flex items-center gap-2 mt-4 text-[11px] text-blue hover:underline"
            >
              ← Back to {set.name}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/\(catalog\)/cards/\[id\]/page.tsx
git commit -m "feat: add card detail page with breadcrumb and Cardmarket price"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| SSR series list at `/browse` | Task 9 |
| SSR sets list at `/browse/[series]` | Task 10 |
| SSR cards grid at `/browse/[series]/[set]` | Task 11 |
| SSR card detail at `/cards/[id]` | Task 12 |
| Filter chips (All / Holo / EX / Secret) | Task 11 (CardsGrid) |
| Breadcrumb on all catalog pages | Tasks 9–12 |
| pokemontcg.io API client with pagination | Task 3 |
| Zod validation at API boundary | Task 2 |
| Local seed script (not API route) | Task 6 |
| Public routes (no auth redirect) | Task 7 |
| Cardmarket EUR price shown | Tasks 3, 6, 11, 12 |
| MongoDB indexes for sets/cards | Task 6 |
| `images.pokemontcg.io` allowed in next.config | Task 7 |
| Topbar prefix match for /browse/* | Task 7 |

### Placeholder scan

No "TBD", "TODO", or vague steps. Every step has complete code.

### Type consistency

- `PtcgSet` / `PtcgCard` (Zod inferred, from `lib/schemas/pokemontcg.ts`) — used in `lib/pokemontcg.ts` and `scripts/seed.ts`
- `PokemonSet` / `PokemonCard` (TypeScript interfaces, from `lib/types.ts`) — used in `lib/sets.ts`, `lib/cards.ts`, and all page components
- `toSeriesSlug` exported from `lib/sets.ts`, imported in `scripts/seed.ts` — consistent
- `getSetById` returns `PokemonSet | null` — null-checked with `notFound()` in both set page and card detail page ✓
- `getCardById` returns `PokemonCard | null` — null-checked in card detail page ✓
