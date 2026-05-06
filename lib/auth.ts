import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getDb } from './db'
import type { Tier } from './types'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
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
          }
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.tier = user.tier ?? 'free'
        token.id = user.id
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
          } else {
            token.tier = typeof existing.tier === 'string' ? existing.tier : 'free'
            token.id = existing._id.toString()
          }
        } catch (err) {
          console.error('[auth] jwt google callback error:', err)
          throw err
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? ''
        session.user.tier = (token.tier as Tier | undefined) ?? 'free'
      }
      return session
    },
  },
})
