import { auth } from '@/lib/auth'
import manifest from '@/lib/themes/manifest.json'
import type { ThemeManifest } from '@/lib/schemas/theme'
import ThemePicker from '@/components/settings/ThemePicker'
import { setThemePokemon } from './actions'

export default async function SettingsPage() {
  const session = await auth()
  const userTier = session?.user?.tier ?? 'free'
  const currentPokemonId = session?.user?.themePokemonId ?? null

  async function handleSelect(id: number | null) {
    'use server'
    await setThemePokemon({ pokemonId: id })
  }

  return (
    <div className="space-y-6">
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
