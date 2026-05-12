import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'
import { DEFAULT_CURRENCY, type Currency } from '@/lib/types'
import ThemePicker from '@/components/settings/ThemePicker'
import CurrencyPicker from '@/components/settings/CurrencyPicker'
import { setThemePokemon, setUserCurrency } from './actions'

export default async function SettingsPage() {
  const session = await auth()
  const cookieStore = await cookies()
  const userTier = session?.user?.tier ?? 'free'
  const currentCurrency: Currency = session?.user?.currency ?? DEFAULT_CURRENCY
  const cookieValue = cookieStore.get('theme-pokemon')?.value
  const currentPokemonId =
    cookieValue && /^\d+$/.test(cookieValue) ? Number(cookieValue) : null

  async function handleSelect(id: number | null) {
    'use server'
    await setThemePokemon({ pokemonId: id })
  }

  async function handleCurrency(currency: Currency) {
    'use server'
    await setUserCurrency({ currency })
  }

  return (
    <div className="space-y-6">
      <section className="bg-base border border-surface0 rounded-xl p-6">
        <h2 className="text-lg font-russo text-text mb-1">Currency</h2>
        <p className="text-xs text-overlay1 mb-4">
          The currency used for card costs and expenses across the app.
        </p>
        <CurrencyPicker current={currentCurrency} onSelect={handleCurrency} />
      </section>

      <section className="bg-base border border-surface0 rounded-xl p-6">
        <h2 className="text-lg font-russo text-text mb-1">Theme</h2>
        <p className="text-xs text-overlay1 mb-4">
          Pick a Base Set Pokémon to personalize your app colors. Your current plan: <strong>{userTier}</strong>.
        </p>
        <ThemePicker
          manifest={manifest as ThemeManifest}
          userTier={userTier}
          currentPokemonId={currentPokemonId}
          onSelect={handleSelect}
        />
      </section>
    </div>
  )
}
