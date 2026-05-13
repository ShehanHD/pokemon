'use client'

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import LoginDialog from './LoginDialog'
import UpgradeDialog from './UpgradeDialog'

interface AuthDialogContextValue {
  openLogin: (callbackUrl?: string) => void
  openUpgrade: () => void
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null)

export function useAuthDialog(): AuthDialogContextValue {
  const ctx = useContext(AuthDialogContext)
  if (!ctx) throw new Error('useAuthDialog must be used inside <AuthDialogProvider>')
  return ctx
}

interface DialogState {
  loginOpen: boolean
  setLoginOpen: (v: boolean) => void
  loginCallback: string
  setLoginCallback: (v: string) => void
  upgradeOpen: boolean
  setUpgradeOpen: (v: boolean) => void
}

function SearchParamWatcher({
  setLoginOpen,
  setLoginCallback,
  setUpgradeOpen,
}: Pick<DialogState, 'setLoginOpen' | 'setLoginCallback' | 'setUpgradeOpen'>) {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams?.get('upgrade') === '1') {
      setUpgradeOpen(true)
    }
    if (searchParams?.get('login') === '1') {
      const cb = searchParams.get('callbackUrl')
      setLoginCallback(cb && cb.startsWith('/') ? cb : '/dashboard')
      setLoginOpen(true)
    }
  }, [searchParams, setLoginOpen, setLoginCallback, setUpgradeOpen])

  return null
}

export default function AuthDialogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [loginOpen, setLoginOpen] = useState(false)
  const [loginCallback, setLoginCallback] = useState<string>('/dashboard')
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const openLogin = useCallback((callbackUrl?: string) => {
    setLoginCallback(callbackUrl ?? '/dashboard')
    setLoginOpen(true)
  }, [])

  const openUpgrade = useCallback(() => {
    setUpgradeOpen(true)
  }, [])

  const stripQueryParam = useCallback(
    (keys: string[]) => {
      if (typeof window === 'undefined') return
      const current = new URLSearchParams(window.location.search)
      let changed = false
      for (const k of keys) {
        if (current.has(k)) {
          current.delete(k)
          changed = true
        }
      }
      if (!changed) return
      const qs = current.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname],
  )

  const closeUpgrade = useCallback(() => {
    setUpgradeOpen(false)
    stripQueryParam(['upgrade'])
  }, [stripQueryParam])

  const closeLogin = useCallback(() => {
    setLoginOpen(false)
    stripQueryParam(['login', 'callbackUrl'])
  }, [stripQueryParam])

  const value = useMemo(() => ({ openLogin, openUpgrade }), [openLogin, openUpgrade])

  return (
    <AuthDialogContext.Provider value={value}>
      <Suspense fallback={null}>
        <SearchParamWatcher
          setLoginOpen={setLoginOpen}
          setLoginCallback={setLoginCallback}
          setUpgradeOpen={setUpgradeOpen}
        />
      </Suspense>
      {children}
      <LoginDialog open={loginOpen} onClose={closeLogin} callbackUrl={loginCallback} />
      <UpgradeDialog open={upgradeOpen} onClose={closeUpgrade} />
    </AuthDialogContext.Provider>
  )
}
