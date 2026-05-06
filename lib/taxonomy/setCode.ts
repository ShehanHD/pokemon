import type { PokemonSet } from '@/lib/types'

const OVERRIDES: Record<string, string> = {
  'sv1': 'SVI', 'sv2': 'PAL', 'sv3': 'OBF', 'sv3pt5': '151',
  'sv4': 'PAR', 'sv4pt5': 'PAF', 'sv5': 'TEF', 'sv6': 'TWM',
  'sv6pt5': 'SFA', 'sv7': 'SCR', 'sv8': 'SSP', 'sv8pt5': 'PRE',
  'sv9': 'JTG', 'svp': 'PR-SV',
  'base1': 'BS', 'base2': 'JU', 'base3': 'FO', 'base4': 'BS2',
  'base5': 'TR', 'base6': 'LC', 'basep': 'WP',
  'gym1': 'G1', 'gym2': 'G2',
  'neo1': 'N1', 'neo2': 'N2', 'neo3': 'N3', 'neo4': 'N4',
}

const SHAPE_RE = /^([a-z]+)(\d+)(pt\d+)?$/

export function setCodeFor(set: PokemonSet): string {
  const id = set.pokemontcg_id.toLowerCase()
  if (OVERRIDES[id]) return OVERRIDES[id]
  const m = SHAPE_RE.exec(id)
  if (!m) {
    console.warn(`[taxonomy/setCode] unknown id shape "${set.pokemontcg_id}" — using uppercased id`)
    return set.pokemontcg_id.toUpperCase()
  }
  const [, prefix, num, pt] = m
  const padded = prefix === 'swsh' ? num.padStart(2, '0') : num
  return `${prefix.toUpperCase()}${padded}${pt ? pt.toUpperCase() : ''}`
}
