'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const COOKIE_NAME = 'ads-consent'
const ONE_YEAR = 60 * 60 * 24 * 365

function setConsent(value: 'granted' | 'denied') {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
}

export default function ConsentBanner() {
  const router = useRouter()
  const [pending, setPending] = useState<'granted' | 'denied' | null>(null)

  const choose = (value: 'granted' | 'denied') => {
    setPending(value)
    setConsent(value)
    router.refresh()
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 bg-base/95 backdrop-blur-sm border-t border-surface0 px-4 py-3"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm text-text flex-1 leading-snug">
          We use cookies for personalised ads on the public catalog. Your collection and
          account areas remain ad-free. You can change this anytime in settings.
        </p>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => choose('denied')}
            disabled={pending !== null}
            className="flex-1 sm:flex-none px-3 py-1.5 text-sm rounded border border-surface0 hover:bg-surface0 text-text disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            disabled={pending !== null}
            className="flex-1 sm:flex-none px-3 py-1.5 text-sm rounded bg-blue text-base font-medium hover:bg-blue/90 disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
