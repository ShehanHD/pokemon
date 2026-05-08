'use client'
import { useState, useTransition } from 'react'
import { Star, Lock } from 'lucide-react'
import Link from 'next/link'
import { addWishlistAction, removeWishlistAction } from '@/app/(app)/wishlist/actions'

type State = 'logged-out' | 'unfilled' | 'filled' | 'capped'

export default function WishlistStar({ cardId, initialState, className = '' }: { cardId: string; initialState: State; className?: string }) {
  const [state, setState] = useState<State>(initialState)
  const [, startTransition] = useTransition()
  const [showCapDialog, setShowCapDialog] = useState(false)

  if (state === 'logged-out') return null

  if (state === 'capped') {
    return (
      <>
        <button
          type="button"
          aria-label="Wishlist full — upgrade"
          className={`p-1.5 rounded-full bg-base/80 hover:bg-base transition-colors ${className}`}
          onClick={() => setShowCapDialog(true)}
        >
          <Star size={16} className="text-overlay0" />
        </button>
        {showCapDialog && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setShowCapDialog(false)}>
            <div className="bg-base rounded-xl p-6 max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg text-text mb-2 flex items-center gap-2"><Lock size={16} /> Wishlist full</h3>
              <p className="text-sm text-overlay1 mb-4">Free accounts can wishlist 25 cards. Upgrade to Pro for unlimited.</p>
              <Link href="/upgrade" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold">Upgrade</Link>
            </div>
          </div>
        )}
      </>
    )
  }

  const filled = state === 'filled'

  function toggle() {
    if (filled) {
      setState('unfilled')
      startTransition(async () => {
        const r = await removeWishlistAction(cardId)
        if (!r.ok) setState('filled')
      })
    } else {
      setState('filled')
      startTransition(async () => {
        const r = await addWishlistAction({ cardId })
        if (!r.ok) {
          if (r.reason === 'cap_reached') setState('capped')
          else setState('unfilled')
        }
      })
    }
  }

  return (
    <button
      type="button"
      aria-label={filled ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={filled}
      onClick={toggle}
      className={`p-1.5 rounded-full bg-base/80 hover:bg-base transition-colors ${className}`}
    >
      <Star size={16} className={filled ? 'fill-yellow text-yellow' : 'text-overlay1'} />
    </button>
  )
}
