'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
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

function GlobalSearchInput() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onBrowse = pathname === '/browse'
  const initial = onBrowse ? (searchParams?.get('q') ?? '') : ''
  const [value, setValue] = useState(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedFromUrl = useRef(initial)

  useEffect(() => {
    const urlQ = onBrowse ? (searchParams?.get('q') ?? '') : ''
    if (urlQ !== lastSyncedFromUrl.current) {
      lastSyncedFromUrl.current = urlQ
      setValue(urlQ)
    }
  }, [searchParams, onBrowse])

  useEffect(() => {
    if (value.trim() === lastSyncedFromUrl.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const trimmed = value.trim()
      const params = new URLSearchParams()
      const currentView = onBrowse ? searchParams?.get('view') : null
      if (onBrowse) {
        for (const [k, v] of searchParams?.entries() ?? []) params.set(k, v)
      } else if (currentView === 'cards') {
        params.set('view', 'cards')
      }
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      params.delete('page')
      const qs = params.toString()
      const href = qs ? `/browse?${qs}` : '/browse'
      lastSyncedFromUrl.current = trimmed
      router.replace(href)
    }, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-48">
      <Search
        size={11}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-overlay0 pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search cards, sets…"
        aria-label="Search cards and sets"
        className="w-full bg-base border border-surface0 rounded-md pl-7 pr-6 py-1.5 text-[11px] text-text placeholder:text-overlay0 focus:outline-none focus:border-blue/60"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-overlay0 hover:text-text text-xs leading-none"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function Topbar({ themePokemonId, themeName }: TopbarProps) {
  const pathname = usePathname()
  const title =
    routeTitles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'PokeVault'

  return (
    <header className="bg-mantle border-b border-surface0 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
      <h1 className="text-sm font-russo text-text flex-1 tracking-wide">{title}</h1>
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="bg-base border border-surface0 rounded-md px-3 py-1.5 text-[11px] text-overlay0 w-48 flex items-center gap-2"
          >
            <Search size={11} className="flex-shrink-0" />
            <span>Search cards, sets…</span>
          </div>
        }
      >
        <GlobalSearchInput />
      </Suspense>
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
