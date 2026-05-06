# tcgcollector Alignment — Phase 1 Design

**Date:** 2026-05-06
**Status:** Approved (phased — Phase 1 only)
**Scope:** Adopt tcgcollector.com vocabulary and labelling on top of the existing PokeVault catalog and collection. Italy-only (no region split). No URL restructure. No `/collection/*` mirror routes. No HP/attacks/artist/Pokédex backfill. Those remain out of scope and are deferred to a possible Phase 2.

---

## Goal

Bring PokeVault's labels, taxonomy, and browse UX in line with how tcgcollector organises Pokémon TCG data, so that the catalog, set pages, card detail pages, and collection counts speak the same language as the reference site.

The change is intentionally **additive**: existing routes, existing data shapes, and existing collection records all keep working untouched.

## Why

tcgcollector is the de-facto reference for Pokémon card metadata vocabulary. Aligning gives users:

- A grouping layer (**Era**) above Series, matching how collectors think about the hobby.
- Shareable **set codes** (SVI, SV01, SWSH09) instead of long set names.
- A **standardised rarity vocabulary** (Common → Hyper Rare) instead of the noisy raw API strings.
- **Per-set applicable variants**, so the AddCopyDialog only offers variants that actually exist for that set.
- **Filters and sort** on the set page so users can find cards.
- **"X / Y owned"** completion chips on every set tile so users see progress at a glance.

## Out of Scope (Phase 2 candidates)

- URL restructure to `/cards/intl/{era}/{series}/{setCode}/{cardNumber}`.
- Dedicated `/collection/*` routes mirroring the catalog.
- List view toggle (grid-only stays).
- HP / attacks / weakness / resistance / retreat / artist / Pokédex entry attribute backfill.
- Region split (intl vs jp). PokeVault stays Italy-only single-catalog as originally planned.
- Era / series / set completion stats with progress bars (only the per-set count chip ships in Phase 1).

---

## Architecture

Phase 1 layers a **taxonomy module** on top of the existing pokemontcg.io-derived data. Page components consume the taxonomy through pure functions that map raw API values to normalised tcgcollector labels. No DB migration. No URL changes. No seed-script rewrite.

```
+-----------------------------+        +--------------------------+
| pokemontcg.io derived data  |        | tcgcollector vocabulary  |
| (sets, cards in MongoDB)    | -----> | (era, rarity, variant,   |
|                             |        |  set code) — pure funcs  |
+-----------------------------+        +--------------------------+
                |                                    |
                v                                    v
        +---------------------------------------------+
        | Browse / Set / Card pages (Server Components)|
        | — render taxonomy-aware UI                   |
        +---------------------------------------------+
                |
                v
        +-----------------------------+
        | userCards (MongoDB)         |
        | aggregated for owned counts |
        +-----------------------------+
```

---

## Components

### 1. Taxonomy module — `lib/taxonomy/`

Pure functions, no DB I/O, fully unit-testable.

- **`lib/taxonomy/era.ts`**
  - `seriesToEra(series: string): Era` — lookup table mapping every known series to its era. Examples: `"Scarlet & Violet"` → `"Scarlet & Violet"` era; `"Sword & Shield"` → `"Sword & Shield"` era; `"Sun & Moon"` → `"Sun & Moon"` era.
  - `ERA_ORDER: readonly Era[]` — eras in reverse-chronological release order: `["Scarlet & Violet", "Sword & Shield", "Sun & Moon", "XY", "Black & White", "HeartGold & SoulSilver", "Diamond & Pearl", "EX", "e-Card", "Neo", "Original"]`.
  - Unknown series falls back to `"Other"` era and logs a warning.
  - Era values are zod-parsed at module boundary.

- **`lib/taxonomy/rarity.ts`**
  - `normaliseRarity(raw: string | null): NormalisedRarity` — maps raw pokemontcg.io rarity strings to the tcgcollector vocabulary: `Common`, `Uncommon`, `Rare`, `Rare Holo`, `Double Rare`, `Ultra Rare`, `Illustration Rare`, `Special Illustration Rare`, `Hyper Rare`, `Trainer Gallery`, `ACE SPEC Rare`, `Promo`, `Unknown`.
  - Mapping table is the single source of truth and zod-parsed.
  - Unmapped raw rarities return `"Unknown"` and log a warning with the raw value so the table can be extended.

