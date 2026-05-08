'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard,
  Search,
  BookOpen,
  Star,
  BarChart2,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import UserMenu from './UserMenu'

const COOKIE_KEY = 'sidebar-collapsed'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, section: 'main', matchPrefix: false },
  { href: '/browse', label: 'Browse', Icon: Search, section: 'main', matchPrefix: true },
  { href: '/collection', label: 'My Cards', Icon: BookOpen, section: 'collection', matchPrefix: false },
  { href: '/wishlist', label: 'Wishlist', Icon: Star, section: 'collection', pro: false, matchPrefix: false },
  { href: '/analytics', label: 'Analytics', Icon: BarChart2, section: 'collection', pro: true, matchPrefix: false },
]

export default function Sidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const tier = session?.user?.tier ?? 'free'
  const isPro = tier === 'pro'
  const [collapsed, setCollapsed] = useState(initialCollapsed)

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      document.cookie = `${COOKIE_KEY}=${next ? '1' : '0'}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
      return next
    })
  }

  const mainItems = navItems.filter((i) => i.section === 'main')
  const collectionItems = navItems.filter((i) => i.section === 'collection')

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-44'} flex-shrink-0 bg-mantle border-r border-surface0 flex flex-col transition-[width] duration-200`}
    >
      {/* Brand */}
      <div className="px-4 py-4 border-b border-surface0">
        <div className={`flex items-center gap-1.5 ${collapsed ? 'justify-center' : ''}`}>
          <PokeballIcon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <div>
              <span className="font-russo text-sm text-text tracking-wide">Poke</span>
              <span className="font-russo text-sm text-blue tracking-wide">Vault</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-2">
        {!collapsed && (
          <div className="px-4 py-2 text-[9px] uppercase tracking-widest text-overlay0 font-semibold">
            Main
          </div>
        )}
        {mainItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href}
            isPro={isPro}
            collapsed={collapsed}
          />
        ))}

        {!collapsed ? (
          <div className="px-4 py-2 mt-2 text-[9px] uppercase tracking-widest text-overlay0 font-semibold">
            Collection
          </div>
        ) : (
          <div className="my-2 mx-3 border-t border-surface0" aria-hidden="true" />
        )}
        {collectionItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href}
            isPro={isPro}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="border-t border-surface0 px-4 py-2 text-overlay1 hover:text-text hover:bg-surface0/50 flex items-center justify-center transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <UserMenu collapsed={collapsed} />
    </aside>
  )
}

function NavItem({
  item,
  active,
  isPro,
  collapsed,
}: {
  item: (typeof navItems)[number]
  active: boolean
  isPro: boolean
  collapsed: boolean
}) {
  const locked = item.pro && !isPro && item.href !== '/analytics'
  const { Icon } = item
  const title = collapsed ? `${item.label}${locked ? ' (Pro)' : ''}` : undefined
  const className = [
    'flex items-center text-[11px] transition-colors',
    collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-4 py-2.5',
    active
      ? 'bg-blue/15 text-text border-r-2 border-blue'
      : locked
        ? 'text-overlay0 cursor-not-allowed opacity-60'
        : 'text-overlay1 hover:text-text hover:bg-surface0/50',
  ].join(' ')

  if (locked) {
    return (
      <span className={className} aria-disabled="true" title={title}>
        <Icon size={13} className="flex-shrink-0" />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {!collapsed && <Lock size={10} className="flex-shrink-0 text-overlay0" />}
      </span>
    )
  }

  return (
    <Link href={item.href} className={className} title={title}>
      <Icon size={13} className="flex-shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
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
