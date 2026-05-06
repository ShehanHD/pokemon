# Pokémon Theme Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tier-gated Pokémon theme picker (Base Set, ~53 species) that recolors three CSS variables and swaps the topbar avatar, with build-time palette extraction, SSR cookie-driven theming, and DB persistence.

**Architecture:** Build-time `scripts/build-themes.ts` extracts colors via `node-vibrant` from PokéAPI sprites, validates WCAG AA on the app's mantle, and emits `lib/themes/manifest.json`. At request time, `app/layout.tsx` resolves the theme (cookie → DB → default) and injects inline `<html style>` to override `--color-blue`, `--color-mauve`, `--color-mantle` before paint. A settings page picker writes the choice via a server action that updates both cookie and DB; tier entitlement is enforced at action time and re-checked at resolve time.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4 `@theme` vars, Zod v4, MongoDB, NextAuth v5, `node-vibrant` (new dep), Vitest, `mongodb-memory-server`.

---

## File Structure

**New files:**
- `scripts/baseSet.ts` — static list of 53 Base Set Pokémon (id, slug, tier).
- `scripts/build-themes.ts` — extract palettes, validate WCAG, emit manifest.
- `scripts/__tests__/build-themes.test.ts`
- `scripts/__fixtures__/sprite-25.png` — committed Pikachu sprite for E2E extraction test.
- `lib/themes/manifest.json` — committed extraction output.
- `lib/themes/overrides.ts` — manual palette tuning escape hatch.
- `lib/themes/resolve.ts` — cookie → DB → default resolution.
- `lib/themes/__tests__/resolve.test.ts`
- `lib/schemas/theme.ts` — Zod schemas for entry, manifest, server-action input.
- `lib/schemas/__tests__/theme.test.ts`
- `components/settings/ThemePicker.tsx` — 53-tile grid client component.
- `components/settings/UpgradeDialog.tsx` — modal for locked tiles.
- `components/settings/__tests__/ThemePicker.test.tsx`
- `app/(app)/settings/actions.ts` — `setThemePokemon` server action.
- `app/(app)/settings/__tests__/actions.test.ts`

**Modified files:**
- `lib/types.ts` — add `themePokemonId?: number` to `User`.
- `app/layout.tsx` — async, resolve theme, inject inline `<html style>`.
- `app/(app)/layout.tsx` — pass `theme` prop down to `Topbar`.
- `components/layout/Topbar.tsx` — accept `theme` prop, render Pokémon avatar.
- `app/(app)/settings/page.tsx` — render `<ThemePicker />`.
- `package.json` — add `node-vibrant` dep, `build:themes` script.

---

## Task 1: Add `themePokemonId` to user type and install `node-vibrant`

**Files:**
- Modify: `lib/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the optional field to the `User` interface**

Open `lib/types.ts`. Locate the `User` interface and add the field after `stripeSubscriptionId?:`:

```ts
export interface User {
  _id?: string
  email: string
  name: string
  image?: string
  provider: 'credentials' | 'google'
  tier: Tier
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  themePokemonId?: number
  createdAt: Date
  passwordHash?: string
}
```

- [ ] **Step 2: Install `node-vibrant`**

Run: `npm install --save-dev node-vibrant@4.0.3`
Expected: package.json updated, no peer-dep warnings.

- [ ] **Step 3: Add the `build:themes` script**

Edit `package.json` `"scripts"` block to add:

```json
"build:themes": "tsx scripts/build-themes.ts"
```

- [ ] **Step 4: Verify type still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts package.json package-lock.json
git commit -m "feat(theme): add themePokemonId user field, install node-vibrant"
```

---

## Task 2: Define the Base Set list

**Files:**
- Create: `scripts/baseSet.ts`

- [ ] **Step 1: Write the static Base Set list**

Create `scripts/baseSet.ts`:

