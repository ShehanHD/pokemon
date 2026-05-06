'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('callbackUrl') ?? '/dashboard'
  const callbackUrl = raw.startsWith('/') ? raw : '/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      router.push(callbackUrl)
    }
  }

  return (
    <>
      <h1 className="text-base font-russo text-text text-center mb-6 tracking-wide">Sign In</h1>

      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-xs rounded-lg px-4 py-2.5 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[11px] text-overlay1 mb-1.5 uppercase tracking-wider">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[11px] text-overlay1 mb-1.5 uppercase tracking-wider">Password</label>
          <input
            id="password"
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
        onClick={() => signIn('google', { callbackUrl })}
        className="w-full bg-base border border-surface0 text-overlay2 font-medium py-2.5 rounded-lg text-sm hover:border-blue hover:text-text transition-colors"
      >
        Continue with Google
      </button>

      <p className="text-center text-xs text-overlay0 mt-6">
        No account?{' '}
        <Link href="/register" className="text-blue hover:underline">
          Register
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
