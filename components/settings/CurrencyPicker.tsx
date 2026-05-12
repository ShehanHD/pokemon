'use client'

import { useState, useTransition } from 'react'
import type { Currency } from '@/lib/types'

interface CurrencyPickerProps {
  current: Currency
  onSelect: (currency: Currency) => Promise<void>
}

const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
]

export default function CurrencyPicker({ current, onSelect }: CurrencyPickerProps) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Currency>(current)

  const handleClick = (code: Currency) => {
    if (code === selected || pending) return
    setSelected(code)
    startTransition(() => {
      void onSelect(code)
    })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {CURRENCIES.map(({ code, symbol, label }) => {
        const active = code === selected
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            onClick={() => handleClick(code)}
            className={`px-3 py-2 rounded-lg border text-left transition-colors disabled:opacity-50 ${
              active
                ? 'bg-blue/15 border-blue/40 text-blue'
                : 'bg-mantle border-surface0 text-overlay2 hover:border-overlay0'
            }`}
          >
            <div className="font-russo text-base">
              {symbol} {code}
            </div>
            <div className="text-[10px] text-overlay1">{label}</div>
          </button>
        )
      })}
    </div>
  )
}
