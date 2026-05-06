# Pokémon Theme Customization — Design

**Status:** Approved (design phase)
**Date:** 2026-05-07
**Scope:** v1 of the tiered Pokémon theme customization feature on the roadmap.

## Summary

Users can pick a Pokémon from the 1999 Base Set (~53 unique species). The chosen Pokémon recolors the app via three CSS custom properties (`--color-blue`, `--color-mauve`, `--color-mantle`) and replaces the topbar profile circle with the Pokémon's sprite. Access to specific Pokémon is gated by subscription tier (`free` / `adfree` / `pro`).

Colors are extracted at build time from PokéAPI official artwork sprites using `node-vibrant`, validated against WCAG AA contrast on the app's mantle background, and committed to the repo as `lib/themes/manifest.json`. Manual overrides live in `lib/themes/overrides.ts` for cases where extraction produces poor results.

The selected Pokémon is persisted in a cookie (`theme-pokemon`, 1yr) for SSR-fast resolution and mirrored to `users.themePokemonId` in MongoDB for cross-device persistence. Resolution order: cookie → DB → default. Tier entitlement is re-checked at resolution time so a downgrade silently falls back.

## Goals

- Tier-gated personalization that creates a clear free → adfree → pro upgrade ladder.
- No FOUC: themed CSS variables are present on the very first SSR paint.
- Accessibility-first: every shipped theme passes WCAG AA on text against the mantle.
- Zero extra runtime cost in production: extraction is offline, manifest is static JSON.

## Non-Goals (v1)

- All ~1000 Pokémon (Base Set only).
- Shiny variants.
- Animated avatar transitions or sprite animation.
- Per-page theme overrides.
- Custom user-uploaded palettes.

## Architecture

```
PokéAPI sprite ──► scripts/build-themes.ts ──► lib/themes/manifest.json
                       │                              │
                       ▼                              ▼
                node-vibrant +              lib/themes/resolve.ts
                WCAG validator              (cookie → DB → default,
                       │                     re-checks tier)
                       ▼                              │
                lib/themes/overrides.ts ──────────────┘
                                                      │
                                                      ▼
                                       app/(app)/layout.tsx
                                       (inline <html style="…">)
                                                      │
                                                      ▼
                                       components/layout/Topbar.tsx
                                       components/settings/ThemePicker.tsx
                                       app/(app)/settings/actions.ts
                                       (setThemePokemon server action)
```

### Tier Breakdown

| Tier   | Count | Pokémon (Base Set) |
|--------|-------|-------------------|
| free   | 5     | Bulbasaur, Charmander, Squirtle, Pikachu, Mewtwo |
| adfree | ~20   | Curated mid-popularity additions (Eevee, Snorlax, Gengar, Dragonite, Gyarados, Machamp, Alakazam, Articuno, Zapdos, Moltres, Mew, Vaporeon, Jolteon, Flareon, Lapras, Slowbro, Magikarp, Hitmonchan, Hitmonlee, Kangaskhan) |
| pro    | 53    | All Base Set species (includes the rest) |

Exact adfree list is finalized in implementation; the design contract is "5 free, ~20 adfree, all 53 pro".

## Build-time Palette Extraction

**Script:** `scripts/build-themes.ts` — runs in CI / `npm run build` prior to `next build`. Idempotent. Output committed to repo so CI doesn't need network at build.

**Inputs:**
- A static list of 53 Base Set Pokémon (id + slug + tier) defined in `scripts/baseSet.ts`.
- Optional `lib/themes/overrides.ts` map keyed by Pokémon id.

**Per Pokémon:**
1. If override exists, use it. Skip extraction.
2. Fetch `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`.
3. Run `node-vibrant`. Take `Vibrant` swatch as `primary`, `LightVibrant` (or `Vibrant.lighten`) as `accent`. `mantle` keeps the global default `#e8eef5` unless an override sets it.
4. Validate `primary` contrast vs `mantle` ≥ 4.5:1. If it fails, darken the primary in HSL space in 5% steps until it passes (cap at 30% darkening; if still failing, log a warning and fall through to overrides — manual fix required).
5. Validate `accent` contrast vs `mantle` ≥ 3:1 (UI accent, not body text).

**Output:** `lib/themes/manifest.json`

