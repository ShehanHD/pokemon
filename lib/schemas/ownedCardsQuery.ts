import { z } from 'zod'
import { cardVariantSchema, cardConditionSchema } from './userCard'

export const ownedCardsSortSchema = z.enum(['recent', 'name', 'release', 'count', 'cost'])

export const ownedCardsQuerySchema = z.object({
  series: z.string().min(1).optional(),
  set: z.string().min(1).optional(),
  rarity: z.string().min(1).optional(),
  variant: cardVariantSchema.optional(),
  type: z.enum(['raw', 'graded']).optional(),
  condition: cardConditionSchema.optional(),
  q: z.string().min(1).max(80).optional(),
  sort: ownedCardsSortSchema.default('recent'),
})

export type OwnedCardsQueryInput = z.input<typeof ownedCardsQuerySchema>
export type OwnedCardsQueryParsed = z.output<typeof ownedCardsQuerySchema>

export function parseOwnedCardsQuery(searchParams: Record<string, string | string[] | undefined>): OwnedCardsQueryParsed {
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string') flat[k] = v
    else if (Array.isArray(v) && v.length > 0) flat[k] = v[0]
  }
  return ownedCardsQuerySchema.parse(flat)
}
