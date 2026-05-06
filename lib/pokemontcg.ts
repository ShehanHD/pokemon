import {
  PtcgSetsResponseSchema,
  PtcgCardsResponseSchema,
  PtcgCardResponseSchema,
} from './schemas/pokemontcg'
import type { PtcgSet, PtcgCard } from './schemas/pokemontcg'

const BASE = 'https://api.pokemontcg.io/v2'

function headers(): HeadersInit {
  const key = process.env.POKEMONTCG_API_KEY
  return key ? { 'X-Api-Key': key } : {}
}

export async function fetchAllSets(): Promise<PtcgSet[]> {
  const res = await fetch(`${BASE}/sets`, {
    headers: headers(),
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`pokemontcg.io /v2/sets failed: ${res.status}`)
  const json = await res.json()
  return PtcgSetsResponseSchema.parse(json).data
}

export async function fetchCardsBySet(setId: string, pageSize = 250): Promise<PtcgCard[]> {
  const all: PtcgCard[] = []
  let page = 1
  let totalCount = Infinity

  while (all.length < totalCount) {
    const url = `${BASE}/cards?q=set.id:${setId}&pageSize=${pageSize}&page=${page}`
    const res = await fetch(url, {
      headers: headers(),
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`pokemontcg.io /v2/cards failed: ${res.status}`)
    const json = await res.json()
    const parsed = PtcgCardsResponseSchema.parse(json)
    all.push(...parsed.data)
    totalCount = parsed.totalCount
    page++
  }

  return all
}

export async function fetchCard(id: string): Promise<PtcgCard> {
  const res = await fetch(`${BASE}/cards/${id}`, {
    headers: headers(),
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`pokemontcg.io /v2/cards/${id} failed: ${res.status}`)
  const json = await res.json()
  return PtcgCardResponseSchema.parse(json).data
}
