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
        { _id: 'Base', setCount: 5, minRelease: '1999/01/09', maxRelease: '2000/04/01' },
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
})

describe('getSetsBySeries', () => {
  it('queries by seriesSlug and sorts by releaseDate desc', async () => {
    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ pokemontcg_id: 'base1', name: 'Base Set' }]),
      }),
    })
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ find: mockFind }) as never
    )
    const sets = await getSetsBySeries('base')
    expect(sets).toHaveLength(1)
    expect(mockFind).toHaveBeenCalledWith({ seriesSlug: 'base' })
  })
})

describe('getSetById', () => {
  it('returns a set by pokemontcg_id', async () => {
    const mockFindOne = vi.fn().mockResolvedValue({ pokemontcg_id: 'base1', name: 'Base Set' })
    vi.mocked(getDb).mockResolvedValue(
      makeCollection({ findOne: mockFindOne }) as never
    )
    const set = await getSetById('base1')
    expect(set?.pokemontcg_id).toBe('base1')
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
