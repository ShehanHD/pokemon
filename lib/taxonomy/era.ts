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
