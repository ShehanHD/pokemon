import type { Metadata } from 'next'
import { Russo_One, Chakra_Petch } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${russoOne.variable} ${chakraPetch.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
