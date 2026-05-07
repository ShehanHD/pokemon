'use server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { addToWishlist, removeFromWishlist } from '@/lib/wishlist'
import { addToWishlistInputSchema, type AddToWishlistInput } from '@/lib/schemas/wishlist'
import type { Tier } from '@/lib/types'

type ActionResult = { ok: true } | { ok: false; reason: 'unauthenticated' | 'invalid_input' | 'cap_reached' }

export async function addWishlistAction(input: AddToWishlistInput): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' }
  const parsed = addToWishlistInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  const tier = (session.user as { tier?: Tier }).tier ?? 'free'
  const result = await addToWishlist(session.user.id, parsed.data, tier)
  if (!result.ok) return { ok: false, reason: result.reason === 'cap_reached' ? 'cap_reached' : 'invalid_input' }
  revalidatePath('/wishlist')
  return { ok: true }
}

export async function removeWishlistAction(cardId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' }
  if (!cardId) return { ok: false, reason: 'invalid_input' }
  await removeFromWishlist(session.user.id, cardId)
  revalidatePath('/wishlist')
  return { ok: true }
}
