import { describe, expect, it } from 'vitest'
import { applicableVariantsForSet, variantLabel } from '../variant'
import type { PokemonSet } from '@/lib/types'

function fakeSet(id: string, series: string): PokemonSet {
  return {
    pokemontcg_id: id,
    tcgdex_id: id,
    name: id,
    series,
    seriesSlug: series.toLowerCase(),
    releaseDate: '2024/01/01',
    totalCards: 1,
    printedTotal: 1,
    totalValue: null,
    logoUrl: '',
    symbolUrl: '',
  }
}

describe('applicableVariantsForSet', () => {
  it('returns Scarlet & Violet variants for SV sets', () => {
    const variants = applicableVariantsForSet(fakeSet('sv1', 'Scarlet & Violet'))
    expect(variants).toContain('normal')
    expect(variants).toContain('holofoil')
    expect(variants).toContain('reverse-holofoil')
    expect(variants).not.toContain('1st-edition')
  })

  it('includes pokeball + masterball pattern variants for SV151', () => {
    const variants = applicableVariantsForSet(fakeSet('sv3pt5', 'Scarlet & Violet'))
    expect(variants).toContain('pokeball-pattern')
    expect(variants).toContain('masterball-pattern')
  })

  it('returns Sword & Shield variants', () => {
    const variants = applicableVariantsForSet(fakeSet('swsh1', 'Sword & Shield'))
    expect(variants).toEqual(expect.arrayContaining(['normal', 'holofoil', 'reverse-holofoil']))
  })

  it('returns 1st Edition + Shadowless variants for Base series', () => {
    const variants = applicableVariantsForSet(fakeSet('base1', 'Base'))
    expect(variants).toContain('1st-edition')
    expect(variants).toContain('shadowless')
  })

  it('falls back to permissive superset for unknown sets', () => {
    const variants = applicableVariantsForSet(fakeSet('weird99', 'Other'))
    expect(variants).toEqual(expect.arrayContaining(['normal', 'holofoil', 'reverse-holofoil', 'promo']))
  })
})

describe('variantLabel', () => {
  it.each([
    ['normal', 'Normal'],
    ['holofoil', 'Holofoil'],
    ['reverse-holofoil', 'Reverse Holofoil'],
    ['pokeball-pattern', 'Poké Ball Pattern'],
    ['masterball-pattern', 'Master Ball Pattern'],
    ['cosmos-holo', 'Cosmos Holo'],
    ['crosshatch-holo', 'Crosshatch Holo'],
    ['galaxy-holo', 'Galaxy Holo'],
    ['1st-edition', '1st Edition'],
    ['shadowless', 'Shadowless'],
    ['promo', 'Promo'],
    ['holo', 'Holo (legacy)'],
    ['reverse-holo', 'Reverse Holo (legacy)'],
    ['full-art', 'Full Art (legacy)'],
    ['alt-art', 'Alt Art (legacy)'],
  ])('labels %s as %s', (variant, label) => {
    expect(variantLabel(variant as never)).toBe(label)
  })
})
