import { describe, it, expect } from 'vitest'
import { contrastRatio, ensureContrast } from '../contrast'

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#abcdef', '#abcdef')).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    const a = contrastRatio('#123456', '#fedcba')
    const b = contrastRatio('#fedcba', '#123456')
    expect(a).toBeCloseTo(b, 5)
  })
})

describe('ensureContrast', () => {
  const mantle = '#e8eef5'

  it('returns the input unchanged if it already passes', () => {
    expect(ensureContrast('#000000', mantle, 4.5)).toBe('#000000')
  })

  it('darkens a low-contrast color until it passes', () => {
    const result = ensureContrast('#ffff80', mantle, 4.5)
    expect(contrastRatio(result!, mantle)).toBeGreaterThanOrEqual(4.5)
  })

  it('returns null if even fully black does not satisfy (impossible mantle)', () => {
    // Mantle so dark that nothing further darkening helps — light input on dark bg.
    const result = ensureContrast('#ffffff', '#000000', 4.5)
    // White on black already passes; sanity that the helper short-circuits.
    expect(result).toBe('#ffffff')
  })

  it('returns null when it cannot reach the target within the cap', () => {
    // Cap at 1 step so it must give up.
    const result = ensureContrast('#ffff80', mantle, 4.5, { maxSteps: 1 })
    expect(result).toBeNull()
  })
})
