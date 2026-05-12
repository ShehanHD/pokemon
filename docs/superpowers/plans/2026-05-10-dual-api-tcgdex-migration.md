# Dual-API TCGdex Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the catalog source of truth to TCGdex (Italian primary, Cardmarket EUR pricing). Retain `pokemontcg.io` as an optional secondary source for USD enrichment. Migrate existing `userCards.cardId` rows from `pokemontcg_id` to `tcgdex_id` via a one-time idempotent remap.

**Architecture:** Add a `lib/tcgdex.ts` client with Zod schemas, rewrite the seeder behind a `SEED_SOURCE=tcgdex` feature flag (preserving the existing `SeedReport`/`SeedSetResult` shapes consumed by `SeedClient.tsx`), backfill all sets with the new schema (new fields nullable & additive), then run a one-shot `userCards.cardId` migration once cards have both `pokemontcg_id` and `tcgdex_id` keys, then swap the query layer (`lib/cards.ts`, `lib/sets.ts`, `lib/userCards.ts`) to read `tcgdex_id` / `priceEUR`. Drop `cardmarketPrice` after a clean seed.

**Tech Stack:** Next.js App Router, MongoDB, Zod (mandatory at every external boundary per global CLAUDE.md), TypeScript `strict`, TCGdex `/v2/{lang}` (no auth), pokemontcg.io v2 (API key, USD only).

---

## Pre-flight Sanity

Before starting Task 1:

- Confirm `.env` has `MONGODB_URI`, `MONGODB_DB`, `POKEMONTCG_API_KEY` set (the last is reused for optional USD enrichment).
- Add `TCGDEX_LANG=it` and `SEED_SOURCE=tcgdex` to `.env.example` (Task 2 covers this).
- Run `npx tsc --noEmit` once at the start so you know the baseline is green.

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `lib/schemas/tcgdex.ts` | new | Zod schemas for `/sets`, `/sets/{id}`, `/cards/{id}` |
| `lib/tcgdex.ts` | new | HTTP client: `fetchAllSets`, `fetchSet`, `fetchCard` with concurrency=5 |
| `lib/seedSeriesTcgdex.ts` | new | TCGdex-flavored seeder implementation |
| `lib/seedSeries.ts` | modify | Dispatch on `SEED_SOURCE`; keeps `SeedReport`/`SeedSetResult` exports stable |
| `lib/cards.ts` | modify | Swap `pokemontcg_id` → `tcgdex_id` (primary); `cardmarketPrice` → `priceEUR`; add IT rarities |
| `lib/sets.ts` | modify | Swap `pokemontcg_id` → `tcgdex_id` (primary) |
| `lib/userCards.ts` | modify | Swap `$lookup foreignField` to `tcgdex_id`; sums read `priceEUR` |
| `lib/types.ts` | modify | Add `tcgdex_id`, `language`, `priceEUR`, `priceUSD`, `variants`, `pricing` (nullable) |
| `scripts/migrateUserCardsToTcgdex.ts` | new | Idempotent one-shot remap of `userCards.cardId` |
| `scripts/dropLegacyCardmarketPrice.ts` | new | One-shot field cleanup after backfill |
| `app/(app)/admin/seed/SeedClient.tsx` | unchanged | Consumes the same report shape |
| `app/(app)/admin/seed/page.tsx` | minor | Read totalValue from new field name (`totalValueEUR`) |
| `.env.example` | modify | Add `TCGDEX_LANG`, `SEED_SOURCE` |

---

## Task 1: TCGdex Zod schemas

**Files:**
- Create: `lib/schemas/tcgdex.ts`

- [ ] **Step 1: Create `lib/schemas/tcgdex.ts` with the response shapes from `/v2/it`**

