import { describe, it, expect, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { extractEntry, buildManifest } from '../build-themes'
import type { BaseSetEntry } from '../baseSet'

const PIKACHU: BaseSetEntry = { id: 25, slug: 'pikachu', name: 'Pikachu', tier: 'free' }

async function loadFixture() {
  return readFile(resolve(__dirname, '../__fixtures__/sprite-25.png'))
}

describe('extractEntry', () => {
  it('returns a valid theme entry with hex colors', async () => {
    const buf = await loadFixture()
    const entry = await extractEntry(PIKACHU, buf, {}, '#e8eef5')
    expect(entry.name).toBe('Pikachu')
    expect(entry.tier).toBe('free')
    expect(entry.primary).toMatch(/^#[0-9a-f]{6}$/i)
    expect(entry.accent).toMatch(/^#[0-9a-f]{6}$/i)
    expect(entry.mantle).toBe('#e8eef5')
  })

  it('uses overrides when present (overrides win over extraction)', async () => {
    const buf = await loadFixture()
    const entry = await extractEntry(
      PIKACHU,
      buf,
      { 25: { primary: '#123456', accent: '#abcdef' } },
      '#e8eef5',
    )
    expect(entry.primary).toBe('#123456')
    expect(entry.accent).toBe('#abcdef')
  })

  it('darkens primary that fails 4.5:1 against the mantle', async () => {
    const buf = await loadFixture()
    const entry = await extractEntry(
      PIKACHU,
      buf,
      { 25: { primary: '#ffff80' } },
      '#e8eef5',
    )
    const { contrastRatio } = await import('../../lib/themes/contrast')
    expect(contrastRatio(entry.primary, '#e8eef5')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('buildManifest', () => {
  it('returns a manifest keyed by stringified ids', async () => {
    const buf = await loadFixture()
    const fetcher = vi.fn(async () => buf)
    const manifest = await buildManifest([PIKACHU], {}, '#e8eef5', fetcher)
    expect(Object.keys(manifest)).toEqual(['25'])
    expect(manifest['25'].name).toBe('Pikachu')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(25)
  })

  it('does not call the fetcher when an override fully specifies the entry', async () => {
    const fetcher = vi.fn()
    const manifest = await buildManifest(
      [PIKACHU],
      { 25: { primary: '#111111', accent: '#222222', mantle: '#e8eef5' } },
      '#e8eef5',
      fetcher,
    )
    expect(fetcher).not.toHaveBeenCalled()
    expect(manifest['25'].primary).toBe('#111111')
  })
})
