import 'next-auth'
import type { DefaultSession } from 'next-auth'
import type { Tier } from '@/lib/types'

declare module 'next-auth' {
  interface User {
    id?: string
    tier?: Tier
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string
      tier: Tier
    }
  }
}
