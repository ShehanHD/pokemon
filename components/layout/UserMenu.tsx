'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

const tierLabel = (tier: string | undefined): string => {
  if (tier === 'pro') return '★ Pro'
  if (tier === 'adfree') return '◆ Ad-Free'
  return 'Free'
}

export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession()
  const name = session?.user?.name ?? '—'
  const tier = session?.user?.tier
  const initial = (session?.user?.name ?? session?.user?.email ?? '?').slice(0, 1).toUpperCase()

  return (
    <Link
      href="/profile"
      title={collapsed ? `${name} — open profile` : 'Open profile'}
      className={`border-t border-surface0 w-full px-4 py-3 flex items-center gap-2 hover:bg-surface0/50 transition-colors ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      <div className="w-6 h-6 rounded-full bg-blue/20 border border-blue/40 flex items-center justify-center text-[10px] font-russo text-blue flex-shrink-0">
        {initial}
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[10px] text-overlay2 leading-none truncate">{name}</div>
          <div className="text-[9px] text-mauve mt-0.5">{tierLabel(tier)}</div>
        </div>
      )}
    </Link>
  )
}
