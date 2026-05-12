import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toSeriesSlug, getSeries, getSetsBySeries, getSetById } from '../sets'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

import { getDb } from '@/lib/db'

function makeCollection(methods: Record<string, unknown>) {
  return { collection: vi.fn().mockReturnValue(methods) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toSeriesSlug', () => {
  it('converts series name to slug', () => {
    expect(toSeriesSlug('Sword & Shield')).toBe('sword-shield')
  })

  it('handles already-lowercase names', () => {
    expect(toSeriesSlug('base')).toBe('base')
  })
})

describe('getSeries', () => {
  it('returns series with slug, setCount, releaseRange', async () => {
    const mockAggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: 'base', name: 'Base', names: ['Base'], setCount: 5, minRelease: '1999-01-09', maxRelease: '2000-04-01' },
      ]),
    })
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ aggregate: mockAggregate }) as never
    )
    const result = await getSeries()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Base')
    expect(result[0].slug).toBe('base')
    expect(result[0].setCount).toBe(5)
    expect(result[0].releaseRange).toBe('1999 – 2000')
  })

  it('puts non-main series (pop, miscellaneous, etc.) at the bottom', async () => {
    const mockAggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: 'pop', name: 'POP', names: ['POP'], setCount: 10, minRelease: '2005-01-01', maxRelease: '2009-01-01' },
        { _id: 'base', name: 'Base', names: ['Base'], setCount: 5, minRelease: '1999-01-09', maxRelease: '2000-04-01' },
      ]),
    })
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ aggregate: mockAggregate }) as never
    )
    const result = await getSeries()
    expect(result.map((r) => r.slug)).toEqual(['base', 'pop'])
  })
})

describe('getSetsBySeries', () => {
  it('queries by seriesSlug and sorts by releaseDate desc', async () => {
    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ tcgdex_id: 'base1', name: 'Base Set' }]),
      }),
    })
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ find: mockFind }) as never
    )
    const sets = await getSetsBySeries('base')
    expect(sets).toHaveLength(1)
    expect(mockFind).toHaveBeenCalledWith({ seriesSlug: 'base', tcgdex_id: { $exists: true, $ne: null } })
  })

  it('pushes Black Star Promos to the bottom within a main series', async () => {
    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { tcgdex_id: 'swshp', name: 'SWSH Black Star Promos' },
          { tcgdex_id: 'swsh1', name: 'Sword & Shield' },
        ]),
      }),
    })
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ find: mockFind }) as never
    )
    const sets = await getSetsBySeries('sword-shield')
    expect(sets.map((s) => s.tcgdex_id)).toEqual(['swsh1', 'swshp'])
  })
})

describe('getSetById', () => {
  it('returns a set by tcgdex_id', async () => {
    const mockFindOne = vi.fn().mockResolvedValue({ tcgdex_id: 'base1', name: 'Base Set' })
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ findOne: mockFindOne }) as never
    )
    const set = await getSetById('base1')
    expect(set?.tcgdex_id).toBe('base1')
    expect(mockFindOne).toHaveBeenCalledWith({ tcgdex_id: 'base1' })
  })

  it('returns null when set not found', async () => {
    const mockFindOne = vi.fn().mockResolvedValue(null)
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ findOne: mockFindOne }) as never
    )
    const set = await getSetById('nonexistent')
    expect(set).toBeNull()
  })
})
