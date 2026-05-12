import { z } from 'zod'

export const cardVariantSchema = z.enum([
  'normal', 'holo', 'reverse-holo', '1st-edition',
  'shadowless', 'promo', 'full-art', 'alt-art',
  'holofoil', 'reverse-holofoil', 'pokeball-pattern',
  'masterball-pattern', 'cosmos-holo', 'crosshatch-holo', 'galaxy-holo',
])

export const cardConditionSchema = z.enum(['NM', 'LP', 'MP', 'HP', 'DMG'])

export const gradingCompanySchema = z.enum([
  'PSA', 'GRAAD', 'BGS', 'CGC', 'SGC', 'TAG', 'Ace', 'GMA', 'Other',
])

const gradeSchema = z
  .number()
  .min(1)
  .max(10)
  .refine((g) => (g * 2) % 1 === 0, { message: 'Grade must be in half-point steps' })

export const centeringSchema = z.enum(['Perfect', 'Good', 'Poor', 'Error Print']).optional()

const baseFields = {
  cardId: z.string().min(1),
  variant: cardVariantSchema,
  acquiredAt: z.coerce.date(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
}

export const userCardRawInputSchema = z.object({
  ...baseFields,
  type: z.literal('raw'),
  condition: cardConditionSchema,
  centering: centeringSchema,
})

export const userCardGradedInputSchema = z.object({
  ...baseFields,
  type: z.literal('graded'),
  gradingCompany: gradingCompanySchema,
  grade: gradeSchema,
  gradedValue: z.number().min(0),
})

export const userCardInputSchema = z.discriminatedUnion('type', [
  userCardRawInputSchema,
  userCardGradedInputSchema,
])

export type UserCardInput = z.infer<typeof userCardInputSchema>

export const userCardStatusSchema = z.enum(['owned', 'sold'])

export const markAsSoldInputSchema = z.object({
  soldPrice: z.number().min(0),
  soldAt: z.coerce.date(),
})

export type MarkAsSoldInput = z.infer<typeof markAsSoldInputSchema>
