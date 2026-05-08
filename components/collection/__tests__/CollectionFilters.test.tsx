import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CollectionFilters from '@/app/(app)/collection/CollectionFilters'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams('series=original&sort=name'),
  usePathname: () => '/collection',
}))

describe('CollectionFilters', () => {
  it('round-trips current params and updates URL on change', () => {
    render(<CollectionFilters allSeries={[{ slug: 'original', name: 'Original' }]} allRarities={['Common']} />)
    const select = screen.getByLabelText(/series/i) as HTMLSelectElement
    expect(select.value).toBe('original')
    fireEvent.change(select, { target: { value: '' } })
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/sort=name/))
    expect(push).toHaveBeenCalledWith(expect.not.stringMatching(/series=/))
  })
})
