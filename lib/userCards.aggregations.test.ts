import { describe, it, expect, beforeEach } from 'vitest'
import { getDb } from './db'
import {
  getOwnedCardsGrouped,
  getCollectionStats,
  getRawVsGradedSplit,
  getBySeriesBreakdown,
  getBySetBreakdown,
  getRarityBreakdown,
  getCollectionTimeseries,
} from './userCards'

const userId = 'user-test-aggs'

async function seed() {
  const db = await getDb()
  await db.collection('userCards').deleteMany({ userId })
  await db.collection('cards').deleteMany({ pokemontcg_id: { $in: ['c1', 'c2'] } })
  await db.collection('cards').insertMany([
    { pokemontcg_id: 'c1', name: 'Pikachu', number: '25', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Common', types: ['Lightning'], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', cardmarketPrice: null },
    { pokemontcg_id: 'c2', name: 'Charizard', number: '4', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Rare Holo', types: ['Fire'], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', cardmarketPrice: null },
  ])
  await db.collection('userCards').insertMany([
    { userId, cardId: 'c1', type: 'raw', variant: 'normal', condition: 'NM', cost: 5, acquiredAt: new Date('2026-01-01'), createdAt: new Date(), updatedAt: new Date() },
    { userId, cardId: 'c1', type: 'raw', variant: 'holo', condition: 'NM', cost: 10, acquiredAt: new Date('2026-02-01'), createdAt: new Date(), updatedAt: new Date() },
    { userId, cardId: 'c2', type: 'graded', variant: 'normal', gradingCompany: 'PSA', grade: 9, gradedValue: 200, cost: 150, acquiredAt: new Date('2026-03-01'), createdAt: new Date(), updatedAt: new Date() },
  ])
}

describe('getOwnedCardsGrouped', () => {
  beforeEach(seed)

  it('groups copies by cardId with raw/graded counts and totals', async () => {
    const groups = await getOwnedCardsGrouped(userId, { sort: 'recent' })
    expect(groups).toHaveLength(2)
    const c1 = groups.find((g) => g.cardId === 'c1')!
    expect(c1.copyCount).toBe(2)
    expect(c1.rawCount).toBe(2)
    expect(c1.gradedCount).toBe(0)
    expect(c1.totalCost).toBe(15)
    expect(c1.variants.sort()).toEqual(['holo', 'normal'])
    const c2 = groups.find((g) => g.cardId === 'c2')!
    expect(c2.copyCount).toBe(1)
    expect(c2.gradedCount).toBe(1)
    expect(c2.estValue).toBe(200)
  })

  it('sorts by name ascending', async () => {
    const groups = await getOwnedCardsGrouped(userId, { sort: 'name' })
    expect(groups.map((g) => g.card.name)).toEqual(['Charizard', 'Pikachu'])
  })

  it('returns empty array for unknown user', async () => {
    const groups = await getOwnedCardsGrouped('no-such-user', { sort: 'recent' })
    expect(groups).toEqual([])
  })
})

describe('getCollectionStats', () => {
  beforeEach(seed)

  it('returns totals over all owned copies', async () => {
    const stats = await getCollectionStats(userId)
    expect(stats.totalCopies).toBe(3)
    expect(stats.uniqueCards).toBe(2)
    expect(stats.totalSpend).toBe(165)
    expect(stats.estValue).toBe(215)
  })

  it('returns zeros for empty user', async () => {
    expect(await getCollectionStats('nobody')).toEqual({
      totalCopies: 0, uniqueCards: 0, totalSpend: 0, estValue: 0,
    })
  })
})

describe('getRawVsGradedSplit', () => {
  beforeEach(seed)
  it('splits copies and spend by raw/graded', async () => {
    const r = await getRawVsGradedSplit(userId)
    expect(r.raw).toEqual({ copies: 2, spend: 15 })
    expect(r.graded).toEqual({ copies: 1, spend: 150 })
  })
})

describe('getBySeriesBreakdown', () => {
  beforeEach(seed)
  it('aggregates copies and spend per series', async () => {
    const rows = await getBySeriesBreakdown(userId)
    expect(rows).toEqual([{ series: 'Original', copies: 3, spend: 165 }])
  })
})

describe('getBySetBreakdown', () => {
  beforeEach(seed)
  it('aggregates per set with name', async () => {
    const rows = await getBySetBreakdown(userId)
    expect(rows[0]).toMatchObject({ setCode: 'base1', setName: 'Base', copies: 3, spend: 165 })
  })
})

describe('getRarityBreakdown', () => {
  beforeEach(seed)
  it('aggregates copies per rarity', async () => {
    const rows = await getRarityBreakdown(userId)
    expect(rows.find((r) => r.rarity === 'Common')?.copies).toBe(2)
    expect(rows.find((r) => r.rarity === 'Rare Holo')?.copies).toBe(1)
  })
})

describe('getCollectionTimeseries', () => {
  beforeEach(seed)
  it('returns monthly cumulative copies and spend', async () => {
    const rows = await getCollectionTimeseries(userId)
    expect(rows).toEqual([
      { month: '2026-01', copiesAdded: 1, cumulativeCopies: 1, cumulativeSpend: 5 },
      { month: '2026-02', copiesAdded: 1, cumulativeCopies: 2, cumulativeSpend: 15 },
      { month: '2026-03', copiesAdded: 1, cumulativeCopies: 3, cumulativeSpend: 165 },
    ])
  })
})
