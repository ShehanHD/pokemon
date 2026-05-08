'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { User, Settings, LogOut, ChevronUp } from 'lucide-react'

const tierLabel = (tier: string | undefined): string => {
  if (tier === 'pro') return '★ Pro'
  if (tier === 'adfree') return '◆ Ad-Free'
  return 'Free'
}

export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const name = session?.user?.name ?? '—'
  const tier = session?.user?.tier

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initial = (session?.user?.name ?? session?.user?.email ?? '?').slice(0, 1).toUpperCase()

  return (
    <div ref={ref} className="relative border-t border-surface0">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? `${name} — open menu` : 'Open user menu'}
        className={`w-full px-4 py-3 flex items-center gap-2 hover:bg-surface0/50 transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-blue/20 border border-blue/40 flex items-center justify-center text-[10px] font-russo text-blue flex-shrink-0">
          {initial}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[10px] text-overlay2 leading-none truncate">{name}</div>
              <div className="text-[9px] text-mauve mt-0.5">{tierLabel(tier)}</div>
            </div>
            <ChevronUp
              size={12}
              className={`text-overlay0 flex-shrink-0 transition-transform ${open ? '' : 'rotate-180'}`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute bottom-full mb-1 z-20 bg-mantle border border-surface0 rounded-md shadow-lg py-1 ${
            collapsed ? 'left-full ml-2 w-44' : 'left-2 right-2'
          }`}
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[11px] text-overlay2 hover:bg-surface0/50 hover:text-text transition-colors"
          >
            <User size={13} className="flex-shrink-0" />
            <span>Profile</span>
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[11px] text-overlay2 hover:bg-surface0/50 hover:text-text transition-colors"
          >
            <Settings size={13} className="flex-shrink-0" />
            <span>Settings</span>
          </Link>
          <div className="my-1 border-t border-surface0" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut({ callbackUrl: '/login' })
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-overlay2 hover:bg-surface0/50 hover:text-red transition-colors"
          >
            <LogOut size={13} className="flex-shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  )
}
