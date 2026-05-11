import { describe, it, expect, beforeEach } from 'vitest'
import { getDb } from './db'
import {
  addToWishlist,
  removeFromWishlist,
  isOnWishlist,
  getWishlistedIdsForUser,
  countWishlist,
  getWishlistForUser,
  FREE_TIER_WISHLIST_CAP,
} from './wishlist'

const userId = 'wishlist-test-user'

beforeEach(async () => {
  const db = await getDb()
  await db.collection('wishlist').deleteMany({ userId })
  await db.collection('cards').deleteMany({ tcgdex_id: { $in: ['w1', 'w2'] } })
  await db.collection('cards').insertMany([
    { pokemontcg_id: 'w1', tcgdex_id: 'w1', name: 'Mew', number: '151', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Promo', types: [], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', priceEUR: null },
    { pokemontcg_id: 'w2', tcgdex_id: 'w2', name: 'Mewtwo', number: '150', set_id: 'base1', setName: 'Base', series: 'Original', seriesSlug: 'original', rarity: 'Rare Holo', types: [], subtypes: [], supertype: 'Pokémon', imageUrl: '', imageUrlHiRes: '', priceEUR: null },
  ])
})

describe('wishlist helpers', () => {
  it('add → ok, idempotent', async () => {
    const r1 = await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    expect(r1.ok).toBe(true)
    const r2 = await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    expect(r2.ok).toBe(true)
    expect(await countWishlist(userId)).toBe(1)
  })

  it('isOnWishlist round-trip', async () => {
    expect(await isOnWishlist(userId, 'w1')).toBe(false)
    await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    expect(await isOnWishlist(userId, 'w1')).toBe(true)
    await removeFromWishlist(userId, 'w1')
    expect(await isOnWishlist(userId, 'w1')).toBe(false)
  })

  it('free-tier cap enforced', async () => {
    const db = await getDb()
    const docs = Array.from({ length: FREE_TIER_WISHLIST_CAP }).map((_, i) => ({
      userId, cardId: `f${i}`, addedAt: new Date(),
    }))
    await db.collection('wishlist').insertMany(docs)
    const r = await addToWishlist(userId, { cardId: 'overflow' }, 'free')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('cap_reached')
  })

  it('pro tier exceeds free cap', async () => {
    const db = await getDb()
    const docs = Array.from({ length: FREE_TIER_WISHLIST_CAP }).map((_, i) => ({
      userId, cardId: `f${i}`, addedAt: new Date(),
    }))
    await db.collection('wishlist').insertMany(docs)
    const r = await addToWishlist(userId, { cardId: 'extra' }, 'pro')
    expect(r.ok).toBe(true)
  })

  it('getWishlistedIdsForUser returns Set', async () => {
    await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    await addToWishlist(userId, { cardId: 'w2' }, 'pro')
    const ids = await getWishlistedIdsForUser(userId)
    expect(ids.has('w1')).toBe(true)
    expect(ids.has('w2')).toBe(true)
    expect(ids.size).toBe(2)
  })

  it('getWishlistForUser joins cards', async () => {
    await addToWishlist(userId, { cardId: 'w1' }, 'pro')
    const items = await getWishlistForUser(userId)
    expect(items[0].card.name).toBe('Mew')
  })
})
