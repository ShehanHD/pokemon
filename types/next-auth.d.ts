import 'next-auth'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id?: string
    tier?: string
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string
      tier: string
    }
  }
}
