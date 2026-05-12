import 'dotenv/config'

const API = 'https://api.pokemontcg.io/v2'
const KEY = process.env.POKEMONTCG_API_KEY

async function api<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: KEY ? { 'X-Api-Key': KEY } : {} })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  return r.json() as Promise<T>
}

type Card = {
  id: string
  number: string
  name: string
  cardmarket?: { prices?: { averageSellPrice?: number | null } }
  tcgplayer?: { prices?: Record<string, { market?: number | null }> }
}

async function fetchAll(setId: string): Promise<Card[]> {
  const out: Card[] = []
  let page = 1
  while (true) {
    const r = await api<{ data: Card[]; totalCount: number; pageSize: number }>(
      `/cards?q=set.id:${setId}&pageSize=250&page=${page}`
    )
    out.push(...r.data)
    if (out.length >= r.totalCount || r.data.length === 0) break
    page++
  }
  return out
}

async function main() {
  for (const setId of ['me2pt5', 'me3']) {
    const cards = await fetchAll(setId)
    let cmCount = 0
    let tcgCount = 0
    for (const c of cards) {
      if (c.cardmarket?.prices?.averageSellPrice != null) cmCount++
      const t = c.tcgplayer?.prices
      if (t && Object.values(t).some((v) => v?.market != null)) tcgCount++
    }
    console.log(`${setId}: ${cards.length} cards | cardmarket priced: ${cmCount} | tcgplayer priced: ${tcgCount}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
