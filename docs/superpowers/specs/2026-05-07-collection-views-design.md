# Collection Views (My Cards + Wishlist + Analytics) — Design

**Status:** Approved
**Date:** 2026-05-07
**Author:** PokeVault team

## Goal

Replace the three sidebar stubs (`/collection`, `/wishlist`, `/analytics`) with a coordinated v1 set of "collection-centric" views over the existing `userCards` data model, plus a new `wishlist` collection. Ships as one spec, three phased implementation phases — each phase is independently usable.

## Why now

The catalog, collection data model, card detail page, and theming system are all in production. The sidebar has three "coming soon" stubs that block the user experience from feeling complete. These three features share a data layer (aggregations over `userCards`) and a UX language ("what do I own / want / spend"), so they're cheaper to build together than apart.

## Scope

### In scope (v1)

- **My Cards** (`/collection`) — owned-cards grid, grouped by `cardId`, with filters/sort/search mirroring the browse page URL contract. Public to all logged-in users.
- **Wishlist** (`/wishlist`) — new MongoDB collection for "cards I want", with star toggles in browse + card detail. Free tier capped at 25; Pro unlimited.
- **Analytics** (`/analytics`) — KPI strip + 7 chart panels over the user's `userCards`. Pro-only for charts; free users see KPIs with blurred-chart upgrade teaser.
- **Charting library:** Recharts.
- **Shared aggregation helpers** in `lib/userCards.ts` — used by both My Cards and Analytics.

### Out of scope (deferred)

- Market-value tracking (we use acquisition cost + graded value as a "value tracking is acquisition-based" proxy — explicitly disclosed in UI).
- Wishlist "bulk add" or "wishlist this set" actions.
- Sharing, exporting, or printing collection lists.
- Currency conversion / multi-currency support.
- Marketplace / listings (v2 roadmap item).

## User-facing behavior

### My Cards (`/collection`)

- Header: "My Cards" + count badge, e.g. "123 unique · 287 copies".
- Filter bar (URL-driven): `?series=&set=&rarity=&variant=&type=&condition=&sort=&q=`
  - Search: name + setCode
  - Filters: series, set, rarity, variant, raw/graded, condition (raw only)
  - Sort: recently-added (default), name, set release date, copy count, total cost
- Grid of `OwnedCardTile` (collapsed by card):
  - Card art + name + setCode/era chips
  - Copy count badge (e.g. "×3")
  - Raw/graded mini-pill (e.g. "R 2 · G 1", or just "R" / "G" if homogeneous)
  - Total cost in small text (only when at least one copy has `cost`)
- Click tile → existing `/cards/[id]` (per-copy management lives there).
- Empty state: "You don't own any cards yet — [Browse cards →]".

### Wishlist (`/wishlist`)

- Header: "Wishlist" + count + cap indicator for free users (e.g. "12 / 25 — [Upgrade for unlimited]").
- Grid of card tiles (reuses browse `CardCell` style) with filled `WishlistStar` overlay and a small remove button.
- Sort: recently added (default), name, set release date, priority.
- Empty state: "Star cards from [Browse →] to add them here."

### WishlistStar component

Used in two places: browse-tile overlay (top-left) and card-detail page (next to `OwnedCounter`).

States:
- **Logged-out:** hidden.
- **Free user, below cap:** unfilled star → click adds → filled.
- **Free user at cap:** unfilled star → click opens "Wishlist full — upgrade" dialog.
- **Pro user:** unlimited toggle.
- **Already wishlisted:** filled star → click removes (with optimistic update).

Browse page server-loads a `wishlistedIds: Set<string>` for the current user (one query), passes into `CardsGrid` — no N+1.

### Analytics (`/analytics`)

**Free user view (teaser):** KPIs render with real numbers; the seven charts render blurred behind a centered "Upgrade to Pro to unlock charts" CTA.

