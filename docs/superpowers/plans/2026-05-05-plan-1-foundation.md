# Plan 1: Foundation — Pokemon TCG Catalog

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working Next.js 15 app with MongoDB connection, Auth.js v5 (credentials + Google OAuth), a protected app shell (sidebar + topbar), and a Vercel-ready deployment config.

**Architecture:** Next.js 15 App Router on Vercel. Two route groups: `(auth)` for login/register pages and `(app)` for the protected application. Auth.js v5 handles sessions with JWT strategy. MongoDB uses a cached global client to survive dev hot-reload.

**Tech Stack:** Next.js 15, TypeScript strict, Auth.js v5 (next-auth@beta), MongoDB driver, bcryptjs, Zod, Vitest, Tailwind CSS, Catppuccin Mocha color scheme.

---

## File Structure

```
pokemon/
├── app/
│   ├── layout.tsx                        # Root layout — fonts, lang, metadata
│   ├── page.tsx                          # Redirect to /browse
│   ├── globals.css                       # Catppuccin CSS vars + Tailwind base
│   ├── (auth)/
│   │   ├── layout.tsx                    # Centered card layout
│   │   ├── login/page.tsx                # Credentials form + Google button
│   │   └── register/page.tsx             # Registration form
│   ├── (app)/
│   │   ├── layout.tsx                    # SessionProvider + Sidebar + Topbar wrapper
│   │   ├── dashboard/page.tsx            # 4 stat cards (stub values)
│   │   └── browse/page.tsx               # Browse stub
│   └── api/
│       └── auth/
│           ├── [...nextauth]/route.ts    # Auth.js handler
│           └── register/route.ts         # POST /api/auth/register
├── components/
│   └── layout/
│       ├── Sidebar.tsx                   # Sidebar nav with Pro badges
│       └── Topbar.tsx                    # Page title + search + locale badge
├── lib/
│   ├── db.ts                             # MongoDB connection (global clientPromise)
│   ├── auth.ts                           # Auth.js config (providers, callbacks)
│   └── types.ts                          # Shared TypeScript interfaces
├── middleware.ts                          # Route protection
├── vitest.config.ts                       # Vitest setup
├── .env.example                           # Required env vars (no secrets)
└── tailwind.config.ts                     # Catppuccin color aliases
```

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `pokemon/` (project root via create-next-app)
- Create: `vitest.config.ts`
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Scaffold the project**

Run from the parent directory (`Desktop/Software/`):
```bash
npx create-next-app@latest pokemon \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-eslint
```
Expected: project created in `pokemon/`, installs succeed.

- [ ] **Step 2: Install dependencies**

```bash
cd pokemon
npm install mongodb next-auth@beta bcryptjs zod
npm install --save-dev vitest @vitejs/plugin-react @vitest/coverage-v8 @types/bcryptjs
```
Expected: all installs succeed, no peer dep errors.

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Add Catppuccin Mocha color aliases to Tailwind**

Replace `tailwind.config.ts` content:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#1e1e2e',
        mantle: '#181825',
        crust: '#11111b',
        surface0: '#313244',
        surface1: '#45475a',
        surface2: '#585b70',
        overlay0: '#6c7086',
        overlay1: '#7f849c',
        overlay2: '#9399b2',
        subtext0: '#a6adc8',
        subtext1: '#bac2de',
        text: '#cdd6f4',
        lavender: '#b4befe',
        blue: '#89b4fa',
        sapphire: '#74c7ec',
        sky: '#89dceb',
        teal: '#94e2d5',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        peach: '#fab387',
        maroon: '#eba0ac',
        red: '#f38ba8',
        mauve: '#cba6f7',
        pink: '#f5c2e7',
        flamingo: '#f2cdcd',
        rosewater: '#f5e0dc',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Set Catppuccin CSS variables in globals.css**

Replace `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --base: #1e1e2e;
  --mantle: #181825;
  --crust: #11111b;
  --surface0: #313244;
  --text: #cdd6f4;
  --overlay0: #6c7086;
  --blue: #89b4fa;
  --mauve: #cba6f7;
  --green: #a6e3a1;
  --red: #f38ba8;
}

body {
  background-color: var(--base);
  color: var(--text);
  font-family: var(--font-geist-sans), sans-serif;
}
```

- [ ] **Step 6: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Run Vitest to verify setup**

```bash
npx vitest run
```
Expected: `No test files found` — setup is correct, runner works.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 15 app with Tailwind, Vitest, Catppuccin theme"
```

---

## Task 2: MongoDB Connection

**Files:**
- Create: `lib/db.ts`
- Create: `lib/types.ts`
- Create: `lib/__tests__/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/db.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

