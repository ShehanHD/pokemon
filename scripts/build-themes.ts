import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Vibrant } from 'node-vibrant/node'
import { BASE_SET, type BaseSetEntry } from './baseSet'
import { THEME_OVERRIDES } from '../lib/themes/overrides'
import { ensureContrast, contrastRatio, tintHSL } from '../lib/themes/contrast'
import {
  themeEntrySchema,
  themeManifestSchema,
  type ThemeEntry,
  type ThemeManifest,
} from '../lib/schemas/theme'

const SPRITE_URL = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

type Overrides = Record<
  number,
  Partial<ThemeEntry> & {
    mantle?: string
    crust?: string
    base?: string
    text?: string
    subtext1?: string
    subtext0?: string
    overlay2?: string
    overlay1?: string
    overlay0?: string
  }
>
type Fetcher = (id: number) => Promise<Buffer>

async function defaultFetcher(id: number): Promise<Buffer> {
  const res = await fetch(SPRITE_URL(id))
  if (!res.ok) throw new Error(`Failed to fetch sprite ${id}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function hasFullColorOverride(o: Partial<ThemeEntry> | undefined): boolean {
  return !!o && !!o.primary && !!o.accent
}

export async function extractEntry(
  pokemon: BaseSetEntry,
  buf: Buffer,
  overrides: Overrides,
): Promise<ThemeEntry> {
  const override = overrides[pokemon.id] ?? {}

  let primary = override.primary
  let accent = override.accent
  const primaryFromOverride = !!override.primary
  const accentFromOverride = !!override.accent

  if (!primary || !accent) {
    const palette = await Vibrant.from(buf).getPalette()
    const vibrant = palette.Vibrant?.hex ?? palette.Muted?.hex ?? '#888888'
    const lightVibrant = palette.LightVibrant?.hex ?? palette.LightMuted?.hex ?? '#dddddd'
    primary = primary ?? vibrant
    accent = accent ?? lightVibrant
  }

  const mantle = override.mantle ?? tintHSL(primary, { lightness: 0.85, satFloor: 0.65 })
  const crust = override.crust ?? tintHSL(primary, { lightness: 0.92, satFloor: 0.55 })
  const base = override.base ?? tintHSL(primary, { lightness: 0.97, satFloor: 0.45 })

  // Trust override-supplied primaries — the author hand-picked them for vibrancy.
  // Only force contrast on auto-extracted values, which tend to be muddy.
  if (!primaryFromOverride) {
    const fixed = ensureContrast(primary, mantle, 4.5)
    if (!fixed) {
      throw new Error(
        `Cannot satisfy 4.5:1 contrast for ${pokemon.name} (id ${pokemon.id}) primary=${primary} mantle=${mantle}. Add an override in lib/themes/overrides.ts.`,
      )
    }
    primary = fixed
  }

  if (!accentFromOverride && contrastRatio(accent, mantle) < 3) {
    const fixedAccent = ensureContrast(accent, mantle, 3)
    if (fixedAccent) accent = fixedAccent
  }

  // Themed text: deeply darkened, slightly desaturated tint of the primary.
  // Mantle (L=0.85) is the darkest themed surface, so it's the binding
  // contrast constraint for body text.
  let text = override.text ?? tintHSL(primary, { lightness: 0.18, satFloor: 0.35 })
  if (contrastRatio(text, mantle) < 4.5) {
    const fixedText = ensureContrast(text, mantle, 4.5)
    text = fixedText ?? '#0f172a'
  }

  // Secondary text scale — progressively lighter tints of the primary so
  // text hierarchy carries the theme hue. Higher satFloor than `text` to
  // keep the hue vivid (user feedback: muted hues feel washed out).
  let subtext1 = override.subtext1 ?? tintHSL(primary, { lightness: 0.27, satFloor: 0.45 })
  if (contrastRatio(subtext1, mantle) < 4.5) {
    subtext1 = ensureContrast(subtext1, mantle, 4.5) ?? '#1e293b'
  }
  let subtext0 = override.subtext0 ?? tintHSL(primary, { lightness: 0.36, satFloor: 0.40 })
  if (contrastRatio(subtext0, mantle) < 4.5) {
    subtext0 = ensureContrast(subtext0, mantle, 4.5) ?? '#334155'
  }
  const overlay2 = override.overlay2 ?? tintHSL(primary, { lightness: 0.45, satFloor: 0.35 })
  const overlay1 = override.overlay1 ?? tintHSL(primary, { lightness: 0.55, satFloor: 0.30 })
  const overlay0 = override.overlay0 ?? tintHSL(primary, { lightness: 0.65, satFloor: 0.25 })

  return themeEntrySchema.parse({
    name: pokemon.name,
    tier: pokemon.tier,
    primary,
    accent,
    mantle,
    crust,
    base,
    text,
    subtext1,
    subtext0,
    overlay2,
    overlay1,
    overlay0,
  })
}

export async function buildManifest(
  list: BaseSetEntry[],
  overrides: Overrides,
  fetcher: Fetcher,
): Promise<ThemeManifest> {
  const manifest: ThemeManifest = {}
  for (const pokemon of list) {
    const override = overrides[pokemon.id]
    const buf = hasFullColorOverride(override)
      ? Buffer.alloc(0)
      : await fetcher(pokemon.id)
    const entry = await extractEntry(pokemon, buf, overrides)
    manifest[String(pokemon.id)] = entry
  }
  return themeManifestSchema.parse(manifest)
}

async function main() {
  const manifest = await buildManifest(BASE_SET, THEME_OVERRIDES, defaultFetcher)
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
