import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()
  const cards = db.collection<{
    pokemontcg_id?: string | null
    tcgdex_id?: string | null
    set_id?: string
    number?: string
    name?: string
    rarity?: string | null
  }>('cards')

  const PAIRS = [
    { legacy: 'me1', tcgdex: 'me01' },
    { legacy: 'sv3', tcgdex: 'sv03' },
  ]

  for (const { legacy, tcgdex } of PAIRS) {
    console.log(`\n=== ${legacy} <-> ${tcgdex} ===`)
    const tNums = (await cards.distinct('number', { set_id: tcgdex, tcgdex_id: { $ne: null } })) as string[]
    const lNums = (await cards.distinct('number', { set_id: legacy, tcgdex_id: { $in: [null, undefined] } })) as string[]
    const tSet = new Set(tNums)
    const lSet = new Set(lNums)
    const onlyT = tNums.filter(n => !lSet.has(n)).sort()
    const onlyL = lNums.filter(n => !tSet.has(n)).sort()
    console.log(`  tcgdex-only numbers (${onlyT.length}): ${onlyT.slice(0, 15).join(', ')}...`)
    console.log(`  legacy-only numbers (${onlyL.length}): ${onlyL.slice(0, 15).join(', ')}...`)

    console.log('  -- TCGdex-only sample:')
    for (const n of onlyT.slice(0, 4)) {
      const c = await cards.findOne(
        { set_id: tcgdex, number: n },
        { projection: { tcgdex_id: 1, name: 1, number: 1, rarity: 1 } },
      )
      console.log(`    ${n}: ${JSON.stringify(c)}`)
    }
    console.log('  -- Legacy-only sample:')
    for (const n of onlyL.slice(0, 4)) {
      const c = await cards.findOne(
        { set_id: legacy, number: n },
        { projection: { pokemontcg_id: 1, name: 1, number: 1, rarity: 1 } },
      )
      console.log(`    ${n}: ${JSON.stringify(c)}`)
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
