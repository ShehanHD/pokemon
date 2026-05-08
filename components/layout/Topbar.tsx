'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Globe, Palette } from 'lucide-react'

const routeTitles: [string, string][] = [
  ['/dashboard', 'Dashboard'],
  ['/browse', 'Browse'],
  ['/cards', 'Card Detail'],
  ['/collection', 'My Cards'],
  ['/wishlist', 'Wishlist'],
  ['/analytics', 'Analytics'],
  ['/settings', 'Settings'],
]

interface TopbarProps {
  themePokemonId: number | null
  themeName: string | null
}

export default function Topbar({ themePokemonId, themeName }: TopbarProps) {
  const pathname = usePathname()
  const title =
    routeTitles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'PokeVault'

  return (
    <header className="bg-mantle border-b border-surface0 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
      <h1 className="text-sm font-russo text-text flex-1 tracking-wide">{title}</h1>
      <div aria-hidden="true" className="bg-base border border-surface0 rounded-md px-3 py-1.5 text-[11px] text-overlay0 w-48 flex items-center gap-2">
        <Search size={11} className="flex-shrink-0" />
        <span>Search cards, sets…</span>
      </div>
      <div aria-hidden="true" className="bg-base border border-surface0 rounded px-2 py-1 text-[10px] text-overlay2 flex items-center gap-1.5">
        <Globe size={10} className="flex-shrink-0" />
        <span>IT · EUR</span>
      </div>
      <Link
        href="/settings"
        title={themeName ? `Theme: ${themeName}` : 'Pick a theme'}
        className="bg-base border border-surface0 rounded-full pl-1 pr-3 py-0.5 flex items-center gap-1.5 hover:border-blue/50 transition-colors"
      >
        <span className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-mantle flex-shrink-0">
          {themePokemonId ? (
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${themePokemonId}.png`}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <Palette size={12} className="text-overlay1" />
          )}
        </span>
        <span className="text-[10px] text-overlay2 truncate max-w-[7rem]">
          {themeName ?? 'No theme'}
        </span>
      </Link>
    </header>
  )
}
