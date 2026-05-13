import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const rows = await db
    .collection('cards')
    .find({ set_id: 'svp', $or: [{ imageUrl: null }, { imageUrl: { $exists: false } }, { imageUrl: '' }] })
    .project({ _id: 0, pokemontcg_id: 1, tcgdex_id: 1, number: 1, name: 1 })
    .toArray()

  let recoverable = 0
  let none = 0
  const fixes: Array<{ pokemontcg_id: string; tcgdex_id?: string; small: string; large: string | null }> = []
  for (const r of rows) {
    const pid = r.pokemontcg_id as string | undefined
    if (!pid) { console.log(`${r.tcgdex_id ?? '?'}\t#${r.number}\t${r.name}\tno pokemontcg_id`); none++; continue }
    try {
      const res = await fetch(`https://api.pokemontcg.io/v2/cards/${pid}`)
      if (!res.ok) {
        console.log(`${pid}\t#${r.number}\t${r.name}\tAPI ${res.status}`)
        none++
        continue
      }
      const j = await res.json()
      const small = j?.data?.images?.small as string | undefined
      const large = j?.data?.images?.large as string | undefined
      if (small) {
        console.log(`${pid}\t#${r.number}\t${r.name}\t${small}`)
        fixes.push({ pokemontcg_id: pid, tcgdex_id: r.tcgdex_id as string | undefined, small, large: large ?? null })
        recoverable++
      } else {
        console.log(`${pid}\t#${r.number}\t${r.name}\t(no image in pokemontcg response)`)
        none++
      }
    } catch (e: unknown) {
      console.log(`${pid}\terr: ${(e as Error).message}`)
      none++
    }
  }
  console.log('\n--- summary ---')
  console.log('total missing:', rows.length)
  console.log('recoverable via pokemontcg.io:', recoverable)
  console.log('still missing:', none)
  console.log('\n--- fixes JSON ---')
  console.log(JSON.stringify(fixes, null, 2))
  await c.close()
}

main().catch(e => { console.error(e); process.exit(1) })
