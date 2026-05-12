import 'dotenv/config'
import { MongoClient } from 'mongodb'
const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)

  console.log('--- sv8pt5 cards with number 150-180 ---')
  for (const d of await db.collection('cards').find({ set_id: 'sv8pt5', number: { $in: ['150','151','152','153','154','155','156','157','158','159','160','161','162','163','164','165','166','167','168','169','170','171','172','173','174','175','176','177','178','179','180'] } }).project({ number: 1, name: 1, rarity: 1 }).toArray())
    console.log(`  #${d.number} | ${d.name} | ${d.rarity}`)

  console.log('\n--- sv8pt5 total card count ---')
  console.log('  ', await db.collection('cards').countDocuments({ set_id: 'sv8pt5' }))

  console.log('\n--- sv8pt5 max numeric number ---')
  const all = await db.collection('cards').find({ set_id: 'sv8pt5' }).project({ number: 1 }).toArray()
  const max = Math.max(...all.map(d => parseInt(String(d.number), 10)).filter(n => Number.isFinite(n)))
  console.log('  max:', max)

  console.log('\n--- All cards with cardmarket id or printed number > 170 in sv8pt5 ---')
  for (const d of await db.collection('cards').find({ set_id: 'sv8pt5' }).project({ number: 1, name: 1, rarity: 1 }).toArray()) {
    const n = parseInt(String(d.number), 10)
    if (Number.isFinite(n) && n >= 130) console.log(`  #${d.number} | ${d.name} | ${d.rarity}`)
  }

  console.log('\n--- me1 max number ---')
  const me1 = await db.collection('cards').find({ set_id: 'me1' }).project({ number: 1, name: 1, rarity: 1 }).toArray()
  for (const d of me1) {
    const n = parseInt(String(d.number), 10)
    if (Number.isFinite(n) && n >= 130) console.log(`  me1 #${d.number} | ${d.name} | ${d.rarity}`)
  }

  console.log('\n--- me2 cards >= 130 ---')
  for (const d of await db.collection('cards').find({ set_id: 'me2' }).project({ number: 1, name: 1, rarity: 1 }).toArray()) {
    const n = parseInt(String(d.number), 10)
    if (Number.isFinite(n) && n >= 130) console.log(`  me2 #${d.number} | ${d.name} | ${d.rarity}`)
  }

  console.log('\n--- All Riolu in me1/me2/me2pt5/me3 ---')
  for (const d of await db.collection('cards').find({ name: /Riolu/i, set_id: { $in: ['me1','me2','me2pt5','me3'] } }).project({ pokemontcg_id: 1, name: 1, number: 1, set_id: 1, rarity: 1 }).toArray())
    console.log(`  ${d.pokemontcg_id} | ${d.name} #${d.number} | ${d.set_id} | ${d.rarity}`)

  console.log("\n--- All N's Zekrom anywhere ---")
  for (const d of await db.collection('cards').find({ name: /N's Zekrom/i }).project({ pokemontcg_id: 1, name: 1, number: 1, set_id: 1, rarity: 1 }).toArray())
    console.log(`  ${d.pokemontcg_id} | ${d.name} #${d.number} | ${d.set_id} | ${d.rarity}`)

  console.log('\n--- Sets released after Mar 2026 ---')
  for (const s of await db.collection('sets').find({ releaseDate: { $gte: '2026/03/01' } }).project({ pokemontcg_id: 1, name: 1, releaseDate: 1, printedTotal: 1 }).sort({ releaseDate: 1 }).toArray())
    console.log(`  ${s.pokemontcg_id} | ${s.name} | ${s.releaseDate} | printed=${s.printedTotal}`)

  await c.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
