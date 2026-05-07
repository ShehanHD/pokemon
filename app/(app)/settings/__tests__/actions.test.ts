import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
}
const usersUpdateOne = vi.fn(async () => ({ acknowledged: true }))
const revalidatePath = vi.fn()
let session: { user: { id: string; tier: 'free' | 'adfree' | 'pro' } } | null = null

vi.mock('next/headers', () => ({
  cookies: async () => cookieStore,
}))
vi.mock('next/cache', () => ({
  revalidatePath: (p: string) => revalidatePath(p),
}))
vi.mock('@/lib/auth', () => ({
  auth: async () => session,
}))
vi.mock('@/lib/db', () => ({
  getDb: async () => ({
    collection: () => ({ updateOne: usersUpdateOne }),
  }),
}))

vi.mock('@/lib/themes/manifest.json', () => ({
  default: {
    '25': { name: 'Pikachu', tier: 'free', primary: '#e8b22a', accent: '#fff3b0', mantle: '#e8eef5' },
    '6':  { name: 'Charizard', tier: 'adfree', primary: '#d35400', accent: '#ffd1a8', mantle: '#e8eef5' },
  },
}))

import { setThemePokemon } from '../actions'

beforeEach(() => {
  cookieStore.set.mockClear()
  cookieStore.delete.mockClear()
  usersUpdateOne.mockClear()
  revalidatePath.mockClear()
  session = null
})

describe('setThemePokemon', () => {
  it('free user → free Pokémon: writes cookie, DB, and revalidates', async () => {
    session = { user: { id: 'u1', tier: 'free' } }
    await setThemePokemon({ pokemonId: 25 })
    expect(cookieStore.set).toHaveBeenCalledWith(
      'theme-pokemon',
      '25',
      expect.objectContaining({ path: '/', maxAge: 31536000, sameSite: 'lax' }),
    )
    expect(usersUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $set: { themePokemonId: 25 } })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('free user → adfree Pokémon: rejected, no writes', async () => {
    session = { user: { id: 'u1', tier: 'free' } }
    await expect(setThemePokemon({ pokemonId: 6 })).rejects.toThrow(/tier/i)
    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(usersUpdateOne).not.toHaveBeenCalled()
  })

  it('null clears cookie and unsets DB field', async () => {
    session = { user: { id: 'u1', tier: 'pro' } }
    await setThemePokemon({ pokemonId: null })
    expect(cookieStore.delete).toHaveBeenCalledWith('theme-pokemon')
    expect(usersUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $unset: { themePokemonId: '' } })
  })

  it('anonymous user → free Pokémon: cookie only, no DB call', async () => {
    session = null
    await setThemePokemon({ pokemonId: 25 })
    expect(cookieStore.set).toHaveBeenCalled()
    expect(usersUpdateOne).not.toHaveBeenCalled()
  })

  it('anonymous user → adfree Pokémon: rejected', async () => {
    session = null
    await expect(setThemePokemon({ pokemonId: 6 })).rejects.toThrow(/tier/i)
  })

  it('rejects unknown Pokémon id', async () => {
    session = { user: { id: 'u1', tier: 'pro' } }
    await expect(setThemePokemon({ pokemonId: 9999 })).rejects.toThrow(/unknown/i)
  })

  it('rejects malformed input', async () => {
    session = { user: { id: 'u1', tier: 'pro' } }
    await expect(setThemePokemon({ pokemonId: 'pikachu' })).rejects.toThrow()
  })
})
