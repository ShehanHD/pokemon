'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Suspense } from 'react'
import type { CardsSort } from '@/lib/cards'
import type { NormalisedRarity } from '@/lib/taxonomy/rarity'

const SORT_OPTIONS: { value: CardsSort; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'price-desc', label: 'Price (high → low)' },
  { value: 'price-asc', label: 'Price (low → high)' },
  { value: 'release-desc', label: 'Newest first' },
  { value: 'release-asc', label: 'Oldest first' },
]

const RARITY_OPTIONS: NormalisedRarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Rare Holo',
  'Double Rare',
  'Ultra Rare',
  'Illustration Rare',
  'Special Illustration Rare',
  'Hyper Rare',
  'Mega Hyper Rare',
  'Trainer Gallery',
  'ACE SPEC Rare',
  'Promo',
]

const SUPERTYPE_OPTIONS = ['Pokémon', 'Trainer', 'Energy']

interface Props {
  sort: CardsSort
  rarity: NormalisedRarity | ''
  supertype: string
}

function Filters({ sort, rarity, supertype }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string, defaultValue: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === defaultValue) params.delete(key)
    else params.set(key, value)
    params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const selectClass =
    'bg-mantle border border-surface0 rounded-md text-xs text-text px-2 py-1.5 focus:outline-none focus:border-blue transition-colors cursor-pointer'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Sort"
        value={sort}
        onChange={(e) => update('sort', e.target.value, 'name')}
        className={selectClass}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        aria-label="Rarity"
        value={rarity}
        onChange={(e) => update('rarity', e.target.value, '')}
        className={selectClass}
      >
        <option value="">All rarities</option>
        {RARITY_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <select
        aria-label="Supertype"
        value={supertype}
        onChange={(e) => update('supertype', e.target.value, '')}
        className={selectClass}
      >
        <option value="">All types</option>
        {SUPERTYPE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}

export default function BrowseFilters(props: Props) {
  return (
    <Suspense>
      <Filters {...props} />
    </Suspense>
  )
}
