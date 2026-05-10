# Dual-API Catalog Migration: TCGdex + pokemontcg.io

**Date:** 2026-05-10
**Status:** Draft — awaits one decision (see §5)

## Goal

Switch catalog source of truth from `pokemontcg.io` (English/USD only, missing several Italian-localized sets) to **TCGdex** (multi-language, full Italian coverage, rich Cardmarket EUR pricing). Retain `pokemontcg.io` as a secondary source for **USD pricing only**, joined by `(setName, number)` for future multi-region readiness.

## 1. Why two APIs

| Capability                       | TCGdex `/v2/it` | pokemontcg.io |
|----------------------------------|-----------------|---------------|
| Italian card names / rarities    | ✅              | ❌            |
| McDonald's IT, Wizards IT, promo gaps | ✅         | ❌ (gaps confirmed) |
| Cardmarket EUR (avg/low/trend/holo) | ✅           | partial       |
| TCGPlayer USD pricing            | ❌ (`null`)     | ✅            |
| Auth / rate limits               | none            | API key, throttled |
| Set ID scheme                    | `sv01`, `wp`, `mcd24` | `sv1`, `wp`, `basep` |

**Verdict:** TCGdex covers what we lack today. USD is a *future* requirement → keep pokemontcg.io as an optional enrichment, not primary.

## 2. Architecture

```
TCGdex (/v2/{lang})          ← primary catalog + EUR pricing (it for now, configurable)
        │
        ▼
  seedSeries.ts → cards / sets collections
        ▲
        │
pokemontcg.io v2             ← optional USD enrichment (off by default)
   (joined by setName+number, not set_id)
```

- **Primary key** for cards: `tcgdex_id` (e.g. `sv01-001`).
- **Alternate key**: `pokemontcg_id` (e.g. `sv1-1`) — nullable, populated when USD enrichment succeeds.
- Seeder writes `priceEUR` (from TCGdex Cardmarket) and `priceUSD` (from pokemontcg.io TCGPlayer, when matched).

## 3. Schema changes

### `sets`
```ts
{
  tcgdex_id: string         // new primary, e.g. "sv01"
  pokemontcg_id: string | null
  language: "it" | "en" | ... // currently "it"
  name: string
  series: string
  seriesSlug: string
  releaseDate: string
  totalCards: number        // cardCount.total
  printedTotal: number      // cardCount.official
  logoUrl: string           // TCGdex logo + ".webp"
  symbolUrl: string         // TCGdex symbol + ".webp"
  totalValueEUR: number | null
  totalValueUSD: number | null
}
```

### `cards`
```ts
{
  tcgdex_id: string         // new primary, e.g. "sv01-001"
  pokemontcg_id: string | null
  language: "it" | ...
  name: string
  number: string            // localId
  set_id: string            // tcgdex_id of parent set
  setName: string
  series: string
  seriesSlug: string
  rarity: string | null     // Italian when language=it
  types: string[]
  subtypes: string[]
  supertype: string
  variants: {               // structured, replaces ad-hoc subtype parsing
    firstEdition: boolean
    holo: boolean
    normal: boolean
    reverse: boolean
    wPromo: boolean
  }
  imageUrl: string          // TCGdex base + "/low.webp"
  imageUrlHiRes: string     // TCGdex base + "/high.webp"
  priceEUR: number | null   // cardmarket.averageSellPrice
  priceUSD: number | null   // tcgplayer holofoil/normal market, when enriched
  pricing: {                // optional rich payload for charts later
    cardmarket?: { ... }
    tcgplayer?: { ... }
  }
}
```

### Field renames affecting queries
| Old                 | New                          |
|---------------------|------------------------------|
| `cardmarketPrice`   | `priceEUR`                   |
| `pokemontcg_id` (primary) | `tcgdex_id` (primary), `pokemontcg_id` (alternate) |

All `lib/userCards.ts`, `lib/cards.ts`, `lib/sets.ts` aggregations must swap `cardmarketPrice` → `priceEUR` and `pokemontcg_id` → `tcgdex_id` (for primary lookups).

## 4. Image URLs

TCGdex returns base URLs without extension. Append `/low.webp` or `/high.webp`. Logos/symbols append `.webp`.

```ts
const small = `${card.image}/low.webp`
const large = `${card.image}/high.webp`
const logo  = `${set.logo}.webp`
```

## 5. **Decision required**: ID migration strategy for existing user data

`userCards.cardId` currently stores `pokemontcg_id` values for already-collected cards. After migration the canonical card key is `tcgdex_id`. Two paths:

### Option A — One-time remap (recommended)
Add a migration script that, for every distinct `userCards.cardId`, finds the matching new card via `(setName, number)` or a pre-built `pokemontcg_id → tcgdex_id` map (built during seed), then `$set: { cardId: <tcgdex_id> }`.

