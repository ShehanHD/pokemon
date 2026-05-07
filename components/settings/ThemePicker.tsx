'use client'

import { useState } from 'react'
import type { Tier } from '@/lib/types'
import type { ThemeEntry, ThemeManifest } from '@/lib/schemas/theme'
import { tierAllows } from '@/lib/themes/resolve'
import UpgradeDialog from './UpgradeDialog'

interface ThemePickerProps {
  manifest: ThemeManifest
  userTier: Tier
  currentPokemonId: number | null
  onSelect: (id: number | null) => Promise<void>
}

interface LockedTarget { id: number; entry: ThemeEntry }

export default function ThemePicker({ manifest, userTier, currentPokemonId, onSelect }: ThemePickerProps) {
  const [locked, setLocked] = useState<LockedTarget | null>(null)

  const TIER_ORDER: Record<Tier, number> = { free: 0, adfree: 1, pro: 2 }
  const entries = Object.entries(manifest)
    .map(([id, entry]) => ({ id: Number(id), entry }))
    .sort((a, b) => {
      const t = TIER_ORDER[a.entry.tier] - TIER_ORDER[b.entry.tier]
      return t !== 0 ? t : a.id - b.id
    })

  const handleClick = (id: number, entry: ThemeEntry) => {
    if (!tierAllows(userTier, entry.tier)) {
      setLocked({ id, entry })
      return
    }
    void onSelect(id)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        <button
          type="button"
          onClick={() => void onSelect(null)}
          data-selected={currentPokemonId === null}
          aria-label="Default — no theme"
          className="aspect-square rounded-lg border border-surface0 bg-base text-xs text-overlay1 hover:bg-surface0 data-[selected=true]:ring-2 data-[selected=true]:ring-blue"
        >
          Default
        </button>

        {entries.map(({ id, entry }) => {
          const allowed = tierAllows(userTier, entry.tier)
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleClick(id, entry)}
              data-selected={currentPokemonId === id}
              aria-label={entry.name}
              className="relative aspect-square rounded-lg border border-surface0 bg-base flex flex-col items-center justify-center p-1 hover:bg-surface0 data-[selected=true]:ring-2 data-[selected=true]:ring-blue"
              style={{ backgroundColor: entry.primary + '22' }}
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`}
                alt=""
                loading="lazy"
                className={`w-12 h-12 object-contain ${allowed ? '' : 'opacity-30'}`}
              />
              <span className={`mt-1 text-[10px] truncate w-full text-center ${allowed ? 'text-text' : 'text-overlay0'}`}>
                {entry.name}
              </span>
              <span
                className="absolute top-1 right-1 text-[8px] px-1 rounded uppercase"
                style={{ background: entry.tier === 'free' ? '#10b98155' : entry.tier === 'adfree' ? '#f59e0b55' : '#ec489955' }}
              >
                {entry.tier}
              </span>
              {!allowed && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-2xl">🔒</span>}
            </button>
          )
        })}
      </div>

      <UpgradeDialog
        open={locked !== null}
        requiredTier={locked?.entry.tier ?? 'pro'}
        pokemonName={locked?.entry.name ?? ''}
        onClose={() => setLocked(null)}
      />
    </div>
  )
}