// We test the module structure, not the live connection
describe('db module', () => {
  it('exports getDb function', async () => {
    // Dynamic import avoids module-level connection during tests
    const mod = await import('../db')
    expect(typeof mod.getDb).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/__tests__/db.test.ts
```
Expected: FAIL — `lib/db.ts` does not exist yet.

- [ ] **Step 3: Create lib/types.ts**

```typescript
export type Tier = 'free' | 'adfree' | 'pro'

export interface User {
  _id?: string
  email: string
  name: string
  image?: string
  provider: 'credentials' | 'google'
  tier: Tier
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  createdAt: Date
  passwordHash?: string
}
```

- [ ] **Step 4: Create lib/db.ts**

```typescript
import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  clientPromise = new MongoClient(uri).connect()
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db(dbName)
}

export default clientPromise
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run lib/__tests__/db.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/db.ts lib/types.ts lib/__tests__/db.test.ts
git commit -m "feat: add MongoDB connection helper and shared types"
```

---

## Task 3: Auth.js v5 Configuration

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('auth config', () => {
  it('exports handlers and auth', async () => {
    const mod = await import('../auth')
    expect(typeof mod.auth).toBe('function')
    expect(typeof mod.handlers).toBe('object')
    expect(typeof mod.signIn).toBe('function')
    expect(typeof mod.signOut).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/__tests__/auth.test.ts
```
Expected: FAIL — `lib/auth.ts` does not exist yet.

- [ ] **Step 3: Create lib/auth.ts**

```typescript
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

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          tier: user.tier,
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
          token.tier = existing.tier
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
```

- [ ] **Step 4: Extend NextAuth types**

Create `types/next-auth.d.ts`:
```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      tier: string
    }
  }
}
```

- [ ] **Step 5: Create the route handler**

Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run lib/__tests__/auth.test.ts
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts app/api/auth types/next-auth.d.ts lib/__tests__/auth.test.ts
git commit -m "feat: configure Auth.js v5 with Google and credentials providers"
```

---

## Task 4: Registration API

**Files:**
- Create: `app/api/auth/register/route.ts`
- Create: `app/api/auth/register/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/auth/register/__tests__/route.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db and bcryptjs
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}))
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed_pw') },
}))

import { POST } from '../route'
import { getDb } from '@/lib/db'

