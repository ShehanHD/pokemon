import { describe, it, expect } from 'vitest'
import { addToWishlistInputSchema, wishlistItemSchema } from './wishlist'

describe('wishlist schemas', () => {
  it('accepts a minimal valid input', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c1' })).not.toThrow()
  })
  it('rejects empty cardId', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: '' })).toThrow()
  })
  it('coerces string addedAt to Date', () => {
    const r = wishlistItemSchema.parse({ userId: 'u', cardId: 'c', addedAt: '2026-01-01' })
    expect(r.addedAt).toBeInstanceOf(Date)
  })
  it('rejects oversize note', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c', note: 'x'.repeat(201) })).toThrow()
  })
  it('accepts priority enum', () => {
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c', priority: 'high' })).not.toThrow()
    expect(() => addToWishlistInputSchema.parse({ cardId: 'c', priority: 'urgent' as never })).toThrow()
  })
})
