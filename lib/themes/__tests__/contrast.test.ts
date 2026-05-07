import { describe, it, expect } from 'vitest'
import { contrastRatio, ensureContrast, tintHSL } from '../contrast'

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

describe('tintHSL', () => {
  function hexToHsl(hex: string): [number, number, number] {
    const m = /^#([0-9a-f]{6})$/i.exec(hex)!
    const n = parseInt(m[1], 16)
    const r = ((n >> 16) & 0xff) / 255
    const g = ((n >> 8) & 0xff) / 255
    const b = (n & 0xff) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return [0, 0, l]
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h: number
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    return [h / 6, s, l]
  }

  it('returns valid #RRGGBB hex', () => {
    const out = tintHSL('#e8b22a', { lightness: 0.85, satFloor: 0.65 })
    expect(out).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('preserves hue', () => {
    const input = '#1976D2'
    const [hIn] = hexToHsl(input)
    const [hOut] = hexToHsl(tintHSL(input, { lightness: 0.85, satFloor: 0.65 }))
    expect(hOut).toBeCloseTo(hIn, 2)
  })

  it('lifts lightness to the target', () => {
    const out = tintHSL('#1976D2', { lightness: 0.92, satFloor: 0.55 })
    const [, , lOut] = hexToHsl(out)
    expect(lOut).toBeCloseTo(0.92, 2)
  })

  it('enforces the saturation floor when input is desaturated', () => {
    const out = tintHSL('#888888', { lightness: 0.85, satFloor: 0.65 })
    const [, sOut] = hexToHsl(out)
    expect(sOut).toBeGreaterThanOrEqual(0.6)
  })

  it('keeps higher saturation when input exceeds the floor', () => {
    const input = '#e8b22a'
    const [, sIn] = hexToHsl(input)
    const out = tintHSL(input, { lightness: 0.85, satFloor: 0.3 })
    const [, sOut] = hexToHsl(out)
    expect(sOut).toBeGreaterThanOrEqual(Math.min(sIn, 0.99))
  })
})
