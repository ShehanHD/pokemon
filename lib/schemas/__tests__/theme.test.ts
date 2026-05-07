import { describe, it, expect } from 'vitest'
import {
  themeEntrySchema,
  themeManifestSchema,
  setThemePokemonInputSchema,
} from '../theme'

describe('themeEntrySchema', () => {
  const valid = {
    name: 'Pikachu',
    tier: 'free' as const,
    primary: '#e8b22a',
    accent: '#fff3b0',
    mantle: '#e8eef5',
    crust: '#f1f5f9',
    base: '#ffffff',
    text: '#0f172a',
    subtext1: '#1e293b',
    subtext0: '#334155',
    overlay2: '#475569',
    overlay1: '#64748b',
    overlay0: '#94a3b8',
  }

  it('accepts a valid entry', () => {
    expect(themeEntrySchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a non-hex primary', () => {
    expect(themeEntrySchema.safeParse({ ...valid, primary: 'red' }).success).toBe(false)
  })

  it('rejects an unknown tier', () => {
    expect(themeEntrySchema.safeParse({ ...valid, tier: 'gold' }).success).toBe(false)
  })

  it('rejects a 3-digit hex shorthand', () => {
    expect(themeEntrySchema.safeParse({ ...valid, primary: '#abc' }).success).toBe(false)
  })
})

describe('themeManifestSchema', () => {
  it('accepts a record keyed by numeric strings', () => {
    const r = themeManifestSchema.safeParse({
      '25': { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5', crust: '#f1f5f9', base: '#ffffff', text: '#0f172a', subtext1: '#1e293b', subtext0: '#334155', overlay2: '#475569', overlay1: '#64748b', overlay0: '#94a3b8' },
    })
    expect(r.success).toBe(true)
  })

  it('rejects a non-numeric key', () => {
    const r = themeManifestSchema.safeParse({
      pikachu: { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5', crust: '#f1f5f9', base: '#ffffff', text: '#0f172a', subtext1: '#1e293b', subtext0: '#334155', overlay2: '#475569', overlay1: '#64748b', overlay0: '#94a3b8' },
    })
    expect(r.success).toBe(false)
  })
})

describe('setThemePokemonInputSchema', () => {
  it('accepts null', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: null }).success).toBe(true)
  })

  it('accepts a positive integer', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: 25 }).success).toBe(true)
  })

  it('rejects a negative integer', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: -1 }).success).toBe(false)
  })

  it('rejects a non-integer', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: 1.5 }).success).toBe(false)
  })

  it('rejects a string', () => {
    expect(setThemePokemonInputSchema.safeParse({ pokemonId: '25' }).success).toBe(false)
  })
})
