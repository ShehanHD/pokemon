'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'

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

  const activeCount = KEYS.reduce((n, k) => n + params.getAll(k).length, 0)
  const [open, setOpen] = useState(activeCount > 0)

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

  const clearAll = useCallback(() => {
    const next = new URLSearchParams(params.toString())
    for (const k of KEYS) next.delete(k)
    router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ''}`, { scroll: false })
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-surface0 bg-base text-overlay1 hover:border-blue/50 transition-colors"
        >
          <span className="uppercase tracking-wider">Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 rounded-full bg-blue text-white text-[10px] leading-4">{activeCount}</span>
          )}
          <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] uppercase tracking-wider text-overlay0 hover:text-text"
          >
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2 p-2 rounded-md border border-surface0 bg-mantle/40">
          {renderGroup('Rarity', 'rarity', rarities)}
          {renderGroup('Type', 'type', types)}
          {renderGroup('Variant', 'variant', variants)}
          {renderGroup('Subtype', 'subtype', subtypes)}
        </div>
      )}
    </div>
  )
}