- **`lib/taxonomy/variant.ts`**
  - Extends `CardVariant` enum (see Data & Types below).
  - `applicableVariantsForSet(set: PokemonSet): CardVariant[]` — returns the set of variants the AddCopyDialog should offer for a given set. Driven by an explicit per-era / per-set table.
  - `variantLabel(variant: CardVariant): string` — human-readable label.

- **`lib/taxonomy/setCode.ts`**
  - `setCodeFor(set: PokemonSet): string` — derives the tcgcollector set code from `pokemontcg_id` (e.g. `"sv1"` → `"SVI"`, `"swsh9"` → `"SWSH09"`) with explicit overrides for non-standard cases.
  - Override table is the only writable mutable surface; everything else is computed.

### 2. Browse page — `app/(catalog)/browse/page.tsx`

- Above the existing series grid, render an **Era accordion**: collapsible sections in `ERA_ORDER`, each containing the series rows that already render today.
- Each series row keeps its current set grid layout — no internal change.
- Each set tile gains:
  - **Set-code badge** in the top-left corner (e.g. `SVI`, small chip).
  - **`X / Y owned`** chip in the bottom-right when the user is signed in. Hidden for anonymous visitors.
- Default era state: most-recent era expanded; older eras collapsed.

### 3. Series page — `app/(catalog)/browse/[series]/page.tsx`

- Header gains an **era badge** (above or beside the series name).
- Set tiles gain the same **set-code badge** + **`X / Y owned`** chip as the browse page.
- Set list order unchanged (release-date desc).

### 4. Set page — `app/(catalog)/browse/[series]/[set]/page.tsx`

- Header gains:
  - **Era badge**.
  - **Set code chip** next to the set name.
  - **Release date** in tcgcollector format (`Mar 31, 2023` instead of `2023-03-31`).
- New **`<FilterBar />`** above the cards grid:
  - Filters: Rarity (multi), Type (multi), Variant (multi), Subtype (multi).
  - Driven by URL query params (`?rarity=...&type=...`) so links are shareable.
  - Implemented as a Client Component reading/writing `useSearchParams`.
- New **`<SortMenu />`**:
  - Options: Set order (default), Name asc, Name desc, Number asc, Number desc, Rarity.
  - Also URL-driven (`?sort=...`).
- Each card tile gains a **rarity icon overlay** (small badge in a corner) using the normalised rarity.
- Filtering/sorting happens in the Server Component before passing cards to `<CardsGrid />`.

### 5. Card detail — `app/(catalog)/cards/[id]/page.tsx`

- Top of the details column gains:
  - **Era badge**.
  - **Set code chip**.
  - **Normalised rarity chip** (e.g. `Illustration Rare`).
- Existing "Rarity" row: shows normalised label first with the raw API rarity in muted parens (e.g. `Illustration Rare (Rare Holo VMAX)`).
- `<OwnedCounter />` unchanged.
- `<AddCopyDialog />` variant `<select>` is wired through `applicableVariantsForSet(set)` so users only see variants relevant to the card's set. Existing 8 variants stay valid for any already-stored copies.

### 6. Owned-count surface — `lib/userCards.ts`

Add two server-side aggregation helpers:

- **`getOwnedCountsBySet(userId: string): Promise<Map<string, number>>`**
  - Aggregates `userCards` by `set_id` via the existing `userId_cardId` index path, joining through cards for set association.
  - Returns a Map keyed by `pokemontcg_id` of each set.

- **`getOwnedCountsBySeries(userId: string): Promise<Map<string, number>>`**
  - Same shape, keyed by `seriesSlug`.

Both are called once per page render and passed down through props. Anonymous users skip the call entirely.

---

## Data & Types

### `CardVariant` enum (extended, additive)

