'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/browse': 'Browse',
  '/collection': 'My Cards',
  '/wishlist': 'Wishlist',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function Topbar() {
  const pathname = usePathname()
  const title = titles[pathname] ?? 'PokeVault'

  return (
    <header className="bg-mantle border-b border-surface0 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
      <h1 className="text-sm font-bold text-text flex-1">{title}</h1>
      <div className="bg-base border border-surface0 rounded-md px-3 py-1.5 text-[11px] text-overlay0 w-48">
        🔍 Search cards, sets…
      </div>
      <div className="bg-base border border-surface0 rounded px-2 py-1 text-[10px] text-overlay2">
        🇮🇹 IT · EUR
      </div>
    </header>
  )
}
