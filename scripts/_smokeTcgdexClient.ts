import 'dotenv/config'
import { fetchAllSets, fetchSet, fetchCard, fetchCardsConcurrent } from '../lib/tcgdex'

async function main() {
  const sets = await fetchAllSets()
  console.log(`[smoke] sets: ${sets.length}`)
  const sv01 = await fetchSet('sv01')
  console.log(`[smoke] sv01 cards: ${sv01.cards.length}`)
  const card = await fetchCard(sv01.cards[0].id)
  console.log(`[smoke] card: ${card.id} ${card.name} rarity=${card.rarity ?? 'null'}`)
  const sample = await fetchCardsConcurrent(sv01.cards.slice(0, 5).map((c) => c.id), 5)
  const priced = sample.filter((c) => c.pricing?.cardmarket?.prices?.averageSellPrice != null).length
  console.log(`[smoke] 5-card concurrent fetch ok; priced=${priced}/5`)
}
main().catch((e) => { console.error(e); process.exit(1) })
