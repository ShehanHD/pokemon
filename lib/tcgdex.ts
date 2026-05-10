import {
  TcgdexCardSchema,
  TcgdexSetBriefArraySchema,
  TcgdexSetDetailSchema,
  type TcgdexCard,
  type TcgdexSetBrief,
  type TcgdexSetDetail,
} from './schemas/tcgdex'

const BASE = 'https://api.tcgdex.net/v2'

function lang(): string {
  return process.env.TCGDEX_LANG ?? 'it'
}

async function fetchJson(path: string): Promise<unknown> {
  const url = `${BASE}/${lang()}${path}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) {
    throw new Error(`[tcgdex] ${res.status} ${res.statusText} for ${path}`)
  }
  return res.json()
}

export async function fetchAllSets(): Promise<TcgdexSetBrief[]> {
  const raw = await fetchJson('/sets')
  return TcgdexSetBriefArraySchema.parse(raw)
}

export async function fetchSet(setId: string): Promise<TcgdexSetDetail> {
  const raw = await fetchJson(`/sets/${encodeURIComponent(setId)}`)
  return TcgdexSetDetailSchema.parse(raw)
}

export async function fetchCard(cardId: string): Promise<TcgdexCard> {
  const raw = await fetchJson(`/cards/${encodeURIComponent(cardId)}`)
  return TcgdexCardSchema.parse(raw)
}

export async function fetchCardsConcurrent(
  cardIds: string[],
  concurrency = 5,
): Promise<TcgdexCard[]> {
  const out: TcgdexCard[] = new Array(cardIds.length)
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= cardIds.length) return
      out[i] = await fetchCard(cardIds[i])
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, cardIds.length) }, worker)
  await Promise.all(workers)
  return out
}

export function buildCardImageUrls(image: string | undefined): {
  imageUrl: string | null
  imageUrlHiRes: string | null
} {
  if (!image) return { imageUrl: null, imageUrlHiRes: null }
  return {
    imageUrl: `${image}/low.webp`,
    imageUrlHiRes: `${image}/high.webp`,
  }
}

export function buildAssetUrl(asset: string | undefined): string | null {
  return asset ? `${asset}.webp` : null
}
