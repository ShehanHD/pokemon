import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const missing = await db
    .collection('cards')
    .find({ set_id: 'svp', $or: [{ imageUrl: null }, { imageUrl: { $exists: false } }, { imageUrl: '' }] })
    .project({ _id: 0, number: 1, name: 1, pokemontcg_id: 1, tcgdex_id: 1 })
    .toArray()

  const results: Array<{ tcgdex_id: string | undefined; number: string; name: string; url: string; status: number | string }> = []
  for (const row of missing) {
    const tcgId = row.tcgdex_id as string | undefined
    let url = ''
    if (tcgId && /^svp-\d+$/.test(tcgId)) {
      const num = tcgId.split('-')[1]
      url = `https://assets.tcgdex.net/en/sv/svp/${num}/low.webp`
    } else if (row.number) {
      const padded = String(row.number).padStart(3, '0')
      url = `https://assets.tcgdex.net/en/sv/svp/${padded}/low.webp`
    }
    let status: number | string = 'no-url'
    if (url) {
      try {
        const res = await fetch(url, { method: 'HEAD' })
        status = res.status
      } catch (e: unknown) {
        status = `err:${(e as Error).message}`
      }
    }
    results.push({ tcgdex_id: tcgId, number: row.number as string, name: row.name as string, url, status })
  }

  console.log('total checked:', results.length)
  const ok = results.filter(r => r.status === 200)
  const notFound = results.filter(r => r.status === 404)
  const other = results.filter(r => r.status !== 200 && r.status !== 404)
  console.log('200 OK:', ok.length)
  console.log('404:', notFound.length)
  console.log('other:', other.length)
  console.log('\n--- 200 (recoverable) ---')
  for (const r of ok) console.log(`${r.tcgdex_id ?? '(no tcgdex_id)'}\t#${r.number}\t${r.name}\t${r.url}`)
  console.log('\n--- 404 (genuinely missing upstream) ---')
  for (const r of notFound) console.log(`${r.tcgdex_id ?? '(no tcgdex_id)'}\t#${r.number}\t${r.name}\t${r.url}`)
  if (other.length > 0) {
    console.log('\n--- other ---')
    for (const r of other) console.log(`${r.tcgdex_id ?? '(no tcgdex_id)'}\t#${r.number}\t${r.name}\t${r.url}\t${r.status}`)
  }

  await c.close()
}

main().catch(e => { console.error(e); process.exit(1) })
