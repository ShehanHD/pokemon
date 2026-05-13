'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

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
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  const onConfirm = () => {
    setPending(true)
    void signOut({ callbackUrl: '/browse' })
  }

  return (
    <div className="border-t border-surface0">
      <Link
        href="/profile"
        title={collapsed ? `${name} — open profile` : 'Open profile'}
        className={`w-full px-4 py-3 flex items-center gap-2 hover:bg-surface0/50 transition-colors ${
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
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="Log out"
        className={`w-full px-4 py-2 flex items-center gap-2 text-[10px] text-overlay1 hover:text-red hover:bg-surface0/50 transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <LogOut size={12} className="flex-shrink-0" />
        {!collapsed && <span>Log out</span>}
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
          onClick={() => !pending && setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="bg-base border border-surface0 rounded-2xl p-6 w-[400px] max-w-[92vw] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-title" className="font-russo text-base text-text mb-2">
              Log out?
            </h2>
            <p className="text-sm text-overlay1 mb-5">
              You&apos;ll need to sign in again to access your collection.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="px-4 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text hover:border-overlay0 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onConfirm}
                className="px-4 py-1.5 text-sm bg-red/15 border border-red/40 rounded text-red hover:bg-red/25 disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={12} />
                {pending ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
