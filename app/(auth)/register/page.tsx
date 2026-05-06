'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed.')
      setLoading(false)
      return
    }

    await signIn('credentials', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      callbackUrl: '/dashboard',
    })
  }

  return (
    <>
      <h1 className="text-base font-russo text-text text-center mb-6 tracking-wide">Create Account</h1>

      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-xs rounded-lg px-4 py-2.5 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-[11px] text-overlay1 mb-1.5 uppercase tracking-wider">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30 transition-colors"
          />
        </div>
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
            minLength={8}
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue/90 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-xs text-overlay0 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-blue hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
