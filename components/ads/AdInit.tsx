'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export default function AdInit() {
  const pushed = useRef(false)
  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({})
    } catch {
      // Script not yet loaded; AdSense retries automatically once script is ready.
    }
  }, [])
  return null
}
