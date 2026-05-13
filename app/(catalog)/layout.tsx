import type { ReactNode } from 'react'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { resolveTheme } from '@/lib/themes/resolve'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import ScrollRestorer from '@/components/layout/ScrollRestorer'
import AdsLayer, { getAdsLayerState } from '@/components/ads/AdsLayer'
import AuthDialogProvider from '@/components/auth/AuthDialogProvider'

export default async function CatalogLayout({ children }: { children: ReactNode }) {
  const session: Session | null = await auth()
  // Intentionally no redirect — catalog routes are public

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('theme-pokemon')?.value ?? null
  const sidebarCollapsed = cookieStore.get('sidebar-collapsed')?.value === '1'
  const theme = resolveTheme(manifest as ThemeManifest, {
    cookie: cookieValue,
    userTier: session?.user?.tier,
    userPokemonId: session?.user?.themePokemonId ?? null,
  })
  const themePokemonId = cookieValue && /^\d+$/.test(cookieValue)
    ? Number(cookieValue)
    : (session?.user?.themePokemonId ?? null)

  const tier = session?.user?.tier ?? 'free'
  const ads = await getAdsLayerState(tier)

  return (
    <SessionProvider session={session}>
      <AuthDialogProvider>
        <div className="flex h-screen overflow-hidden bg-[ghostwhite]">
          <Sidebar initialCollapsed={sidebarCollapsed} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Topbar themePokemonId={theme ? themePokemonId : null} themeName={theme?.name ?? null} />
            <main className="flex-1 overflow-y-auto p-4">
              <ScrollRestorer />
              {children}
            </main>
          </div>
        </div>
        <AdsLayer {...ads} />
      </AuthDialogProvider>
    </SessionProvider>
  )
}
