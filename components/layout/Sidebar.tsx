'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, Search, BookOpen, Star, BarChart2, Lock } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, section: 'main', matchPrefix: false },
  { href: '/browse', label: 'Browse', Icon: Search, section: 'main', matchPrefix: true },
  { href: '/collection', label: 'My Cards', Icon: BookOpen, section: 'collection', matchPrefix: false },
  { href: '/wishlist', label: 'Wishlist', Icon: Star, section: 'collection', pro: true, matchPrefix: false },
  { href: '/analytics', label: 'Analytics', Icon: BarChart2, section: 'collection', pro: true, matchPrefix: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const tier = session?.user?.tier ?? 'free'
  const isPro = tier === 'pro'

  const mainItems = navItems.filter((i) => i.section === 'main')
  const collectionItems = navItems.filter((i) => i.section === 'collection')

  return (
    <aside className="w-44 flex-shrink-0 bg-mantle border-r border-surface0 flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-surface0">
        <div className="flex items-center gap-1.5">
          <PokeballIcon className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-russo text-sm text-text tracking-wide">Poke</span>
            <span className="font-russo text-sm text-blue tracking-wide">Vault</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2">
        <div className="px-4 py-2 text-[9px] uppercase tracking-widest text-overlay0 font-semibold">
          Main
        </div>
        {mainItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href}
            isPro={isPro}
          />
        ))}

        <div className="px-4 py-2 mt-2 text-[9px] uppercase tracking-widest text-overlay0 font-semibold">
          Collection
        </div>
        {collectionItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href}
            isPro={isPro}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-surface0 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue/20 border border-blue/40 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-overlay2 leading-none truncate">
              {session?.user?.name ?? '—'}
            </div>
            <div className="text-[9px] text-mauve mt-0.5">
              {tier === 'pro' ? '★ Pro' : tier === 'adfree' ? '◆ Ad-Free' : 'Free'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  item,
  active,
  isPro,
}: {
  item: (typeof navItems)[number]
  active: boolean
  isPro: boolean
}) {
  const locked = item.pro && !isPro
  const { Icon } = item
  const className = [
    'flex items-center gap-2.5 px-4 py-2.5 text-[11px] transition-colors',
    active
      ? 'bg-blue/15 text-text border-r-2 border-blue'
      : locked
        ? 'text-overlay0 cursor-not-allowed opacity-60'
        : 'text-overlay1 hover:text-text hover:bg-surface0/50',
  ].join(' ')

  if (locked) {
    return (
      <span className={className} aria-disabled="true">
        <Icon size={13} className="flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        <Lock size={10} className="flex-shrink-0 text-overlay0" />
      </span>
    )
  }

  return (
    <Link href={item.href} className={className}>
      <Icon size={13} className="flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
    </Link>
  )
}

function PokeballIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-overlay0" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5" className="text-overlay0" />
      <path d="M2 12a10 10 0 0 1 20 0" fill="currentColor" className="text-blue opacity-30" />
      <circle cx="12" cy="12" r="3" fill="currentColor" className="text-surface1" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" className="text-text" />
    </svg>
  )
}
