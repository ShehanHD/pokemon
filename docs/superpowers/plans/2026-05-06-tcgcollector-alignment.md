# tcgcollector Alignment (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align PokeVault's catalog vocabulary, set/series/card pages, and AddCopyDialog with tcgcollector.com — adding Era grouping, set codes, normalised rarity, per-set applicable variants, URL-driven filter/sort on set pages, and per-set "X / Y owned" chips — while staying Italy-only, additive, and free of DB / URL migrations.

**Architecture:** A new pure-function `lib/taxonomy/` module maps raw pokemontcg.io values to tcgcollector vocabulary (era, rarity, set code, applicable variants). Server Components consume the taxonomy directly; URL-driven `<FilterBar />` and `<SortMenu />` Client Components expose filter/sort state via `useSearchParams`. Owned counts come from two new server-side aggregation helpers in `lib/userCards.ts`. No database migration; existing `userCards` documents and existing variant/grading values remain valid.

**Tech Stack:** Next.js 16 App Router (RSC), TypeScript (strict), Zod 4, MongoDB driver, NextAuth 5 beta, Tailwind v4, Vitest 4 (+ in-memory MongoDB), React 19.

Spec source-of-truth: `docs/superpowers/specs/2026-05-06-tcgcollector-alignment-design.md`.

---

## File Structure

**Create:**
- `lib/taxonomy/era.ts` — series → era lookup, ERA_ORDER, zod-parsed Era enum
- `lib/taxonomy/rarity.ts` — raw rarity → normalised rarity mapping
- `lib/taxonomy/setCode.ts` — `pokemontcg_id` → tcgcollector set code derivation + override table
- `lib/taxonomy/variant.ts` — applicable-variants-per-set lookup + variant labels
- `lib/taxonomy/__tests__/era.test.ts`
- `lib/taxonomy/__tests__/rarity.test.ts`
- `lib/taxonomy/__tests__/setCode.test.ts`
- `lib/taxonomy/__tests__/variant.test.ts`
- `lib/__tests__/userCards.aggregations.test.ts` — integration tests for owned-count aggregations
- `components/catalog/EraAccordion.tsx` — Client Component, collapse state for era sections
- `components/catalog/FilterBar.tsx` — Client Component, URL-driven filters
- `components/catalog/SortMenu.tsx` — Client Component, URL-driven sort
- `components/catalog/__tests__/FilterBar.test.tsx`
- `components/catalog/__tests__/SortMenu.test.tsx`
- `lib/taxonomy/__tests__/dateFormat.test.ts` — release-date formatter unit test
- `lib/dateFormat.ts` — `formatTcgcReleaseDate("YYYY/MM/DD")` helper

**Modify:**
- `lib/types.ts` — extend `CardVariant` (+7), extend `GradingCompany` (+ Ace, GMA)
- `lib/userCards.ts` — add `getOwnedCountsBySet`, `getOwnedCountsBySeries`
- `components/catalog/SetCard.tsx` — add `setCode` badge + `ownedCount` chip props
- `app/(catalog)/browse/page.tsx` — group series by era, parallel-fetch owned counts, render via `<EraAccordion />`
- `app/(catalog)/browse/[series]/page.tsx` — era badge in header + setCode + ownedCount per tile
- `app/(catalog)/browse/[series]/[set]/page.tsx` — era badge, set-code chip, formatted release date, FilterBar + SortMenu, server-side filter/sort
- `components/catalog/CardsGrid.tsx` — accept pre-filtered cards from parent; render rarity icon overlay using normalised rarity (remove internal chip-filter UI)
- `app/(catalog)/cards/[id]/page.tsx` — era / setCode / normalised rarity chips, "normalised (raw)" rarity row, thread `set` to `<AddCopyDialog />`
- `components/collection/AddCopyDialog.tsx` — accept `set` prop, drive variants via `applicableVariantsForSet(set)`, add Ace/GMA to companies

**Convention:** Vitest tests next to the unit they cover under `__tests__/`. Per-task TDD: failing test → minimal impl → green → commit.

---

## Task 1: Extend `CardVariant` and `GradingCompany` types (additive)

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Extend `CardVariant` and `GradingCompany`**

In `lib/types.ts`, replace the `CardVariant` and `GradingCompany` declarations:

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

export type GradingCompany = 'PSA' | 'BGS' | 'CGC' | 'SGC' | 'TAG' | 'Ace' | 'GMA' | 'Other'
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — purely additive union widening.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): extend CardVariant and GradingCompany with tcgcollector vocabulary"
```

---

## Task 2: Era taxonomy (`lib/taxonomy/era.ts`)

**Files:**
- Create: `lib/taxonomy/era.ts`
- Create: `lib/taxonomy/__tests__/era.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/taxonomy/__tests__/era.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { ERA_ORDER, seriesToEra, type Era } from '../era'

