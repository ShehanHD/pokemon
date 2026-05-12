'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

function Input({ initial }: { initial: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search sets and cards…"
        className="w-full bg-mantle border border-surface0 rounded-md px-3 py-2 text-sm text-text placeholder:text-overlay0 focus:outline-none focus:border-blue/60"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-overlay0 hover:text-text text-xs"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function BrowseSearch({ initial }: { initial: string }) {
  return (
    <Suspense>
      <Input initial={initial} />
    </Suspense>
  )
}
