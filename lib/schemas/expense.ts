import { z } from 'zod'

export const expenseCategoryEnum = z.enum([
  'purchase',
  'grading',
  'shipping',
  'supplies',
  'other',
])

export const expenseSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().nonnegative().finite(),
  date: z.coerce.date(),
  category: expenseCategoryEnum,
  note: z.string().max(500).optional(),
  cardId: z.string().min(1).optional(),
})

export const addExpenseInputSchema = z.object({
  amount: z.number().nonnegative().finite(),
  date: z.coerce.date(),
  category: expenseCategoryEnum,
  note: z.string().max(500).optional(),
  cardId: z.string().min(1).optional(),
})

export const updateExpenseInputSchema = z.object({
  id: z.string().min(1),
  amount: z.number().nonnegative().finite().optional(),
  date: z.coerce.date().optional(),
  category: expenseCategoryEnum.optional(),
  note: z.string().max(500).optional(),
  cardId: z.string().min(1).nullable().optional(),
})

export type ExpenseCategoryInput = z.infer<typeof expenseCategoryEnum>
export type AddExpenseInput = z.infer<typeof addExpenseInputSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>
