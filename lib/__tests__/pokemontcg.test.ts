import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAllSets, fetchCardsBySet, fetchCard } from '../pokemontcg'

function makeFetch(json: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(json),
  })
}

const validSet = {
  id: 'base1',
  name: 'Base Set',
  series: 'Base',
  releaseDate: '1999/01/09',
  total: 102,
  images: {
    symbol: 'https://images.pokemontcg.io/base1/symbol.png',
    logo: 'https://images.pokemontcg.io/base1/logo.png',
  },
}

const validCard = {
  id: 'base1-4',
  name: 'Charizard',
  number: '4',
  supertype: 'Pokémon',
  images: {
    small: 'https://images.pokemontcg.io/base1/4.png',
    large: 'https://images.pokemontcg.io/base1/4_hires.png',
  },
  set: { id: 'base1', name: 'Base Set', series: 'Base' },
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAllSets', () => {
  it('returns parsed sets', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [validSet] }))
    const sets = await fetchAllSets()
    expect(sets).toHaveLength(1)
    expect(sets[0].id).toBe('base1')
  })

  it('calls the correct endpoint', async () => {
    const mockFetch = makeFetch({ data: [] })
    vi.stubGlobal('fetch', mockFetch)
    await fetchAllSets()
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pokemontcg.io/v2/sets',
      expect.any(Object)
    )
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', makeFetch({}, false, 500))
    await expect(fetchAllSets()).rejects.toThrow('pokemontcg.io /v2/sets failed: 500')
  })
})

describe('fetchCardsBySet', () => {
  it('paginates across multiple pages', async () => {
    const page1 = { data: [validCard], totalCount: 2, count: 1, pageSize: 1, page: 1 }
    const page2 = { data: [{ ...validCard, id: 'base1-5' }], totalCount: 2, count: 1, pageSize: 1, page: 2 }
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) })
    vi.stubGlobal('fetch', mockFetch)
    const cards = await fetchCardsBySet('base1', 1)
    expect(cards).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('returns cards from a single page', async () => {
    vi.stubGlobal('fetch', makeFetch({
      data: [validCard],
      totalCount: 1,
      count: 1,
      pageSize: 250,
      page: 1,
    }))
    const cards = await fetchCardsBySet('base1')
    expect(cards).toHaveLength(1)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', makeFetch({}, false, 404))
    await expect(fetchCardsBySet('bad-id')).rejects.toThrow('pokemontcg.io /v2/cards failed: 404')
  })
})

describe('fetchCard', () => {
  it('returns a parsed card', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: validCard }))
    const card = await fetchCard('base1-4')
    expect(card.id).toBe('base1-4')
  })

  it('throws on 404', async () => {
    vi.stubGlobal('fetch', makeFetch({}, false, 404))
    await expect(fetchCard('bad-id')).rejects.toThrow('pokemontcg.io /v2/cards/bad-id failed: 404')
  })
})
