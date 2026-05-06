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
