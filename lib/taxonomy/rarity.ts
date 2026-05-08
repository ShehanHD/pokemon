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
  'Mega Hyper Rare',
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
  'Mega Hyper Rare': 'Mega Hyper Rare',
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

const RARITY_SYMBOLS: Record<NormalisedRarity, string> = {
  'Common': '●',
  'Uncommon': '◆',
  'Rare': '★',
  'Rare Holo': '★',
  'Double Rare': '★★',
  'Ultra Rare': '★★',
  'Illustration Rare': '★',
  'Special Illustration Rare': '★★',
  'Hyper Rare': '★★★',
  'Mega Hyper Rare': '★★★',
  'Trainer Gallery': 'TG',
  'ACE SPEC Rare': 'ACE',
  'Promo': 'PR',
  'Unknown': '?',
}

export function raritySymbol(raw: string | null): string {
  return RARITY_SYMBOLS[normaliseRarity(raw)]
}