**Pro user view:**
- KPI strip across the top: Total copies · Unique cards · Total spend · Estimated value (with disclaimer "value tracking is acquisition-based").
- 2-column grid of charts (1-column on mobile):
  - Row 1: Raw vs Graded donut · Rarity bar
  - Row 2: By Series bar · By Set top-10 bar (with "view all" link)
  - Row 3: Acquisition timeline (full-width) · Spend over time (full-width)
- All charts use Recharts with Pokémon-palette theme tokens (`--color-blue`, `--color-mauve`, etc.).

**Empty state (no copies yet, any tier):** single CTA "Add your first card to unlock collection analytics" — no blurred charts.

### Sidebar gating updates

- `My Cards` — unchanged (no Pro gate).
- `Wishlist` — remove `pro: true` flag. Page enforces the 25-cap for free users server-side.
- `Analytics` — keep `pro: true` flag in the data, but change rendering: the link navigates to the teaser page rather than rendering as a disabled item.

## Architecture

### Approach

Shared aggregation helpers in `lib/userCards.ts` (matches existing `lib/cards.ts` / `lib/sets.ts` patterns), plus a new `lib/wishlist.ts` for the new collection.

### File structure

**New files:**

- `lib/wishlist.ts` — `addToWishlist`, `removeFromWishlist`, `getWishlistForUser`, `isOnWishlist`, `getWishlistedIdsForUser`, `countWishlist`
- `lib/schemas/wishlist.ts` — Zod schemas
- `app/(app)/collection/page.tsx` — My Cards
- `app/(app)/collection/CollectionFilters.tsx` — URL-driven filter bar
- `app/(app)/collection/OwnedCardTile.tsx` — owned-card grid tile
- `app/(app)/wishlist/page.tsx` — wishlist grid
- `app/(app)/wishlist/actions.ts` — add/remove server actions
- `app/(app)/analytics/page.tsx` — analytics dashboard
- `app/(app)/analytics/charts/KpiCards.tsx`
- `app/(app)/analytics/charts/BySeriesChart.tsx`
- `app/(app)/analytics/charts/BySetChart.tsx`
- `app/(app)/analytics/charts/RawVsGradedDonut.tsx`
- `app/(app)/analytics/charts/RarityChart.tsx`
- `app/(app)/analytics/charts/AcquisitionTimeline.tsx`
- `app/(app)/analytics/charts/SpendTimeline.tsx`
- `components/wishlist/WishlistStar.tsx` — toggle button

**Modified files:**

- `lib/userCards.ts` — add: `getOwnedCardsGrouped`, `getCollectionStats`, `getCollectionTimeseries`, `getRawVsGradedSplit`, `getBySeriesBreakdown`, `getBySetBreakdown`, `getRarityBreakdown`
- `lib/types.ts` — add `OwnedCardGroup`, `CollectionStats`, `WishlistItem`, chart datapoint types
- `components/catalog/CardsGrid.tsx` — accept optional `wishlistedIds: Set<string>` and render `WishlistStar` overlay
- `app/(catalog)/cards/[id]/page.tsx` — add `WishlistStar` next to `OwnedCounter`
- `app/(catalog)/browse/[series]/[set]/page.tsx` — load `wishlistedIds` for current user, pass to grid
- `app/(catalog)/browse/[series]/page.tsx` — same
- `app/(catalog)/browse/page.tsx` — same
- `components/layout/Sidebar.tsx` — drop `pro: true` from Wishlist; change Analytics rendering to navigate-to-teaser
- `package.json` — add `recharts`

**New MongoDB collection:** `wishlist`, indexes:
- `{ userId: 1, cardId: 1 }` unique
- `{ userId: 1, addedAt: -1 }`

### Data layer & schemas

**Wishlist Zod schema** (`lib/schemas/wishlist.ts`):

```typescript
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
```

Server actions parse with Zod at the boundary. Free-tier cap (25) enforced server-side in `addToWishlist` — returns `{ ok: false, reason: 'cap_reached' }` for the UI to show the upgrade prompt.

**`OwnedCardGroup` type** (`lib/types.ts`):

