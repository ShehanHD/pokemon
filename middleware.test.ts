import { describe, it, expect, vi } from 'vitest'

// Mock @/lib/auth so that auth() returns a function wrapping the handler
vi.mock('@/lib/auth', () => ({
  auth: vi.fn((handler: (req: unknown) => unknown) => handler),
}))

// Mock next/server to avoid Next.js runtime dependency
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url: URL) => ({ type: 'redirect', url })),
    next: vi.fn(() => ({ type: 'next' })),
  },
}))

describe('middleware module', () => {
  it('exports a default function', async () => {
    const mod = await import('./middleware')
    expect(typeof mod.default).toBe('function')
  })

  it('exports config with matcher', async () => {
    const mod = await import('./middleware')
    expect(mod.config).toBeDefined()
    expect(Array.isArray(mod.config.matcher)).toBe(true)
  })
})