const mockDb = {
  collection: vi.fn().mockReturnValue({
    findOne: vi.fn(),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'new-id' }),
  }),
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb as never)
    mockDb.collection().findOne.mockResolvedValue(null)
  })

  it('returns 400 for invalid payload', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'short' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when email already registered', async () => {
    mockDb.collection().findOne.mockResolvedValue({ email: 'a@b.com' })
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'password123', name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 201 on successful registration', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@b.com', password: 'password123', name: 'New User' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run app/api/auth/register/__tests__/route.test.ts
```
Expected: FAIL — route does not exist.

- [ ] **Step 3: Create the registration route**

Create `app/api/auth/register/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from '@/lib/db'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { email, password, name } = parsed.data
  const db = await getDb()

  const existing = await db.collection('users').findOne({ email })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.collection('users').insertOne({
    email,
    name,
    passwordHash,
    provider: 'credentials',
    tier: 'free',
    createdAt: new Date(),
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run app/api/auth/register/__tests__/route.test.ts
```
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/register/
git commit -m "feat: add POST /api/auth/register endpoint with Zod validation"
```

---

## Task 5: Auth Pages (Login + Register)

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Create the auth layout**

Create `app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-crust flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-mantle border border-surface0 rounded-xl p-8">
        <div className="text-center mb-6">
          <span className="text-2xl font-black text-text">Poke</span>
          <span className="text-2xl font-black text-red">Vault</span>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the login page**

Create `app/(auth)/login/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password.')
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <>
      <h1 className="text-lg font-bold text-text text-center mb-6">Sign in</h1>

      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-sm rounded-lg px-4 py-2 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-overlay0 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-overlay0 mb-1">Password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue text-crust font-semibold py-2 rounded-lg text-sm hover:bg-blue/90 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-surface0" />
        <span className="text-xs text-overlay0">or</span>
        <div className="flex-1 h-px bg-surface0" />
      </div>

      <button
        onClick={() => signIn('google', { callbackUrl })}
        className="w-full bg-base border border-surface0 text-text font-medium py-2 rounded-lg text-sm hover:border-blue"
      >
        Continue with Google
      </button>

      <p className="text-center text-xs text-overlay0 mt-6">
        No account?{' '}
        <Link href="/register" className="text-blue hover:underline">
          Register
        </Link>
      </p>
    </>
  )
}
```

- [ ] **Step 3: Create the register page**

Create `app/(auth)/register/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed.')
      setLoading(false)
      return
    }

    // Auto sign-in after registration
    await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      callbackUrl: '/dashboard',
    })
  }

  return (
    <>
      <h1 className="text-lg font-bold text-text text-center mb-6">Create account</h1>

      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-sm rounded-lg px-4 py-2 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-overlay0 mb-1">Name</label>
          <input
            name="name"
            type="text"
            required
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-overlay0 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-overlay0 mb-1">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full bg-base border border-surface0 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-blue"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue text-crust font-semibold py-2 rounded-lg text-sm hover:bg-blue/90 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-xs text-overlay0 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-blue hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add login and register pages with credentials + Google OAuth"
```

---

## Task 6: App Shell — Sidebar and Topbar

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/Topbar.tsx`
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

Create `components/layout/Sidebar.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', section: 'main' },
  { href: '/browse', label: 'Browse', icon: '📦', section: 'main' },
  { href: '/collection', label: 'My Cards', icon: '🗂️', section: 'collection' },
  { href: '/wishlist', label: 'Wishlist', icon: '⭐', section: 'collection', pro: true },
  { href: '/analytics', label: 'Analytics', icon: '📈', section: 'collection', pro: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const tier = session?.user?.tier ?? 'free'
  const isPro = tier === 'pro'

  const mainItems = navItems.filter((i) => i.section === 'main')
  const collectionItems = navItems.filter((i) => i.section === 'collection')

  return (
    <aside className="w-40 flex-shrink-0 bg-mantle border-r border-surface0 flex flex-col">
      <div className="px-4 py-4 border-b border-surface0">
        <span className="font-black text-sm text-text">Poke</span>
        <span className="font-black text-sm text-red">Vault</span>
      </div>

      <nav className="flex-1 py-2">
        <div className="px-4 py-2 text-[9px] uppercase tracking-widest text-surface1 font-semibold">
          Main
        </div>
        {mainItems.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} isPro={isPro} />
        ))}

        <div className="px-4 py-2 mt-2 text-[9px] uppercase tracking-widest text-surface1 font-semibold">
          My Collection
        </div>
        {collectionItems.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} isPro={isPro} />
        ))}
      </nav>

      <div className="border-t border-surface0 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-mauve flex-shrink-0" />
          <div>
            <div className="text-[10px] text-overlay2 leading-none">
              {session?.user?.name ?? '—'}
            </div>
            <div className="text-[9px] text-mauve mt-0.5">
              {tier === 'pro' ? '✦ Pro' : tier === 'adfree' ? '◆ Ad-Free' : 'Free'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  item,
  active,
  isPro,
}: {
  item: (typeof navItems)[number]
  active: boolean
  isPro: boolean
}) {
  const locked = item.pro && !isPro
  return (
    <Link
      href={locked ? '#' : item.href}
      className={[
        'flex items-center gap-2 px-4 py-2 text-[11px]',
        active
          ? 'bg-blue/10 text-text border-r-2 border-blue'
          : locked
            ? 'text-overlay0 cursor-not-allowed'
            : 'text-overlay0 hover:text-text',
      ].join(' ')}
    >
      <span className="w-4 text-center">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {locked && (
        <span className="text-[8px] bg-mauve/20 text-mauve px-1.5 py-0.5 rounded-full">
          Pro
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Create Topbar.tsx**

Create `components/layout/Topbar.tsx`:
```typescript
'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/browse': 'Browse',
  '/collection': 'My Cards',
  '/wishlist': 'Wishlist',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function Topbar() {
  const pathname = usePathname()
  const title = titles[pathname] ?? 'PokeVault'

  return (
    <header className="bg-mantle border-b border-surface0 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
      <h1 className="text-sm font-bold text-text flex-1">{title}</h1>
      <div className="bg-base border border-surface0 rounded-md px-3 py-1.5 text-[11px] text-overlay0 w-48">
        🔍 Search cards, sets…
      </div>
      <div className="bg-base border border-surface0 rounded px-2 py-1 text-[10px] text-overlay2">
        🇮🇹 IT · EUR
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create the app layout**

Create `app/(app)/layout.tsx`:
```typescript
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-crust">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ app/\(app\)/layout.tsx
git commit -m "feat: add Sidebar, Topbar, and protected app layout"
```

---

## Task 7: Page Stubs

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/browse/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create dashboard page stub**

Create `app/(app)/dashboard/page.tsx`:
```typescript
const stats = [
  { label: 'Cards Owned', value: '0', sub: 'Start your collection' },
  { label: 'Collection Value', value: '€0', sub: 'Add cards to track value' },
  { label: 'Sets Tracked', value: '0', sub: '—' },
  { label: 'Gain / Loss', value: '—', sub: 'Pro feature', locked: true },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-base border border-surface0 rounded-xl p-4">
            <div className="text-[9px] uppercase tracking-widest text-overlay0 mb-2">
              {stat.label}
            </div>
            <div
              className={[
                'text-2xl font-black',
                stat.locked ? 'text-overlay0' : 'text-text',
              ].join(' ')}
            >
              {stat.value}
            </div>
            <div className="text-[10px] text-overlay0 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
        <p className="text-overlay0 text-sm">
          Browse sets and add cards to your collection to see your dashboard come alive.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create browse page stub**

Create `app/(app)/browse/page.tsx`:
```typescript
export default function BrowsePage() {
  return (
    <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
      <p className="text-overlay0 text-sm">Card catalog coming in Plan 2.</p>
    </div>
  )
}
```

- [ ] **Step 3: Replace root page.tsx with redirect**

Replace `app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/browse')
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/dashboard/ app/\(app\)/browse/ app/page.tsx
git commit -m "feat: add dashboard and browse page stubs, redirect root to /browse"
```

---

## Task 8: Middleware (Route Protection)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write the failing test**

Create `middleware.test.ts` at project root:
```typescript
import { describe, it, expect } from 'vitest'

describe('middleware module', () => {
  it('exports a default function', async () => {
    const mod = await import('./middleware')
    expect(typeof mod.default).toBe('function')
  })

  it('exports config with matcher', async () => {
    const mod = await import('./middleware')
    expect(mod.config).toBeDefined()
    expect(Array.isArray(mod.config.matcher)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run middleware.test.ts
```
Expected: FAIL — middleware.ts does not exist.

- [ ] **Step 3: Create middleware.ts**

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const protectedPrefixes = ['/dashboard', '/collection', '/wishlist', '/analytics', '/settings']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run middleware.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts middleware.test.ts
git commit -m "feat: add middleware to protect app routes, redirect to /login"
```

---

## Task 9: Root Layout and Metadata

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PokeVault — Pokemon TCG Collector',
  description: 'Track your Pokémon TCG collection, monitor Cardmarket prices in EUR, and manage your cards.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: set root layout with Italian lang, Geist fonts, and SEO metadata"
```

---

## Task 10: Environment Variables and Vercel Setup

**Files:**
- Create: `.env.example`
- Create: `.env.local` (local only, never committed)

- [ ] **Step 1: Create .env.example**

Create `.env.example`:
```bash
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGODB_DB=pokemon

# Auth.js
AUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App URL
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 2: Ensure .env.local is gitignored**

Verify `echo ".env.local" >> .gitignore` (create-next-app adds this by default — confirm it's present):
```bash
grep ".env.local" .gitignore
```
Expected: `.env.local` appears.

- [ ] **Step 3: Create your local .env.local**

Copy the example and fill in real values:
```bash
cp .env.example .env.local
```
Edit `.env.local` with real `MONGODB_URI`, `AUTH_SECRET` (`openssl rand -base64 32`), and Google OAuth credentials.

- [ ] **Step 4: Run the dev server to verify everything works**

```bash
npm run dev
```
Open `http://localhost:3000`:
- Should redirect to `/browse`
- `/browse` should redirect to `/login` (unauthenticated)
- Login page should render with email/password fields and Google button
- Register page (`/register`) should render

- [ ] **Step 5: Commit .env.example**

```bash
git add .env.example .gitignore
git commit -m "chore: add env.example with required environment variables"
```

---

## Plan Complete

Plan 1 covers the full foundation: scaffold → MongoDB → Auth.js → registration API → auth pages → app shell → page stubs → middleware → deployment config.

**Run all tests before calling Plan 1 done:**
```bash
npx vitest run
```
Expected: all tests pass.

**Plans remaining:**
- Plan 2: Card Catalog (pokemontcg.io sync, SSR browse pages, card detail page)
- Plan 3: Price Sync (Vercel Cron, price_history collection, daily sync job)
- Plan 4: Collection Tracker (add/remove cards, collection page, 500-card cap enforcement)
- Plan 5: Subscriptions (Stripe integration, tier enforcement, upgrade UI)
- Plan 6: Pro Features (price history charts, gain/loss, CSV/PDF export, alerts, wishlist)
