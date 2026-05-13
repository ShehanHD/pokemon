import 'next-auth'
import type { DefaultSession } from 'next-auth'
import type { Tier } from '@/lib/types'

declare module 'next-auth' {
  interface User {
    id?: string
    tier?: Tier
    themePokemonId?: number
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string
      tier: Tier
      themePokemonId?: number
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    tier?: Tier
    themePokemonId?: number
  }
}
