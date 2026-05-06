import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getDb } from './db'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

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
          tier: user.tier as string,
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
        token.tier = (user as { tier?: string }).tier ?? 'free'
        token.id = user.id
      }
      if (account?.provider === 'google') {
        const db = await getDb()
        const existing = await db.collection('users').findOne({ email: token.email })
        if (!existing) {
          await db.collection('users').insertOne({
            email: token.email,
            name: token.name,
            image: token.picture,
            provider: 'google',
            tier: 'free',
            createdAt: new Date(),
          })
          token.tier = 'free'
        } else {
          token.tier = existing.tier as string
          token.id = existing._id.toString()
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.tier = token.tier as string
      }
      return session
    },
  },
})
