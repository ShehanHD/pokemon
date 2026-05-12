'use client'

import { useEffect, useState, type ReactNode } from 'react'

const CARD_WIDTH_MIN = 120
const CARD_WIDTH_MAX = 280
const CARD_WIDTH_STEP = 10
const CARD_WIDTH_DEFAULT = 170
const CARD_WIDTH_STORAGE_KEY = 'pokevault.cardsGridWidth'
const CARD_WIDTH_EVENT = 'pokevault:cardWidthChange'

function readStoredWidth(): number {
  if (typeof window === 'undefined') return CARD_WIDTH_DEFAULT
  const stored = window.localStorage.getItem(CARD_WIDTH_STORAGE_KEY)
  if (!stored) return CARD_WIDTH_DEFAULT
  const n = Number(stored)
  if (Number.isFinite(n) && n >= CARD_WIDTH_MIN && n <= CARD_WIDTH_MAX) return n
  return CARD_WIDTH_DEFAULT
}

function useCardGridWidth(): [number, (n: number) => void] {
  const [cardWidth, setCardWidth] = useState<number>(CARD_WIDTH_DEFAULT)

  useEffect(() => {
    setCardWidth(readStoredWidth())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail
      if (typeof detail === 'number') setCardWidth(detail)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === CARD_WIDTH_STORAGE_KEY) setCardWidth(readStoredWidth())
    }
    window.addEventListener(CARD_WIDTH_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CARD_WIDTH_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const update = (n: number) => {
    setCardWidth(n)
    window.localStorage.setItem(CARD_WIDTH_STORAGE_KEY, String(n))
    window.dispatchEvent(new CustomEvent<number>(CARD_WIDTH_EVENT, { detail: n }))
  }

  return [cardWidth, update]
}

export function CardSizeSlider({ className = '' }: { className?: string }) {
  const [cardWidth, setCardWidth] = useCardGridWidth()
  return (
    <label className={`flex items-center gap-2 text-[11px] text-overlay1 shrink-0 ${className}`}>
      <span className="hidden sm:inline">Card size</span>
      <input
        type="range"
        min={CARD_WIDTH_MIN}
        max={CARD_WIDTH_MAX}
        step={CARD_WIDTH_STEP}
        value={cardWidth}
        onChange={(e) => setCardWidth(Number(e.target.value))}
        aria-label="Card grid size"
        className="w-24 sm:w-32 accent-blue cursor-pointer"
      />
    </label>
  )
}

export function ResizableCardGrid({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const [cardWidth] = useCardGridWidth()
  return (
    <div
      className={`grid gap-2 ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
    >
      {children}
    </div>
  )
}
