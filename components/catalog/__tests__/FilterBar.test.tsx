import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterBar from '../FilterBar'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('rarity=Common'),
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/browse/x/y',
}))

describe('FilterBar', () => {
  it('hydrates initial state from URL params', () => {
    render(<FilterBar rarities={['Common', 'Rare']} types={[]} variants={[]} subtypes={[]} />)
    const commonChip = screen.getByRole('button', { name: /Common/ })
    expect(commonChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('writes selected rarity to URL on click', () => {
    render(<FilterBar rarities={['Common', 'Rare']} types={[]} variants={[]} subtypes={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /Rare$/ }))
    expect(replaceMock).toHaveBeenCalled()
    const arg = replaceMock.mock.calls[0][0] as string
    expect(arg).toContain('rarity=Common')
    expect(arg).toContain('rarity=Rare')
  })
})
