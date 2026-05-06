'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export const SORT_OPTIONS = [
  { value: 'set-order',   label: 'Set order' },
  { value: 'name-asc',    label: 'Name asc' },
  { value: 'name-desc',   label: 'Name desc' },
  { value: 'number-asc',  label: 'Number asc' },
  { value: 'number-desc', label: 'Number desc' },
  { value: 'rarity',      label: 'Rarity' },
] as const

export type SortValue = typeof SORT_OPTIONS[number]['value']

export default function SortMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const current = (params.get('sort') ?? 'set-order') as SortValue

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString())
        if (e.target.value === 'set-order') next.delete('sort')
        else next.set('sort', e.target.value)
        router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      }}
      className="text-[11px] bg-base border border-surface0 rounded px-2 py-1 text-text"
      aria-label="Sort cards"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
