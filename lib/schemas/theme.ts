import { z } from 'zod'

export const tierSchema = z.enum(['free', 'adfree', 'pro'])

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be #RRGGBB')

export const themeEntrySchema = z.object({
  name: z.string().min(1),
  tier: tierSchema,
  primary: hexColorSchema,
  accent: hexColorSchema,
  mantle: hexColorSchema,
  crust: hexColorSchema,
  base: hexColorSchema,
  text: hexColorSchema,
  subtext1: hexColorSchema,
  subtext0: hexColorSchema,
  overlay2: hexColorSchema,
  overlay1: hexColorSchema,
  overlay0: hexColorSchema,
})

export const themeManifestSchema = z.record(
  z.string().regex(/^\d+$/, 'Pokémon id key must be numeric'),
  themeEntrySchema,
)

export const setThemePokemonInputSchema = z.object({
  pokemonId: z.number().int().positive().nullable(),
})

export type ThemeEntry = z.infer<typeof themeEntrySchema>
export type ThemeManifest = z.infer<typeof themeManifestSchema>
export type SetThemePokemonInput = z.infer<typeof setThemePokemonInputSchema>
