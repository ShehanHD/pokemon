import { z } from 'zod'

export const TcgdexSetBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().optional(),
  symbol: z.string().optional(),
  cardCount: z
    .object({
      total: z.number().int().nonnegative(),
      official: z.number().int().nonnegative(),
    })
    .optional(),
  releaseDate: z.string().optional(),
})
export type TcgdexSetBrief = z.infer<typeof TcgdexSetBriefSchema>

export const TcgdexSetCardRefSchema = z.object({
  id: z.string(),
  localId: z.string(),
  name: z.string(),
  image: z.string().optional(),
})

export const TcgdexSetDetailSchema = TcgdexSetBriefSchema.extend({
  serie: z
    .object({ id: z.string(), name: z.string() })
    .optional(),
  cards: z.array(TcgdexSetCardRefSchema).default([]),
})
export type TcgdexSetDetail = z.infer<typeof TcgdexSetDetailSchema>

const TcgdexCardmarketSchema = z
  .object({
    updated: z.string().optional(),
    unit: z.string().optional(),
    idProduct: z.number().optional(),
    avg: z.number().nullable().optional(),
    low: z.number().nullable().optional(),
    trend: z.number().nullable().optional(),
    avg1: z.number().nullable().optional(),
    avg7: z.number().nullable().optional(),
    avg30: z.number().nullable().optional(),
    'avg-holo': z.number().nullable().optional(),
    'low-holo': z.number().nullable().optional(),
    'trend-holo': z.number().nullable().optional(),
    'avg1-holo': z.number().nullable().optional(),
    'avg7-holo': z.number().nullable().optional(),
    'avg30-holo': z.number().nullable().optional(),
  })
  .passthrough()

const TcgdexPricingSchema = z.object({
  cardmarket: TcgdexCardmarketSchema.nullable().optional(),
  tcgplayer: z.unknown().optional(),
}).passthrough()

export const TcgdexCardSchema = z.object({
  id: z.string(),
  localId: z.string(),
  name: z.string(),
  image: z.string().optional(),
  rarity: z.string().nullable().optional(),
  category: z.string().optional(),
  illustrator: z.string().optional(),
  hp: z.number().optional(),
  types: z.array(z.string()).optional(),
  variants: z
    .object({
      firstEdition: z.boolean().optional(),
      holo: z.boolean().optional(),
      normal: z.boolean().optional(),
      reverse: z.boolean().optional(),
      wPromo: z.boolean().optional(),
    })
    .partial()
    .optional(),
  set: z.object({ id: z.string(), name: z.string() }).optional(),
  pricing: TcgdexPricingSchema.optional(),
}).passthrough()
export type TcgdexCard = z.infer<typeof TcgdexCardSchema>

export const TcgdexSetBriefArraySchema = z.array(TcgdexSetBriefSchema)
