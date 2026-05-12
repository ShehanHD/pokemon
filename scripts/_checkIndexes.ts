import 'dotenv/config'
import { getDb } from '../lib/db'
async function main() {
  const db = await getDb()
  for (const c of ['sets','cards']) {
    const ix = await db.collection(c).indexes()
    console.log(c, JSON.stringify(ix.filter((i:any)=>i.unique || i.name.includes('tcgdex') || i.name.includes('pokemontcg')), null, 2))
  }
}
main().then(()=>process.exit(0))
