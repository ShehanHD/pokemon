import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient, type Db } from 'mongodb'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

import { getOwnedCountsBySet, getOwnedCountsBySeries } from '../userCards'
import { getDb } from '@/lib/db'

let mongo: MongoMemoryServer
let client: MongoClient
let db: Db

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  client = await MongoClient.connect(mongo.getUri())
  db = client.db('test')
  vi.mocked(getDb).mockResolvedValue(db)
})

afterAll(async () => {
  await client.close()
  await mongo.stop()
})

beforeEach(async () => {
  await db.collection('userCards').deleteMany({})
  await db.collection('cards').deleteMany({})

  await db.collection('cards').insertMany([
    { pokemontcg_id: 'sv1-1',  set_id: 'sv1',  seriesSlug: 'scarlet-violet' },
    { pokemontcg_id: 'sv1-2',  set_id: 'sv1',  seriesSlug: 'scarlet-violet' },
    { pokemontcg_id: 'sv2-1',  set_id: 'sv2',  seriesSlug: 'scarlet-violet' },
    { pokemontcg_id: 'swsh1-1', set_id: 'swsh1', seriesSlug: 'sword-shield' },
  ])

  await db.collection('userCards').insertMany([
    { userId: 'u1', cardId: 'sv1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u1', cardId: 'sv1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u1', cardId: 'sv1-2', type: 'raw', variant: 'holofoil', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u1', cardId: 'swsh1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
    { userId: 'u2', cardId: 'sv1-1', type: 'raw', variant: 'normal', condition: 'NM', acquiredAt: new Date(), cost: 1, createdAt: new Date(), updatedAt: new Date() },
  ])
})

describe('getOwnedCountsBySet', () => {
  it('aggregates u1 counts by set_id', async () => {
    const counts = await getOwnedCountsBySet('u1')
    expect(counts.get('sv1')).toBe(3)
    expect(counts.get('swsh1')).toBe(1)
    expect(counts.get('sv2')).toBeUndefined()
  })

  it('returns empty Map for users with no copies', async () => {
    const counts = await getOwnedCountsBySet('nobody')
    expect(counts.size).toBe(0)
  })
})

describe('getOwnedCountsBySeries', () => {
  it('aggregates u1 counts by seriesSlug', async () => {
    const counts = await getOwnedCountsBySeries('u1')
    expect(counts.get('scarlet-violet')).toBe(3)
    expect(counts.get('sword-shield')).toBe(1)
  })
})
