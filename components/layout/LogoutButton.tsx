'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: '/login' })}
      className="text-[11px] px-3 py-1.5 rounded border border-surface0 text-overlay2 hover:border-red/40 hover:text-red transition-colors inline-flex items-center gap-1.5"
    >
      <LogOut size={12} />
      <span>Log out</span>
    </button>
  )
}
