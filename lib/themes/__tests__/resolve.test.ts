import { describe, it, expect } from 'vitest'
import { resolveTheme, tierAllows } from '../resolve'
import type { ThemeManifest } from '@/lib/schemas/theme'

const manifest: ThemeManifest = {
  '25': { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5', crust: '#f1f5f9', base: '#ffffff', text: '#0f172a', subtext1: '#1e293b', subtext0: '#334155', overlay2: '#475569', overlay1: '#64748b', overlay0: '#94a3b8' },
  '6':  { name: 'Charizard', tier: 'adfree', primary: '#d35400', accent: '#ffd1a8', mantle: '#e8eef5', crust: '#f1f5f9', base: '#ffffff', text: '#0f172a', subtext1: '#1e293b', subtext0: '#334155', overlay2: '#475569', overlay1: '#64748b', overlay0: '#94a3b8' },
  '150':{ name: 'Mewtwo', tier: 'free', primary: '#9b59b6', accent: '#d2b4de', mantle: '#e8eef5', crust: '#f1f5f9', base: '#ffffff', text: '#0f172a', subtext1: '#1e293b', subtext0: '#334155', overlay2: '#475569', overlay1: '#64748b', overlay0: '#94a3b8' },
}

describe('tierAllows', () => {
  it('grants free → free', () => { expect(tierAllows('free', 'free')).toBe(true) })
  it('denies free → adfree', () => { expect(tierAllows('free', 'adfree')).toBe(false) })
  it('grants adfree → free', () => { expect(tierAllows('adfree', 'free')).toBe(true) })
  it('grants pro → adfree', () => { expect(tierAllows('pro', 'adfree')).toBe(true) })
  it('grants pro → pro', () => { expect(tierAllows('pro', 'pro')).toBe(true) })
})

describe('resolveTheme', () => {
  it('returns the cookie entry when within tier', () => {
    const r = resolveTheme(manifest, { cookie: '25', userTier: 'free', userPokemonId: null })
    expect(r?.name).toBe('Pikachu')
  })

  it('falls back to DB when cookie is above tier (downgrade)', () => {
    const r = resolveTheme(manifest, { cookie: '6', userTier: 'free', userPokemonId: 25 })
    expect(r?.name).toBe('Pikachu')
  })

  it('returns null when cookie is above tier and DB is also above tier', () => {
    const r = resolveTheme(manifest, { cookie: '6', userTier: 'free', userPokemonId: 6 })
    expect(r).toBeNull()
  })

  it('returns DB entry when no cookie', () => {
    const r = resolveTheme(manifest, { cookie: null, userTier: 'free', userPokemonId: 150 })
    expect(r?.name).toBe('Mewtwo')
  })

  it('returns null when neither cookie nor DB is set', () => {
    const r = resolveTheme(manifest, { cookie: null, userTier: 'free', userPokemonId: null })
    expect(r).toBeNull()
  })

  it('returns null when cookie is a non-numeric string', () => {
    const r = resolveTheme(manifest, { cookie: 'abc', userTier: 'pro', userPokemonId: null })
    expect(r).toBeNull()
  })

  it('returns null when cookie points to an unknown Pokémon', () => {
    const r = resolveTheme(manifest, { cookie: '9999', userTier: 'pro', userPokemonId: null })
    expect(r).toBeNull()
  })

  it('treats anonymous (undefined tier) as free', () => {
    const r = resolveTheme(manifest, { cookie: '6', userTier: undefined, userPokemonId: null })
    expect(r).toBeNull()
    const r2 = resolveTheme(manifest, { cookie: '25', userTier: undefined, userPokemonId: null })
    expect(r2?.name).toBe('Pikachu')
  })
})
