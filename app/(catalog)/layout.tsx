import type { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default async function CatalogLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  // Intentionally no redirect — catalog routes are public

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-crust">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
