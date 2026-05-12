import 'next-auth'
import type { DefaultSession } from 'next-auth'
import type { Tier, Currency } from '@/lib/types'

declare module 'next-auth' {
  interface User {
    id?: string
    tier?: Tier
    themePokemonId?: number
    currency?: Currency
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string
      tier: Tier
      themePokemonId?: number
      currency?: Currency
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    tier?: Tier
    themePokemonId?: number
    currency?: Currency
  }
}
