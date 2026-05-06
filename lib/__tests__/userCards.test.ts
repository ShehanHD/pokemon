import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

import { getUserCardsForCard, getUserCardCount } from '../userCards'
import { getDb } from '@/lib/db'

const mockCollection = {
  find: vi.fn(),
  countDocuments: vi.fn(),
}
const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) }

describe('getUserCardsForCard', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
    mockCollection.find.mockReset()
    mockCollection.countDocuments.mockReset()
  })

  it('returns docs scoped to userId + cardId, newest first', async () => {
    const docs = [
      { _id: 'a', userId: 'u1', cardId: 'c1', type: 'raw', createdAt: new Date('2026-01-02') },
      { _id: 'b', userId: 'u1', cardId: 'c1', type: 'graded', createdAt: new Date('2026-01-01') },
    ]
    const sortMock = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) })
    mockCollection.find.mockReturnValue({ sort: sortMock })

    const result = await getUserCardsForCard('u1', 'c1')

    expect(mockDb.collection).toHaveBeenCalledWith('userCards')
    expect(mockCollection.find).toHaveBeenCalledWith({ userId: 'u1', cardId: 'c1' })
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 })
    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('a')
  })

  it('serializes _id to string', async () => {
    const docs = [{ _id: { toString: () => 'oid-string' }, userId: 'u1', cardId: 'c1', type: 'raw' }]
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) }),
    })
    const result = await getUserCardsForCard('u1', 'c1')
    expect(result[0]._id).toBe('oid-string')
  })
})

describe('getUserCardCount', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
  })

  it('returns count scoped to userId + cardId', async () => {
    mockCollection.countDocuments.mockResolvedValue(3)
    const n = await getUserCardCount('u1', 'c1')
    expect(mockCollection.countDocuments).toHaveBeenCalledWith({ userId: 'u1', cardId: 'c1' })
    expect(n).toBe(3)
  })
})
