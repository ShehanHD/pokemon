import { z } from 'zod'

export const wishlistPriorityEnum = z.enum(['low', 'med', 'high'])

export const wishlistItemSchema = z.object({
  userId: z.string().min(1),
  cardId: z.string().min(1),
  addedAt: z.coerce.date(),
  note: z.string().max(200).optional(),
  priority: wishlistPriorityEnum.optional(),
})

export const addToWishlistInputSchema = z.object({
  cardId: z.string().min(1),
  note: z.string().max(200).optional(),
  priority: wishlistPriorityEnum.optional(),
})

export type WishlistPriority = z.infer<typeof wishlistPriorityEnum>
export type AddToWishlistInput = z.infer<typeof addToWishlistInputSchema>
