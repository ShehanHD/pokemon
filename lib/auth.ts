import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getDb } from './db'
import type { Tier, Currency } from './types'

const CURRENCY_VALUES: Currency[] = ['EUR', 'USD', 'GBP', 'JPY']
const isCurrency = (v: unknown): v is Currency =>
  typeof v === 'string' && (CURRENCY_VALUES as string[]).includes(v)
import { authConfig } from './auth.config'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        try {
          const db = await getDb()
          const user = await db.collection('users').findOne({
            email: parsed.data.email,
            provider: 'credentials',
          })
          if (!user || !user.passwordHash) return null

          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash as string)
          if (!valid) return null

          return {
            id: user._id.toString(),
            email: user.email as string,
            name: user.name as string,
            image: (user.image as string | undefined) ?? null,
            tier: (typeof user.tier === 'string' ? user.tier : 'free') as Tier,
            themePokemonId:
              typeof user.themePokemonId === 'number' ? user.themePokemonId : undefined,
            currency: isCurrency(user.currency) ? user.currency : undefined,
          }
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.tier = user.tier ?? 'free'
        token.id = user.id
        token.themePokemonId = user.themePokemonId
        token.currency = user.currency
      }
      if (account?.provider === 'google') {
        try {
          const db = await getDb()
          const existing = await db.collection('users').findOne({ email: token.email })
          if (!existing) {
            const result = await db.collection('users').insertOne({
              email: token.email,
              name: token.name,
              image: token.picture,
              provider: 'google',
              tier: 'free',
              createdAt: new Date(),
            })
            token.id = result.insertedId.toString()
            token.tier = 'free'
            token.themePokemonId = undefined
            token.currency = undefined
          } else {
            token.tier = typeof existing.tier === 'string' ? existing.tier : 'free'
            token.id = existing._id.toString()
            token.themePokemonId =
              typeof existing.themePokemonId === 'number' ? existing.themePokemonId : undefined
            token.currency = isCurrency(existing.currency) ? existing.currency : undefined
          }
        } catch (err) {
          console.error('[auth] jwt google callback error:', err)
          throw err
        }
      }
      if (token.email === 'shehanhd@gmail.com') {
        token.tier = 'pro'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? ''
        session.user.tier = (token.tier as Tier | undefined) ?? 'free'
        session.user.themePokemonId =
          typeof token.themePokemonId === 'number' ? token.themePokemonId : undefined
        session.user.currency = isCurrency(token.currency) ? token.currency : undefined
      }
      return session
    },
  },
})