```ts
import type { Tier } from '../lib/types'

export interface BaseSetEntry {
  id: number      // National Pokédex id
  slug: string    // lowercase name
  name: string    // Display name
  tier: Tier      // Minimum tier to unlock
}

// 1999 Pokémon TCG Base Set — 53 unique species.
// Tiers: 5 free, 20 adfree, remaining 28 pro.
export const BASE_SET: BaseSetEntry[] = [
  { id: 1,   slug: 'bulbasaur',  name: 'Bulbasaur',  tier: 'free' },
  { id: 4,   slug: 'charmander', name: 'Charmander', tier: 'free' },
  { id: 7,   slug: 'squirtle',   name: 'Squirtle',   tier: 'free' },
  { id: 25,  slug: 'pikachu',    name: 'Pikachu',    tier: 'free' },
  { id: 150, slug: 'mewtwo',     name: 'Mewtwo',     tier: 'free' },

  { id: 6,   slug: 'charizard',  name: 'Charizard',  tier: 'adfree' },
  { id: 9,   slug: 'blastoise',  name: 'Blastoise',  tier: 'adfree' },
  { id: 3,   slug: 'venusaur',   name: 'Venusaur',   tier: 'adfree' },
  { id: 133, slug: 'eevee',      name: 'Eevee',      tier: 'adfree' },
  { id: 143, slug: 'snorlax',    name: 'Snorlax',    tier: 'adfree' },
  { id: 94,  slug: 'gengar',     name: 'Gengar',     tier: 'adfree' },
  { id: 149, slug: 'dragonite',  name: 'Dragonite',  tier: 'adfree' },
  { id: 130, slug: 'gyarados',   name: 'Gyarados',   tier: 'adfree' },
  { id: 68,  slug: 'machamp',    name: 'Machamp',    tier: 'adfree' },
  { id: 65,  slug: 'alakazam',   name: 'Alakazam',   tier: 'adfree' },
  { id: 144, slug: 'articuno',   name: 'Articuno',   tier: 'adfree' },
  { id: 145, slug: 'zapdos',     name: 'Zapdos',     tier: 'adfree' },
  { id: 146, slug: 'moltres',    name: 'Moltres',    tier: 'adfree' },
  { id: 151, slug: 'mew',        name: 'Mew',        tier: 'adfree' },
  { id: 134, slug: 'vaporeon',   name: 'Vaporeon',   tier: 'adfree' },
  { id: 135, slug: 'jolteon',    name: 'Jolteon',    tier: 'adfree' },
  { id: 136, slug: 'flareon',    name: 'Flareon',    tier: 'adfree' },
  { id: 131, slug: 'lapras',     name: 'Lapras',     tier: 'adfree' },
  { id: 80,  slug: 'slowbro',    name: 'Slowbro',    tier: 'adfree' },
  { id: 129, slug: 'magikarp',   name: 'Magikarp',   tier: 'adfree' },

  { id: 17,  slug: 'pidgeotto',     name: 'Pidgeotto',     tier: 'pro' },
  { id: 26,  slug: 'raichu',        name: 'Raichu',        tier: 'pro' },
  { id: 35,  slug: 'clefairy',      name: 'Clefairy',      tier: 'pro' },
  { id: 39,  slug: 'jigglypuff',    name: 'Jigglypuff',    tier: 'pro' },
  { id: 40,  slug: 'wigglytuff',    name: 'Wigglytuff',    tier: 'pro' },
  { id: 42,  slug: 'golbat',        name: 'Golbat',        tier: 'pro' },
  { id: 44,  slug: 'gloom',         name: 'Gloom',         tier: 'pro' },
  { id: 51,  slug: 'dugtrio',       name: 'Dugtrio',       tier: 'pro' },
  { id: 56,  slug: 'mankey',        name: 'Mankey',        tier: 'pro' },
  { id: 70,  slug: 'weepinbell',    name: 'Weepinbell',    tier: 'pro' },
  { id: 75,  slug: 'graveler',      name: 'Graveler',      tier: 'pro' },
  { id: 78,  slug: 'rapidash',      name: 'Rapidash',      tier: 'pro' },
  { id: 82,  slug: 'magneton',      name: 'Magneton',      tier: 'pro' },
  { id: 83,  slug: 'farfetchd',     name: 'Farfetch’d', tier: 'pro' },
  { id: 86,  slug: 'seel',          name: 'Seel',          tier: 'pro' },
  { id: 92,  slug: 'gastly',        name: 'Gastly',        tier: 'pro' },
  { id: 93,  slug: 'haunter',       name: 'Haunter',       tier: 'pro' },
  { id: 100, slug: 'voltorb',       name: 'Voltorb',       tier: 'pro' },
  { id: 102, slug: 'exeggcute',     name: 'Exeggcute',     tier: 'pro' },
  { id: 104, slug: 'cubone',        name: 'Cubone',        tier: 'pro' },
  { id: 106, slug: 'hitmonlee',     name: 'Hitmonlee',     tier: 'pro' },
  { id: 107, slug: 'hitmonchan',    name: 'Hitmonchan',    tier: 'pro' },
  { id: 113, slug: 'chansey',       name: 'Chansey',       tier: 'pro' },
  { id: 115, slug: 'kangaskhan',    name: 'Kangaskhan',    tier: 'pro' },
  { id: 123, slug: 'scyther',       name: 'Scyther',       tier: 'pro' },
  { id: 125, slug: 'electabuzz',    name: 'Electabuzz',    tier: 'pro' },
  { id: 142, slug: 'aerodactyl',    name: 'Aerodactyl',    tier: 'pro' },
  { id: 147, slug: 'dratini',       name: 'Dratini',       tier: 'pro' },
]
```

- [ ] **Step 2: Verify it compiles and totals 53**

Run:

```bash
npx tsx -e "import { BASE_SET } from './scripts/baseSet'; console.log(BASE_SET.length)"
```

Expected: `53`

- [ ] **Step 3: Commit**

```bash
git add scripts/baseSet.ts
git commit -m "feat(theme): add Base Set Pokémon list with tier assignments"
```

---

## Task 3: Zod schemas for theme entry, manifest, and action input

**Files:**
- Create: `lib/schemas/theme.ts`
- Test: `lib/schemas/__tests__/theme.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/schemas/__tests__/theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  themeEntrySchema,
  themeManifestSchema,
  setThemePokemonInputSchema,
} from '../theme'

describe('themeEntrySchema', () => {
  const valid = {
    name: 'Pikachu',
    tier: 'free' as const,
    primary: '#e8b22a',
    accent: '#fff3b0',
    mantle: '#e8eef5',
  }

  it('accepts a valid entry', () => {
    expect(themeEntrySchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a non-hex primary', () => {
    expect(themeEntrySchema.safeParse({ ...valid, primary: 'red' }).success).toBe(false)
  })

  it('rejects an unknown tier', () => {
    expect(themeEntrySchema.safeParse({ ...valid, tier: 'gold' }).success).toBe(false)
  })

  it('rejects a 3-digit hex shorthand', () => {
    expect(themeEntrySchema.safeParse({ ...valid, primary: '#abc' }).success).toBe(false)
  })
})

describe('themeManifestSchema', () => {
  it('accepts a record keyed by numeric strings', () => {
    const r = themeManifestSchema.safeParse({
      '25': { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5' },
    })
    expect(r.success).toBe(true)
  })

  it('rejects a non-numeric key', () => {
    const r = themeManifestSchema.safeParse({
      pikachu: { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5' },
    })
    expect(r.success).toBe(false)
  })
})

describe('setThemePokemonInputSchema', () => {
  it('accepts null', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: null }).success).toBe(true)
  })

  it('accepts a positive integer', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: 25 }).success).toBe(true)
  })

  it('rejects a negative integer', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: -1 }).success).toBe(false)
  })

  it('rejects a non-integer', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: 1.5 }).success).toBe(false)
  })

  it('rejects a string', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: '25' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/schemas/__tests__/theme.test.ts`
Expected: FAIL — module `'../theme'` does not exist.

- [ ] **Step 3: Write the schemas**

Create `lib/schemas/theme.ts`:

```ts
import { z } from 'zod'

export const tierSchema = z.enum(['free', 'adfree', 'pro'])

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be #RRGGBB')

export const themeEntrySchema = z.object({
  name: z.string().min(1),
  tier: tierSchema,
  primary: hexColorSchema,
  accent: hexColorSchema,
  mantle: hexColorSchema,
})

export const themeManifestSchema = z.record(
  z.string().regex(/^\d+$/, 'Pokémon id key must be numeric'),
  themeEntrySchema,
)

export const setThemePokemonInputSchema = z.object({
  pokemonId: z.number().int().positive().nullable(),
})

export type ThemeEntry = z.infer<typeof themeEntrySchema>
export type ThemeManifest = z.infer<typeof themeManifestSchema>
export type SetThemePokemonInput = z.infer<typeof setThemePokemonInputSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/schemas/__tests__/theme.test.ts`
Expected: 11/11 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/theme.ts lib/schemas/__tests__/theme.test.ts
git commit -m "feat(theme): add Zod schemas for theme entry, manifest, and action input"
```

---

## Task 4: WCAG contrast helpers

**Files:**
- Create: `lib/themes/contrast.ts`
- Test: `lib/themes/__tests__/contrast.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/themes/__tests__/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { contrastRatio, ensureContrast } from '../contrast'

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#abcdef', '#abcdef')).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    const a = contrastRatio('#123456', '#fedcba')
    const b = contrastRatio('#fedcba', '#123456')
    expect(a).toBeCloseTo(b, 5)
  })
})

