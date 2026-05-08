'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface Props {
  allSeries: Array<{ slug: string; name: string }>
  allRarities: string[]
}

export default function CollectionFilters({ allSeries, allRarities }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        type="search"
        placeholder="Search name or number"
        defaultValue={sp.get('q') ?? ''}
        onBlur={(e) => update('q', e.target.value.trim())}
        className="px-3 py-1.5 rounded border border-surface0 bg-base text-sm"
        aria-label="Search"
      />
      <label className="text-xs text-overlay1">Series
        <select
          value={sp.get('series') ?? ''}
          onChange={(e) => update('series', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="">All</option>
          {allSeries.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </label>
      <label className="text-xs text-overlay1">Rarity
        <select
          value={sp.get('rarity') ?? ''}
          onChange={(e) => update('rarity', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="">All</option>
          {allRarities.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label className="text-xs text-overlay1">Type
        <select
          value={sp.get('type') ?? ''}
          onChange={(e) => update('type', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="">All</option>
          <option value="raw">Raw</option>
          <option value="graded">Graded</option>
        </select>
      </label>
      <label className="text-xs text-overlay1">Sort
        <select
          value={sp.get('sort') ?? 'recent'}
          onChange={(e) => update('sort', e.target.value)}
          className="ml-1 px-2 py-1 rounded border border-surface0 bg-base text-sm"
        >
          <option value="recent">Recently added</option>
          <option value="name">Name</option>
          <option value="release">Release date</option>
          <option value="count">Copy count</option>
          <option value="cost">Total cost</option>
        </select>
      </label>
    </div>
  )
}
