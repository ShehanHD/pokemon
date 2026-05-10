'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { seedSetIds, type SeedReport } from '@/lib/seedSeries'

const InputSchema = z.object({
  setIds: z.array(z.string().min(1)).min(1).max(50),
})

export async function seedSetsAction(input: { setIds: string[] }): Promise<SeedReport> {
  if (process.env.NODE_ENV === 'production') redirect('/dashboard')
  const parsed = InputSchema.parse(input)
  const report = await seedSetIds(parsed.setIds)
  revalidatePath('/admin/seed')
  return report
}
