'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  callbackUrl?: string
}

export default function LoginDialog({ open, onClose, callbackUrl = '/dashboard' }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const safeCallback = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password.')
    } else {
      onClose()
      router.push(safeCallback)
      router.refresh()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-mantle border border-surface0 rounded-2xl p-8 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-russo text-text tracking-wide">Sign In</h2>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            className="text-overlay0 hover:text-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 text-red text-xs rounded-lg px-4 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dlg-email" className="block text-[11px] text-overlay1 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              id="dlg-email"
              name="email"
              type="email"
              required
              autoFocus
              className="w-full bg-base border border-surface0 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="dlg-password" className="block text-[11px] text-overlay1 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              id="dlg-password"
              name="password"
              type="password"
              required
              className="w-full bg-base border border-surface0 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue/90 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-surface0" />
          <span className="text-[10px] text-overlay0 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-surface0" />
        </div>

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: safeCallback })}
          className="w-full bg-base border border-surface0 text-overlay2 font-medium py-2.5 rounded-lg text-sm hover:border-blue hover:text-text transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center text-xs text-overlay0 mt-6">
          No account?{' '}
          <Link href="/register" className="text-blue hover:underline" onClick={onClose}>
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
