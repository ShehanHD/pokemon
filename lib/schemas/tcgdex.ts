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

const TcgdexCardmarketPricesSchema = z.object({
  averageSellPrice: z.number().nullable().optional(),
  lowPrice: z.number().nullable().optional(),
  trendPrice: z.number().nullable().optional(),
  reverseHoloSell: z.number().nullable().optional(),
  reverseHoloLow: z.number().nullable().optional(),
  reverseHoloTrend: z.number().nullable().optional(),
  avg1: z.number().nullable().optional(),
  avg7: z.number().nullable().optional(),
  avg30: z.number().nullable().optional(),
}).passthrough()

const TcgdexPricingSchema = z.object({
  cardmarket: z
    .object({
      updated: z.string().optional(),
      unit: z.string().optional(),
      prices: TcgdexCardmarketPricesSchema.optional(),
    })
    .partial()
    .passthrough()
    .optional(),
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
