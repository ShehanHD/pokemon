import 'dotenv/config'

const API = 'https://api.tcgdex.net/v2/it'

async function api<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`)
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  return r.json() as Promise<T>
}

type SetBrief = {
  id: string
  name: string
  logo?: string
  symbol?: string
  cardCount?: { total: number; official: number }
  releaseDate?: string
}

type SetDetail = SetBrief & {
  serie?: { id: string; name: string }
  cards: Array<{ id: string; localId: string; name: string; image?: string }>
}

type CardDetail = {
  id: string
  localId: string
  name: string
  image?: string
  rarity?: string
  category?: string
  illustrator?: string
  hp?: number
  types?: string[]
  variants?: Record<string, boolean>
  set?: { id: string; name: string }
  pricing?: unknown
}

function summarize(label: string, obj: unknown) {
  console.log(`\n--- ${label} ---`)
  console.log(JSON.stringify(obj, null, 2))
}

async function main() {
  console.log('=== TCGdex IT probe ===')

  // 1. Inventory: how many IT sets?
  const allSets = await api<SetBrief[]>('/sets')
  console.log(`\n[sets] total IT sets: ${allSets.length}`)

  // Surface gap-relevant sets the user cares about
  const interesting = allSets.filter((s) => {
    const n = s.name?.toLowerCase() ?? ''
    return (
      n.includes('mcdonald') ||
      n.includes('wizards') ||
      n.includes('promo') ||
      n.includes('megaevolu') ||
      n.includes('scarlatto') ||
      n.includes('spada')
    )
  })
  console.log(`[sets] gap-relevant matches: ${interesting.length}`)
  for (const s of interesting.slice(0, 25)) {
    console.log(`  ${s.id.padEnd(12)} | ${s.name} | release=${s.releaseDate ?? '?'} | total=${s.cardCount?.total ?? '?'}`)
  }

  // 2. Detailed shape: one modern set + one promo set
  const sampleSetIds = ['sv01', 'wp', 'mcd24'].filter((id) => allSets.some((s) => s.id === id))
  for (const id of sampleSetIds) {
    try {
      const detail = await api<SetDetail>(`/sets/${id}`)
      summarize(`set detail: ${id}`, {
        id: detail.id,
        name: detail.name,
        serie: detail.serie,
        releaseDate: detail.releaseDate,
        cardCount: detail.cardCount,
        logo: detail.logo,
        symbol: detail.symbol,
        firstThreeCards: detail.cards.slice(0, 3),
      })
    } catch (err) {
      console.log(`  [skip] /sets/${id}: ${(err as Error).message}`)
    }
  }

  // 3. Card shape: pick first card from first detail-able set
  const firstSetWithCards = sampleSetIds[0]
  if (firstSetWithCards) {
    const detail = await api<SetDetail>(`/sets/${firstSetWithCards}`)
    const sampleCardIds = detail.cards.slice(0, 3).map((c) => c.id)
    for (const cardId of sampleCardIds) {
      try {
        const card = await api<CardDetail>(`/cards/${cardId}`)
        summarize(`card detail: ${cardId}`, card)
      } catch (err) {
        console.log(`  [skip] /cards/${cardId}: ${(err as Error).message}`)
      }
    }
  }

  // 4. Pricing presence sweep across 25 random cards from a modern set
  const modernId = sampleSetIds.find((id) => id.startsWith('sv')) ?? sampleSetIds[0]
  if (modernId) {
    const detail = await api<SetDetail>(`/sets/${modernId}`)
    const sample = detail.cards.slice(0, 25)
    let withPricing = 0
    let withImage = 0
    let withRarity = 0
    for (const c of sample) {
      const card = await api<CardDetail>(`/cards/${c.id}`)
      if (card.pricing && Object.keys(card.pricing as object).length > 0) withPricing += 1
      if (card.image) withImage += 1
      if (card.rarity) withRarity += 1
    }
    console.log(`\n[coverage in ${modernId}, first ${sample.length} cards]`)
    console.log(`  with image:   ${withImage}/${sample.length}`)
    console.log(`  with rarity:  ${withRarity}/${sample.length}`)
    console.log(`  with pricing: ${withPricing}/${sample.length}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
