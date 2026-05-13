'use client'

import { Suspense, useEffect, useLayoutEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const STORAGE_PREFIX = 'pv:scroll:'

function findScrollMain(): HTMLElement | null {
  const mains = document.getElementsByTagName('main')
  for (const m of Array.from(mains)) {
    const style = getComputedStyle(m)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') return m
  }
  return mains[0] ?? null
}

type Anchor = { id: string; offset: number }
type Stored = { kind: 'anchor'; anchor: Anchor; scrollTop: number } | { kind: 'pixel'; scrollTop: number }

function captureAnchor(main: HTMLElement): Anchor | null {
  const mainTop = main.getBoundingClientRect().top
  const candidates = main.querySelectorAll<HTMLElement>('[id]')
  let best: Anchor | null = null
  let bestOffset = Infinity
  for (const el of Array.from(candidates)) {
    const offset = el.getBoundingClientRect().top - mainTop
    // Topmost element whose top is at or below the viewport top.
    // Use a small negative tolerance so a card whose top is just above the
    // viewport edge (partially visible) still anchors correctly.
    if (offset >= -8 && offset < bestOffset) {
      bestOffset = offset
      best = { id: el.id, offset }
    }
  }
  return best
}

function parseStored(raw: string | null): Stored | null {
  if (raw === null) return null
  // Backwards-compat: legacy entries are bare numbers.
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw)
    return Number.isFinite(n) ? { kind: 'pixel', scrollTop: n } : null
  }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.kind === 'anchor' &&
        parsed.anchor && typeof parsed.anchor.id === 'string' &&
        typeof parsed.anchor.offset === 'number' &&
        typeof parsed.scrollTop === 'number') {
      return parsed as Stored
    }
    if (parsed && typeof parsed === 'object' && parsed.kind === 'pixel' &&
        typeof parsed.scrollTop === 'number') {
      return parsed as Stored
    }
  } catch {}
  return null
}

function Inner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const key = `${STORAGE_PREFIX}${pathname}${search ? `?${search}` : ''}`

  useLayoutEffect(() => {
    const main = findScrollMain()
    if (!main) return

    const raw = sessionStorage.getItem(key)
    const stored = parseStored(raw)
    if (!stored) return

    let cancelled = false
    const start = performance.now()

    const cancel = () => {
      if (cancelled) return
      cancelled = true
    }
    main.addEventListener('wheel', cancel, { passive: true, once: true })
    main.addEventListener('touchstart', cancel, { passive: true, once: true })
    window.addEventListener('keydown', cancel, { once: true })

    const apply = () => {
      if (cancelled) return

      let desiredScrollTop: number
      let anchored = false

      if (stored.kind === 'anchor') {
        const el = document.getElementById(stored.anchor.id)
        if (el) {
          const mainTop = main.getBoundingClientRect().top
          const elTop = el.getBoundingClientRect().top
          const currentOffset = elTop - mainTop
          desiredScrollTop = main.scrollTop + (currentOffset - stored.anchor.offset)
          anchored = true
        } else {
          desiredScrollTop = stored.scrollTop
        }
      } else {
        desiredScrollTop = stored.scrollTop
      }

      const maxScroll = Math.max(main.scrollHeight - main.clientHeight, 0)
      const effective = Math.min(Math.max(desiredScrollTop, 0), maxScroll)
      if (Math.abs(main.scrollTop - effective) > 1) {
        main.scrollTop = effective
      }

      const elapsed = performance.now() - start
      const reached = Math.abs(main.scrollTop - desiredScrollTop) <= 1

      if (!reached && elapsed < 1500) {
        requestAnimationFrame(apply)
      }
    }
    apply()

    return () => {
      cancelled = true
      main.removeEventListener('wheel', cancel)
      main.removeEventListener('touchstart', cancel)
      window.removeEventListener('keydown', cancel)
    }
  }, [key])

  useEffect(() => {
    const main = findScrollMain()
    if (!main) return

    let lastScrollInputAt = 0
    const markScroll = () => { lastScrollInputAt = performance.now() }
    main.addEventListener('wheel', markScroll, { passive: true })
    main.addEventListener('touchmove', markScroll, { passive: true })
    window.addEventListener('keydown', markScroll)

    let settleTimer: number | null = null
    const onScroll = () => {
      if (settleTimer !== null) clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        settleTimer = null
        // Programmatic scrollTop=0 from Next.js navigation should not clobber
        // a real saved position. Only persist 0 when the user actually drove there.
        if (main.scrollTop === 0 && performance.now() - lastScrollInputAt > 200) return
        const anchor = captureAnchor(main)
        const payload: Stored = anchor
          ? { kind: 'anchor', anchor, scrollTop: main.scrollTop }
          : { kind: 'pixel', scrollTop: main.scrollTop }
        sessionStorage.setItem(key, JSON.stringify(payload))
      }, 150)
    }
    main.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      if (settleTimer !== null) clearTimeout(settleTimer)
      main.removeEventListener('scroll', onScroll)
      main.removeEventListener('wheel', markScroll)
      main.removeEventListener('touchmove', markScroll)
      window.removeEventListener('keydown', markScroll)
    }
  }, [key])

  return null
}

export default function ScrollRestorer() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
