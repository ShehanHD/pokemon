'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Suspense } from 'react'

type Value = 'all' | 'owned' | 'not-owned'

const OPTIONS: { value: Value; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'In collection' },
  { value: 'not-owned', label: 'Not in collection' },
]

function Buttons({ current }: { current: Value }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function select(v: Value) {
    const params = new URLSearchParams(searchParams.toString())
    if (v === 'all') params.delete('collection')
    else params.set('collection', v)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(value)}
          className={[
            'px-2 py-1 rounded text-[11px] font-medium border transition-colors',
            current === value
              ? 'bg-blue text-white border-blue'
              : 'bg-mantle text-overlay1 border-surface0 hover:text-text',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function CollectionFilter({ value }: { value: Value }) {
  return (
    <Suspense>
      <Buttons current={value} />
    </Suspense>
  )
}
