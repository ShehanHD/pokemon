import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WishlistStar from '@/components/wishlist/WishlistStar'

vi.mock('@/app/(app)/wishlist/actions', () => ({
  addWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
  removeWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('WishlistStar', () => {
  it('hidden when logged out', () => {
    const { container } = render(<WishlistStar cardId="c1" initialState="logged-out" />)
    expect(container.firstChild).toBeNull()
  })
  it('toggles from unfilled → filled on click', async () => {
    render(<WishlistStar cardId="c1" initialState="unfilled" />)
    const btn = screen.getByRole('button', { name: /add to wishlist/i })
    fireEvent.click(btn)
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'))
  })
  it('shows cap dialog when capped', () => {
    render(<WishlistStar cardId="c1" initialState="capped" />)
    fireEvent.click(screen.getByRole('button', { name: /wishlist full/i }))
    expect(screen.getAllByText(/upgrade/i).length).toBeGreaterThan(0)
  })
})
