'use client'

import type { Tier } from '@/lib/types'

interface UpgradeDialogProps {
  open: boolean
  requiredTier: Tier
  pokemonName: string
  onClose: () => void
}

const TIER_COPY: Record<Tier, string> = {
  free: 'Free',
  adfree: 'Adfree',
  pro: 'Pro',
}

export default function UpgradeDialog({ open, requiredTier, pokemonName, onClose }: UpgradeDialogProps) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-base border border-surface0 rounded-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="upgrade-title" className="text-lg font-russo text-text mb-2">Unlock {pokemonName}</h2>
        <p className="text-sm text-overlay1 mb-4">
          {pokemonName} is available on the {TIER_COPY[requiredTier]} plan. Upgrade to unlock it as a theme.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-surface0 text-overlay1 hover:bg-surface0"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1.5 text-sm rounded bg-blue text-white opacity-60 cursor-not-allowed"
          >
            Upgrade (coming soon)
          </button>
        </div>
      </div>
    </div>
  )
}
