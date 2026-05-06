'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface FilterBarProps {
  rarities: string[]
  types: string[]
  variants: string[]
  subtypes: string[]
}

const KEYS = ['rarity', 'type', 'variant', 'subtype'] as const
type FilterKey = typeof KEYS[number]

export default function FilterBar({ rarities, types, variants, subtypes }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const toggle = useCallback((key: FilterKey, value: string) => {
    const next = new URLSearchParams(params.toString())
    const current = next.getAll(key)
    next.delete(key)
    if (current.includes(value)) {
      for (const v of current) if (v !== value) next.append(key, v)
    } else {
      for (const v of current) next.append(key, v)
      next.append(key, value)
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [params, pathname, router])

  const renderGroup = (label: string, key: FilterKey, values: string[]) => {
    if (values.length === 0) return null
    const selected = new Set(params.getAll(key))
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-overlay0 mr-1">{label}</span>
        {values.map((v) => {
          const on = selected.has(v)
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key, v)}
              className={[
                'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                on
                  ? 'bg-blue text-white border-blue'
                  : 'bg-base text-overlay1 border-surface0 hover:border-blue/50',
              ].join(' ')}
            >
              {v}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {renderGroup('Rarity', 'rarity', rarities)}
      {renderGroup('Type', 'type', types)}
      {renderGroup('Variant', 'variant', variants)}
      {renderGroup('Subtype', 'subtype', subtypes)}
    </div>
  )
}
