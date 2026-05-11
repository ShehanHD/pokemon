import { describe, expect, it, vi } from 'vitest'
import { setCodeFor } from '../setCode'
import type { PokemonSet } from '@/lib/types'

function fakeSet(id: string, name = 'Set'): PokemonSet {
  return {
    pokemontcg_id: id,
    tcgdex_id: id,
    name,
    series: 'X',
    seriesSlug: 'x',
    releaseDate: '2024/01/01',
    totalCards: 1,
    printedTotal: 1,
    totalValue: null,
    logoUrl: '',
    symbolUrl: '',
  }
}

describe('setCodeFor', () => {
  it('derives SVI from sv1', () => {
    expect(setCodeFor(fakeSet('sv1'))).toBe('SVI')
  })

  it('derives SV01 from sv01', () => {
    expect(setCodeFor(fakeSet('sv01'))).toBe('SV01')
  })

  it('zero-pads SWSH ids to two digits', () => {
    expect(setCodeFor(fakeSet('swsh1'))).toBe('SWSH01')
    expect(setCodeFor(fakeSet('swsh9'))).toBe('SWSH09')
    expect(setCodeFor(fakeSet('swsh12'))).toBe('SWSH12')
  })

  it('honours overrides for non-standard ids', () => {
    expect(setCodeFor(fakeSet('base1'))).toBe('BS')
    expect(setCodeFor(fakeSet('basep'))).toBe('WP')
  })

  it('uppercases and warns for unknown shapes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(setCodeFor(fakeSet('weird-id-99'))).toBe('WEIRD-ID-99')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
