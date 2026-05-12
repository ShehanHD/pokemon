'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  addExpense,
  updateExpense,
  removeExpense,
} from '@/lib/expenses'
import {
  addExpenseInputSchema,
  updateExpenseInputSchema,
} from '@/lib/schemas/expense'

type ActionResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' | 'invalid_input' | 'not_found' }

export async function addExpenseAction(input: unknown): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' }
  const parsed = addExpenseInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  await addExpense(session.user.id, parsed.data)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function updateExpenseAction(input: unknown): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' }
  const parsed = updateExpenseInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid_input' }
  const result = await updateExpense(session.user.id, parsed.data)
  if (!result) return { ok: false, reason: 'not_found' }
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function removeExpenseAction(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' }
  if (!id || typeof id !== 'string') return { ok: false, reason: 'invalid_input' }
  await removeExpense(session.user.id, id)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { ok: true }
}
