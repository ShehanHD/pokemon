import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCardsBySet, getCardById } from '../cards'

const mockToArray = vi.fn()
const mockFindOne = vi.fn()
const mockFind = vi.fn(() => ({ toArray: mockToArray }))
const mockCollection = vi.fn(() => ({ find: mockFind, findOne: mockFindOne }))

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => Promise.resolve({ collection: mockCollection })),
}))

const sampleCard = {
  pokemontcg_id: 'base1-1',
  name: 'Chansey',
  number: '1',
  set_id: 'base1',
  setName: 'Base Set',
  series: 'Base',
  seriesSlug: 'base',
  rarity: 'Rare Holo',
  types: ['Colorless'],
  subtypes: ['Stage 1'],
  supertype: 'Pokémon',
  imageUrl: 'https://example.com/small.png',
  imageUrlHiRes: 'https://example.com/large.png',
  cardmarketPrice: 12.5,
}

describe('getCardsBySet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns sorted cards for a set', async () => {
    mockToArray.mockResolvedValue([sampleCard])
    const result = await getCardsBySet('base1')
    expect(mockCollection).toHaveBeenCalledWith('cards')
    expect(mockFind).toHaveBeenCalledWith({ set_id: 'base1' })
    expect(result).toEqual([sampleCard])
  })

  it('returns empty array when set has no cards', async () => {
    mockToArray.mockResolvedValue([])
    const result = await getCardsBySet('nonexistent')
    expect(result).toEqual([])
  })
})

describe('getCardById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the card when found', async () => {
    mockFindOne.mockResolvedValue(sampleCard)
    const result = await getCardById('base1-1')
    expect(mockCollection).toHaveBeenCalledWith('cards')
    expect(mockFindOne).toHaveBeenCalledWith({ pokemontcg_id: 'base1-1' })
    expect(result).toEqual(sampleCard)
  })

  it('returns null when card not found', async () => {
    mockFindOne.mockResolvedValue(null)
    const result = await getCardById('nonexistent')
    expect(result).toBeNull()
  })

  it('returns card with null optional fields', async () => {
    const nullableCard = { ...sampleCard, rarity: null, cardmarketPrice: null }
    mockFindOne.mockResolvedValue(nullableCard)
    const result = await getCardById('base1-1')
    expect(result).toEqual(nullableCard)
    expect(result?.rarity).toBeNull()
    expect(result?.cardmarketPrice).toBeNull()
  })
})
