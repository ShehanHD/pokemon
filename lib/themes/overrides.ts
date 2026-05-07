import type { ThemeEntry } from '@/lib/schemas/theme'

// Manual palette overrides for Pokémon whose extracted colors look poor or fail
// WCAG. Keyed by national Pokédex id. Overrides win over extraction.
//
// Override primaries are TRUSTED — `build-themes.ts` does not auto-darken them.
// The layout only injects `--color-blue` (and `--color-mauve` accent), so primaries
// render against the fixed global mantle `#e8eef5`. Pick vivid Material 500–700
// saturated hues for punch. Pair with a brighter Material 300–500 accent.
//
// To add an override: pick a saturated hex for `primary` and a brighter `accent`.
// Run `npm run build:themes` to refresh the manifest.

export const THEME_OVERRIDES: Record<
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
> = {
  // ── Free tier ──────────────────────────────────────────────────────────
  56:  { primary: '#A65A2C', accent: '#F0B070' }, // Mankey
  70:  { primary: '#7CB342', accent: '#DCE775' }, // Weepinbell
  75:  { primary: '#795548', accent: '#BCAAA4' }, // Graveler
  82:  { primary: '#1976D2', accent: '#90CAF9' }, // Magneton
  83:  { primary: '#A0522D', accent: '#E8BC98' }, // Farfetch'd
  86:  { primary: '#0288D1', accent: '#81D4FA' }, // Seel
  100: { primary: '#E53935', accent: '#F8AAAA' }, // Voltorb
  102: { primary: '#D84315', accent: '#FFAB91' }, // Exeggcute
  51:  { primary: '#8D5524', accent: '#D8A888' }, // Dugtrio
  44:  { primary: '#5E35B1', accent: '#F0987A' }, // Gloom

  // ── Adfree tier ────────────────────────────────────────────────────────
  17:  { primary: '#A0522D', accent: '#E8BC98' }, // Pidgeotto
  42:  { primary: '#7B1FA2', accent: '#CE93D8' }, // Golbat
  78:  { primary: '#FF6D00', accent: '#FFD180' }, // Rapidash
  92:  { primary: '#5E35B1', accent: '#9078C8' }, // Gastly
  93:  { primary: '#7B1FA2', accent: '#D098E8' }, // Haunter
  104: { primary: '#8D5524', accent: '#E8D0A8' }, // Cubone
  106: { primary: '#C62828', accent: '#EF9A9A' }, // Hitmonlee
  107: { primary: '#D32F2F', accent: '#F4A8A8' }, // Hitmonchan
  113: { primary: '#E91E63', accent: '#F8C8DC' }, // Chansey
  115: { primary: '#A0522D', accent: '#D8B898' }, // Kangaskhan
  123: { primary: '#388E3C', accent: '#A0DCA8' }, // Scyther
  125: { primary: '#F57F17', accent: '#FFD600' }, // Electabuzz
  147: { primary: '#1976D2', accent: '#90CAF9' }, // Dratini
  40:  { primary: '#E91E63', accent: '#F8C8DC' }, // Wigglytuff
  80:  { primary: '#D81B60', accent: '#F8C0D0' }, // Slowbro

  // ── Pro tier (the icons) ───────────────────────────────────────────────
  1:   { primary: '#43A047', accent: '#A8D88C' }, // Bulbasaur
  4:   { primary: '#FF6D00', accent: '#FFB74D' }, // Charmander
  7:   { primary: '#1E88E5', accent: '#7BC8E5' }, // Squirtle
  25:  { primary: '#F57F17', accent: '#FFD600' }, // Pikachu
  26:  { primary: '#FF6D00', accent: '#FFB74D' }, // Raichu
  35:  { primary: '#EC407A', accent: '#F8C0D8' }, // Clefairy
  39:  { primary: '#E91E63', accent: '#F8C8DC' }, // Jigglypuff
  3:   { primary: '#2E7D32', accent: '#E91E63' }, // Venusaur
  6:   { primary: '#FF6D00', accent: '#FFA726' }, // Charizard
  9:   { primary: '#1565C0', accent: '#5FA8D9' }, // Blastoise
  65:  { primary: '#FF8F00', accent: '#FFC107' }, // Alakazam
  68:  { primary: '#283593', accent: '#F44336' }, // Machamp
  94:  { primary: '#6A1B9A', accent: '#E040FB' }, // Gengar
  129: { primary: '#E64A19', accent: '#FFB74D' }, // Magikarp
  130: { primary: '#1565C0', accent: '#F44336' }, // Gyarados
  131: { primary: '#1976D2', accent: '#80DEEA' }, // Lapras
  133: { primary: '#A1622D', accent: '#E8C088' }, // Eevee
  134: { primary: '#0288D1', accent: '#4FC3F7' }, // Vaporeon
  135: { primary: '#F57F17', accent: '#FFD600' }, // Jolteon
  136: { primary: '#E64A19', accent: '#FFB74D' }, // Flareon
  142: { primary: '#455A64', accent: '#B0A8C8' }, // Aerodactyl
  143: { primary: '#283593', accent: '#D8C0A0' }, // Snorlax
  144: { primary: '#0288D1', accent: '#4FC3F7' }, // Articuno
  145: { primary: '#F57F17', accent: '#FFD600' }, // Zapdos
  146: { primary: '#E64A19', accent: '#FFB74D' }, // Moltres
  149: { primary: '#EF6C00', accent: '#FFB74D' }, // Dragonite
  150: { primary: '#7B1FA2', accent: '#E040FB' }, // Mewtwo
  151: { primary: '#EC407A', accent: '#F8B0CC' }, // Mew
}
