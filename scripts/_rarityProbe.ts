import 'dotenv/config'
import { getDb } from '../lib/db'
async function main() {
  const d = await getDb()
  const r = await d.collection('cards').distinct('rarity', { language: 'it' })
  console.log(JSON.stringify(r, null, 2))
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
