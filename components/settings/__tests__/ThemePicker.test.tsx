import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ThemePicker from '../ThemePicker'

const onSelect = vi.fn(async () => {})

const baseProps = {
  manifest: {
    '25': { name: 'Pikachu', tier: 'free' as const, primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5' },
    '6':  { name: 'Charizard', tier: 'adfree' as const, primary: '#d35400', accent: '#ffd1a8', mantle: '#e8eef5' },
    '150':{ name: 'Mewtwo', tier: 'free' as const, primary: '#9b59b6', accent: '#d2b4de', mantle: '#e8eef5' },
  },
  userTier: 'free' as const,
  currentPokemonId: 25 as number | null,
  onSelect,
}

beforeEach(() => onSelect.mockClear())

describe('ThemePicker', () => {
  it('renders one tile per manifest entry plus a default tile', () => {
    render(<ThemePicker {...baseProps} />)
    expect(screen.getByRole('button', { name: /default/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pikachu/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Charizard/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mewtwo/ })).toBeInTheDocument()
  })

  it('marks the current selection', () => {
    render(<ThemePicker {...baseProps} />)
    const pikachu = screen.getByRole('button', { name: /Pikachu/ })
    expect(pikachu).toHaveAttribute('data-selected', 'true')
  })

  it('calls onSelect with the id when an unlocked tile is clicked', () => {
    render(<ThemePicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Mewtwo/ }))
    expect(onSelect).toHaveBeenCalledWith(150)
  })

  it('opens the upgrade dialog when a locked tile is clicked', () => {
    render(<ThemePicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Charizard/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/adfree/i)).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('default tile calls onSelect(null)', () => {
    render(<ThemePicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /default/i }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