```json
{
  "1": { "name": "Bulbasaur", "tier": "free", "primary": "#5fa463", "accent": "#c5e8a3", "mantle": "#e8eef5" },
  "4": { "name": "Charmander", "tier": "free", "primary": "#e87a3a", "accent": "#ffd1a8", "mantle": "#e8eef5" },
  "...": "..."
}
```

**Schema (Zod):** `themeManifestSchema` validates the file at app boot in dev and on first read in prod. Bad manifest → hard fail (we fix the manifest, not the runtime).

## Theme Application (SSR)

### Cookie

- Name: `theme-pokemon`
- Value: stringified Pokémon id (e.g. `"25"`) or absent.
- `Path=/`, `Max-Age=31536000`, `SameSite=Lax`, **not** `HttpOnly` (theme is non-sensitive and the picker is client-driven).
- Set/cleared exclusively by the `setThemePokemon` server action (cookies API).

### Database

- New field on the user document: `themePokemonId?: number`.
- Mirrors the cookie for logged-in users so a new device picks up the theme.
- Cleared (set to `null` / `$unset`) when the user picks "Default (no theme)".

### Resolution (`lib/theme/resolve.ts`)

```
function resolveTheme(cookie, session): ThemeEntry | null
  if cookie:
    entry = manifest[cookie]
    if entry && tierAllows(session?.tier ?? 'free', entry.tier):
      return entry
  if session?.user.themePokemonId:
    entry = manifest[session.user.themePokemonId]
    if entry && tierAllows(session.tier, entry.tier):
      return entry
  return null
```

`tierAllows(userTier, entryTier)` is a simple ordering: `free < adfree < pro`. A user's tier must be ≥ the entry's tier.

### Injection

`app/(app)/layout.tsx`:

```tsx
const cookieStore = await cookies()
const session = await auth()
const theme = resolveTheme(cookieStore.get('theme-pokemon')?.value, session)
const styleAttr = theme
  ? `--color-blue:${theme.primary};--color-mauve:${theme.accent};--color-mantle:${theme.mantle};`
  : undefined

return (
  <html lang="en" style={styleAttr}>
    {/* … */}
  </html>
)
```

The three CSS variables override the `@theme` defaults from `app/globals.css` for the entire app subtree. No client JS needed for the initial paint — that's how we avoid FOUC.

`theme` is also passed down to `Topbar` so the avatar doesn't have to re-resolve.

## UI Components

### `components/settings/ThemePicker.tsx` (new)

- Grid of 53 tiles (CSS grid, ~6-8 cols responsive).
- Each tile: cropped circular sprite + name + tier badge.
- "Default (no theme)" tile at the top to revert.
- Locked tiles (entry tier > user tier) render with a lock overlay and reduced opacity.
- Click handler:
  - Unlocked: calls `setThemePokemon(id)` server action, optimistically updates UI.
  - Locked: opens `UpgradeDialog` instead of calling the action.
  - Default tile: calls `setThemePokemon(null)`.
- Current selection ringed in `var(--color-blue)`.

### `components/settings/UpgradeDialog.tsx` (new)

- Dialog wrapper around tier upgrade copy + CTA.
- Shows the required tier for the clicked Pokémon ("This Pokémon is available for Pro subscribers.").
- v1: CTA is a stub button labelled "Upgrade" — wires up to billing in a future iteration.

### `components/layout/Topbar.tsx` (modify)

- Profile circle currently a generic icon; swap to the themed Pokémon sprite when `theme` prop is non-null.
- 32px circle, ring in `var(--color-blue)`.
- Falls back to the existing icon when no theme is selected.

### `app/(app)/settings/page.tsx` (modify)

- New section: "Theme". Embeds `<ThemePicker />`.

### `app/(app)/settings/actions.ts` (new or extend)

```ts
'use server'
export async function setThemePokemon(input: { pokemonId: number | null }) {
  const { pokemonId } = setThemePokemonInputSchema.parse(input)
  const session = await auth()
  if (pokemonId !== null) {
    const entry = manifest[pokemonId]
    if (!entry) throw new Error('Unknown Pokémon')
    if (!tierAllows(session?.tier ?? 'free', entry.tier)) {
      throw new Error('Tier not entitled')
    }
  }
  const cookieStore = await cookies()
  if (pokemonId === null) cookieStore.delete('theme-pokemon')
  else cookieStore.set('theme-pokemon', String(pokemonId), { path: '/', maxAge: 31536000, sameSite: 'lax' })
  if (session?.user) {
    await users.updateOne({ _id: session.user.id }, pokemonId === null
      ? { $unset: { themePokemonId: '' } }
      : { $set: { themePokemonId: pokemonId } })
  }
  revalidatePath('/')
}
```

