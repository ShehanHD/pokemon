import type { Metadata } from 'next'
import { Russo_One, Chakra_Petch } from 'next/font/google'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { resolveTheme } from '@/lib/themes/resolve'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'
import './globals.css'

const russoOne = Russo_One({
  variable: '--font-russo',
  subsets: ['latin'],
  weight: '400',
})

const chakraPetch = Chakra_Petch({
  variable: '--font-chakra',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'PokeVault — Pokemon TCG Collector',
  description: 'Track your Pokémon TCG collection, monitor Cardmarket prices in EUR, and manage your cards.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = await auth()
  const theme = resolveTheme(manifest as ThemeManifest, {
    cookie: cookieStore.get('theme-pokemon')?.value ?? null,
    userTier: session?.user?.tier,
    userPokemonId: session?.user?.themePokemonId ?? null,
  })
  const styleAttr = theme
    ? ({
        ['--color-blue' as string]: theme.primary,
        ['--color-mauve' as string]: theme.accent,
        ['--color-mantle' as string]: theme.mantle,
      } as React.CSSProperties)
    : undefined

  return (
    <html lang="it" style={styleAttr}>
      <body className={`${russoOne.variable} ${chakraPetch.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