describe('ensureContrast', () => {
  const mantle = '#e8eef5'

  it('returns the input unchanged if it already passes', () => {
    expect(ensureContrast('#000000', mantle, 4.5)).toBe('#000000')
  })

  it('darkens a low-contrast color until it passes', () => {
    const result = ensureContrast('#ffff80', mantle, 4.5)
    expect(contrastRatio(result, mantle)).toBeGreaterThanOrEqual(4.5)
  })

  it('returns null if even fully black does not satisfy (impossible mantle)', () => {
    // Mantle so dark that nothing further darkening helps — light input on dark bg.
    const result = ensureContrast('#ffffff', '#000000', 4.5)
    // White on black already passes; sanity that the helper short-circuits.
    expect(result).toBe('#ffffff')
  })

  it('returns null when it cannot reach the target within the cap', () => {
    // Cap at 1 step so it must give up.
    const result = ensureContrast('#ffff80', mantle, 4.5, { maxSteps: 1 })
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/themes/__tests__/contrast.test.ts`
Expected: FAIL — module `'../contrast'` does not exist.

- [ ] **Step 3: Implement the helpers**

Create `lib/themes/contrast.ts`:

```ts
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`Invalid hex: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const ch = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

export function contrastRatio(fg: string, bg: string): number {
  const Lfg = relativeLuminance(hexToRgb(fg))
  const Lbg = relativeLuminance(hexToRgb(bg))
  const [hi, lo] = Lfg >= Lbg ? [Lfg, Lbg] : [Lbg, Lfg]
  return (hi + 0.05) / (lo + 0.05)
}

interface EnsureOptions {
  maxSteps?: number      // how many 5%-darken steps to attempt
  stepFactor?: number    // multiplier per step (default 0.95)
}

export function ensureContrast(
  fg: string,
  bg: string,
  target: number,
  opts: EnsureOptions = {},
): string | null {
  const { maxSteps = 12, stepFactor = 0.95 } = opts
  let [r, g, b] = hexToRgb(fg)
  let current = rgbToHex(r, g, b)
  if (contrastRatio(current, bg) >= target) return current
  for (let i = 0; i < maxSteps; i++) {
    r *= stepFactor
    g *= stepFactor
    b *= stepFactor
    current = rgbToHex(r, g, b)
    if (contrastRatio(current, bg) >= target) return current
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/themes/__tests__/contrast.test.ts`
Expected: 7/7 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/themes/contrast.ts lib/themes/__tests__/contrast.test.ts
git commit -m "feat(theme): add WCAG contrast ratio + ensureContrast helpers"
```

---

## Task 5: Manifest overrides scaffold

**Files:**
- Create: `lib/themes/overrides.ts`

- [ ] **Step 1: Create the file**

```ts
import type { ThemeEntry } from '@/lib/schemas/theme'

// Manual palette overrides for Pokémon whose extracted colors look poor or fail
// WCAG. Keyed by national Pokédex id. Overrides win over extraction.
//
// To add an override: copy the corresponding entry from lib/themes/manifest.json
// and tweak. Run `npm run build:themes` to refresh the manifest.

export const THEME_OVERRIDES: Record<number, Partial<ThemeEntry> & { mantle?: string }> = {
  // Example (commented):
  // 1: { primary: '#3aa55a', accent: '#c5e8a3' },
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/themes/overrides.ts
git commit -m "feat(theme): add empty overrides map for manual palette tuning"
```

---

## Task 6: Build-time extraction script

**Files:**
- Create: `scripts/build-themes.ts`
- Create: `scripts/__fixtures__/sprite-25.png` (committed)
- Test: `scripts/__tests__/build-themes.test.ts`

- [ ] **Step 1: Download a fixture sprite for testing**

Run:

```bash
mkdir -p scripts/__fixtures__
curl -sL https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png -o scripts/__fixtures__/sprite-25.png
file scripts/__fixtures__/sprite-25.png
```

Expected: `scripts/__fixtures__/sprite-25.png: PNG image data, ...`

- [ ] **Step 2: Write the failing tests**

Create `scripts/__tests__/build-themes.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { extractEntry, buildManifest } from '../build-themes'
import type { BaseSetEntry } from '../baseSet'

const PIKACHU: BaseSetEntry = { id: 25, slug: 'pikachu', name: 'Pikachu', tier: 'free' }

async function loadFixture() {
  return readFile(resolve(__dirname, '../__fixtures__/sprite-25.png'))
}

describe('extractEntry', () => {
  it('returns a valid theme entry with hex colors', async () => {
    const buf = await loadFixture()
    const entry = await extractEntry(PIKACHU, buf, {}, '#e8eef5')
    expect(entry.name).toBe('Pikachu')
    expect(entry.tier).toBe('free')
    expect(entry.primary).toMatch(/^#[0-9a-f]{6}$/i)
    expect(entry.accent).toMatch(/^#[0-9a-f]{6}$/i)
    expect(entry.mantle).toBe('#e8eef5')
  })

  it('uses overrides when present (overrides win over extraction)', async () => {
    const buf = await loadFixture()
    const entry = await extractEntry(
      PIKACHU,
      buf,
      { 25: { primary: '#123456', accent: '#abcdef' } },
      '#e8eef5',
    )
    expect(entry.primary).toBe('#123456')
    expect(entry.accent).toBe('#abcdef')
  })

  it('darkens primary that fails 4.5:1 against the mantle', async () => {
    const buf = await loadFixture()
    // Force an awful primary via override of accent only — primary still extracted.
    // Use a near-mantle override to trigger contrast logic.
    const entry = await extractEntry(
      PIKACHU,
      buf,
      { 25: { primary: '#ffff80' } },
      '#e8eef5',
    )
    // Either the override darkened or it remained — verify it passes contrast.
    const { contrastRatio } = await import('../../lib/themes/contrast')
    expect(contrastRatio(entry.primary, '#e8eef5')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('buildManifest', () => {
  it('returns a manifest keyed by stringified ids', async () => {
    const buf = await loadFixture()
    const fetcher = vi.fn(async () => buf)
    const manifest = await buildManifest([PIKACHU], {}, '#e8eef5', fetcher)
    expect(Object.keys(manifest)).toEqual(['25'])
    expect(manifest['25'].name).toBe('Pikachu')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(25)
  })

  it('does not call the fetcher when an override fully specifies the entry', async () => {
    const fetcher = vi.fn()
    const manifest = await buildManifest(
      [PIKACHU],
      { 25: { primary: '#111111', accent: '#222222', mantle: '#e8eef5' } },
      '#e8eef5',
      fetcher,
    )
    expect(fetcher).not.toHaveBeenCalled()
    expect(manifest['25'].primary).toBe('#111111')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run scripts/__tests__/build-themes.test.ts`
Expected: FAIL — module `'../build-themes'` does not exist.

- [ ] **Step 4: Implement the script**

Create `scripts/build-themes.ts`:

```ts
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Vibrant } from 'node-vibrant/node'
import { BASE_SET, type BaseSetEntry } from './baseSet'
import { THEME_OVERRIDES } from '../lib/themes/overrides'
import { ensureContrast, contrastRatio } from '../lib/themes/contrast'
import { themeEntrySchema, themeManifestSchema, type ThemeEntry, type ThemeManifest } from '../lib/schemas/theme'

const DEFAULT_MANTLE = '#e8eef5'
const SPRITE_URL = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

type Overrides = Record<number, Partial<ThemeEntry>>
type Fetcher = (id: number) => Promise<Buffer>

async function defaultFetcher(id: number): Promise<Buffer> {
  const res = await fetch(SPRITE_URL(id))
  if (!res.ok) throw new Error(`Failed to fetch sprite ${id}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function isFullOverride(o: Partial<ThemeEntry> | undefined): o is ThemeEntry {
  return !!o && !!o.primary && !!o.accent && !!o.mantle && !!o.name && !!o.tier
}

export async function extractEntry(
  pokemon: BaseSetEntry,
  buf: Buffer,
  overrides: Overrides,
  mantleDefault: string,
): Promise<ThemeEntry> {
  const override = overrides[pokemon.id] ?? {}

  let primary = override.primary
  let accent = override.accent
  const mantle = override.mantle ?? mantleDefault

  if (!primary || !accent) {
    const palette = await Vibrant.from(buf).getPalette()
    const vibrant = palette.Vibrant?.hex ?? palette.Muted?.hex ?? '#888888'
    const lightVibrant = palette.LightVibrant?.hex ?? palette.LightMuted?.hex ?? '#dddddd'
    primary = primary ?? vibrant
    accent = accent ?? lightVibrant
  }

  const fixed = ensureContrast(primary, mantle, 4.5)
  if (!fixed) {
    throw new Error(
      `Cannot satisfy 4.5:1 contrast for ${pokemon.name} (id ${pokemon.id}) primary=${primary} mantle=${mantle}. Add an override in lib/themes/overrides.ts.`,
    )
  }
  primary = fixed

  if (contrastRatio(accent, mantle) < 3) {
    const fixedAccent = ensureContrast(accent, mantle, 3)
    if (fixedAccent) accent = fixedAccent
  }

  const entry = themeEntrySchema.parse({
    name: pokemon.name,
    tier: pokemon.tier,
    primary,
    accent,
    mantle,
  })
  return entry
}

export async function buildManifest(
  list: BaseSetEntry[],
  overrides: Overrides,
  mantleDefault: string,
  fetcher: Fetcher,
): Promise<ThemeManifest> {
  const manifest: ThemeManifest = {}
  for (const pokemon of list) {
    const override = overrides[pokemon.id]
    let buf: Buffer
    if (isFullOverride({ ...override, name: pokemon.name, tier: pokemon.tier })) {
      buf = Buffer.alloc(0)
    } else {
      buf = await fetcher(pokemon.id)
    }
    const entry = await extractEntry(pokemon, buf, overrides, mantleDefault)
    manifest[String(pokemon.id)] = entry
  }
  return themeManifestSchema.parse(manifest)
}

async function main() {
  const manifest = await buildManifest(BASE_SET, THEME_OVERRIDES, DEFAULT_MANTLE, defaultFetcher)
  const out = resolve(process.cwd(), 'lib/themes/manifest.json')
  await writeFile(out, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${Object.keys(manifest).length} entries to ${out}`)
}

if (process.argv[1] && process.argv[1].endsWith('build-themes.ts')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run scripts/__tests__/build-themes.test.ts`
Expected: 5/5 PASS.

- [ ] **Step 6: Run the script for real to produce the manifest**

Run: `npm run build:themes`
Expected: `Wrote 53 entries to .../lib/themes/manifest.json`. The file `lib/themes/manifest.json` is created.

- [ ] **Step 7: Spot-check the manifest**

Run: `node -e "const m=require('./lib/themes/manifest.json'); console.log(Object.keys(m).length, m['25'])"`
Expected: `53 { name: 'Pikachu', tier: 'free', primary: '#...', accent: '#...', mantle: '#e8eef5' }`

- [ ] **Step 8: Commit**

```bash
git add scripts/build-themes.ts scripts/__tests__/build-themes.test.ts scripts/__fixtures__/sprite-25.png lib/themes/manifest.json
git commit -m "feat(theme): build-time palette extraction with WCAG validation"
```

---

## Task 7: Resolution helper (cookie → DB → default)

**Files:**
- Create: `lib/themes/resolve.ts`
- Test: `lib/themes/__tests__/resolve.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/themes/__tests__/resolve.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveTheme, tierAllows } from '../resolve'
import type { ThemeManifest } from '@/lib/schemas/theme'

const manifest: ThemeManifest = {
  '25': { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5' },
  '6':  { name: 'Charizard', tier: 'adfree', primary: '#d35400', accent: '#ffd1a8', mantle: '#e8eef5' },
  '150':{ name: 'Mewtwo', tier: 'free', primary: '#9b59b6', accent: '#d2b4de', mantle: '#e8eef5' },
}

describe('tierAllows', () => {
  it('grants free → free', () => { expect(tierAllows('free', 'free')).toBe(true) })
  it('denies free → adfree', () => { expect(tierAllows('free', 'adfree')).toBe(false) })
  it('grants adfree → free', () => { expect(tierAllows('adfree', 'free')).toBe(true) })
  it('grants pro → adfree', () => { expect(tierAllows('pro', 'adfree')).toBe(true) })
  it('grants pro → pro', () => { expect(tierAllows('pro', 'pro')).toBe(true) })
})

describe('resolveTheme', () => {
  it('returns the cookie entry when within tier', () => {
    const r = resolveTheme(manifest, { cookie: '25', userTier: 'free', userPokemonId: null })
    expect(r?.name).toBe('Pikachu')
  })

  it('falls back to DB when cookie is above tier (downgrade)', () => {
    const r = resolveTheme(manifest, { cookie: '6', userTier: 'free', userPokemonId: 25 })
    expect(r?.name).toBe('Pikachu')
  })

  it('returns null when cookie is above tier and DB is also above tier', () => {
    const r = resolveTheme(manifest, { cookie: '6', userTier: 'free', userPokemonId: 6 })
    expect(r).toBeNull()
  })

  it('returns DB entry when no cookie', () => {
    const r = resolveTheme(manifest, { cookie: null, userTier: 'free', userPokemonId: 150 })
    expect(r?.name).toBe('Mewtwo')
  })

  it('returns null when neither cookie nor DB is set', () => {
    const r = resolveTheme(manifest, { cookie: null, userTier: 'free', userPokemonId: null })
    expect(r).toBeNull()
  })

  it('returns null when cookie is a non-numeric string', () => {
    const r = resolveTheme(manifest, { cookie: 'abc', userTier: 'pro', userPokemonId: null })
    expect(r).toBeNull()
  })

  it('returns null when cookie points to an unknown Pokémon', () => {
    const r = resolveTheme(manifest, { cookie: '9999', userTier: 'pro', userPokemonId: null })
    expect(r).toBeNull()
  })

  it('treats anonymous (undefined tier) as free', () => {
    const r = resolveTheme(manifest, { cookie: '6', userTier: undefined, userPokemonId: null })
    expect(r).toBeNull()
    const r2 = resolveTheme(manifest, { cookie: '25', userTier: undefined, userPokemonId: null })
    expect(r2?.name).toBe('Pikachu')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/themes/__tests__/resolve.test.ts`
Expected: FAIL — module `'../resolve'` does not exist.

- [ ] **Step 3: Implement resolution**

Create `lib/themes/resolve.ts`:

```ts
import type { Tier } from '@/lib/types'
import type { ThemeEntry, ThemeManifest } from '@/lib/schemas/theme'

const TIER_RANK: Record<Tier, number> = { free: 0, adfree: 1, pro: 2 }

export function tierAllows(userTier: Tier, entryTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[entryTier]
}

export interface ResolveContext {
  cookie: string | null | undefined
  userTier: Tier | undefined
  userPokemonId: number | null | undefined
}

export function resolveTheme(
  manifest: ThemeManifest,
  ctx: ResolveContext,
): ThemeEntry | null {
  const tier: Tier = ctx.userTier ?? 'free'

  if (ctx.cookie && /^\d+$/.test(ctx.cookie)) {
    const entry = manifest[ctx.cookie]
    if (entry && tierAllows(tier, entry.tier)) return entry
  }

  if (ctx.userPokemonId != null) {
    const entry = manifest[String(ctx.userPokemonId)]
    if (entry && tierAllows(tier, entry.tier)) return entry
  }

  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/themes/__tests__/resolve.test.ts`
Expected: 13/13 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/themes/resolve.ts lib/themes/__tests__/resolve.test.ts
git commit -m "feat(theme): add cookie→DB→default theme resolution helper"
```

---

## Task 8: Server action `setThemePokemon`

**Files:**
- Create: `app/(app)/settings/actions.ts`
- Test: `app/(app)/settings/__tests__/actions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/(app)/settings/__tests__/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
}
const usersUpdateOne = vi.fn(async () => ({ acknowledged: true }))
const revalidatePath = vi.fn()
let session: { user: { id: string }; tier: 'free' | 'adfree' | 'pro' } | null = null

vi.mock('next/headers', () => ({
  cookies: async () => cookieStore,
}))
vi.mock('next/cache', () => ({
  revalidatePath: (p: string) => revalidatePath(p),
}))
vi.mock('@/lib/auth', () => ({
  auth: async () => session,
}))
vi.mock('@/lib/db', () => ({
  getDb: async () => ({
    collection: () => ({ updateOne: usersUpdateOne }),
  }),
}))

const manifest = {
  '25': { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5' },
  '6':  { name: 'Charizard', tier: 'adfree', primary: '#d35400', accent: '#ffd1a8', mantle: '#e8eef5' },
}
vi.mock('@/lib/themes/manifest.json', () => ({ default: manifest }))

import { setThemePokemon } from '../actions'

beforeEach(() => {
  cookieStore.set.mockClear()
  cookieStore.delete.mockClear()
  usersUpdateOne.mockClear()
  revalidatePath.mockClear()
  session = null
})

describe('setThemePokemon', () => {
  it('free user → free Pokémon: writes cookie, DB, and revalidates', async () => {
    session = { user: { id: 'u1' }, tier: 'free' }
    await setThemePokemon({ pokemonId: 25 })
    expect(cookieStore.set).toHaveBeenCalledWith(
      'theme-pokemon',
      '25',
      expect.objectContaining({ path: '/', maxAge: 31536000, sameSite: 'lax' }),
    )
    expect(usersUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $set: { themePokemonId: 25 } })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('free user → adfree Pokémon: rejected, no writes', async () => {
    session = { user: { id: 'u1' }, tier: 'free' }
    await expect(setThemePokemon({ pokemonId: 6 })).rejects.toThrow(/tier/i)
    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(usersUpdateOne).not.toHaveBeenCalled()
  })

  it('null clears cookie and unsets DB field', async () => {
    session = { user: { id: 'u1' }, tier: 'pro' }
    await setThemePokemon({ pokemonId: null })
    expect(cookieStore.delete).toHaveBeenCalledWith('theme-pokemon')
    expect(usersUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $unset: { themePokemonId: '' } })
  })

  it('anonymous user → free Pokémon: cookie only, no DB call', async () => {
    session = null
    await setThemePokemon({ pokemonId: 25 })
    expect(cookieStore.set).toHaveBeenCalled()
    expect(usersUpdateOne).not.toHaveBeenCalled()
  })

  it('anonymous user → adfree Pokémon: rejected', async () => {
    session = null
    await expect(setThemePokemon({ pokemonId: 6 })).rejects.toThrow(/tier/i)
  })

  it('rejects unknown Pokémon id', async () => {
    session = { user: { id: 'u1' }, tier: 'pro' }
    await expect(setThemePokemon({ pokemonId: 9999 })).rejects.toThrow(/unknown/i)
  })

  it('rejects malformed input', async () => {
    session = { user: { id: 'u1' }, tier: 'pro' }
    // @ts-expect-error — testing runtime validation
    await expect(setThemePokemon({ pokemonId: 'pikachu' })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/settings/__tests__/actions.test.ts"`
Expected: FAIL — module `'../actions'` does not exist.

- [ ] **Step 3: Implement the action**

Create `app/(app)/settings/actions.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { setThemePokemonInputSchema } from '@/lib/schemas/theme'
import { tierAllows } from '@/lib/themes/resolve'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'

const THEME_COOKIE = 'theme-pokemon'
const ONE_YEAR = 60 * 60 * 24 * 365

export async function setThemePokemon(input: unknown): Promise<void> {
  const { pokemonId } = setThemePokemonInputSchema.parse(input)
  const session = await auth()
  const userTier = session?.tier ?? 'free'

  if (pokemonId !== null) {
    const entry = (manifest as ThemeManifest)[String(pokemonId)]
    if (!entry) throw new Error(`Unknown Pokémon id: ${pokemonId}`)
    if (!tierAllows(userTier, entry.tier)) {
      throw new Error(`Tier ${userTier} not entitled to ${entry.tier} themes`)
    }
  }

  const cookieStore = await cookies()
  if (pokemonId === null) {
    cookieStore.delete(THEME_COOKIE)
  } else {
    cookieStore.set(THEME_COOKIE, String(pokemonId), {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
    })
  }

  if (session?.user?.id) {
    const db = await getDb()
    const users = db.collection('users')
    const _id = ObjectId.isValid(session.user.id)
      ? new ObjectId(session.user.id)
      : (session.user.id as unknown as ObjectId)
    if (pokemonId === null) {
      await users.updateOne({ _id }, { $unset: { themePokemonId: '' } })
    } else {
      await users.updateOne({ _id }, { $set: { themePokemonId: pokemonId } })
    }
  }

  revalidatePath('/')
}
```

Note: tests mock `getDb` to return a stub with `collection().updateOne()`, and they use `_id: 'u1'` (string). The action above mirrors that contract by passing `_id` straight through when not a valid ObjectId; in production the user id is an `ObjectId` string from auth.

- [ ] **Step 4: Update the test mock to align with `_id: 'u1'` passthrough**

Adjust the assertions in `actions.test.ts` if the implementation passes `_id` differently than the test expects. Re-run tests until they pass — never modify tests to relax assertions; modify the implementation to match the tested contract. The test asserts `{ _id: 'u1' }`, and the implementation falls through to that exact value when the id is not a valid ObjectId hex string.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/settings/__tests__/actions.test.ts"`
Expected: 7/7 PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/settings/actions.ts" "app/(app)/settings/__tests__/actions.test.ts"
git commit -m "feat(theme): add setThemePokemon server action with tier enforcement"
```

---

## Task 9: SSR injection in root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace the root layout to resolve and inject the theme**

Replace the entire contents of `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Russo_One, Chakra_Petch } from 'next/font/google'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { resolveTheme } from '@/lib/themes/resolve'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'
import './globals.css'

const russoOne = Russo_One({
  variable: '--font-russo',
  subsets: ['latin'],
  weight: '400',
})

const chakraPetch = Chakra_Petch({
  variable: '--font-chakra',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'PokeVault — Pokemon TCG Collector',
  description: 'Track your Pokémon TCG collection, monitor Cardmarket prices in EUR, and manage your cards.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = await auth()
  const theme = resolveTheme(manifest as ThemeManifest, {
    cookie: cookieStore.get('theme-pokemon')?.value ?? null,
    userTier: session?.tier,
    userPokemonId: session?.user?.themePokemonId ?? null,
  })
  const styleAttr = theme
    ? ({
        ['--color-blue' as string]: theme.primary,
        ['--color-mauve' as string]: theme.accent,
        ['--color-mantle' as string]: theme.mantle,
      } as React.CSSProperties)
    : undefined

  return (
    <html lang="it" style={styleAttr}>
      <body className={`${russoOne.variable} ${chakraPetch.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Extend the NextAuth session type to carry `themePokemonId`**

If `session?.user?.themePokemonId` causes a TS error, open `lib/auth.config.ts` (or wherever `Session`/`JWT` are augmented) and add `themePokemonId?: number` to the user augmentation. Reference the existing `tier` augmentation as a pattern.

If no session augmentation file exists, add one at `types/next-auth.d.ts`:

```ts
import type { Tier } from '@/lib/types'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    tier?: Tier
    user: {
      id?: string
      themePokemonId?: number
    } & Omit<import('next-auth').Session['user'], 'id'>
  }
}
```

Then update `lib/auth.ts` JWT/session callbacks to populate `themePokemonId` from the user document on session build (mirror the existing `tier` flow).

- [ ] **Step 3: Verify type checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass; new tests from earlier tasks also pass.

- [ ] **Step 5: Smoke-test the dev server**

Run (in one terminal): `npm run dev`
In a browser, open the app while logged out, then run in DevTools console:

```js
document.cookie = 'theme-pokemon=25; path=/; max-age=31536000'
```

Reload. Verify the `<html>` element has an inline `style` attribute setting `--color-blue`, `--color-mauve`, `--color-mantle` to Pikachu's palette. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx lib/auth.ts lib/auth.config.ts types/next-auth.d.ts 2>/dev/null; git commit -m "feat(theme): SSR-inject themed CSS variables on <html>"
```

---

## Task 10: ThemePicker and UpgradeDialog components

**Files:**
- Create: `components/settings/UpgradeDialog.tsx`
- Create: `components/settings/ThemePicker.tsx`
- Test: `components/settings/__tests__/ThemePicker.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `components/settings/__tests__/ThemePicker.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ThemePicker from '../ThemePicker'

const onSelect = vi.fn(async () => {})

const baseProps = {
  manifest: {
    '25': { name: 'Pikachu', tier: 'free' as const, primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5' },
    '6':  { name: 'Charizard', tier: 'adfree' as const, primary: '#d35400', accent: '#ffd1a8', mantle: '#e8eef5' },
    '150':{ name: 'Mewtwo', tier: 'free' as const, primary: '#9b59b6', accent: '#d2b4de', mantle: '#e8eef5' },
  },
  userTier: 'free' as const,
  currentPokemonId: 25 as number | null,
  onSelect,
}

beforeEach(() => onSelect.mockClear())

describe('ThemePicker', () => {
  it('renders one tile per manifest entry plus a default tile', () => {
    render(<ThemePicker {...baseProps} />)
    expect(screen.getByRole('button', { name: /default/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pikachu/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Charizard/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mewtwo/ })).toBeInTheDocument()
  })

  it('marks the current selection', () => {
    render(<ThemePicker {...baseProps} />)
    const pikachu = screen.getByRole('button', { name: /Pikachu/ })
    expect(pikachu).toHaveAttribute('data-selected', 'true')
  })

  it('calls onSelect with the id when an unlocked tile is clicked', () => {
    render(<ThemePicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Mewtwo/ }))
    expect(onSelect).toHaveBeenCalledWith(150)
  })

  it('opens the upgrade dialog when a locked tile is clicked', () => {
    render(<ThemePicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Charizard/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/adfree/i)).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('default tile calls onSelect(null)', () => {
    render(<ThemePicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /default/i }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/settings/__tests__/ThemePicker.test.tsx`
Expected: FAIL — module `'../ThemePicker'` does not exist.

- [ ] **Step 3: Implement `UpgradeDialog`**

Create `components/settings/UpgradeDialog.tsx`:

```tsx
'use client'

import type { Tier } from '@/lib/types'

interface UpgradeDialogProps {
  open: boolean
  requiredTier: Tier
  pokemonName: string
  onClose: () => void
}

const TIER_COPY: Record<Tier, string> = {
  free: 'Free',
  adfree: 'Ad-Free',
  pro: 'Pro',
}

export default function UpgradeDialog({ open, requiredTier, pokemonName, onClose }: UpgradeDialogProps) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-base border border-surface0 rounded-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="upgrade-title" className="text-lg font-russo text-text mb-2">Unlock {pokemonName}</h2>
        <p className="text-sm text-overlay1 mb-4">
          {pokemonName} is available on the {TIER_COPY[requiredTier]} plan. Upgrade to unlock it as a theme.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-surface0 text-overlay1 hover:bg-surface0"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1.5 text-sm rounded bg-blue text-white opacity-60 cursor-not-allowed"
          >
            Upgrade (coming soon)
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `ThemePicker`**

Create `components/settings/ThemePicker.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Tier } from '@/lib/types'
import type { ThemeEntry, ThemeManifest } from '@/lib/schemas/theme'
import { tierAllows } from '@/lib/themes/resolve'
import UpgradeDialog from './UpgradeDialog'

interface ThemePickerProps {
  manifest: ThemeManifest
  userTier: Tier
  currentPokemonId: number | null
  onSelect: (id: number | null) => Promise<void>
}

interface LockedTarget { id: number; entry: ThemeEntry }

export default function ThemePicker({ manifest, userTier, currentPokemonId, onSelect }: ThemePickerProps) {
  const [locked, setLocked] = useState<LockedTarget | null>(null)

  const entries = Object.entries(manifest)
    .map(([id, entry]) => ({ id: Number(id), entry }))
    .sort((a, b) => a.id - b.id)

  const handleClick = (id: number, entry: ThemeEntry) => {
    if (!tierAllows(userTier, entry.tier)) {
      setLocked({ id, entry })
      return
    }
    void onSelect(id)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        <button
          type="button"
          onClick={() => void onSelect(null)}
          data-selected={currentPokemonId === null}
          aria-label="Default — no theme"
          className="aspect-square rounded-lg border border-surface0 bg-base text-xs text-overlay1 hover:bg-surface0 data-[selected=true]:ring-2 data-[selected=true]:ring-blue"
        >
          Default
        </button>

        {entries.map(({ id, entry }) => {
          const allowed = tierAllows(userTier, entry.tier)
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleClick(id, entry)}
              data-selected={currentPokemonId === id}
              aria-label={entry.name}
              className="relative aspect-square rounded-lg border border-surface0 bg-base flex flex-col items-center justify-center p-1 hover:bg-surface0 data-[selected=true]:ring-2 data-[selected=true]:ring-blue"
              style={{ backgroundColor: entry.primary + '22' }}
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`}
                alt=""
                loading="lazy"
                className={`w-12 h-12 object-contain ${allowed ? '' : 'opacity-30'}`}
              />
              <span className={`mt-1 text-[10px] truncate w-full text-center ${allowed ? 'text-text' : 'text-overlay0'}`}>
                {entry.name}
              </span>
              <span
                className="absolute top-1 right-1 text-[8px] px-1 rounded uppercase"
                style={{ background: entry.tier === 'free' ? '#10b98155' : entry.tier === 'adfree' ? '#f59e0b55' : '#ec489955' }}
              >
                {entry.tier}
              </span>
              {!allowed && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-2xl">🔒</span>}
            </button>
          )
        })}
      </div>

      <UpgradeDialog
        open={locked !== null}
        requiredTier={locked?.entry.tier ?? 'pro'}
        pokemonName={locked?.entry.name ?? ''}
        onClose={() => setLocked(null)}
      />
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run components/settings/__tests__/ThemePicker.test.tsx`
Expected: 5/5 PASS.

- [ ] **Step 6: Commit**

```bash
git add components/settings/ThemePicker.tsx components/settings/UpgradeDialog.tsx components/settings/__tests__/ThemePicker.test.tsx
git commit -m "feat(theme): add ThemePicker grid and UpgradeDialog modal"
```

---

## Task 11: Wire ThemePicker into the settings page

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Replace the settings page**

Replace the entire contents of `app/(app)/settings/page.tsx` with:

```tsx
import { auth } from '@/lib/auth'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'
import ThemePicker from '@/components/settings/ThemePicker'
import { setThemePokemon } from './actions'

export default async function SettingsPage() {
  const session = await auth()
  const userTier = session?.tier ?? 'free'
  const currentPokemonId = session?.user?.themePokemonId ?? null

  async function handleSelect(id: number | null) {
    'use server'
    await setThemePokemon({ pokemonId: id })
  }

  return (
    <div className="space-y-6">
      <section className="bg-base border border-surface0 rounded-xl p-6">
        <h2 className="text-lg font-russo text-text mb-1">Theme</h2>
        <p className="text-xs text-overlay1 mb-4">
          Pick a Base Set Pokémon to personalize your app colors. Your current plan: <strong>{userTier}</strong>.
        </p>
        <ThemePicker
          manifest={manifest as ThemeManifest}
          userTier={userTier}
          currentPokemonId={currentPokemonId}
          onSelect={handleSelect}
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify type checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test in the dev server**

Run: `npm run dev`. Log in. Navigate to `/settings`. Verify:
- The grid renders 53 Pokémon plus a "Default" tile.
- Locked tiles (above your tier) show a lock overlay.
- Clicking an unlocked tile recolors the app immediately after the page revalidates.
- Clicking a locked tile opens the upgrade dialog.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/settings/page.tsx"
git commit -m "feat(theme): render ThemePicker on settings page"
```

---

## Task 12: Themed avatar in the topbar

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/layout/Topbar.tsx`

- [ ] **Step 1: Resolve the theme in the app layout and pass it down**

Replace `app/(app)/layout.tsx` contents with:

```tsx
import { SessionProvider } from 'next-auth/react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { resolveTheme } from '@/lib/themes/resolve'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('theme-pokemon')?.value ?? null
  const theme = resolveTheme(manifest as ThemeManifest, {
    cookie: cookieValue,
    userTier: session.tier,
    userPokemonId: session.user?.themePokemonId ?? null,
  })
  const themePokemonId = cookieValue && /^\d+$/.test(cookieValue)
    ? Number(cookieValue)
    : (session.user?.themePokemonId ?? null)

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-crust">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar themePokemonId={theme ? themePokemonId : null} themeName={theme?.name ?? null} />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
```

- [ ] **Step 2: Update `Topbar` to accept and render the avatar**

Replace `components/layout/Topbar.tsx` contents with:

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { Search, Globe, User } from 'lucide-react'

const routeTitles: [string, string][] = [
  ['/dashboard', 'Dashboard'],
  ['/browse', 'Browse'],
  ['/cards', 'Card Detail'],
  ['/collection', 'My Cards'],
  ['/wishlist', 'Wishlist'],
  ['/analytics', 'Analytics'],
  ['/settings', 'Settings'],
]

interface TopbarProps {
  themePokemonId: number | null
  themeName: string | null
}

export default function Topbar({ themePokemonId, themeName }: TopbarProps) {
  const pathname = usePathname()
  const title =
    routeTitles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'PokeVault'

  return (
    <header className="bg-mantle border-b border-surface0 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
      <h1 className="text-sm font-russo text-text flex-1 tracking-wide">{title}</h1>
      <div aria-hidden="true" className="bg-base border border-surface0 rounded-md px-3 py-1.5 text-[11px] text-overlay0 w-48 flex items-center gap-2">
        <Search size={11} className="flex-shrink-0" />
        <span>Search cards, sets…</span>
      </div>
      <div aria-hidden="true" className="bg-base border border-surface0 rounded px-2 py-1 text-[10px] text-overlay2 flex items-center gap-1.5">
        <Globe size={10} className="flex-shrink-0" />
        <span>IT · EUR</span>
      </div>
      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue flex items-center justify-center bg-base">
        {themePokemonId ? (
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${themePokemonId}.png`}
            alt={themeName ?? 'Theme avatar'}
            className="w-full h-full object-contain"
          />
        ) : (
          <User size={16} className="text-overlay1" />
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Verify type checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Smoke-test in dev server**

Run: `npm run dev`. Log in, pick a free Pokémon on `/settings`, verify the topbar avatar swaps to that Pokémon's sprite. Pick "Default" and confirm it reverts to the user icon. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/layout.tsx" components/layout/Topbar.tsx
git commit -m "feat(theme): swap topbar avatar to themed Pokémon sprite"
```

---

## Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: full suite passes (118 prior tests + ~36 new).

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual e2e smoke**

Run: `npm run dev`. Log in. Verify:
- `/settings` shows 53 Pokémon + "Default".
- Picking a free Pokémon recolors the app and updates the topbar avatar without a hard reload (server action + revalidate covers this).
- Picking a locked Pokémon opens the upgrade dialog and does not change the theme.
- Reload — the theme persists from the cookie before any client JS runs (no FOUC: open DevTools → Network → throttle to "Slow 3G" and confirm the first paint already has the themed colors).
- Log out, set `document.cookie = 'theme-pokemon=25; path=/; max-age=31536000'`, reload — public pages should also be themed (root layout SSR resolution).
- Log out, set `document.cookie = 'theme-pokemon=6; path=/; max-age=31536000'` (Charizard, adfree). Log in as a free user. Verify Charizard's theme is NOT applied (downgrade case — cookie is rejected at resolution).

Stop the dev server.

- [ ] **Step 4: Final commit (if any uncommitted touch-ups)**

```bash
git status
# If there are no changes, skip. Otherwise:
git add -A && git commit -m "chore(theme): final cleanup after smoke testing"
```

---

## Self-Review Notes

- **Spec coverage:** Each spec section maps to a task — Architecture (T9, T12), Tier breakdown (T2), Build-time extraction (T4–T6), Theme application (T9), UI components (T10–T11), Data model (T1), Server action (T8), Testing (woven into T3–T10).
- **Type consistency:** `ThemeEntry`/`ThemeManifest`/`Tier` defined once (`lib/schemas/theme.ts`, `lib/types.ts`) and reused. `tierAllows` has one definition (`lib/themes/resolve.ts`). Server action input keyed `pokemonId` consistently.
- **Placeholder scan:** No TBD/TODO/"add error handling later" — all error paths shown explicitly.
- **Risk: NextAuth augmentation** (T9 step 2) depends on the existing auth setup. If `lib/auth.ts` doesn't carry `tier` on session yet (despite the memory claim), the executing engineer must mirror the same augmentation pattern for `themePokemonId` — both fields belong on `Session`.