## Data Model Changes

### `users` collection

- Add optional field `themePokemonId: number` (nullable / unset when default).
- Migration: none — field is optional, existing docs default to "no theme".

### Zod schemas

- `setThemePokemonInputSchema = z.object({ pokemonId: z.number().int().nullable() })`
- `themeEntrySchema = z.object({ name: z.string(), tier: tierSchema, primary: hexString, accent: hexString, mantle: hexString })`
- `themeManifestSchema = z.record(z.string().regex(/^\d+$/), themeEntrySchema)`
- `hexString = z.string().regex(/^#[0-9a-f]{6}$/i)`

## Testing

**Build-time extraction (`scripts/build-themes.ts`)**
- WCAG validator unit test: low-contrast primary against mantle auto-darkens until ≥4.5:1.
- Override merge: id present in `overrides.ts` short-circuits extraction; manual values win.
- `node-vibrant` + `fetch` mocked. One end-to-end test against a committed fixture sprite under `__fixtures__/`.
- Snapshot the resulting `manifest.json` shape.

**Zod schemas**
- `themeManifestSchema` valid passes; bad hex fails; unknown tier fails.
- `setThemePokemonInputSchema` accepts null and valid ids; rejects non-numbers and out-of-range.

**Server action `setThemePokemon`**
- Free user → free Pokémon: cookie set, DB updated, `revalidatePath('/')` called.
- Free user → pro Pokémon: rejected, no cookie, no DB write.
- `null`: clears cookie and DB field.
- Anonymous → free Pokémon: cookie only.
- Anonymous → locked Pokémon: rejected.

**Resolution (`lib/theme/resolve.ts`)**
- Cookie within tier → returns cookie entry.
- Cookie above tier (downgrade) → falls back to DB, then default; cookie ignored.
- No cookie, DB within tier → returns DB entry.
- Neither → returns `null`.

**Components**
- `ThemePicker`: 53 tiles render; locked tile click opens `UpgradeDialog`; unlocked tile calls action; current selection ring uses `var(--color-blue)`.
- `UpgradeDialog`: tier copy matches clicked Pokémon's tier.
- Topbar avatar: themed prop renders sprite; null prop renders default circle.

**Integration**
- `app/(app)/layout.tsx`: with cookie set, rendered `<html>` carries the three CSS var overrides inline.
- Snapshot of inline style for one free Pokémon locks the FOUC-avoidance contract.

## File Map

```
scripts/
  build-themes.ts            (new — extraction + WCAG validation)
  baseSet.ts                 (new — 53 Base Set ids/slugs/tiers)
lib/themes/
  manifest.json              (new — committed output)
  overrides.ts               (new — manual palette tuning)
  resolve.ts                 (new — cookie → DB → default)
lib/schemas/
  theme.ts                   (new — Zod schemas)
components/settings/
  ThemePicker.tsx            (new)
  UpgradeDialog.tsx          (new)
components/layout/
  Topbar.tsx                 (modify — themed avatar)
app/(app)/
  layout.tsx                 (modify — resolveTheme + inline style)
  settings/
    page.tsx                 (modify — embed ThemePicker)
    actions.ts               (new or extend — setThemePokemon)
lib/types.ts                 (modify — add themePokemonId? to user)
```

## Risks

- **Extraction quality:** Some sprites produce muddy or low-saturation primaries. Mitigation: WCAG auto-darken + manual overrides file. Acceptance: every shipped Pokémon must pass WCAG AA before merge.
- **Cookie/DB drift:** Cookie set without DB (anonymous) is fine; DB without cookie (new device) resolves correctly. Mitigation handled in resolve order.
- **Tier downgrade:** Resolved by re-checking entitlement at resolution time.
- **CDN caching:** Inline `<html style>` is per-request and not cacheable across users. App is auth-gated so this is already the model — no new constraint.

## Out of Scope (revisit later)

- Sprite animation / shiny.
- Per-component theme overrides (e.g. dark mode toggle).
- User-uploaded custom palettes.
- Theme preview-on-hover before commit.
- Billing/upgrade flow (stub only in v1).
