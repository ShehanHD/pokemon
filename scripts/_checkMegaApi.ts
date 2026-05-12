import 'dotenv/config'

const API = 'https://api.pokemontcg.io/v2'
const KEY = process.env.POKEMONTCG_API_KEY

async function api<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: KEY ? { 'X-Api-Key': KEY } : {} })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  return r.json() as Promise<T>
}

async function main() {
  console.log('--- All sets with series matching /mega/i (from API) ---')
  const sets = await api<{ data: Array<{ id: string; name: string; series: string; releaseDate: string; total: number; printedTotal: number }> }>(
    `/sets?q=series:"Mega Evolution"&pageSize=250`
  )
  for (const s of sets.data) {
    console.log(`  ${s.id} | ${s.name} | series="${s.series}" | release=${s.releaseDate} | total=${s.total}`)
  }

  console.log('\n--- Searching for any "mega" promo/related set ---')
  const promo = await api<{ data: Array<{ id: string; name: string; series: string; releaseDate: string; total: number }> }>(
    `/sets?q=name:"*mega*"&pageSize=250`
  )
  for (const s of promo.data) {
    console.log(`  ${s.id} | ${s.name} | series="${s.series}" | release=${s.releaseDate} | total=${s.total}`)
  }

  for (const setId of ['me2pt5', 'me3']) {
    console.log(`\n--- ${setId} card sample (first 5) with prices ---`)
    const cards = await api<{ data: Array<{ id: string; number: string; name: string; rarity?: string; supertype: string; cardmarket?: { prices?: { averageSellPrice?: number } }; tcgplayer?: { prices?: Record<string, { market?: number }> } }>; totalCount: number }>(
      `/cards?q=set.id:${setId}&pageSize=5&page=1`
    )
    console.log(`  totalCount: ${cards.totalCount}`)
    for (const c of cards.data) {
      const cm = c.cardmarket?.prices?.averageSellPrice
      const tcg = c.tcgplayer?.prices
      const tcgKeys = tcg ? Object.keys(tcg) : []
      console.log(`    #${c.number} ${c.name} | ${c.supertype}/${c.rarity ?? '?'} | cm=${cm ?? 'none'} | tcg keys=[${tcgKeys.join(',')}]`)
    }
  }

  // Check supertypes for me1/me2 - are basic energies in there at all on the API?
  for (const setId of ['me1', 'me2', 'me2pt5', 'me3']) {
    console.log(`\n--- ${setId} supertype breakdown (from API) ---`)
    const all = await api<{ data: Array<{ supertype: string; rarity?: string }>; totalCount: number }>(
      `/cards?q=set.id:${setId}&pageSize=250&page=1`
    )
    const bySupertype: Record<string, number> = {}
    const byRarity: Record<string, number> = {}
    for (const c of all.data) {
      bySupertype[c.supertype] = (bySupertype[c.supertype] ?? 0) + 1
      const r = c.rarity ?? 'unknown'
      byRarity[r] = (byRarity[r] ?? 0) + 1
    }
    console.log(`  totalCount: ${all.totalCount} (returned ${all.data.length})`)
    console.log(`  supertype:`, bySupertype)
    console.log(`  rarity:`, byRarity)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
