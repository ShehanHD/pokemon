'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', section: 'main' },
  { href: '/browse', label: 'Browse', icon: '📦', section: 'main' },
  { href: '/collection', label: 'My Cards', icon: '🗂️', section: 'collection' },
  { href: '/wishlist', label: 'Wishlist', icon: '⭐', section: 'collection', pro: true },
  { href: '/analytics', label: 'Analytics', icon: '📈', section: 'collection', pro: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const tier = session?.user?.tier ?? 'free'
  const isPro = tier === 'pro'

  const mainItems = navItems.filter((i) => i.section === 'main')
  const collectionItems = navItems.filter((i) => i.section === 'collection')

  return (
    <aside className="w-40 flex-shrink-0 bg-mantle border-r border-surface0 flex flex-col">
      <div className="px-4 py-4 border-b border-surface0">
        <span className="font-black text-sm text-text">Poke</span>
        <span className="font-black text-sm text-red">Vault</span>
      </div>

      <nav className="flex-1 py-2">
        <div className="px-4 py-2 text-[9px] uppercase tracking-widest text-surface1 font-semibold">
          Main
        </div>
        {mainItems.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} isPro={isPro} />
        ))}

        <div className="px-4 py-2 mt-2 text-[9px] uppercase tracking-widest text-surface1 font-semibold">
          My Collection
        </div>
        {collectionItems.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} isPro={isPro} />
        ))}
      </nav>

      <div className="border-t border-surface0 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-mauve flex-shrink-0" />
          <div>
            <div className="text-[10px] text-overlay2 leading-none">
              {session?.user?.name ?? '—'}
            </div>
            <div className="text-[9px] text-mauve mt-0.5">
              {tier === 'pro' ? '✦ Pro' : tier === 'adfree' ? '◆ Ad-Free' : 'Free'}
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
  return (
    <Link
      href={locked ? '#' : item.href}
      className={[
        'flex items-center gap-2 px-4 py-2 text-[11px]',
        active
          ? 'bg-blue/10 text-text border-r-2 border-blue'
          : locked
            ? 'text-overlay0 cursor-not-allowed'
            : 'text-overlay0 hover:text-text',
      ].join(' ')}
    >
      <span className="w-4 text-center">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {locked && (
        <span className="text-[8px] bg-mauve/20 text-mauve px-1.5 py-0.5 rounded-full">
          Pro
        </span>
      )}
    </Link>
  )
}
