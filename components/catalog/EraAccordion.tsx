'use client'

import { useState, type ReactNode } from 'react'
import type { Era } from '@/lib/taxonomy/era'

interface EraSectionProps {
  era: Era
  defaultOpen: boolean
  children: ReactNode
}

export function EraSection({ era, defaultOpen, children }: EraSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 mb-3 text-sm font-russo uppercase tracking-wider text-mauve"
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>{era}</span>
      </button>
      {open && children}
    </section>
  )
}
