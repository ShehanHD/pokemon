import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { addUserCard, removeUserCard } from '../actions'
import { getDb } from '@/lib/db'
import { auth } from '@/lib/auth'

const insertOne = vi.fn().mockResolvedValue({ insertedId: 'new-id' })
const deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 })
const mockCollection = { insertOne, deleteOne }
const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) }

const validRawInput = {
  type: 'raw' as const,
  cardId: 'sv1-25',
  variant: 'normal' as const,
  acquiredAt: '2026-05-06',
  cost: 12.5,
  condition: 'NM' as const,
}

describe('addUserCard', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
    insertOne.mockClear()
    mockDb.collection.mockClear()
  })

  it('throws UNAUTHORIZED when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await expect(addUserCard(validRawInput)).rejects.toThrow('UNAUTHORIZED')
    expect(insertOne).not.toHaveBeenCalled()
  })

  it('throws UNAUTHORIZED when session has no user id', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '' } } as never)
    await expect(addUserCard(validRawInput)).rejects.toThrow('UNAUTHORIZED')
    expect(insertOne).not.toHaveBeenCalled()
  })

  it('rejects invalid input via zod', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
    await expect(addUserCard({ type: 'raw', cardId: '' })).rejects.toThrow()
    expect(insertOne).not.toHaveBeenCalled()
  })

  it('inserts a userCard scoped to session userId on success', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
    await addUserCard(validRawInput)
    expect(mockDb.collection).toHaveBeenCalledWith('userCards')
    expect(insertOne).toHaveBeenCalledTimes(1)
    const doc = insertOne.mock.calls[0][0]
    expect(doc.userId).toBe('u1')
    expect(doc.cardId).toBe('sv1-25')
    expect(doc.type).toBe('raw')
    expect(doc.createdAt).toBeInstanceOf(Date)
    expect(doc.updatedAt).toBeInstanceOf(Date)
  })
})

describe('removeUserCard', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Db)
    deleteOne.mockClear()
    mockDb.collection.mockClear()
  })

  it('throws UNAUTHORIZED when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await expect(
      removeUserCard('507f1f77bcf86cd799439011', 'sv1-25'),
    ).rejects.toThrow('UNAUTHORIZED')
    expect(deleteOne).not.toHaveBeenCalled()
  })

  it('scopes delete by userId (tenant isolation)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
    await removeUserCard('507f1f77bcf86cd799439011', 'sv1-25')
    expect(deleteOne).toHaveBeenCalledTimes(1)
    const filter = deleteOne.mock.calls[0][0]
    expect(filter.userId).toBe('u1')
    expect(filter._id).toBeDefined()
  })

  it('does not delete copies belonging to another user', async () => {
    deleteOne.mockResolvedValueOnce({ deletedCount: 0 })
    vi.mocked(auth).mockResolvedValue({ user: { id: 'attacker' } } as never)
    await removeUserCard('507f1f77bcf86cd799439011', 'sv1-25')
    const filter = deleteOne.mock.calls[0][0]
    expect(filter.userId).toBe('attacker')
  })
})