- **Pros:** clean single primary key going forward; aggregations only need `tcgdex_id`; no permanent dual-key branching.
- **Cons:** one-shot migration; needs careful matching for promo gaps where `pokemontcg_id` was previously absent (none of these can exist, so safe); reversible only via backup.
- **Impact:** ~30 min effort, low risk (read-modify-write per `userCards` row, idempotent), high long-term value.

### Option B — Dual-key forever
Keep `userCards.cardId` pointing at `pokemontcg_id` for legacy rows; new inserts use `tcgdex_id`. Every aggregation `$lookup` must match on `{ $or: [{ pokemontcg_id: cardId }, { tcgdex_id: cardId }] }`.

- **Pros:** no migration step; legacy rows untouched.
- **Cons:** every query and index gets more complex forever; new cards added via TCGdex-only sets (McDonald's IT etc.) have no `pokemontcg_id` and break the legacy join; permanent tech debt.
- **Impact:** zero up-front, high recurring cost.

**Recommendation:** Option A. The user collection is small (single user, dev phase), the schema is still evolving, and the legacy join is already a known fragility. Plan assumes A unless overridden.

## 6. Seeder rewrite (`lib/seedSeries.ts` + new `lib/tcgdex.ts`)

1. New `lib/tcgdex.ts`:
   - `fetchAllSets(lang = 'it')` → `SetBrief[]`
   - `fetchSet(setId, lang)` → `SetDetail` with cards list
   - `fetchCard(cardId, lang)` → `CardDetail` (used in batch with concurrency limit ~5)
   - Zod schemas validating each response.
2. `lib/seedSeries.ts` rewrite:
   - Replace `pokemontcg` calls with TCGdex calls.
   - Build `tcgdex_id → pokemontcg_id` map by `(setName.toLowerCase(), number)` join against a one-time fetch of pokemontcg.io sets+cards (cached on disk under `.cache/pokemontcg/`).
   - Write `priceEUR` from TCGdex `cardmarket.averageSellPrice`.
   - Optional flag `enrichUSD` (default false) — when true, fetch matching pokemontcg.io card and write `priceUSD` from `tcgplayer.prices.{holofoil|normal|reverseHolofoil}.market`.
   - Preserve `SeedReport` / `SeedSetResult` shape so `SeedClient.tsx` keeps working untouched.

## 7. Query / UI updates

- `lib/cards.ts`: swap `pokemontcg_id` → `tcgdex_id`; rename `cardmarketPrice` → `priceEUR` in sorts.
- `lib/userCards.ts`: every `$lookup` `foreignField` becomes `tcgdex_id`; value sums read `priceEUR`.
- `lib/sets.ts`: lookups by `tcgdex_id`.
- Rarity normalisation table in `lib/cards.ts` needs Italian variants added (e.g. `Comune`, `Non Comune`, `Rara`, `Rara Holo`). Stored rarity stays as TCGdex returns it; normalisation maps display.
- No UI component shape changes expected — fields just rename internally.

## 8. Rollout sequence

1. **`lib/tcgdex.ts`** + zod schemas + unit-ish probe coverage (reuse `scripts/_probeTcgdex.ts` learnings).
2. **Schema migration plan** — new fields nullable, no breakage during write phase.
3. **Seeder rewrite** behind a feature toggle (`SEED_SOURCE=tcgdex`); old seeder remains importable until cutover.
4. **One-time backfill** of existing seeded cards: re-run new seeder for all sets currently in DB. Cards now have both keys.
5. **`userCards` migration script** (Option A) once backfill complete — produces `pokemontcg_id → tcgdex_id` map from cards collection and rewrites `userCards.cardId`.
6. **Query layer swap** — rename references in `lib/cards.ts`, `lib/userCards.ts`, `lib/sets.ts` to `tcgdex_id` / `priceEUR`.
7. **Drop** the old `cardmarketPrice` field after one clean seed.
8. **Optional:** turn on `enrichUSD` once a pokemontcg.io join cache exists.

## 9. Multi-language readiness

- `language` column persisted per card/set.
- `lib/tcgdex.ts` accepts `lang` parameter; default `"it"` from env (`TCGDEX_LANG`).
- Future per-user language preference reads from session settings; queries already partitioned by `language`.
- No language switching in this iteration — single-language deploy.

## 10. Non-goals

- Real-time pricing refresh (still batch on seed).
- TCGPlayer/USD UI surfacing — schema is ready, UI stays EUR-only this iteration.
- Live language switching.
- Backfilling pricing history charts from TCGdex's richer payload (data is captured in `pricing`, surfaced later).

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Italian rarity strings break filters | Extend rarity normalisation map; covered by seed-time inspection |
| Promo set IDs (`wp`, `basep`) don't match across APIs | USD enrichment is best-effort; missing match → `priceUSD = null`, no failure |
| TCGdex per-card fetch is N requests per set | Concurrency limit of 5, ~250ms inter-set delay already in place |
| Migration script run twice corrupts `userCards` | Make idempotent — only rewrite when `cardId` matches a known `pokemontcg_id` |
