import type { CardVariant, PokemonCard, PokemonSet } from '@/lib/types'
import { normaliseRarity, type NormalisedRarity } from './rarity'

const PERMISSIVE: CardVariant[] = ['normal', 'holofoil', 'reverse-holofoil', 'promo']

const MODERN_4: CardVariant[] = ['normal', 'holofoil', 'reverse-holofoil', 'promo']
const WITH_COSMOS: CardVariant[] = ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'promo']
const WITH_COSMOS_AND_CROSSHATCH: CardVariant[] = ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'crosshatch-holo', 'promo']
const E_CARD_VARIANTS: CardVariant[] = ['normal', 'holofoil', 'reverse-holofoil', 'crosshatch-holo', 'promo']
const NEO_VARIANTS: CardVariant[] = ['normal', 'holofoil', '1st-edition', 'crosshatch-holo', 'promo']
const ORIGINAL_VARIANTS: CardVariant[] = ['normal', 'holofoil', '1st-edition', 'shadowless', 'promo']

const SERIES_VARIANTS: Record<string, CardVariant[]> = {
  'Scarlet & Violet':       MODERN_4,
  'Sword & Shield':         MODERN_4,
  'Sun & Moon':             MODERN_4,
  'XY':                     WITH_COSMOS,
  'Black & White':          WITH_COSMOS,
  'HeartGold & SoulSilver': WITH_COSMOS_AND_CROSSHATCH,
  'Diamond & Pearl':        WITH_COSMOS_AND_CROSSHATCH,
  'Platinum':               WITH_COSMOS_AND_CROSSHATCH,
  'EX':                     WITH_COSMOS_AND_CROSSHATCH,
  'E-Card':                 E_CARD_VARIANTS,
  'e-Card':                 E_CARD_VARIANTS,
  'Neo':                    NEO_VARIANTS,
  'Base':                   ORIGINAL_VARIANTS,
  'Gym':                    ORIGINAL_VARIANTS,
  'Original':               ORIGINAL_VARIANTS,
  'Other':                  PERMISSIVE,
}

const SET_OVERRIDES: Record<string, CardVariant[]> = {
  'sv3pt5': ['normal', 'holofoil', 'reverse-holofoil', 'pokeball-pattern', 'masterball-pattern', 'promo'],
  'cel25':  ['normal', 'holofoil', 'reverse-holofoil', 'galaxy-holo', 'promo'],
}

export function applicableVariantsForSet(set: PokemonSet): CardVariant[] {
  const id = (set.pokemontcg_id ?? set.tcgdex_id).toLowerCase()
  const override = SET_OVERRIDES[id]
  if (override) return override
  return SERIES_VARIANTS[set.series] ?? PERMISSIVE
}

const REGULAR_SET_ID_RE = /^[a-z]+\d+(pt\d+)?$/

export function isRegularSet(set: PokemonSet): boolean {
  const id = (set.pokemontcg_id ?? set.tcgdex_id).toLowerCase()
  if (SET_OVERRIDES[id]) return true
  if (/promo/i.test(set.name)) return false
  return REGULAR_SET_ID_RE.test(id)
}

export interface VariantChip {
  variant: CardVariant
  short: string
  label: string
}

const RARITY_CHIPS: Partial<Record<NormalisedRarity, VariantChip>> = {
  'Double Rare':               { variant: 'holofoil', short: 'DR',  label: 'Double Rare' },
  'Ultra Rare':                { variant: 'holofoil', short: 'UR',  label: 'Ultra Rare' },
  'Illustration Rare':         { variant: 'holofoil', short: 'IR',  label: 'Illustration Rare' },
  'Special Illustration Rare': { variant: 'holofoil', short: 'SIR', label: 'Special Illustration Rare' },
  'Hyper Rare':                { variant: 'holofoil', short: 'HR',  label: 'Hyper Rare' },
  'Mega Hyper Rare':           { variant: 'holofoil', short: 'MHR', label: 'Mega Hyper Rare' },
  'Trainer Gallery':           { variant: 'holofoil', short: 'TG',  label: 'Trainer Gallery' },
  'ACE SPEC Rare':             { variant: 'holofoil', short: 'AS',  label: 'ACE SPEC Rare' },
}

export function chipsForCard(card: PokemonCard, set: PokemonSet): VariantChip[] {
  const rarity = normaliseRarity(card.rarity)
  const rarityChip = RARITY_CHIPS[rarity]
  if (rarityChip) return [rarityChip]
  let variants = applicableVariantsForSet(set)
  if (!isRegularSet(set)) return [{ variant: 'promo', short: variantShortLabel('promo'), label: variantLabel('promo') }]
  if (rarity !== 'Rare') variants = variants.filter((v) => v !== 'holofoil')
  variants = variants.filter((v) => v !== 'promo')
  return variants.map((v) => ({ variant: v, short: variantShortLabel(v), label: variantLabel(v) }))
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
  'holo':              'Holo (legacy)',
  'reverse-holo':      'Reverse Holo (legacy)',
  'full-art':          'Full Art (legacy)',
  'alt-art':           'Alt Art (legacy)',
}

export function variantLabel(variant: CardVariant): string {
  return LABELS[variant] ?? variant
}

const SHORT_LABELS: Record<CardVariant, string> = {
  'normal':            'N',
  'holofoil':          'H',
  'reverse-holofoil':  'RH',
  'pokeball-pattern':  'PB',
  'masterball-pattern':'MB',
  'cosmos-holo':       'CH',
  'crosshatch-holo':   'XH',
  'galaxy-holo':       'GH',
  '1st-edition':       '1E',
  'shadowless':        'SL',
  'promo':             'P',
  'holo':              'H',
  'reverse-holo':      'RH',
  'full-art':          'FA',
  'alt-art':           'AA',
}

export function variantShortLabel(variant: CardVariant): string {
  return SHORT_LABELS[variant] ?? variant
}

/**
 * Derives how many cards in a set are eligible for each variant,
 * using the rarity distribution (already fetched) and the same
 * chip-selection logic as chipsForCard.
 */
export function computeVariantTotalsFromRarities(
  rarityTotals: Map<string, number>,
  set: PokemonSet,
): Map<CardVariant, number> {
  const result = new Map<CardVariant, number>()

  if (!isRegularSet(set)) {
    const total = [...rarityTotals.values()].reduce((a, b) => a + b, 0)
    if (total > 0) result.set('promo', total)
    return result
  }

  const applicableVariants = applicableVariantsForSet(set)
  const regularVariants = applicableVariants.filter((v) => v !== 'promo')
  const nonHoloVariants = regularVariants.filter((v) => v !== 'holofoil')

  for (const [rarity, count] of rarityTotals) {
    const chip = RARITY_CHIPS[rarity as import('./rarity').NormalisedRarity]
    if (chip) {
      result.set(chip.variant, (result.get(chip.variant) ?? 0) + count)
    } else if (rarity === 'Promo') {
      result.set('promo', (result.get('promo') ?? 0) + count)
    } else {
      const variants = rarity === 'Rare' ? regularVariants : nonHoloVariants
      for (const v of variants) {
        result.set(v, (result.get(v) ?? 0) + count)
      }
    }
  }

  return result
}
