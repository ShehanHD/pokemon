'use client'

import { X, Sparkles, Check } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const PRO_FEATURES = [
  'Wishlist tracking',
  'Sold copies & realized P/L',
  'Expense tracking',
  'Analytics dashboards',
  'Ad-free experience',
]

export default function UpgradeDialog({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-base border border-surface0 rounded-2xl p-6 w-[440px] max-w-[92vw] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-mauve" />
            <h2 className="font-russo text-base text-text">Upgrade to Pro</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-overlay0 hover:text-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-overlay1 mb-4">
          This feature is part of PokeVault Pro. Unlock the full toolkit for tracking,
          analyzing, and managing your collection.
        </p>

        <ul className="flex flex-col gap-2 mb-5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-text">
              <Check size={14} className="text-green flex-shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-mantle border border-surface0 rounded text-text focus:outline-none"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-mauve text-white rounded font-russo focus:outline-none"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  )
}
