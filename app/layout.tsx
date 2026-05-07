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
        ['--color-crust' as string]: theme.crust,
        ['--color-base' as string]: theme.base,
        ['--color-text' as string]: theme.text,
        ['--color-subtext1' as string]: theme.subtext1,
        ['--color-subtext0' as string]: theme.subtext0,
        ['--color-overlay2' as string]: theme.overlay2,
        ['--color-overlay1' as string]: theme.overlay1,
        ['--color-overlay0' as string]: theme.overlay0,
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
