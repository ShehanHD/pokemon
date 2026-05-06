import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db and bcryptjs
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}))
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed_pw') },
}))

import { POST } from '../route'
import { getDb } from '@/lib/db'

const mockDb = {
  collection: vi.fn().mockReturnValue({
    findOne: vi.fn(),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'new-id' }),
  }),
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as never)
    mockDb.collection().findOne.mockResolvedValue(null)
  })

  it('returns 400 for invalid payload', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'short' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when email already registered', async () => {
    mockDb.collection().findOne.mockResolvedValue({ email: 'a@b.com' })
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'password123', name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 201 on successful registration', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@b.com', password: 'password123', name: 'New User' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