```typescript
type OwnedCardGroup = {
  cardId: string
  card: Card           // joined from cards collection
  copyCount: number
  rawCount: number
  gradedCount: number
  totalCost: number
  estValue: number     // sum of gradedValue (graded) + cost (raw fallback)
  lastAcquiredAt: Date
  variants: CardVariant[]   // distinct variants owned (for tile badges)
}
```

**`getOwnedCardsGrouped` pipeline shape:**

```
match: { userId }
group: by cardId → copyCount, rawCount, gradedCount, totalCost, estValue, lastAcquiredAt, variants
lookup: cards collection by cardId
filter: post-lookup (series/set/rarity/variant/type/condition match)
sort: per `sort` param
paginate: limit/skip
```

Filters/sort accepted as a typed `OwnedCardsQuery` object, parsed from URL search params with Zod (mirrors existing `FilterBar`/`SortMenu` URL contract).

**Analytics aggregations** — each is a single MongoDB pipeline returning chart-ready datapoints. No client-side reshaping.

- `getCollectionStats(userId) → { totalCopies, uniqueCards, totalSpend, estValue }`
- `getBySeriesBreakdown(userId) → Array<{ series, copies, spend }>`
- `getBySetBreakdown(userId, limit?) → Array<{ setCode, setName, copies, spend }>`
- `getRawVsGradedSplit(userId) → { raw: { copies, spend }, graded: { copies, spend } }`
- `getRarityBreakdown(userId) → Array<{ rarity, copies }>`
- `getCollectionTimeseries(userId) → Array<{ month: 'YYYY-MM', copiesAdded, cumulativeCopies, cumulativeSpend }>`

Indexes: `userCards` already has `{ userId: 1, cardId: 1 }` and `{ userId: 1, acquiredAt: -1 }` — no new indexes needed for the aggregations.

## Testing

Vitest, follows existing patterns (real test DB, no mocks per CLAUDE.md):

- `lib/userCards.aggregations.test.ts` — seeded fixture, asserts each new helper for raw-only, graded-only, mixed, empty users.
- `lib/wishlist.test.ts` — add/remove/idempotency, free-tier cap enforcement, unique-index behavior.
- `lib/schemas/wishlist.test.ts` — schema parsing edge cases.
- `components/wishlist/__tests__/WishlistStar.test.tsx` — toggle states, capped state, logged-out state.
- `components/collection/__tests__/CollectionFilters.test.tsx` — URL serialization round-trip.
- `app/(app)/wishlist/actions.test.ts` — server-action zod validation, cap path, ownership check.

## Phased rollout

Single spec, three phases — each independently shippable:

1. **Phase 1 — My Cards.** Aggregation helpers in `lib/userCards.ts` + tests, `OwnedCardGroup` type, `/collection` page, `CollectionFilters`, `OwnedCardTile`. No new collections. Lowest risk.
2. **Phase 2 — Analytics.** Recharts dependency, remaining aggregation helpers, `/analytics` page with KPI strip + 7 charts, free-tier teaser. Reuses Phase 1 helpers.
3. **Phase 3 — Wishlist.** New `wishlist` collection + Zod schema, `lib/wishlist.ts`, server actions, `WishlistStar`, browse + card detail integration, `/wishlist` page, sidebar gating change. Highest integration surface.

## Risks & mitigations

- **Aggregation perf at scale.** A user with thousands of copies running multiple pipelines on every analytics page-load could be slow. Mitigation: cache `getCollectionStats` result for 60s per user via Next.js `unstable_cache`. Acceptable staleness for non-financial data.
- **Free-tier cap bypass.** Cap must be enforced server-side, not client-side. Server action checks `countWishlist(userId)` against tier before insert.
- **Recharts bundle size (~90KB gz).** Lazy-load the analytics page client components so the cost is only paid by users navigating there.
- **Wishlist + browse N+1.** Avoided by loading `wishlistedIds: Set<string>` once in the page server component and passing into `CardsGrid`.
