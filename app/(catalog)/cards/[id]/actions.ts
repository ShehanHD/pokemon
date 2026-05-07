'use server'

import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getUserCardsForCard } from '@/lib/userCards'
import { userCardInputSchema } from '@/lib/schemas/userCard'

export async function addUserCard(input: unknown) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const parsed = userCardInputSchema.parse(input)
  const now = new Date()

  const db = await getDb()
  await db.collection('userCards').insertOne({
    ...parsed,
    userId: session.user.id,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath(`/cards/${parsed.cardId}`)
}

export async function removeUserCard(userCardId: string, cardId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const db = await getDb()
  await db.collection('userCards').deleteOne({
    _id: new ObjectId(userCardId),
    userId: session.user.id,
  })

  revalidatePath(`/cards/${cardId}`)
  revalidatePath('/', 'layout')
}

export async function updateUserCard(userCardId: string, cardId: string, input: unknown) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const parsed = userCardInputSchema.parse(input)
  const db = await getDb()
  await db.collection('userCards').updateOne(
    { _id: new ObjectId(userCardId), userId: session.user.id },
    { $set: { ...parsed, updatedAt: new Date() } },
  )

  revalidatePath(`/cards/${cardId}`)
  revalidatePath('/', 'layout')
}

export async function fetchUserCardsForVariant(cardId: string, variant: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const all = await getUserCardsForCard(session.user.id, cardId)
  return all
    .filter((c) => c.variant === variant)
    .map((c) => ({
      ...c,
      acquiredAt: c.acquiredAt instanceof Date ? c.acquiredAt.toISOString() : String(c.acquiredAt),
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
    }))
}
