'use server'

import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
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
}
