import 'dotenv/config'
import { searchCards } from '../lib/cards'

async function main() {
  for (const q of ['91/124', '91/123', '/124', '/123', '91/12']) {
    const results = await searchCards(q, 5)
    console.log(`\nQuery "${q}" → ${results.length} hits`)
    for (const c of results.slice(0, 5)) {
      console.log(`  - ${c.name} (${c.set_id} #${c.number})`)
    }
  }
  process.exit(0)
}
main()
