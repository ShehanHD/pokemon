import type { CardVariant, PokemonSet } from '@/lib/types'
import { seriesToEra, type Era } from './era'

const PERMISSIVE: CardVariant[] = ['normal', 'holofoil', 'reverse-holofoil', 'promo']

const ERA_VARIANTS: Record<Era, CardVariant[]> = {
  'Scarlet & Violet':       ['normal', 'holofoil', 'reverse-holofoil', 'promo'],
  'Sword & Shield':         ['normal', 'holofoil', 'reverse-holofoil', 'promo'],
  'Sun & Moon':             ['normal', 'holofoil', 'reverse-holofoil', 'promo'],
  'XY':                     ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'promo'],
  'Black & White':          ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'promo'],
  'HeartGold & SoulSilver': ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'crosshatch-holo', 'promo'],
  'Diamond & Pearl':        ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'crosshatch-holo', 'promo'],
  'EX':                     ['normal', 'holofoil', 'reverse-holofoil', 'cosmos-holo', 'crosshatch-holo', 'promo'],
  'e-Card':                 ['normal', 'holofoil', 'reverse-holofoil', 'crosshatch-holo', 'promo'],
  'Neo':                    ['normal', 'holofoil', '1st-edition', 'crosshatch-holo', 'promo'],
  'Original':               ['normal', 'holofoil', '1st-edition', 'shadowless', 'promo'],
  'Other':                  PERMISSIVE,
}

const SET_OVERRIDES: Record<string, CardVariant[]> = {
  'sv3pt5': ['normal', 'holofoil', 'reverse-holofoil', 'pokeball-pattern', 'masterball-pattern', 'promo'],
  'cel25':  ['normal', 'holofoil', 'reverse-holofoil', 'galaxy-holo', 'promo'],
}

export function applicableVariantsForSet(set: PokemonSet): CardVariant[] {
  const override = SET_OVERRIDES[set.pokemontcg_id.toLowerCase()]
  if (override) return override
  return ERA_VARIANTS[seriesToEra(set.series)] ?? PERMISSIVE
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
