import { describe, it, expect } from 'vitest'
import {
  PtcgSetSchema,
  PtcgCardSchema,
  PtcgSetsResponseSchema,
  PtcgCardsResponseSchema,
  PtcgCardResponseSchema,
} from '../pokemontcg'

const validSet = {
  id: 'base1',
  name: 'Base Set',
  series: 'Base',
  releaseDate: '1999/01/09',
  total: 102,
  printedTotal: 102,
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

describe('PtcgSetSchema', () => {
  it('parses a valid set', () => {
    const result = PtcgSetSchema.parse(validSet)
    expect(result.id).toBe('base1')
    expect(result.name).toBe('Base Set')
  })

  it('rejects a set with missing fields', () => {
    expect(() => PtcgSetSchema.parse({ id: 'base1' })).toThrow()
  })

  it('rejects a set with invalid URL', () => {
    const bad = { ...validSet, images: { symbol: 'not-a-url', logo: 'not-a-url' } }
    expect(() => PtcgSetSchema.parse(bad)).toThrow()
  })
})

describe('PtcgCardSchema', () => {
  it('parses a minimal card (no optional fields)', () => {
    const result = PtcgCardSchema.parse(validCard)
    expect(result.id).toBe('base1-4')
    expect(result.rarity).toBeUndefined()
    expect(result.types).toBeUndefined()
  })

  it('parses a card with all optional fields', () => {
    const full = {
      ...validCard,
      rarity: 'Rare Holo',
      types: ['Fire'],
      subtypes: ['Stage 2'],
      cardmarket: {
        prices: { averageSellPrice: 350.0, lowPrice: 300.0, trendPrice: 360.0 },
      },
    }
    const result = PtcgCardSchema.parse(full)
    expect(result.rarity).toBe('Rare Holo')
    expect(result.types).toEqual(['Fire'])
    expect(result.cardmarket?.prices?.averageSellPrice).toBe(350.0)
  })

  it('rejects a card with invalid image URL', () => {
    const bad = { ...validCard, images: { small: 'bad', large: 'bad' } }
    expect(() => PtcgCardSchema.parse(bad)).toThrow()
  })
})

describe('PtcgSetsResponseSchema', () => {
  it('parses a sets response', () => {
    const result = PtcgSetsResponseSchema.parse({ data: [validSet] })
    expect(result.data).toHaveLength(1)
  })
})

describe('PtcgCardsResponseSchema', () => {
  it('parses a cards response', () => {
    const result = PtcgCardsResponseSchema.parse({
      data: [validCard],
      totalCount: 1,
      count: 1,
      pageSize: 250,
      page: 1,
    })
    expect(result.totalCount).toBe(1)
  })
})

describe('PtcgCardResponseSchema', () => {
  it('parses a single card response', () => {
    const result = PtcgCardResponseSchema.parse({ data: validCard })
    expect(result.data.id).toBe('base1-4')
  })
})
