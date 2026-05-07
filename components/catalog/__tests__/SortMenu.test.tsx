import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SortMenu, { SORT_OPTIONS } from '../SortMenu'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/browse/x/y',
}))

describe('SortMenu', () => {
  it('writes ?sort=name-asc when "Name asc" selected', () => {
    render(<SortMenu />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'name-asc' } })
    expect(replaceMock).toHaveBeenCalled()
    expect(replaceMock.mock.calls[0][0] as string).toContain('sort=name-asc')
  })

  it('exposes the documented sort options', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual([
      'set-order', 'name-asc', 'name-desc', 'number-asc', 'number-desc', 'rarity', 'price-desc', 'price-asc',
    ])
  })
})
