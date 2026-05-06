import { describe, expect, it, vi } from 'vitest'
import { ERA_ORDER, seriesToEra, type Era } from '../era'

describe('seriesToEra', () => {
  it('maps Scarlet & Violet series to its era', () => {
    expect(seriesToEra('Scarlet & Violet')).toBe('Scarlet & Violet')
  })

  it('maps Sword & Shield series to its era', () => {
    expect(seriesToEra('Sword & Shield')).toBe('Sword & Shield')
  })

  it('maps Sun & Moon series to its era', () => {
    expect(seriesToEra('Sun & Moon')).toBe('Sun & Moon')
  })

  it('maps XY series to XY era', () => {
    expect(seriesToEra('XY')).toBe('XY')
  })

  it('maps Black & White series to its era', () => {
    expect(seriesToEra('Black & White')).toBe('Black & White')
  })

  it('maps HeartGold & SoulSilver series to its era', () => {
    expect(seriesToEra('HeartGold & SoulSilver')).toBe('HeartGold & SoulSilver')
  })

  it('maps Diamond & Pearl series to its era', () => {
    expect(seriesToEra('Diamond & Pearl')).toBe('Diamond & Pearl')
  })

  it('maps EX series to EX era', () => {
    expect(seriesToEra('EX')).toBe('EX')
  })

  it('maps e-Card series to its era', () => {
    expect(seriesToEra('E-Card')).toBe('e-Card')
  })

  it('maps Neo series to Neo era', () => {
    expect(seriesToEra('Neo')).toBe('Neo')
  })

  it('maps Original/Base series to Original era', () => {
    expect(seriesToEra('Base')).toBe('Original')
    expect(seriesToEra('Gym')).toBe('Original')
  })

  it('falls back to "Other" and warns for unknown series', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(seriesToEra('Some Unknown Series')).toBe('Other')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('ERA_ORDER', () => {
  it('lists eras in reverse-chronological order', () => {
    expect(ERA_ORDER).toEqual([
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
  })

  it('every value is a valid Era', () => {
    const eras: readonly Era[] = ERA_ORDER
    expect(eras.length).toBeGreaterThan(0)
  })
})
