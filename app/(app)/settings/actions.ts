'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { setThemePokemonInputSchema } from '@/lib/schemas/theme'
import { currencyEnum } from '@/lib/schemas/expense'
import { tierAllows } from '@/lib/themes/resolve'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'

const THEME_COOKIE = 'theme-pokemon'
const ONE_YEAR = 60 * 60 * 24 * 365

export async function setThemePokemon(input: unknown): Promise<void> {
  const { pokemonId } = setThemePokemonInputSchema.parse(input)
  const session = await auth()
  const userTier = session?.user?.tier ?? 'free'

  if (pokemonId !== null) {
    const entry = (manifest as ThemeManifest)[String(pokemonId)]
    if (!entry) throw new Error(`Unknown Pokémon id: ${pokemonId}`)
    if (!tierAllows(userTier, entry.tier)) {
      throw new Error(`Tier ${userTier} not entitled to ${entry.tier} themes`)
    }
  }

  const cookieStore = await cookies()
  if (pokemonId === null) {
    cookieStore.delete(THEME_COOKIE)
  } else {
    cookieStore.set(THEME_COOKIE, String(pokemonId), {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
    })
  }

  if (session?.user?.id) {
    const db = await getDb()
    const users = db.collection('users')
    const _id = ObjectId.isValid(session.user.id)
      ? new ObjectId(session.user.id)
      : (session.user.id as unknown as ObjectId)
    if (pokemonId === null) {
      await users.updateOne({ _id }, { $unset: { themePokemonId: '' } })
    } else {
      await users.updateOne({ _id }, { $set: { themePokemonId: pokemonId } })
    }
  }

  revalidatePath('/', 'layout')
}

const setCurrencyInputSchema = z.object({ currency: currencyEnum })

export async function setUserCurrency(input: unknown): Promise<void> {
  const { currency } = setCurrencyInputSchema.parse(input)
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const db = await getDb()
  const _id = ObjectId.isValid(session.user.id)
    ? new ObjectId(session.user.id)
    : (session.user.id as unknown as ObjectId)
  await db.collection('users').updateOne({ _id }, { $set: { currency } })

  revalidatePath('/', 'layout')
}
