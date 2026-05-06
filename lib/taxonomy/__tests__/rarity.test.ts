import { describe, expect, it, vi } from 'vitest'
import { normaliseRarity } from '../rarity'

describe('normaliseRarity', () => {
  it.each([
    ['Common', 'Common'],
    ['Uncommon', 'Uncommon'],
    ['Rare', 'Rare'],
    ['Rare Holo', 'Rare Holo'],
    ['Rare Holo EX', 'Ultra Rare'],
    ['Rare Holo GX', 'Ultra Rare'],
    ['Rare Holo V', 'Ultra Rare'],
    ['Rare Holo VMAX', 'Ultra Rare'],
    ['Rare Holo VSTAR', 'Ultra Rare'],
    ['Rare Ultra', 'Ultra Rare'],
    ['Ultra Rare', 'Ultra Rare'],
    ['Double Rare', 'Double Rare'],
    ['Illustration Rare', 'Illustration Rare'],
    ['Special Illustration Rare', 'Special Illustration Rare'],
    ['Hyper Rare', 'Hyper Rare'],
    ['Rare Secret', 'Hyper Rare'],
    ['Rare Rainbow', 'Hyper Rare'],
    ['Trainer Gallery Rare Holo', 'Trainer Gallery'],
    ['Rare ACE', 'ACE SPEC Rare'],
    ['ACE SPEC Rare', 'ACE SPEC Rare'],
    ['Promo', 'Promo'],
    ['Rare Promo', 'Promo'],
  ])('maps "%s" → "%s"', (raw, expected) => {
    expect(normaliseRarity(raw)).toBe(expected)
  })

  it('returns "Unknown" and warns for unmapped values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normaliseRarity('Some Weird Rarity')).toBe('Unknown')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns "Unknown" for null', () => {
    expect(normaliseRarity(null)).toBe('Unknown')
  })
})
