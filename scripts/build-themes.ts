import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Vibrant } from 'node-vibrant/node'
import { BASE_SET, type BaseSetEntry } from './baseSet'
import { THEME_OVERRIDES } from '../lib/themes/overrides'
import { ensureContrast, contrastRatio } from '../lib/themes/contrast'
import {
  themeEntrySchema,
  themeManifestSchema,
  type ThemeEntry,
  type ThemeManifest,
} from '../lib/schemas/theme'

const DEFAULT_MANTLE = '#e8eef5'
const SPRITE_URL = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

type Overrides = Record<number, Partial<ThemeEntry> & { mantle?: string }>
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
  mantleDefault: string,
): Promise<ThemeEntry> {
  const override = overrides[pokemon.id] ?? {}

  let primary = override.primary
  let accent = override.accent
  const accentFromOverride = !!override.accent
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

  if (!accentFromOverride && contrastRatio(accent, mantle) < 3) {
    const fixedAccent = ensureContrast(accent, mantle, 3)
    if (fixedAccent) accent = fixedAccent
  }

  return themeEntrySchema.parse({
    name: pokemon.name,
    tier: pokemon.tier,
    primary,
    accent,
    mantle,
  })
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
    const buf = hasFullColorOverride(override)
      ? Buffer.alloc(0)
      : await fetcher(pokemon.id)
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
