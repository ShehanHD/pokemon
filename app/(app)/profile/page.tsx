import Link from 'next/link'
import { auth } from '@/lib/auth'
import type { Tier } from '@/lib/types'

const tierLabel: Record<Tier, string> = {
  free: 'Free',
  adfree: 'Ad-Free',
  pro: 'Pro',
}

const tierBadgeClass: Record<Tier, string> = {
  free: 'bg-surface0 text-overlay2 border-surface1',
  adfree: 'bg-mauve/15 text-mauve border-mauve/40',
  pro: 'bg-blue/15 text-blue border-blue/40',
}

export default async function ProfilePage() {
  const session = await auth()
  const user = session?.user

  if (!user) {
    return (
      <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
        <p className="text-overlay0 text-sm">Sign in to view your profile.</p>
      </div>
    )
  }

  const tier: Tier = (user.tier as Tier | undefined) ?? 'free'
  const initial = (user.name ?? user.email ?? '?').slice(0, 1).toUpperCase()

  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: user.name ?? '—' },
    { label: 'Email', value: user.email ?? '—' },
    { label: 'Plan', value: tierLabel[tier] },
  ]

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <header className="mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue/20 border border-blue/40 flex items-center justify-center font-russo text-2xl text-blue">
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-russo text-text truncate">{user.name ?? 'Profile'}</h1>
          <span
            className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${tierBadgeClass[tier]}`}
          >
            {tierLabel[tier]}
          </span>
        </div>
      </header>

      <div className="bg-base border border-surface0 rounded-xl overflow-hidden mb-4">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={[
              'flex items-center px-4 py-3 gap-4',
              i > 0 ? 'border-t border-surface0' : '',
            ].join(' ')}
          >
            <span className="text-[11px] text-overlay0 uppercase tracking-wider w-24 flex-shrink-0">
              {row.label}
            </span>
            <span className="text-sm text-text truncate">{row.value}</span>
          </div>
        ))}
      </div>

      {tier === 'free' && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/upgrade"
            className="text-[11px] px-3 py-1.5 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors"
          >
            Upgrade plan
          </Link>
        </div>
      )}
    </main>
  )
}