```ts
import { z } from 'zod'

export const TcgdexSetBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().optional(),
  symbol: z.string().optional(),
  cardCount: z
    .object({
      total: z.number().int().nonnegative(),
      official: z.number().int().nonnegative(),
    })
    .optional(),
  releaseDate: z.string().optional(),
})
export type TcgdexSetBrief = z.infer<typeof TcgdexSetBriefSchema>

export const TcgdexSetCardRefSchema = z.object({
  id: z.string(),
  localId: z.string(),
  name: z.string(),
  image: z.string().optional(),
})

export const TcgdexSetDetailSchema = TcgdexSetBriefSchema.extend({
  serie: z
    .object({ id: z.string(), name: z.string() })
    .optional(),
  cards: z.array(TcgdexSetCardRefSchema).default([]),
})
export type TcgdexSetDetail = z.infer<typeof TcgdexSetDetailSchema>

const TcgdexCardmarketPricesSchema = z.object({
  averageSellPrice: z.number().nullable().optional(),
  lowPrice: z.number().nullable().optional(),
  trendPrice: z.number().nullable().optional(),
  reverseHoloSell: z.number().nullable().optional(),
  reverseHoloLow: z.number().nullable().optional(),
  reverseHoloTrend: z.number().nullable().optional(),
  avg1: z.number().nullable().optional(),
  avg7: z.number().nullable().optional(),
  avg30: z.number().nullable().optional(),
}).passthrough()

const TcgdexPricingSchema = z.object({
  cardmarket: z
    .object({
      updated: z.string().optional(),
      unit: z.string().optional(),
      prices: TcgdexCardmarketPricesSchema.optional(),
    })
    .partial()
    .passthrough()
    .optional(),
  tcgplayer: z.unknown().optional(),
}).passthrough()

export const TcgdexCardSchema = z.object({
  id: z.string(),
  localId: z.string(),
  name: z.string(),
  image: z.string().optional(),
  rarity: z.string().nullable().optional(),
  category: z.string().optional(),
  illustrator: z.string().optional(),
  hp: z.number().optional(),
  types: z.array(z.string()).optional(),
  variants: z
    .object({
      firstEdition: z.boolean().optional(),
      holo: z.boolean().optional(),
      normal: z.boolean().optional(),
      reverse: z.boolean().optional(),
      wPromo: z.boolean().optional(),
    })
    .partial()
    .optional(),
  set: z.object({ id: z.string(), name: z.string() }).optional(),
  pricing: TcgdexPricingSchema.optional(),
}).passthrough()
export type TcgdexCard = z.infer<typeof TcgdexCardSchema>

export const TcgdexSetBriefArraySchema = z.array(TcgdexSetBriefSchema)
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/schemas/tcgdex.ts
git commit -m "feat(tcgdex): add Zod schemas for /v2 set and card responses"
```

---

## Task 2: TCGdex HTTP client

**Files:**
- Create: `lib/tcgdex.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add env vars to `.env.example`**

Append below the existing `POKEMONTCG_API_KEY` line:

```
# TCGdex (https://tcgdex.dev) — primary catalog source
TCGDEX_LANG=it
# Seeder source: 'tcgdex' (new) or 'pokemontcg' (legacy fallback)
SEED_SOURCE=tcgdex
```

- [ ] **Step 2: Create `lib/tcgdex.ts`**

```ts
import {
  TcgdexCardSchema,
  TcgdexSetBriefArraySchema,
  TcgdexSetDetailSchema,
  type TcgdexCard,
  type TcgdexSetBrief,
  type TcgdexSetDetail,
} from './schemas/tcgdex'

const BASE = 'https://api.tcgdex.net/v2'

function lang(): string {
  return process.env.TCGDEX_LANG ?? 'it'
}

