import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const sets = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; name?: string }>('sets')
  const cards = db.collection<{ pokemontcg_id?: string | null; tcgdex_id?: string | null; set_id?: string; number?: string; name?: string }>('cards')
  const userCards = db.collection<{ cardId?: string }>('userCards')

  // === sv3pt5 / sv03.5 investigation ===
  console.log('=== sv3pt5 / sv03.5 set docs ===')
  const setDocs = await sets.find(
    { $or: [{ pokemontcg_id: 'sv3pt5' }, { tcgdex_id: 'sv03.5' }] },
    { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1 } },
  ).toArray()
  for (const s of setDocs) console.log(' ', JSON.stringify(s))

  console.log('\n=== Card numbers sv3pt5 vs sv03.5 ===')
  const lNums = (await cards.distinct('number', { set_id: 'sv3pt5', tcgdex_id: { $in: [null, undefined] } })) as string[]
  const tNums = (await cards.distinct('number', { set_id: 'sv03.5', tcgdex_id: { $ne: null } })) as string[]
  // Also possibly TCGdex parked at set_id=sv3pt5 (if seeder used same id)
  const tNumsAtLegacy = (await cards.distinct('number', { set_id: 'sv3pt5', tcgdex_id: { $ne: null }, pokemontcg_id: { $in: [null, undefined] } })) as string[]
  console.log(`  legacy orphans at sv3pt5 (count=${lNums.length}): ${lNums.slice(0, 10).join(', ')}`)
  console.log(`  tcgdex orphans at sv03.5 (count=${tNums.length}): ${tNums.slice(0, 10).join(', ')}`)
  console.log(`  tcgdex orphans at sv3pt5  (count=${tNumsAtLegacy.length}): ${tNumsAtLegacy.slice(0, 10).join(', ')}`)

  // === 4 unmappable userCards ===
  console.log('\n=== userCards mappability ===')
  const ids = (await userCards.distinct('cardId')) as string[]
  for (const cid of ids) {
    const doc = await cards.findOne({ pokemontcg_id: cid }, { projection: { tcgdex_id: 1, set_id: 1, name: 1, number: 1 } })
    const tag = doc?.tcgdex_id ? 'OK ' : doc ? 'MISS' : 'NONE'
    console.log(`  [${tag}] ${cid} -> ${JSON.stringify(doc ?? null)}`)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
