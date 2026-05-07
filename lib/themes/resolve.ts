import type { Tier } from '@/lib/types'
import type { ThemeEntry, ThemeManifest } from '@/lib/schemas/theme'

const TIER_RANK: Record<Tier, number> = { free: 0, adfree: 1, pro: 2 }

export function tierAllows(userTier: Tier, entryTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[entryTier]
}

export interface ResolveContext {
  cookie: string | null | undefined
  userTier: Tier | undefined
  userPokemonId: number | null | undefined
}

export function resolveTheme(
  manifest: ThemeManifest,
  ctx: ResolveContext,
): ThemeEntry | null {
  const tier: Tier = ctx.userTier ?? 'free'

  if (ctx.cookie && /^\d+$/.test(ctx.cookie)) {
    const entry = manifest[ctx.cookie]
    if (entry && tierAllows(tier, entry.tier)) return entry
  }

  if (ctx.userPokemonId != null) {
    const entry = manifest[String(ctx.userPokemonId)]
    if (entry && tierAllows(tier, entry.tier)) return entry
  }

  return null
}
