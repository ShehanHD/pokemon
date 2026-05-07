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
