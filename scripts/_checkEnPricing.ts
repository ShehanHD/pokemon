import 'dotenv/config'
import { fetchCard } from '../lib/tcgdex'

async function main() {
  const id = 'swsh4-188' // pick one
  const card = await fetchCard(id)
  console.log('lang:', process.env.TCGDEX_LANG ?? 'en')
  console.log('id:', card.id, 'name:', card.name)
  console.log('pricing:', JSON.stringify(card.pricing, null, 2))
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
