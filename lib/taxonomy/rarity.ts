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
  'Holo Rare': 'Rare Holo',
  'Rare Holo EX': 'Ultra Rare',
  'Rare Holo GX': 'Ultra Rare',
  'Rare Holo V': 'Ultra Rare',
  'Holo Rare V': 'Ultra Rare',
  'Rare Holo VMAX': 'Ultra Rare',
  'Holo Rare VMAX': 'Ultra Rare',
  'Rare Holo VSTAR': 'Ultra Rare',
  'Holo Rare VSTAR': 'Ultra Rare',
  'Rare Holo LV.X': 'Ultra Rare',
  'Rare Ultra': 'Ultra Rare',
  'Ultra Rare': 'Ultra Rare',
  'Rare BREAK': 'Ultra Rare',
  'Rare Prism Star': 'Ultra Rare',
  'Rare Prime': 'Ultra Rare',
  'Rare PRIME': 'Ultra Rare',
  'Rare Shining': 'Ultra Rare',
  'Amazing Rare': 'Ultra Rare',
  'Radiant Rare': 'Ultra Rare',
  'LEGEND': 'Ultra Rare',
  'Double Rare': 'Double Rare',
  'Double rare': 'Double Rare',
  'Illustration Rare': 'Illustration Rare',
  'Illustration rare': 'Illustration Rare',
  'Special Illustration Rare': 'Special Illustration Rare',
  'Special illustration rare': 'Special Illustration Rare',
  'Hyper Rare': 'Hyper Rare',
  'Hyper rare': 'Hyper Rare',
  'Mega Hyper Rare': 'Mega Hyper Rare',
  'Rare Secret': 'Hyper Rare',
  'Secret Rare': 'Hyper Rare',
  'Rare Rainbow': 'Hyper Rare',
  'Rare Shiny': 'Hyper Rare',
  'Shiny Rare': 'Hyper Rare',
  'Shiny rare': 'Hyper Rare',
  'Shiny rare V': 'Hyper Rare',
  'Shiny rare VMAX': 'Hyper Rare',
  'Rare Shiny GX': 'Hyper Rare',
  'Shiny Ultra Rare': 'Hyper Rare',
  'Trainer Gallery Rare Holo': 'Trainer Gallery',
  'Rare Holo Star': 'Trainer Gallery',
  'Full Art Trainer': 'Trainer Gallery',
  'Rare ACE': 'ACE SPEC Rare',
  'ACE SPEC Rare': 'ACE SPEC Rare',
  'Promo': 'Promo',
  'Rare Promo': 'Promo',
  'Classic Collection': 'Promo',
  'Black White Rare': 'Hyper Rare',
  'One Diamond': 'Common',
  'Two Diamond': 'Uncommon',
  'Three Diamond': 'Rare',
  'Four Diamond': 'Double Rare',
  'One Star': 'Ultra Rare',
  'Two Star': 'Ultra Rare',
  'Three Star': 'Ultra Rare',
  'One Shiny': 'Hyper Rare',
  'Two Shiny': 'Hyper Rare',
  'Crown': 'Mega Hyper Rare',
  'None': 'Unknown',
}

export function normaliseRarity(raw: string | null): NormalisedRarity {
  if (raw === null) return 'Unknown'
  const mapped = RARITY_MAP[raw]
  if (mapped) return normalisedRaritySchema.parse(mapped)
  console.warn(`[taxonomy/rarity] unknown rarity "${raw}" — falling back to "Unknown"`)
  return 'Unknown'
}

const RAW_RARITIES_BY_NORMALISED: Record<NormalisedRarity, string[]> = (() => {
  const out = {} as Record<NormalisedRarity, string[]>
  for (const value of normalisedRaritySchema.options) out[value] = []
  for (const [raw, normalised] of Object.entries(RARITY_MAP)) {
    out[normalised].push(raw)
  }
  return out
})()

export function getRawRaritiesFor(target: NormalisedRarity): string[] {
  return RAW_RARITIES_BY_NORMALISED[target]
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
  'Unknown': '',
}

export function raritySymbol(raw: string | null): string {
  return RARITY_SYMBOLS[normaliseRarity(raw)]
}

const RARITY_SHORT_LABELS: Record<NormalisedRarity, string> = {
  'Common': 'C',
  'Uncommon': 'U',
  'Rare': 'R',
  'Rare Holo': 'RH',
  'Double Rare': 'DR',
  'Ultra Rare': 'UR',
  'Illustration Rare': 'IR',
  'Special Illustration Rare': 'SIR',
  'Hyper Rare': 'HR',
  'Mega Hyper Rare': 'MHR',
  'Trainer Gallery': 'TG',
  'ACE SPEC Rare': 'ACE',
  'Promo': 'PR',
  'Unknown': '?',
}

export function rarityShortLabel(target: NormalisedRarity): string {
  return RARITY_SHORT_LABELS[target]
}
