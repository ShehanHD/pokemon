'use server'

import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { editSoldInputSchema } from '@/lib/schemas/userCard'

export async function updateSoldUserCard(userCardId: string, input: unknown) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const parsed = editSoldInputSchema.parse(input)

  const set: Record<string, unknown> = {
    soldPrice: parsed.soldPrice,
    soldAt: parsed.soldAt,
    updatedAt: new Date(),
  }
  const unset: Record<string, ''> = {}
  if (parsed.cost === undefined) {
    unset.cost = ''
  } else {
    set.cost = parsed.cost
  }
  if (parsed.extraCost === undefined) {
    unset.extraCost = ''
  } else {
    set.extraCost = parsed.extraCost
  }

  const update: Record<string, unknown> = { $set: set }
  if (Object.keys(unset).length > 0) update.$unset = unset

  const db = await getDb()
  const result = await db.collection('userCards').updateOne(
    { _id: new ObjectId(userCardId), userId: session.user.id, status: 'sold' },
    update,
  )
  if (result.matchedCount === 0) throw new Error('NOT_FOUND')

  revalidatePath('/sold')
  revalidatePath('/', 'layout')
}

export async function unsellUserCard(userCardId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const db = await getDb()
  const result = await db.collection('userCards').updateOne(
    { _id: new ObjectId(userCardId), userId: session.user.id, status: 'sold' },
    {
      $set: { status: 'owned', updatedAt: new Date() },
      $unset: { soldPrice: '', soldAt: '' },
    },
  )
  if (result.matchedCount === 0) throw new Error('NOT_FOUND')

  revalidatePath('/sold')
  revalidatePath('/', 'layout')
}