`lib/types.ts` — keep all existing values, add the new ones below.

```typescript
export type CardVariant =
  // existing — kept for back-compat with already-stored userCards
  | 'normal'
  | 'holo'
  | 'reverse-holo'
  | '1st-edition'
  | 'shadowless'
  | 'promo'
  | 'full-art'
  | 'alt-art'
  // new — tcgcollector vocabulary
  | 'holofoil'
  | 'reverse-holofoil'
  | 'pokeball-pattern'
  | 'masterball-pattern'
  | 'cosmos-holo'
  | 'crosshatch-holo'
  | 'galaxy-holo'
```

### `GradingCompany` enum (extended, additive)

Add `'Ace'` and `'GMA'` to the existing union. `'Other'` stays.

### Database

**No migration.** `userCards` documents already store `variant` and `gradingCompany` as strings. The new enum values become valid going forward; the existing 8 variants and existing grading companies remain valid for previously-stored copies.

---

## Data Flow

1. Server Component (`/browse`) calls `getSeriesWithSets()` (existing) and `getOwnedCountsBySeries(userId)` + `getOwnedCountsBySet(userId)` (new) in parallel.
2. The page maps each series → era via `seriesToEra(series)`, groups into `ERA_ORDER` buckets, and renders the accordion.
3. Each `<SetCard />` receives `set`, `setCode = setCodeFor(set)`, and `ownedCount = countsBySet.get(set.pokemontcg_id) ?? 0`.
4. Set page (`/browse/[series]/[set]`) reads `searchParams`, calls `getCardsBySet(setId)`, applies filter + sort in-memory (cards-per-set is bounded), and passes the result to `<CardsGrid />`.
5. Card detail page (`/cards/[id]`) computes `era`, `setCode`, and `normalisedRarity` once and renders the badges/chips.

## Error Handling

- Unknown series in `seriesToEra` → return `"Other"` era and `console.warn` with the unmapped value.
- Unknown rarity in `normaliseRarity` → return `"Unknown"` and `console.warn`.
- Unknown `pokemontcg_id` shape in `setCodeFor` → fall back to uppercased ID and `console.warn`.
- Filter / sort URL params zod-parsed; invalid values silently dropped.
- `getOwnedCountsBy*` failures bubble up to the page's existing error boundary; counts default to `0` if the call short-circuits for an anonymous user.

## Testing

- **Unit tests** (`vitest`) for every taxonomy module function:
  - `era.ts` — known series → era, unknown series fallback, ERA_ORDER ordering.
  - `rarity.ts` — every documented raw rarity maps to a normalised value; unknown falls back.
  - `setCode.ts` — standard pokemontcg_id derivation, override entries, unknown-id fallback.
  - `variant.ts` — applicable variants per representative set across all eras; label lookups.
- **Component test** for `<FilterBar />`: changing a filter writes the expected URL query params; reading the URL hydrates the right initial state.
- **Component test** for `<SortMenu />`: same pattern.
- **Integration test** for `getOwnedCountsBySet` + `getOwnedCountsBySeries` against in-memory MongoDB (existing pattern in the repo).
- Existing collection tests stay green — `<AddCopyDialog />`, `<RemoveCopyDialog />`, `<OwnedCounter />`, server actions all keep their current contracts.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Era / rarity / set-code lookup tables drift from upstream tcgcollector vocabulary | Tables centralised in `lib/taxonomy/`; warn-on-unknown so gaps surface in logs; unit tests cover the documented universe. |
| Per-set variant matrix is wrong for an obscure set | Default to a permissive superset for unknown sets; AddCopyDialog still works; users can correct via stored copies (which always remain editable). |
| Filter/sort on URL params breaks existing share links | No existing share links use these params; default behaviour (no params) reproduces today's grid exactly. |
| Owned-count aggregation is slow on large collections | Bounded by user's collection size and existing `userId_cardId` index; cached per request, not per render. |

## Effort Estimate

~4–6 days of focused work, broken into the implementation plan that follows. Mostly additive, low-risk.