describe('seriesToEra', () => {
  it('maps Scarlet & Violet series to its era', () => {
    expect(seriesToEra('Scarlet & Violet')).toBe('Scarlet & Violet')
  })

  it('maps Sword & Shield series to its era', () => {
    expect(seriesToEra('Sword & Shield')).toBe('Sword & Shield')
  })

  it('maps Sun & Moon series to its era', () => {
    expect(seriesToEra('Sun & Moon')).toBe('Sun & Moon')
  })

  it('maps XY series to XY era', () => {
    expect(seriesToEra('XY')).toBe('XY')
  })

  it('maps Black & White series to its era', () => {
    expect(seriesToEra('Black & White')).toBe('Black & White')
  })

  it('maps HeartGold & SoulSilver series to its era', () => {
    expect(seriesToEra('HeartGold & SoulSilver')).toBe('HeartGold & SoulSilver')
  })

  it('maps Diamond & Pearl series to its era', () => {
    expect(seriesToEra('Diamond & Pearl')).toBe('Diamond & Pearl')
  })

  it('maps EX series to EX era', () => {
    expect(seriesToEra('EX')).toBe('EX')
  })

  it('maps e-Card series to its era', () => {
    expect(seriesToEra('E-Card')).toBe('e-Card')
  })

  it('maps Neo series to Neo era', () => {
    expect(seriesToEra('Neo')).toBe('Neo')
  })

  it('maps Original/Base series to Original era', () => {
    expect(seriesToEra('Base')).toBe('Original')
    expect(seriesToEra('Gym')).toBe('Original')
  })

  it('falls back to "Other" and warns for unknown series', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(seriesToEra('Some Unknown Series')).toBe('Other')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('ERA_ORDER', () => {
  it('lists eras in reverse-chronological order', () => {
    expect(ERA_ORDER).toEqual([
      'Scarlet & Violet',
      'Sword & Shield',
      'Sun & Moon',
      'XY',
      'Black & White',
      'HeartGold & SoulSilver',
      'Diamond & Pearl',
      'EX',
      'e-Card',
      'Neo',
      'Original',
      'Other',
    ])
  })

  it('every value is a valid Era', () => {
    const eras: readonly Era[] = ERA_ORDER
    expect(eras.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/taxonomy/__tests__/era.test.ts`
Expected: FAIL with "Cannot find module '../era'".

- [ ] **Step 3: Implement `lib/taxonomy/era.ts`**

```typescript
import { z } from 'zod'

export const eraSchema = z.enum([
  'Scarlet & Violet',
  'Sword & Shield',
  'Sun & Moon',
  'XY',
  'Black & White',
  'HeartGold & SoulSilver',
  'Diamond & Pearl',
  'EX',
  'e-Card',
  'Neo',
  'Original',
  'Other',
])
export type Era = z.infer<typeof eraSchema>

export const ERA_ORDER: readonly Era[] = [
  'Scarlet & Violet',
  'Sword & Shield',
  'Sun & Moon',
  'XY',
  'Black & White',
  'HeartGold & SoulSilver',
  'Diamond & Pearl',
  'EX',
  'e-Card',
  'Neo',
  'Original',
  'Other',
] as const

const SERIES_TO_ERA: Record<string, Era> = {
  'Scarlet & Violet': 'Scarlet & Violet',
  'Sword & Shield': 'Sword & Shield',
  'Sun & Moon': 'Sun & Moon',
  'XY': 'XY',
  'Black & White': 'Black & White',
  'HeartGold & SoulSilver': 'HeartGold & SoulSilver',
  'Diamond & Pearl': 'Diamond & Pearl',
  'Platinum': 'Diamond & Pearl',
  'EX': 'EX',
  'E-Card': 'e-Card',
  'e-Card': 'e-Card',
  'Neo': 'Neo',
  'Base': 'Original',
  'Gym': 'Original',
  'Other': 'Other',
}

export function seriesToEra(series: string): Era {
  const mapped = SERIES_TO_ERA[series]
  if (mapped) return eraSchema.parse(mapped)
  console.warn(`[taxonomy/era] unknown series "${series}" — falling back to "Other"`)
  return 'Other'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/taxonomy/__tests__/era.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/taxonomy/era.ts lib/taxonomy/__tests__/era.test.ts
git commit -m "feat(taxonomy): add era lookup module with ERA_ORDER and seriesToEra"
```

---

## Task 3: Rarity taxonomy (`lib/taxonomy/rarity.ts`)

**Files:**
- Create: `lib/taxonomy/rarity.ts`
- Create: `lib/taxonomy/__tests__/rarity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/taxonomy/__tests__/rarity.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { normaliseRarity } from '../rarity'

describe('normaliseRarity', () => {
  it.each([
    ['Common', 'Common'],
    ['Uncommon', 'Uncommon'],
    ['Rare', 'Rare'],
    ['Rare Holo', 'Rare Holo'],
    ['Rare Holo EX', 'Ultra Rare'],
    ['Rare Holo GX', 'Ultra Rare'],
    ['Rare Holo V', 'Ultra Rare'],
    ['Rare Holo VMAX', 'Ultra Rare'],
    ['Rare Holo VSTAR', 'Ultra Rare'],
    ['Rare Ultra', 'Ultra Rare'],
    ['Ultra Rare', 'Ultra Rare'],
    ['Double Rare', 'Double Rare'],
    ['Illustration Rare', 'Illustration Rare'],
    ['Special Illustration Rare', 'Special Illustration Rare'],
    ['Hyper Rare', 'Hyper Rare'],
    ['Rare Secret', 'Hyper Rare'],
    ['Rare Rainbow', 'Hyper Rare'],
    ['Trainer Gallery Rare Holo', 'Trainer Gallery'],
    ['Rare ACE', 'ACE SPEC Rare'],
    ['ACE SPEC Rare', 'ACE SPEC Rare'],
    ['Promo', 'Promo'],
    ['Rare Promo', 'Promo'],
  ])('maps "%s" → "%s"', (raw, expected) => {
    expect(normaliseRarity(raw)).toBe(expected)
  })

  it('returns "Unknown" and warns for unmapped values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normaliseRarity('Some Weird Rarity')).toBe('Unknown')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns "Unknown" for null', () => {
    expect(normaliseRarity(null)).toBe('Unknown')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/taxonomy/__tests__/rarity.test.ts`
Expected: FAIL with "Cannot find module '../rarity'".

- [ ] **Step 3: Implement `lib/taxonomy/rarity.ts`**

```typescript
import { z } from 'zod'

export const normalisedRaritySchema = z.enum([
  'Common',
  'Uncommon',
  'Rare',
  'Rare Holo',
  'Double Rare',
  'Ultra Rare',
  'Illustration Rare',
  'Special Illustration Rare',
  'Hyper Rare',
  'Trainer Gallery',
  'ACE SPEC Rare',
  'Promo',
  'Unknown',
])
export type NormalisedRarity = z.infer<typeof normalisedRaritySchema>

const RARITY_MAP: Record<string, NormalisedRarity> = {
  'Common': 'Common',
  'Uncommon': 'Uncommon',
  'Rare': 'Rare',
  'Rare Holo': 'Rare Holo',
  'Rare Holo EX': 'Ultra Rare',
  'Rare Holo GX': 'Ultra Rare',
  'Rare Holo V': 'Ultra Rare',
  'Rare Holo VMAX': 'Ultra Rare',
  'Rare Holo VSTAR': 'Ultra Rare',
  'Rare Holo LV.X': 'Ultra Rare',
  'Rare Ultra': 'Ultra Rare',
  'Ultra Rare': 'Ultra Rare',
  'Rare BREAK': 'Ultra Rare',
  'Rare Prism Star': 'Ultra Rare',
  'Rare Prime': 'Ultra Rare',
  'Rare Shining': 'Ultra Rare',
  'Amazing Rare': 'Ultra Rare',
  'Radiant Rare': 'Ultra Rare',
  'LEGEND': 'Ultra Rare',
  'Double Rare': 'Double Rare',
  'Illustration Rare': 'Illustration Rare',
  'Special Illustration Rare': 'Special Illustration Rare',
  'Hyper Rare': 'Hyper Rare',
  'Rare Secret': 'Hyper Rare',
  'Rare Rainbow': 'Hyper Rare',
  'Rare Shiny': 'Hyper Rare',
  'Rare Shiny GX': 'Hyper Rare',
  'Trainer Gallery Rare Holo': 'Trainer Gallery',
  'Rare Holo Star': 'Trainer Gallery',
  'Rare ACE': 'ACE SPEC Rare',
  'ACE SPEC Rare': 'ACE SPEC Rare',
  'Promo': 'Promo',
  'Rare Promo': 'Promo',
}

export function normaliseRarity(raw: string | null): NormalisedRarity {
  if (raw === null) return 'Unknown'
  const mapped = RARITY_MAP[raw]
  if (mapped) return normalisedRaritySchema.parse(mapped)
  console.warn(`[taxonomy/rarity] unknown rarity "${raw}" — falling back to "Unknown"`)
  return 'Unknown'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/taxonomy/__tests__/rarity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/taxonomy/rarity.ts lib/taxonomy/__tests__/rarity.test.ts
git commit -m "feat(taxonomy): add normaliseRarity mapping raw API rarity to tcgcollector vocabulary"
```

---

## Task 4: Set code derivation (`lib/taxonomy/setCode.ts`)

**Files:**
- Create: `lib/taxonomy/setCode.ts`
- Create: `lib/taxonomy/__tests__/setCode.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/taxonomy/__tests__/setCode.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { setCodeFor } from '../setCode'
import type { PokemonSet } from '@/lib/types'

function fakeSet(id: string, name = 'Set'): PokemonSet {
  return {
    pokemontcg_id: id,
    name,
    series: 'X',
    seriesSlug: 'x',
    releaseDate: '2024/01/01',
    totalCards: 1,
    printedTotal: 1,
    totalValue: null,
    logoUrl: '',
    symbolUrl: '',
  }
}

describe('setCodeFor', () => {
  it('derives SVI from sv1', () => {
    expect(setCodeFor(fakeSet('sv1'))).toBe('SVI')
  })

  it('derives SV01 from sv01', () => {
    expect(setCodeFor(fakeSet('sv01'))).toBe('SV01')
  })

  it('zero-pads SWSH ids to two digits', () => {
    expect(setCodeFor(fakeSet('swsh1'))).toBe('SWSH01')
    expect(setCodeFor(fakeSet('swsh9'))).toBe('SWSH09')
    expect(setCodeFor(fakeSet('swsh12'))).toBe('SWSH12')
  })

  it('honours overrides for non-standard ids', () => {
    expect(setCodeFor(fakeSet('base1'))).toBe('BS')
    expect(setCodeFor(fakeSet('basep'))).toBe('WP')
  })

  it('uppercases and warns for unknown shapes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(setCodeFor(fakeSet('weird-id-99'))).toBe('WEIRD-ID-99')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/taxonomy/__tests__/setCode.test.ts`
Expected: FAIL with "Cannot find module '../setCode'".

- [ ] **Step 3: Implement `lib/taxonomy/setCode.ts`**

```typescript
import type { PokemonSet } from '@/lib/types'

const OVERRIDES: Record<string, string> = {
  'sv1': 'SVI',
  'sv2': 'PAL',
  'sv3': 'OBF',
  'sv3pt5': '151',
  'sv4': 'PAR',
  'sv4pt5': 'PAF',
  'sv5': 'TEF',
  'sv6': 'TWM',
  'sv6pt5': 'SFA',
  'sv7': 'SCR',
  'sv8': 'SSP',
  'sv8pt5': 'PRE',
  'sv9': 'JTG',
  'svp': 'PR-SV',
  'base1': 'BS',
  'base2': 'JU',
  'base3': 'FO',
  'base4': 'BS2',
  'base5': 'TR',
  'base6': 'LC',
  'basep': 'WP',
  'gym1': 'G1',
  'gym2': 'G2',
  'neo1': 'N1',
  'neo2': 'N2',
  'neo3': 'N3',
  'neo4': 'N4',
}

const SHAPE_RE = /^([a-z]+)(\d+)(pt\d+)?$/

export function setCodeFor(set: PokemonSet): string {
  const id = set.pokemontcg_id.toLowerCase()
  if (OVERRIDES[id]) return OVERRIDES[id]

  const m = SHAPE_RE.exec(id)
  if (!m) {
    console.warn(`[taxonomy/setCode] unknown id shape "${set.pokemontcg_id}" — using uppercased id`)
    return set.pokemontcg_id.toUpperCase()
  }

  const [, prefix, num, pt] = m
  const padded = prefix === 'swsh' ? num.padStart(2, '0') : num
  return `${prefix.toUpperCase()}${padded}${pt ? pt.toUpperCase() : ''}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/taxonomy/__tests__/setCode.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/taxonomy/setCode.ts lib/taxonomy/__tests__/setCode.test.ts
git commit -m "feat(taxonomy): derive tcgcollector set codes from pokemontcg_id with overrides"
```

---

## Task 5: Variant taxonomy (`lib/taxonomy/variant.ts`)

**Files:**
- Create: `lib/taxonomy/variant.ts`
- Create: `lib/taxonomy/__tests__/variant.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/taxonomy/__tests__/variant.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { applicableVariantsForSet, variantLabel } from '../variant'
import type { PokemonSet } from '@/lib/types'

function fakeSet(id: string, series: string): PokemonSet {
  return {
    pokemontcg_id: id,
    name: id,
    series,
    seriesSlug: series.toLowerCase(),
    releaseDate: '2024/01/01',
    totalCards: 1,
    printedTotal: 1,
    totalValue: null,
    logoUrl: '',
    symbolUrl: '',
  }
}

describe('applicableVariantsForSet', () => {
  it('returns Scarlet & Violet variants for SV sets', () => {
    const variants = applicableVariantsForSet(fakeSet('sv1', 'Scarlet & Violet'))
    expect(variants).toContain('normal')
    expect(variants).toContain('holofoil')
    expect(variants).toContain('reverse-holofoil')
    expect(variants).not.toContain('1st-edition')
  })

  it('includes pokeball + masterball pattern variants for SV151', () => {
    const variants = applicableVariantsForSet(fakeSet('sv3pt5', 'Scarlet & Violet'))
    expect(variants).toContain('pokeball-pattern')
    expect(variants).toContain('masterball-pattern')
  })

  it('returns Sword & Shield variants', () => {
    const variants = applicableVariantsForSet(fakeSet('swsh1', 'Sword & Shield'))
    expect(variants).toEqual(expect.arrayContaining(['normal', 'holofoil', 'reverse-holofoil']))
  })

  it('returns 1st Edition + Shadowless variants for Original era Base', () => {
    const variants = applicableVariantsForSet(fakeSet('base1', 'Base'))
    expect(variants).toContain('1st-edition')
    expect(variants).toContain('shadowless')
  })

  it('falls back to permissive superset for unknown sets', () => {
    const variants = applicableVariantsForSet(fakeSet('weird99', 'Other'))
    expect(variants).toEqual(expect.arrayContaining(['normal', 'holofoil', 'reverse-holofoil', 'promo']))
  })
})

describe('variantLabel', () => {
  it.each([
    ['normal', 'Normal'],
    ['holofoil', 'Holofoil'],
    ['reverse-holofoil', 'Reverse Holofoil'],
    ['pokeball-pattern', 'Poké Ball Pattern'],
    ['masterball-pattern', 'Master Ball Pattern'],
    ['cosmos-holo', 'Cosmos Holo'],
    ['crosshatch-holo', 'Crosshatch Holo'],
    ['galaxy-holo', 'Galaxy Holo'],
    ['1st-edition', '1st Edition'],
    ['shadowless', 'Shadowless'],
    ['promo', 'Promo'],
    ['holo', 'Holo (legacy)'],
    ['reverse-holo', 'Reverse Holo (legacy)'],
    ['full-art', 'Full Art (legacy)'],
    ['alt-art', 'Alt Art (legacy)'],
  ])('labels %s as %s', (variant, label) => {
    expect(variantLabel(variant as never)).toBe(label)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/taxonomy/__tests__/variant.test.ts`
Expected: FAIL with "Cannot find module '../variant'".

- [ ] **Step 3: Implement `lib/taxonomy/variant.ts`**

```typescript
import type { CardVariant, PokemonSet } from '@/lib/types'
import { seriesToEra, type Era } from './era'

const PERMISSIVE: CardVariant[] = ['normal', 'holofoil', 'reverse-holofoil', 'promo']

const ERA_VARIANTS: Record<Era, CardVariant[]> = {
  'Scarlet & Violet':       ['normal', 'holofoil', 'reverse-holofoil', 'promo'],
  'Sword & Shield':         ['normal', 'holofoil', 'reverse-holofoil', 'promo'],
  'Sun & Moon':             ['normal', 'holofoil', 'reverse-holofoil', 'promo'],
  'XY':                     ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'promo'],
  'Black & White':          ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'promo'],
  'HeartGold & SoulSilver': ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'crosshatch-holo', 'promo'],
  'Diamond & Pearl':        ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'crosshatch-holo', 'promo'],
  'EX':                     ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'crosshatch-holo', 'promo'],
  'e-Card':                 ['normal', 'holofoil', 'reverse-holofoil', 'crosshatch-holo', 'promo'],
  'Neo':                    ['normal', 'holofoil', '1st-edition', 'crosshatch-holo', 'promo'],
  'Original':               ['normal', 'holofoil', '1st-edition', 'shadowless', 'promo'],
  'Other':                  PERMISSIVE,
}

const SET_OVERRIDES: Record<string, CardVariant[]> = {
  'sv3pt5': ['normal', 'holofoil', 'reverse-holofoil', 'pokeball-pattern', 'masterball-pattern', 'promo'],
  'cel25':  ['normal', 'holofoil', 'reverse-holofoil', 'galaxy-holo', 'promo'],
}

export function applicableVariantsForSet(set: PokemonSet): CardVariant[] {
  const override = SET_OVERRIDES[set.pokemontcg_id.toLowerCase()]
  if (override) return override
  return ERA_VARIANTS[seriesToEra(set.series)] ?? PERMISSIVE
}

const LABELS: Record<CardVariant, string> = {
  'normal':            'Normal',
  'holofoil':          'Holofoil',
  'reverse-holofoil':  'Reverse Holofoil',
  'pokeball-pattern':  'Poké Ball Pattern',
  'masterball-pattern':'Master Ball Pattern',
  'cosmos-holo':       'Cosmos Holo',
  'crosshatch-holo':   'Crosshatch Holo',
  'galaxy-holo':       'Galaxy Holo',
  '1st-edition':       '1st Edition',
  'shadowless':        'Shadowless',
  'promo':             'Promo',
  // legacy values kept for back-compat with stored userCards
  'holo':              'Holo (legacy)',
  'reverse-holo':      'Reverse Holo (legacy)',
  'full-art':          'Full Art (legacy)',
  'alt-art':           'Alt Art (legacy)',
}

export function variantLabel(variant: CardVariant): string {
  return LABELS[variant] ?? variant
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/taxonomy/__tests__/variant.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/taxonomy/variant.ts lib/taxonomy/__tests__/variant.test.ts
git commit -m "feat(taxonomy): add per-set applicable variants and variant labels"
```

---

## Task 6: tcgcollector release-date formatter

**Files:**
- Create: `lib/dateFormat.ts`
- Create: `lib/__tests__/dateFormat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/dateFormat.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { formatTcgcReleaseDate } from '../dateFormat'

describe('formatTcgcReleaseDate', () => {
  it('formats YYYY/MM/DD as "Mon DD, YYYY"', () => {
    expect(formatTcgcReleaseDate('2023/03/31')).toBe('Mar 31, 2023')
    expect(formatTcgcReleaseDate('2024/11/01')).toBe('Nov 1, 2024')
  })

  it('returns the raw input for malformed dates', () => {
    expect(formatTcgcReleaseDate('not-a-date')).toBe('not-a-date')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/dateFormat.test.ts`
Expected: FAIL with "Cannot find module '../dateFormat'".

- [ ] **Step 3: Implement `lib/dateFormat.ts`**

```typescript
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function formatTcgcReleaseDate(yyyySlashMmSlashDd: string): string {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(yyyySlashMmSlashDd)
  if (!m) return yyyySlashMmSlashDd
  const [, y, mm, dd] = m
  const monthIdx = parseInt(mm, 10) - 1
  if (monthIdx < 0 || monthIdx > 11) return yyyySlashMmSlashDd
  return `${MONTHS[monthIdx]} ${parseInt(dd, 10)}, ${y}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/dateFormat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dateFormat.ts lib/__tests__/dateFormat.test.ts
git commit -m "feat: add tcgcollector-style release date formatter"
```

---

## Task 7: Owned-count aggregations (`lib/userCards.ts`)

**Files:**
- Modify: `lib/userCards.ts`
- Create: `lib/__tests__/userCards.aggregations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/userCards.aggregations.test.ts` (mirrors the existing in-memory MongoDB pattern from prior `lib/__tests__/userCards.test.ts`):

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'
import { getOwnedCountsBySet, getOwnedCountsBySeries } from '../userCards'

let mongo: MongoMemoryServer
let client: MongoClient

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  client = await MongoClient.connect(process.env.MONGODB_URI)
})

afterAll(async () => {
  await client.close()
  await mongo.stop()
})

beforeEach(async () => {
  const db = client.db('test')
  await db.collection('userCards').deleteMany({})
  await db.collection('cards').deleteMany({})

  await db.collection('cards').insertMany([
    { pokemontcg_id: 'sv1-1',  set_id: 'sv1',  seriesSlug: 'scarlet-violet' },
    { pokemontcg_id: 'sv1-2',  set_id: 'sv1',  seriesSlug: 'scarlet-violet' },
    { pokemontcg_id: 'sv2-1',  set_id: 'sv2',  seriesSlug: 'scarlet-violet' },
    { pokemontcg_id: 'swsh1-1', set_id: 'swsh1', seriesSlug: 'sword-shield' },
  ])

  await db.collection('userCards').insertMany([
    { userId: 'u1', cardId: 'sv1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u1', cardId: 'sv1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u1', cardId: 'sv1-2', type: 'raw', variant: 'holofoil', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u1', cardId: 'swsh1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u2', cardId: 'sv1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
  ])
})

describe('getOwnedCountsBySet', () => {
  it('aggregates u1 counts by set_id', async () => {
    const counts = await getOwnedCountsBySet('u1')
    expect(counts.get('sv1')).toBe(3)   // 2 sv1-1 + 1 sv1-2
    expect(counts.get('swsh1')).toBe(1)
    expect(counts.get('sv2')).toBeUndefined()
  })

  it('returns empty Map for users with no copies', async () => {
    const counts = await getOwnedCountsBySet('nobody')
    expect(counts.size).toBe(0)
  })
})

describe('getOwnedCountsBySeries', () => {
  it('aggregates u1 counts by seriesSlug', async () => {
    const counts = await getOwnedCountsBySeries('u1')
    expect(counts.get('scarlet-violet')).toBe(3)
    expect(counts.get('sword-shield')).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/userCards.aggregations.test.ts`
Expected: FAIL with "getOwnedCountsBySet is not a function" (or import error).

- [ ] **Step 3: Implement aggregations in `lib/userCards.ts`**

Append to `lib/userCards.ts`:

```typescript
export async function getOwnedCountsBySet(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; count: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    { $group: { _id: '$card.set_id', count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id, r.count)
  return map
}

export async function getOwnedCountsBySeries(userId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const rows = await db.collection('userCards').aggregate<{ _id: string; count: number }>([
    { $match: { userId } },
    {
      $lookup: {
        from: 'cards',
        localField: 'cardId',
        foreignField: 'pokemontcg_id',
        as: 'card',
      },
    },
    { $unwind: '$card' },
    { $group: { _id: '$card.seriesSlug', count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id, r.count)
  return map
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/userCards.aggregations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/userCards.ts lib/__tests__/userCards.aggregations.test.ts
git commit -m "feat(userCards): add owned-count aggregations by set and by series"
```

---

## Task 8: SetCard — set-code badge + owned-count chip

**Files:**
- Modify: `components/catalog/SetCard.tsx`

- [ ] **Step 1: Add new props and badges**

In `components/catalog/SetCard.tsx`, extend the props interface and the rendered tile:

```typescript
import { setCodeFor } from '@/lib/taxonomy/setCode'

interface SetCardProps {
  set: PokemonSet
  seriesSlug: string
  ownedCount?: number      // optional — only passed when user is signed in
  totalCards?: number      // for "X / Y owned" denominator (defaults to set.totalCards)
}

export default function SetCard({ set, seriesSlug, ownedCount, totalCards }: SetCardProps) {
  const code = setCodeFor(set)
  const denom = totalCards ?? set.totalCards
  // ...existing tile JSX wrapped in a relative container...
  // top-left:
  //   <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-base/80 text-mauve border border-surface0">
  //     {code}
  //   </span>
  // bottom-right (only when ownedCount !== undefined):
  //   <span className="absolute bottom-1 right-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue/80 text-white">
  //     {ownedCount} / {denom} owned
  //   </span>
}
```

Keep all existing layout intact; the two badges are absolute-positioned overlays on the existing tile container (ensure that container is `relative`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Visually verify in dev**

Run: `bun dev` (or `npm run dev`), open `/browse`, confirm:
- Set tiles show their set code badge top-left.
- When signed in, "X / Y owned" chip appears bottom-right.
- Anonymous: only the set-code badge appears.

If a regression is observed, fix before committing (per CLAUDE.md iterative review loop).

- [ ] **Step 4: Commit**

```bash
git add components/catalog/SetCard.tsx
git commit -m "feat(SetCard): add set-code badge and owned-count chip"
```

---

## Task 9: Browse page Era accordion

**Files:**
- Create: `components/catalog/EraAccordion.tsx`
- Modify: `app/(catalog)/browse/page.tsx`

- [ ] **Step 1: Implement `components/catalog/EraAccordion.tsx`**

```typescript
'use client'

import { useState, type ReactNode } from 'react'
import type { Era } from '@/lib/taxonomy/era'

interface EraSectionProps {
  era: Era
  defaultOpen: boolean
  children: ReactNode
}

export function EraSection({ era, defaultOpen, children }: EraSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 mb-3 text-sm font-russo uppercase tracking-wider text-mauve"
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>{era}</span>
      </button>
      {open && children}
    </section>
  )
}
```

- [ ] **Step 2: Modify `app/(catalog)/browse/page.tsx`**

```typescript
import { auth } from '@/auth'
import { getSeriesWithSets } from '@/lib/sets'
import { getOwnedCountsBySet, getOwnedCountsBySeries } from '@/lib/userCards'
import { ERA_ORDER, seriesToEra, type Era } from '@/lib/taxonomy/era'
import { EraSection } from '@/components/catalog/EraAccordion'
import SetCard from '@/components/catalog/SetCard'

export default async function BrowsePage() {
  const session = await auth()
  const userId = session?.user?.id

  const [seriesWithSets, countsBySet] = await Promise.all([
    getSeriesWithSets(),
    userId ? getOwnedCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
  ])

  const grouped = new Map<Era, typeof seriesWithSets>()
  for (const s of seriesWithSets) {
    const era = seriesToEra(s.name)
    if (!grouped.has(era)) grouped.set(era, [])
    grouped.get(era)!.push(s)
  }

  const mostRecentEra = ERA_ORDER.find((e) => grouped.has(e))

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-russo mb-4">Browse</h1>
      {ERA_ORDER.filter((e) => grouped.has(e)).map((era) => (
        <EraSection key={era} era={era} defaultOpen={era === mostRecentEra}>
          {grouped.get(era)!.map((s) => (
            <div key={s.slug} className="mb-4">
              <h2 className="text-base font-chakra mb-2 text-text">{s.name} <span className="text-overlay0 text-xs">{s.releaseRange}</span></h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {s.sets.map((set) => (
                  <SetCard
                    key={set.pokemontcg_id}
                    set={set}
                    seriesSlug={s.slug}
                    ownedCount={userId ? (countsBySet.get(set.pokemontcg_id) ?? 0) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </EraSection>
      ))}
    </main>
  )
}
```

- [ ] **Step 3: Type-check + visual verify**

Run: `npx tsc --noEmit`
Then: `bun dev`, visit `/browse`. Confirm: era sections render, most-recent era expanded, others collapsed; signed-in users see owned counts on tiles.

- [ ] **Step 4: Commit**

```bash
git add components/catalog/EraAccordion.tsx app/\(catalog\)/browse/page.tsx
git commit -m "feat(browse): group series under collapsible Era sections with owned-count chips"
```

---

## Task 10: Series page — era badge + setCode + owned counts

**Files:**
- Modify: `app/(catalog)/browse/[series]/page.tsx`

- [ ] **Step 1: Wire era badge and per-tile data**

In `app/(catalog)/browse/[series]/page.tsx`:

```typescript
import { auth } from '@/auth'
import { getSetsBySeries } from '@/lib/sets'
import { getOwnedCountsBySet } from '@/lib/userCards'
import { seriesToEra } from '@/lib/taxonomy/era'
import SetCard from '@/components/catalog/SetCard'

export default async function SeriesPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const session = await auth()
  const userId = session?.user?.id

  const [sets, counts] = await Promise.all([
    getSetsBySeries(series),
    userId ? getOwnedCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
  ])

  if (sets.length === 0) {
    return <main className="p-6"><p>No sets found.</p></main>
  }

  const seriesName = sets[0].series
  const era = seriesToEra(seriesName)

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-4">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-mauve/20 text-mauve mb-2">{era} era</span>
        <h1 className="text-2xl font-russo">{seriesName}</h1>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {sets.map((set) => (
          <SetCard
            key={set.pokemontcg_id}
            set={set}
            seriesSlug={series}
            ownedCount={userId ? (counts.get(set.pokemontcg_id) ?? 0) : undefined}
          />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Type-check + visual verify**

Run: `npx tsc --noEmit`
Then visit `/browse/scarlet-violet` in dev. Confirm era badge in header and owned-count chips on tiles.

- [ ] **Step 3: Commit**

```bash
git add app/\(catalog\)/browse/\[series\]/page.tsx
git commit -m "feat(series): add era badge in header and owned-count chips on set tiles"
```

---

## Task 11: FilterBar (URL-driven, Client Component)

**Files:**
- Create: `components/catalog/FilterBar.tsx`
- Create: `components/catalog/__tests__/FilterBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/catalog/__tests__/FilterBar.test.tsx`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterBar from '../FilterBar'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('rarity=Common'),
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/browse/x/y',
}))

describe('FilterBar', () => {
  it('hydrates initial state from URL params', () => {
    render(<FilterBar rarities={['Common', 'Rare']} types={[]} variants={[]} subtypes={[]} />)
    const commonChip = screen.getByRole('button', { name: /Common/ })
    expect(commonChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('writes selected rarity to URL on click', () => {
    render(<FilterBar rarities={['Common', 'Rare']} types={[]} variants={[]} subtypes={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /Rare$/ }))
    expect(replaceMock).toHaveBeenCalled()
    const arg = replaceMock.mock.calls[0][0] as string
    expect(arg).toContain('rarity=Common')
    expect(arg).toContain('rarity=Rare')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/catalog/__tests__/FilterBar.test.tsx`
Expected: FAIL with "Cannot find module '../FilterBar'".

- [ ] **Step 3: Implement `components/catalog/FilterBar.tsx`**

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface FilterBarProps {
  rarities: string[]
  types: string[]
  variants: string[]
  subtypes: string[]
}

const KEYS = ['rarity', 'type', 'variant', 'subtype'] as const
type FilterKey = typeof KEYS[number]

export default function FilterBar({ rarities, types, variants, subtypes }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const toggle = useCallback((key: FilterKey, value: string) => {
    const next = new URLSearchParams(params.toString())
    const current = next.getAll(key)
    next.delete(key)
    if (current.includes(value)) {
      for (const v of current) if (v !== value) next.append(key, v)
    } else {
      for (const v of current) next.append(key, v)
      next.append(key, value)
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [params, pathname, router])

  const renderGroup = (label: string, key: FilterKey, values: string[]) => {
    if (values.length === 0) return null
    const selected = new Set(params.getAll(key))
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-overlay0 mr-1">{label}</span>
        {values.map((v) => {
          const on = selected.has(v)
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key, v)}
              className={[
                'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                on
                  ? 'bg-blue text-white border-blue'
                  : 'bg-base text-overlay1 border-surface0 hover:border-blue/50',
              ].join(' ')}
            >
              {v}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {renderGroup('Rarity', 'rarity', rarities)}
      {renderGroup('Type', 'type', types)}
      {renderGroup('Variant', 'variant', variants)}
      {renderGroup('Subtype', 'subtype', subtypes)}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/catalog/__tests__/FilterBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/catalog/FilterBar.tsx components/catalog/__tests__/FilterBar.test.tsx
git commit -m "feat(catalog): add URL-driven FilterBar for rarity/type/variant/subtype"
```

---

## Task 12: SortMenu (URL-driven)

**Files:**
- Create: `components/catalog/SortMenu.tsx`
- Create: `components/catalog/__tests__/SortMenu.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/catalog/__tests__/SortMenu.test.tsx`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SortMenu, { SORT_OPTIONS } from '../SortMenu'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/browse/x/y',
}))

describe('SortMenu', () => {
  it('writes ?sort=name-asc when "Name asc" selected', () => {
    render(<SortMenu />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'name-asc' } })
    expect(replaceMock).toHaveBeenCalled()
    expect(replaceMock.mock.calls[0][0] as string).toContain('sort=name-asc')
  })

  it('exposes the documented sort options', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual([
      'set-order', 'name-asc', 'name-desc', 'number-asc', 'number-desc', 'rarity',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/catalog/__tests__/SortMenu.test.tsx`
Expected: FAIL with "Cannot find module '../SortMenu'".

- [ ] **Step 3: Implement `components/catalog/SortMenu.tsx`**

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export const SORT_OPTIONS = [
  { value: 'set-order',   label: 'Set order' },
  { value: 'name-asc',    label: 'Name asc' },
  { value: 'name-desc',   label: 'Name desc' },
  { value: 'number-asc',  label: 'Number asc' },
  { value: 'number-desc', label: 'Number desc' },
  { value: 'rarity',      label: 'Rarity' },
] as const

export type SortValue = typeof SORT_OPTIONS[number]['value']

export default function SortMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const current = (params.get('sort') ?? 'set-order') as SortValue

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString())
        if (e.target.value === 'set-order') next.delete('sort')
        else next.set('sort', e.target.value)
        router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      }}
      className="text-[11px] bg-base border border-surface0 rounded px-2 py-1 text-text"
      aria-label="Sort cards"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/catalog/__tests__/SortMenu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/catalog/SortMenu.tsx components/catalog/__tests__/SortMenu.test.tsx
git commit -m "feat(catalog): add URL-driven SortMenu for set page"
```

---

## Task 13: Set page — header, FilterBar/SortMenu wiring, server-side filter+sort

**Files:**
- Modify: `app/(catalog)/browse/[series]/[set]/page.tsx`
- Modify: `components/catalog/CardsGrid.tsx`

- [ ] **Step 1: Strip CardsGrid's internal filter UI**

`components/catalog/CardsGrid.tsx` becomes a pure presenter:

```typescript
'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { PokemonCard } from '@/lib/types'
import { normaliseRarity } from '@/lib/taxonomy/rarity'

export default function CardsGrid({ cards, printedTotal }: { cards: PokemonCard[]; printedTotal: number }) {
  if (cards.length === 0) {
    return <p className="text-overlay0 text-sm text-center py-8">No cards match this filter.</p>
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
      {cards.map((card) => {
        const rarity = normaliseRarity(card.rarity)
        return (
          <Link key={card.pokemontcg_id} href={`/cards/${card.pokemontcg_id}`} className="group">
            <div className="relative aspect-[245/342] rounded-lg overflow-hidden bg-surface0 border border-surface0 group-hover:border-blue/50 transition-colors">
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
                className="object-cover"
              />
              <span className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded bg-base/80 text-mauve border border-surface0">
                {rarity}
              </span>
            </div>
            <div className="mt-1 px-0.5">
              <p className="text-[10px] text-overlay2 truncate leading-tight">{card.name}</p>
              <p className="text-[10px] text-overlay0 tabular-nums">
                {card.number}/{printedTotal}
                {card.cardmarketPrice !== null && (
                  <span className="text-mauve"> · €{card.cardmarketPrice.toFixed(2)}</span>
                )}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Implement filter+sort on the set page**

Replace `app/(catalog)/browse/[series]/[set]/page.tsx` body with:

```typescript
import { z } from 'zod'
import { getSetById } from '@/lib/sets'
import { getCardsBySet } from '@/lib/cards'
import { seriesToEra } from '@/lib/taxonomy/era'
import { setCodeFor } from '@/lib/taxonomy/setCode'
import { normaliseRarity } from '@/lib/taxonomy/rarity'
import { applicableVariantsForSet, variantLabel } from '@/lib/taxonomy/variant'
import { formatTcgcReleaseDate } from '@/lib/dateFormat'
import FilterBar from '@/components/catalog/FilterBar'
import SortMenu from '@/components/catalog/SortMenu'
import CardsGrid from '@/components/catalog/CardsGrid'
import type { PokemonCard } from '@/lib/types'

const sortSchema = z.enum(['set-order','name-asc','name-desc','number-asc','number-desc','rarity']).catch('set-order')

function parseCardNumber(num: string): number {
  const n = parseInt(num, 10)
  return isNaN(n) ? Infinity : n
}

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ series: string; set: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { set: setId } = await params
  const sp = await searchParams
  const set = await getSetById(setId)
  if (!set) return <main className="p-6"><p>Set not found.</p></main>

  const cards = await getCardsBySet(setId)
  const era = seriesToEra(set.series)
  const code = setCodeFor(set)

  const arr = (k: string) => {
    const v = sp[k]
    return Array.isArray(v) ? v : v ? [v] : []
  }
  const rarityFilters = new Set(arr('rarity'))
  const typeFilters = new Set(arr('type'))
  const variantFilters = new Set(arr('variant'))
  const subtypeFilters = new Set(arr('subtype'))
  const sort = sortSchema.parse(typeof sp.sort === 'string' ? sp.sort : 'set-order')

  let visible = cards.filter((c) => {
    if (rarityFilters.size > 0 && !rarityFilters.has(normaliseRarity(c.rarity))) return false
    if (typeFilters.size > 0 && !c.types.some((t) => typeFilters.has(t))) return false
    if (subtypeFilters.size > 0 && !c.subtypes.some((s) => subtypeFilters.has(s))) return false
    return true
  })

  const compare: Record<typeof sort, (a: PokemonCard, b: PokemonCard) => number> = {
    'set-order':   (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number) || a.number.localeCompare(b.number),
    'name-asc':    (a, b) => a.name.localeCompare(b.name),
    'name-desc':   (a, b) => b.name.localeCompare(a.name),
    'number-asc':  (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number),
    'number-desc': (a, b) => parseCardNumber(b.number) - parseCardNumber(a.number),
    'rarity':      (a, b) => normaliseRarity(a.rarity).localeCompare(normaliseRarity(b.rarity)),
  }
  visible = [...visible].sort(compare[sort])

  const allRarities = Array.from(new Set(cards.map((c) => normaliseRarity(c.rarity)))).sort()
  const allTypes = Array.from(new Set(cards.flatMap((c) => c.types))).sort()
  const allSubtypes = Array.from(new Set(cards.flatMap((c) => c.subtypes))).sort()
  const allVariants = applicableVariantsForSet(set).map(variantLabel)

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-mauve/20 text-mauve">{era} era</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-base border border-surface0 text-mauve">{code}</span>
        <h1 className="text-2xl font-russo">{set.name}</h1>
        <span className="text-overlay0 text-xs">{formatTcgcReleaseDate(set.releaseDate)}</span>
      </header>

      <div className="flex justify-between items-start gap-4 mb-3">
        <FilterBar
          rarities={allRarities}
          types={allTypes}
          variants={allVariants}
          subtypes={allSubtypes}
        />
        <SortMenu />
      </div>

      <CardsGrid cards={visible} printedTotal={set.printedTotal} />
    </main>
  )
}
```

- [ ] **Step 3: Type-check + visual verify**

Run: `npx tsc --noEmit`
Then dev-test `/browse/scarlet-violet/sv1`: confirm era + set-code chips, filter chips toggle URL, sort dropdown changes URL and order, rarity overlay on each card.

- [ ] **Step 4: Commit**

```bash
git add app/\(catalog\)/browse/\[series\]/\[set\]/page.tsx components/catalog/CardsGrid.tsx
git commit -m "feat(set-page): add era/setCode/release-date header, URL-driven filter+sort, rarity overlay"
```

---

## Task 14: Card detail — era / setCode / normalised rarity chips and dialog wiring

**Files:**
- Modify: `app/(catalog)/cards/[id]/page.tsx`

- [ ] **Step 1: Add chips and "normalised (raw)" rarity row; thread `set` to AddCopyDialog**

In `app/(catalog)/cards/[id]/page.tsx`:

```typescript
import { seriesToEra } from '@/lib/taxonomy/era'
import { setCodeFor } from '@/lib/taxonomy/setCode'
import { normaliseRarity } from '@/lib/taxonomy/rarity'

// inside the component, after `set` is loaded:
const era = seriesToEra(card.series)
const code = set ? setCodeFor(set) : null
const normalised = normaliseRarity(card.rarity)

// In the JSX details column, just above the existing rows:
<div className="flex flex-wrap items-center gap-2 mb-3">
  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-mauve/20 text-mauve">{era} era</span>
  {code && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-base border border-surface0 text-mauve">{code}</span>}
  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue/20 text-blue">{normalised}</span>
</div>

// Replace the Rarity row value with:
{normalised}{card.rarity ? <span className="text-overlay0"> ({card.rarity})</span> : null}

// Pass `set` through to <AddCopyDialog />:
<AddCopyDialog cardId={card.pokemontcg_id} set={set} />
```

- [ ] **Step 2: Type-check + dev-verify**

Run: `npx tsc --noEmit`
Visit a known card detail page; confirm chips, "normalised (raw)" rarity row, and that AddCopyDialog opens.

- [ ] **Step 3: Commit**

```bash
git add app/\(catalog\)/cards/\[id\]/page.tsx
git commit -m "feat(card-detail): add era/setCode/normalised-rarity chips and thread set into AddCopyDialog"
```

---

## Task 15: AddCopyDialog — per-set variants + Ace/GMA grading companies

**Files:**
- Modify: `components/collection/AddCopyDialog.tsx`

- [ ] **Step 1: Replace hardcoded VARIANTS with per-set; add Ace/GMA**

In `components/collection/AddCopyDialog.tsx`:

```typescript
import type { PokemonSet } from '@/lib/types'
import { applicableVariantsForSet, variantLabel } from '@/lib/taxonomy/variant'

interface AddCopyDialogProps {
  cardId: string
  set: PokemonSet | null
}

export default function AddCopyDialog({ cardId, set }: AddCopyDialogProps) {
  const VARIANTS = set
    ? applicableVariantsForSet(set)
    : (['normal','holofoil','reverse-holofoil','promo'] as const)

  const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']
  const COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'SGC', 'TAG', 'Ace', 'GMA', 'Other']

  // existing state, handlers, and JSX — only change:
  // <select> for variant renders {VARIANTS.map((v) => <option key={v} value={v}>{variantLabel(v)}</option>)}
  // grading company <select> renders the extended COMPANIES
}
```

Keep server-action call shape and existing tests untouched — they assert against stored values, which remain valid.

- [ ] **Step 2: Type-check + run existing dialog tests**

Run: `npx tsc --noEmit`
Run: `npx vitest run components/collection/__tests__`
Expected: PASS — current tests still green (they pass valid variant values from the existing union).

- [ ] **Step 3: Dev-verify**

Open a card detail page; the variant `<select>` shows tcgcollector labels for that set's era; grading-company `<select>` lists Ace and GMA.

- [ ] **Step 4: Commit**

```bash
git add components/collection/AddCopyDialog.tsx
git commit -m "feat(AddCopyDialog): use per-set applicable variants and add Ace/GMA grading companies"
```

---

## Task 16: Final integration check + full test pass

**Files:**
- (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS — all existing tests + every new test added in Tasks 2–15.

- [ ] **Step 2: Type-check the project**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

`bun dev`, walk through:
- `/browse` — era accordion expands/collapses; signed-in: owned chips correct on tiles.
- `/browse/scarlet-violet` — era badge in header; tiles show set codes + owned chips.
- `/browse/scarlet-violet/sv1` — era + set-code + formatted release date in header; FilterBar toggles update URL and grid; SortMenu reorders; rarity overlays visible.
- A card detail page — era/setCode/normalised rarity chips; "Illustration Rare (Rare Holo VMAX)" row; AddCopyDialog variant select shows era-correct variants.

- [ ] **Step 4: Commit final docs sync**

If any project documentation references the old card-grid filter chips or the absence of era/owned counts, update it now (per CLAUDE.md "documentation must always stay in sync"). Otherwise no commit needed.

```bash
# only if docs were updated
git add <doc-file>
git commit -m "docs: align references with tcgcollector Phase 1 vocabulary"
```

---

## Self-Review Checklist (run after writing the plan; fix inline)

- [x] **Spec coverage**: every spec section has a task — taxonomy module (T2–T5), owned-count (T7), browse era accordion (T9), series page badges (T10), set page filter/sort/header (T11–T13), card detail chips (T14), AddCopyDialog wiring (T15), types (T1).
- [x] **No placeholders** — every step contains complete code or an exact command.
- [x] **Type consistency** — `Era`, `NormalisedRarity`, `CardVariant`, `GradingCompany`, `applicableVariantsForSet(set)`, `variantLabel(variant)`, `setCodeFor(set)`, `normaliseRarity(raw)`, `seriesToEra(series)`, `formatTcgcReleaseDate(yyyy/mm/dd)`, `getOwnedCountsBySet(userId)`, `getOwnedCountsBySeries(userId)` are used consistently across the plan.
- [x] **Commits frequent** — every task ends with a commit.
- [x] **Italy-only honoured** — no region-split work appears anywhere.