async function fetchJson(path: string): Promise<unknown> {
  const url = `${BASE}/${lang()}${path}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) {
    throw new Error(`[tcgdex] ${res.status} ${res.statusText} for ${path}`)
  }
  return res.json()
}

export async function fetchAllSets(): Promise<TcgdexSetBrief[]> {
  const raw = await fetchJson('/sets')
  return TcgdexSetBriefArraySchema.parse(raw)
}

export async function fetchSet(setId: string): Promise<TcgdexSetDetail> {
  const raw = await fetchJson(`/sets/${encodeURIComponent(setId)}`)
  return TcgdexSetDetailSchema.parse(raw)
}

export async function fetchCard(cardId: string): Promise<TcgdexCard> {
  const raw = await fetchJson(`/cards/${encodeURIComponent(cardId)}`)
  return TcgdexCardSchema.parse(raw)
}

export async function fetchCardsConcurrent(
  cardIds: string[],
  concurrency = 5,
): Promise<TcgdexCard[]> {
  const out: TcgdexCard[] = new Array(cardIds.length)
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= cardIds.length) return
      out[i] = await fetchCard(cardIds[i])
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, cardIds.length) }, worker)
  await Promise.all(workers)
  return out
}

export function buildCardImageUrls(image: string | undefined): {
  imageUrl: string | null
  imageUrlHiRes: string | null
} {
  if (!image) return { imageUrl: null, imageUrlHiRes: null }
  return {
    imageUrl: `${image}/low.webp`,
    imageUrlHiRes: `${image}/high.webp`,
  }
}

export function buildAssetUrl(asset: string | undefined): string | null {
  return asset ? `${asset}.webp` : null
}
```

- [ ] **Step 3: Smoke-run the client against the live API**

Create one-off script `scripts/_smokeTcgdexClient.ts`:

```ts
import 'dotenv/config'
import { fetchAllSets, fetchSet, fetchCard, fetchCardsConcurrent } from '../lib/tcgdex'

async function main() {
  const sets = await fetchAllSets()
  console.log(`[smoke] sets: ${sets.length}`)
  const sv01 = await fetchSet('sv01')
  console.log(`[smoke] sv01 cards: ${sv01.cards.length}`)
  const card = await fetchCard(sv01.cards[0].id)
  console.log(`[smoke] card: ${card.id} ${card.name} rarity=${card.rarity ?? 'null'}`)
  const sample = await fetchCardsConcurrent(sv01.cards.slice(0, 5).map((c) => c.id), 5)
  const priced = sample.filter((c) => c.pricing?.cardmarket?.prices?.averageSellPrice != null).length
  console.log(`[smoke] 5-card concurrent fetch ok; priced=${priced}/5`)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

Run: `npx tsx scripts/_smokeTcgdexClient.ts`
Expected: 4 lines, all numbers > 0, no Zod parse error.

- [ ] **Step 4: Commit**

```bash
git add lib/tcgdex.ts .env.example scripts/_smokeTcgdexClient.ts
git commit -m "feat(tcgdex): client with concurrency-limited card fetch + smoke script"
```

---

## Task 3: Extend `lib/types.ts` with new card/set fields

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Read current `lib/types.ts`** to identify the `Card` and `PokemonSet` interfaces.

- [ ] **Step 2: Extend `Card` (additive, all new fields nullable for transition phase)**

Add these fields to the existing `Card` interface (do NOT remove `pokemontcg_id` or `cardmarketPrice` yet — the field drop is Task 12):

```ts
export interface Card {
  // ...existing fields...
  pokemontcg_id?: string | null
  tcgdex_id?: string | null
  language?: string | null
  cardmarketPrice?: number | null
  priceEUR?: number | null
  priceUSD?: number | null
  variants?: {
    firstEdition: boolean
    holo: boolean
    normal: boolean
    reverse: boolean
    wPromo: boolean
  } | null
  pricing?: {
    cardmarket?: Record<string, unknown>
    tcgplayer?: Record<string, unknown>
  } | null
}
```

And on `PokemonSet`:

```ts
export interface PokemonSet {
  // ...existing fields...
  pokemontcg_id?: string | null
  tcgdex_id?: string | null
  language?: string | null
  totalValue?: number | null     // legacy (EUR), keep until clean seed
  totalValueEUR?: number | null
  totalValueUSD?: number | null
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add tcgdex_id, language, priceEUR/USD, variants to Card and Set"
```

---

## Task 4: New TCGdex seeder

**Files:**
- Create: `lib/seedSeriesTcgdex.ts`

- [ ] **Step 1: Create `lib/seedSeriesTcgdex.ts`**

```ts
import { getDb } from './db'
import { toSeriesSlug } from './sets'
import {
  fetchAllSets,
  fetchSet,
  fetchCardsConcurrent,
  buildCardImageUrls,
  buildAssetUrl,
} from './tcgdex'
import type { TcgdexCard, TcgdexSetBrief } from './schemas/tcgdex'
import { SERIES_OVERRIDES, resolveSeries } from './seedSeries'
import type { SeedReport, SeedSetResult } from './seedSeries'

export type { SeedReport, SeedSetResult }
export { SERIES_OVERRIDES, resolveSeries }

const INTER_SET_DELAY_MS = 250

function language(): string {
  return process.env.TCGDEX_LANG ?? 'it'
}

function resolvePriceEUR(card: TcgdexCard): number | null {
  const v = card.pricing?.cardmarket?.prices?.averageSellPrice
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function normaliseVariants(card: TcgdexCard) {
  const v = card.variants ?? {}
  return {
    firstEdition: Boolean(v.firstEdition),
    holo: Boolean(v.holo),
    normal: Boolean(v.normal),
    reverse: Boolean(v.reverse),
    wPromo: Boolean(v.wPromo),
  }
}

async function ensureIndexes() {
  const db = await getDb()
  await db.collection('sets').createIndex({ tcgdex_id: 1 }, { unique: true, sparse: true })
  await db.collection('sets').createIndex({ pokemontcg_id: 1 }, { sparse: true })
  await db.collection('sets').createIndex({ seriesSlug: 1 })
  await db.collection('cards').createIndex({ tcgdex_id: 1 }, { unique: true, sparse: true })
  await db.collection('cards').createIndex({ pokemontcg_id: 1 }, { sparse: true })
  await db.collection('cards').createIndex({ set_id: 1 })
}

async function seedOneSet(brief: TcgdexSetBrief): Promise<SeedSetResult> {
  const db = await getDb()
  const detail = await fetchSet(brief.id)
  const seriesName = detail.serie?.name ?? 'Other'
  const series = resolveSeries(brief.id, seriesName)
  const seriesSlug = toSeriesSlug(series)
  const lang = language()

  const setDoc = {
    tcgdex_id: brief.id,
    pokemontcg_id: null,
    language: lang,
    name: brief.name,
    series,
    seriesSlug,
    releaseDate: brief.releaseDate ?? '',
    totalCards: brief.cardCount?.total ?? detail.cards.length,
    printedTotal: brief.cardCount?.official ?? detail.cards.length,
    logoUrl: buildAssetUrl(brief.logo) ?? '',
    symbolUrl: buildAssetUrl(brief.symbol) ?? '',
  }

  await db.collection('sets').updateOne(
    { tcgdex_id: brief.id },
    { $set: setDoc },
    { upsert: true },
  )

  const cardIds = detail.cards.map((c) => c.id)
  const cards = await fetchCardsConcurrent(cardIds, 5)

  const ops = cards.map((card) => {
    const imgs = buildCardImageUrls(card.image)
    const priceEUR = resolvePriceEUR(card)
    return {
      updateOne: {
        filter: { tcgdex_id: card.id },
        update: {
          $set: {
            tcgdex_id: card.id,
            pokemontcg_id: null,
            language: lang,
            name: card.name,
            number: card.localId,
            set_id: brief.id,
            setName: brief.name,
            series,
            seriesSlug,
            rarity: card.rarity ?? null,
            types: card.types ?? [],
            subtypes: [],
            supertype: card.category ?? '',
            variants: normaliseVariants(card),
            imageUrl: imgs.imageUrl ?? '',
            imageUrlHiRes: imgs.imageUrlHiRes ?? '',
            priceEUR,
            priceUSD: null,
            pricing: card.pricing ?? null,
          },
        },
        upsert: true,
      },
    }
  })

  if (ops.length > 0) {
    await db.collection('cards').bulkWrite(ops, { ordered: false })
  }

  const prices = cards.map(resolvePriceEUR).filter((p): p is number => p !== null)
  const totalValueEUR = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) : null

  await db.collection('sets').updateOne(
    { tcgdex_id: brief.id },
    { $set: { totalValueEUR, totalValueUSD: null, totalValue: totalValueEUR } },
  )

  return {
    setId: brief.id,
    setName: brief.name,
    cardsUpserted: cards.length,
    pricedCards: prices.length,
    totalValue: totalValueEUR,
  }
}

export async function seedSetIdsTcgdex(setIds: string[]): Promise<SeedReport> {
  if (setIds.length === 0) {
    return { results: [], errors: [], setsTouched: 0, cardsUpserted: 0, pricedCards: 0 }
  }

  await ensureIndexes()
  const all = await fetchAllSets()
  const wanted = new Set(setIds)
  const targets = all.filter((s) => wanted.has(s.id))

  const results: SeedSetResult[] = []
  const errors: { setId: string; message: string }[] = []

  for (const id of setIds) {
    if (!targets.find((t) => t.id === id)) {
      errors.push({ setId: id, message: 'Set not found in TCGdex API' })
    }
  }

  for (let i = 0; i < targets.length; i++) {
    const set = targets[i]
    try {
      results.push(await seedOneSet(set))
    } catch (err) {
      errors.push({
        setId: set.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, INTER_SET_DELAY_MS))
    }
  }

  return {
    results,
    errors,
    setsTouched: results.length,
    cardsUpserted: results.reduce((s, r) => s + r.cardsUpserted, 0),
    pricedCards: results.reduce((s, r) => s + r.pricedCards, 0),
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/seedSeriesTcgdex.ts
git commit -m "feat(seed): add TCGdex seeder writing tcgdex_id, priceEUR, structured variants"
```

---

## Task 5: Wire `SEED_SOURCE` dispatcher

**Files:**
- Modify: `lib/seedSeries.ts`

- [ ] **Step 1: Add a dispatch wrapper at the bottom of `lib/seedSeries.ts` (preserve all existing exports)**

Replace the existing `export async function seedSetIds(setIds: string[]): Promise<SeedReport>` function with this:

```ts
async function seedSetIdsLegacy(setIds: string[]): Promise<SeedReport> {
  // ...existing body of the original seedSetIds, unchanged...
}

export async function seedSetIds(setIds: string[]): Promise<SeedReport> {
  const source = (process.env.SEED_SOURCE ?? 'pokemontcg').toLowerCase()
  if (source === 'tcgdex') {
    const { seedSetIdsTcgdex } = await import('./seedSeriesTcgdex')
    return seedSetIdsTcgdex(setIds)
  }
  return seedSetIdsLegacy(setIds)
}
```

(Rename the function body, do not delete it. The legacy seeder remains importable as a fallback during cutover.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual smoke — seed one small set via the admin UI**

```bash
# Ensure SEED_SOURCE=tcgdex in .env, then:
npm run dev
```

In a browser, visit `/admin/seed`, find `mcd24` (McDonald's IT — 15 cards), click "Seed". Wait for completion. Expected: green ✓ row, ~15 cards, EUR total > 0.

Verify in shell:

```bash
npx tsx -e "import('./lib/db').then(async ({getDb}) => { const d = await getDb(); const s = await d.collection('sets').findOne({tcgdex_id:'mcd24'}); console.log(s); const c = await d.collection('cards').findOne({set_id:'mcd24'}); console.log(c); process.exit(0)})"
```

Expected: set doc has `tcgdex_id: 'mcd24'`, `language: 'it'`, `totalValueEUR` set; card has `tcgdex_id`, `priceEUR`, `variants` object, image URL ending in `/low.webp`.

- [ ] **Step 4: Commit**

```bash
git add lib/seedSeries.ts
git commit -m "feat(seed): dispatch on SEED_SOURCE env, default pokemontcg, opt-in tcgdex"
```

---

## Task 6: Admin seed page passthrough

**Files:**
- Modify: `app/(app)/admin/seed/page.tsx`

The `SeedClient.tsx` consumes `SeedReport`/`SeedSetResult` which we kept stable. The page itself reads sets from MongoDB and from the upstream API to compute "new vs in DB". Audit it for any direct `pokemontcg_id` references.

- [ ] **Step 1: Read `app/(app)/admin/seed/page.tsx`** — locate any reference to `pokemontcg_id`, `cardmarketPrice`, or `totalValue` and the upstream `fetchAllSets` import.

- [ ] **Step 2: Update — use `tcgdex_id` for in-DB lookup and TCGdex `fetchAllSets`**

For each occurrence:
- `import { fetchAllSets } from '@/lib/pokemontcg'` → `import { fetchAllSets } from '@/lib/tcgdex'`
- DB-side filter `{ pokemontcg_id }` for joining with API set → `{ tcgdex_id }`
- Read `dbTotalValue` from `totalValueEUR ?? totalValue` (prefer the new field, fall back during transition).
- The `apiTotal`/`printedTotal` fields move from `set.total`/`set.printedTotal` → `set.cardCount?.total`/`set.cardCount?.official` (with fallback to 0).
- `releaseDate` from `set.releaseDate` (TCGdex returns same string format).
- `logoUrl` from `buildAssetUrl(set.logo)` (use the helper from `lib/tcgdex`).
- Series grouping uses `set.serie?.name` as the source; reuse `resolveSeries(set.id, set.serie?.name ?? 'Other')` from `lib/seedSeries`.

If the page already builds `SetRow` objects, the conversion is mechanical — match field types declared in `SeedClient.tsx:9-19`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Visit `/admin/seed` in a browser. Expected: no console errors, list groups by Italian series names, McDonald's set shows correct DB values, "new" badges only on un-seeded sets.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/admin/seed/page.tsx"
git commit -m "feat(admin): seed page reads from TCGdex sets, joins on tcgdex_id"
```

---

## Task 7: Backfill seed (one-time operation)

This is an operational step, not a code change.

- [ ] **Step 1: Confirm `.env` has `SEED_SOURCE=tcgdex`.**

- [ ] **Step 2: Take a database snapshot (insurance for Task 8).**

```bash
mongodump --uri "$MONGODB_URI" --db "$MONGODB_DB" --out ".backup/$(date +%Y-%m-%d-pre-tcgdex)"
```

Expected: `done dumping pokemon.userCards`, `pokemon.cards`, `pokemon.sets` lines.

- [ ] **Step 3: From `/admin/seed`, click "Seed all" and let it complete.**

Expected: every set ends with green ✓, total EUR > 0 for sets that have pricing. Errors are tolerable for promo-only sets that lack pricing — note them but proceed.

- [ ] **Step 4: Sanity-check counts**

```bash
npx tsx -e "import('./lib/db').then(async ({getDb}) => { const d = await getDb(); console.log('sets:', await d.collection('sets').countDocuments({tcgdex_id:{\$ne:null}})); console.log('cards:', await d.collection('cards').countDocuments({tcgdex_id:{\$ne:null}})); console.log('priced:', await d.collection('cards').countDocuments({priceEUR:{\$ne:null}})); process.exit(0)})"
```

Expected: sets ≥ 100 (all seeded sets), cards in tens of thousands, priced is a high fraction of cards.

- [ ] **Step 5: Commit a marker (no code, but record state)**

```bash
git commit --allow-empty -m "chore(seed): backfill complete — all sets seeded via TCGdex"
```

---

## Task 8: One-time `userCards.cardId` migration (Option A)

**Files:**
- Create: `scripts/migrateUserCardsToTcgdex.ts`

- [ ] **Step 1: Create the script — idempotent, dry-run first**

```ts
import 'dotenv/config'
import { getDb } from '../lib/db'

type CardKeyDoc = { pokemontcg_id?: string | null; tcgdex_id?: string | null }

async function buildKeyMap(): Promise<Map<string, string>> {
  const db = await getDb()
  const cursor = db.collection<CardKeyDoc>('cards').find(
    { pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } },
    { projection: { _id: 0, pokemontcg_id: 1, tcgdex_id: 1 } },
  )
  const map = new Map<string, string>()
  for await (const doc of cursor) {
    if (doc.pokemontcg_id && doc.tcgdex_id) {
      map.set(doc.pokemontcg_id, doc.tcgdex_id)
    }
  }
  return map
}

async function main() {
  const dryRun = !process.argv.includes('--apply')
  const db = await getDb()

  const keyMap = await buildKeyMap()
  console.log(`[migrate] pokemontcg_id → tcgdex_id pairs: ${keyMap.size}`)

  // The map covers all cards seeded via legacy → TCGdex. For TCGdex-only cards
  // (McDonald's IT, etc.), there is no pokemontcg_id, so legacy userCards never
  // referenced them and the migration does not need to consider them.

  const tcgdexIds = new Set<string>()
  for await (const doc of db.collection('cards').find(
    { tcgdex_id: { $ne: null } },
    { projection: { _id: 0, tcgdex_id: 1 } },
  )) {
    if (doc.tcgdex_id) tcgdexIds.add(doc.tcgdex_id)
  }

  let alreadyMigrated = 0
  let toRewrite = 0
  let unknown = 0
  const unknownSamples: string[] = []
  const cursor = db.collection('userCards').find({}, { projection: { _id: 1, cardId: 1 } })

  for await (const uc of cursor) {
    const id = uc.cardId as string | undefined
    if (!id) continue
    if (tcgdexIds.has(id)) { alreadyMigrated += 1; continue }
    const next = keyMap.get(id)
    if (!next) {
      unknown += 1
      if (unknownSamples.length < 10) unknownSamples.push(id)
      continue
    }
    toRewrite += 1
    if (!dryRun) {
      await db.collection('userCards').updateOne(
        { _id: uc._id, cardId: id },
        { $set: { cardId: next } },
      )
    }
  }

  console.log(`[migrate] already on tcgdex_id: ${alreadyMigrated}`)
  console.log(`[migrate] rewrites ${dryRun ? 'planned' : 'applied'}: ${toRewrite}`)
  console.log(`[migrate] unmatched legacy ids: ${unknown}`)
  if (unknownSamples.length > 0) {
    console.log(`[migrate] sample unmatched: ${unknownSamples.join(', ')}`)
  }
  if (dryRun) console.log('[migrate] dry run — re-run with --apply to commit')
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Dry-run**

Run: `npx tsx scripts/migrateUserCardsToTcgdex.ts`
Expected: prints map size, planned rewrites count > 0, unmatched count = 0 (or, if non-zero, inspect samples — they may be cards from sets that were never seeded; resolve by either seeding the missing set or deciding whether to leave the user row as-is).

- [ ] **Step 3: If unmatched count > 0, investigate before applying.**

Likely causes:
- A set missing from the backfill — re-seed it then re-run dry-run.
- A user-only card (impossible by current data model — investigate before proceeding).

Do NOT proceed to apply until unmatched is 0.

- [ ] **Step 4: Apply**

Run: `npx tsx scripts/migrateUserCardsToTcgdex.ts --apply`
Expected: prints "rewrites applied: N", "unmatched legacy ids: 0".

- [ ] **Step 5: Verify idempotence — re-run apply**

Run: `npx tsx scripts/migrateUserCardsToTcgdex.ts --apply`
Expected: "rewrites applied: 0", "already on tcgdex_id: <total>".

- [ ] **Step 6: Commit**

```bash
git add scripts/migrateUserCardsToTcgdex.ts
git commit -m "feat(migrate): one-time userCards.cardId remap pokemontcg_id → tcgdex_id"
```

---

## Task 9: Swap query layer — `lib/cards.ts`

**Files:**
- Modify: `lib/cards.ts`

- [ ] **Step 1: Read the file fully** — find every `pokemontcg_id` and `cardmarketPrice` site.

- [ ] **Step 2: Mechanical swap. For each occurrence:**

- `getCardById(pokemontcg_id: string)` → `getCardById(tcgdex_id: string)`; query becomes `{ tcgdex_id }`.
- Filter on owned IDs (`filter.pokemontcg_id`) → `filter.tcgdex_id`.
- `$lookup` from `'sets'` with `foreignField: 'pokemontcg_id'` → `foreignField: 'tcgdex_id'`.
- `filter.cardmarketPrice` and `sortSpec.cardmarketPrice` → `priceEUR`.
- Any external return type that used to expose `cardmarketPrice` should expose `priceEUR` (callers will be migrated by the next two tasks).

- [ ] **Step 3: Extend `RAW_RARITIES_BY_NORMALISED` with Italian variants**

Add Italian entries to the existing English map. Example shape:

```ts
const RAW_RARITIES_BY_NORMALISED: Record<string, string[]> = {
  Common:   ['Common', 'Comune'],
  Uncommon: ['Uncommon', 'Non Comune'],
  Rare:     ['Rare', 'Rara'],
  'Rare Holo':       ['Rare Holo', 'Rara Holo'],
  'Rare Ultra':      ['Rare Ultra', 'Ultra Rara'],
  'Rare Secret':     ['Rare Secret', 'Rara Segreta'],
  'Double Rare':     ['Double Rare', 'Doppia Rara'],
  'Illustration Rare':       ['Illustration Rare', 'Rara Illustrata'],
  'Special Illustration Rare': ['Special Illustration Rare', 'Rara Illustrata Speciale'],
  Promo:    ['Promo'],
  // ...keep existing English-only entries that have no IT counterpart...
}
```

After applying the seed in Task 7, surface the actually-encountered IT rarity strings:

```bash
npx tsx -e "import('./lib/db').then(async ({getDb}) => { const d = await getDb(); const r = await d.collection('cards').distinct('rarity', {language:'it'}); console.log(r); process.exit(0)})"
```

Expected: list of IT rarity strings. Cross-check that every distinct value appears in exactly one bucket of `RAW_RARITIES_BY_NORMALISED`. Add any missing string. If you see one you don't recognize, group by visual inspection of cards on `/cards/<id>` rather than guessing.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: callers of `getCardById` will fail because their argument names changed — that's expected and resolved by Tasks 10–11. For now, fix only call sites *inside `lib/cards.ts`*; leave external errors for the next task.

Run with focus: `npx tsc --noEmit 2>&1 | grep "lib/cards.ts"`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/cards.ts
git commit -m "refactor(cards): query on tcgdex_id, sort on priceEUR, add IT rarities"
```

---

## Task 10: Swap query layer — `lib/sets.ts`

**Files:**
- Modify: `lib/sets.ts`

- [ ] **Step 1: Mechanical swap**

In `lib/sets.ts:100-104` (`getSetById`):

```ts
export async function getSetById(tcgdex_id: string): Promise<PokemonSet | null> {
  const db = await getDb()
  const doc = await db.collection('sets').findOne({ tcgdex_id })
  return doc ? serializeSet(doc as Record<string, unknown>) : null
}
```

In `lib/sets.ts:124-136` (`getPrintedTotalsBySetId`):

```ts
export async function getPrintedTotalsBySetId(): Promise<Map<string, number>> {
  const db = await getDb()
  const docs = await db
    .collection('sets')
    .find({}, { projection: { tcgdex_id: 1, printedTotal: 1 } })
    .toArray()
  const map = new Map<string, number>()
  for (const d of docs) {
    const doc = d as unknown as { tcgdex_id: string; printedTotal: number }
    map.set(doc.tcgdex_id, doc.printedTotal)
  }
  return map
}
```

In `lib/sets.ts:138-146` (`getSetsByIds`):

```ts
export async function getSetsByIds(ids: string[]): Promise<PokemonSet[]> {
  if (ids.length === 0) return []
  const db = await getDb()
  const docs = await db
    .collection('sets')
    .find({ tcgdex_id: { $in: ids } })
    .toArray()
  return docs.map((d) => serializeSet(d as Record<string, unknown>))
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep "lib/sets.ts"`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/sets.ts
git commit -m "refactor(sets): primary lookups on tcgdex_id"
```

---

## Task 11: Swap query layer — `lib/userCards.ts`

**Files:**
- Modify: `lib/userCards.ts`

- [ ] **Step 1: Mechanical sweep**

For every `$lookup` against the `cards` collection:
- `foreignField: 'pokemontcg_id'` → `foreignField: 'tcgdex_id'`

For every value-sum aggregation that reads pricing:
- `$ifNull: ['$card.cardmarketPrice', 0]` → `$ifNull: ['$card.priceEUR', 0]`
- Any direct `card.cardmarketPrice` projection → `card.priceEUR`

`localField` continues to be `userCards.cardId` (which is now a `tcgdex_id` after Task 8).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean across the whole project (Tasks 9–11 are now consistent).

Run: `npm run build` (Next.js prod build catches dynamic import errors)
Expected: success.

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
```

Visit, in order, and verify nothing 500s:
1. `/dashboard` — KPIs render with EUR values.
2. `/collection` — owned cards list shows correct counts and prices.
3. `/cards/<some-tcgdex-id>` — card detail renders.
4. `/browse/<series-slug>` — sets render with cover art.
5. `/analytics` — charts render with non-zero EUR totals.
6. `/wishlist` — list renders.

If any value shows as `0` or `null` where there should be a price, check the corresponding `priceEUR` in MongoDB.

- [ ] **Step 4: Commit**

```bash
git add lib/userCards.ts
git commit -m "refactor(userCards): \$lookup on tcgdex_id, sums on priceEUR"
```

---

## Task 12: Drop legacy `cardmarketPrice` field

**Files:**
- Create: `scripts/dropLegacyCardmarketPrice.ts`
- Modify: `lib/types.ts`

- [ ] **Step 1: Confirm no remaining references**

Run:

```bash
git grep -nE "cardmarketPrice|pokemontcg_id" -- 'lib/' 'app/' 'components/' 'scripts/' \
  ':!scripts/migrateUserCardsToTcgdex.ts' \
  ':!scripts/dropLegacyCardmarketPrice.ts' \
  ':!lib/seedSeries.ts' \
  ':!lib/seedSeriesTcgdex.ts'
```

Expected: empty (the legacy seeder and the migration script are the only allowed references to `pokemontcg_id`; nothing should reference `cardmarketPrice` anywhere in app code).

- [ ] **Step 2: Create the cleanup script**

```ts
import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const dryRun = !process.argv.includes('--apply')
  const db = await getDb()
  const cardsToClean = await db.collection('cards').countDocuments({ cardmarketPrice: { $exists: true } })
  const setsToClean = await db.collection('sets').countDocuments({ totalValue: { $exists: true } })
  console.log(`[cleanup] cards with cardmarketPrice: ${cardsToClean}`)
  console.log(`[cleanup] sets with totalValue: ${setsToClean}`)
  if (dryRun) { console.log('[cleanup] dry run — re-run with --apply to commit'); return }
  const r1 = await db.collection('cards').updateMany({ cardmarketPrice: { $exists: true } }, { $unset: { cardmarketPrice: '' } })
  const r2 = await db.collection('sets').updateMany({ totalValue: { $exists: true } }, { $unset: { totalValue: '' } })
  console.log(`[cleanup] cards modified: ${r1.modifiedCount}; sets modified: ${r2.modifiedCount}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Dry-run, then apply**

```bash
npx tsx scripts/dropLegacyCardmarketPrice.ts
npx tsx scripts/dropLegacyCardmarketPrice.ts --apply
```

Expected: counts match the universe, then non-zero `modifiedCount` on apply.

- [ ] **Step 4: Drop the legacy fields from `lib/types.ts`**

Remove `cardmarketPrice` from `Card` and `totalValue` from `PokemonSet` (keep `totalValueEUR`/`totalValueUSD`).

- [ ] **Step 5: Drop the legacy `cardmarketPrice` writes from the legacy seeder**

In `lib/seedSeries.ts:97`, the legacy seeder still writes `cardmarketPrice`. Since the legacy seeder is now only a fallback, leave it as-is — but rename the field it writes to `priceEUR` so a fallback seed produces compatible data:

```ts
priceEUR: resolvePrice(card),
```

And in the set total update, write to `totalValueEUR` instead of `totalValue`.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add scripts/dropLegacyCardmarketPrice.ts lib/types.ts lib/seedSeries.ts
git commit -m "chore(cleanup): drop cardmarketPrice/totalValue, unify legacy seeder on priceEUR"
```

---

## Task 13: Final verification

Not a code task — a checklist before marking the migration done.

- [ ] **Step 1: Database invariants**

```bash
npx tsx -e "import('./lib/db').then(async ({getDb}) => { const d = await getDb();
  const a = await d.collection('cards').countDocuments({tcgdex_id:null});
  const b = await d.collection('cards').countDocuments({cardmarketPrice:{\$exists:true}});
  const c = await d.collection('userCards').countDocuments({});
  const cardIds = await d.collection('userCards').distinct('cardId');
  const known = await d.collection('cards').countDocuments({tcgdex_id:{\$in:cardIds}});
  console.log({cardsWithoutTcgdexId:a, cardsWithLegacyPrice:b, userCards:c, userCardsResolved:known});
  process.exit(0)})"
```

Expected: `cardsWithoutTcgdexId: 0`, `cardsWithLegacyPrice: 0`, `userCardsResolved == userCards`.

- [ ] **Step 2: UI smoke**

Repeat the smoke walk from Task 11 Step 3. Expect no regressions.

- [ ] **Step 3: Commit a final marker**

```bash
git commit --allow-empty -m "chore(migration): TCGdex dual-API migration complete"
```

---

## Self-Review Notes (already applied)

- **Spec coverage:** §1 dual-API → Tasks 2 + (deferred USD enrichment). §2 architecture → Tasks 1–4. §3 schema → Tasks 3–4. §4 image URLs → Task 2 (`buildCardImageUrls`/`buildAssetUrl`). §5 Option A migration → Task 8. §6 seeder rewrite → Tasks 4–5. §7 query/UI updates → Tasks 9–11. §8 rollout sequence → Tasks 1→13 in order. §9 multi-language → Tasks 1, 2, 4 (`language` field, `TCGDEX_LANG`). §10 non-goals → respected (no live USD UI, no realtime). §11 risks → mitigated by idempotence (Task 8), concurrency limit (Task 2), best-effort USD (deferred), Italian rarity sweep (Task 9).
- **Placeholder scan:** all step bodies contain explicit code, commands, or expected output.
- **Type consistency:** `seedSetIdsTcgdex` returns `SeedReport`; `SeedReport`/`SeedSetResult` reused unchanged from `lib/seedSeries.ts` so `SeedClient.tsx` continues to compile. `tcgdex_id` field used identically in seeder writes (Task 4) and query reads (Tasks 9–11). `priceEUR` field used identically in seeder writes (Task 4), aggregations (Task 11), and sort filters (Task 9).
- **USD enrichment** is deliberately deferred — schema is ready (`priceUSD`, `pricing.tcgplayer`); turn-on is a future task once a `(setName, number)` cache exists.
