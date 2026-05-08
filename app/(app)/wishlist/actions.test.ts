import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDb } from '@/lib/db'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { auth } from '@/lib/auth'
import { addWishlistAction, removeWishlistAction } from './actions'

const userId = 'sa-wishlist-user'

beforeEach(async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId, tier: 'free' } } as never)
  const db = await getDb()
  await db.collection('wishlist').deleteMany({ userId: { $in: [userId, 'someone-else'] } })
})

describe('wishlist server actions', () => {
  it('addWishlistAction inserts item', async () => {
    const r = await addWishlistAction({ cardId: 'c1' })
    expect(r.ok).toBe(true)
  })
  it('addWishlistAction rejects when not signed in', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const r = await addWishlistAction({ cardId: 'c1' })
    expect(r.ok).toBe(false)
  })
  it('addWishlistAction rejects invalid input', async () => {
    const r = await addWishlistAction({ cardId: '' })
    expect(r.ok).toBe(false)
  })
  it('removeWishlistAction is owner-scoped', async () => {
    const db = await getDb()
    await db.collection('wishlist').insertOne({ userId: 'someone-else', cardId: 'c1', addedAt: new Date() })
    await removeWishlistAction('c1')
    const remains = await db.collection('wishlist').countDocuments({ userId: 'someone-else', cardId: 'c1' })
    expect(remains).toBe(1)
  })
})
