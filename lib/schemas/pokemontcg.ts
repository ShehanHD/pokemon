import { z } from 'zod'

const PtcgCardPricesSchema = z.object({
  averageSellPrice: z.number().nullable().optional(),
  lowPrice: z.number().nullable().optional(),
  trendPrice: z.number().nullable().optional(),
}).optional()

export const PtcgSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  series: z.string(),
  releaseDate: z.string(),
  total: z.number(),
  images: z.object({
    symbol: z.string().url(),
    logo: z.string().url(),
  }),
})

export const PtcgCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.string(),
  rarity: z.string().optional(),
  types: z.array(z.string()).optional(),
  subtypes: z.array(z.string()).optional(),
  supertype: z.string(),
  images: z.object({
    small: z.string().url(),
    large: z.string().url(),
  }),
  set: z.object({
    id: z.string(),
    name: z.string(),
    series: z.string(),
  }),
  cardmarket: z.object({
    prices: PtcgCardPricesSchema,
  }).optional(),
})

export const PtcgSetsResponseSchema = z.object({
  data: z.array(PtcgSetSchema),
})

export const PtcgCardsResponseSchema = z.object({
  data: z.array(PtcgCardSchema),
  totalCount: z.number(),
  count: z.number(),
  pageSize: z.number(),
  page: z.number(),
})

export const PtcgCardResponseSchema = z.object({
  data: PtcgCardSchema,
})

export type PtcgSet = z.infer<typeof PtcgSetSchema>
export type PtcgCard = z.infer<typeof PtcgCardSchema>
