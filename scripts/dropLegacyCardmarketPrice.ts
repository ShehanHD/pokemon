import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const dryRun = !process.argv.includes('--apply')
  const db = await getDb()

  const cardsToClean = await db.collection('cards').countDocuments({ cardmarketPrice: { $exists: true } })
  const setsToClean = await db.collection('sets').countDocuments({ totalValue: { $exists: true } })

  console.log(`[cleanup] cards with cardmarketPrice: ${cardsToClean}`)
  console.log(`[cleanup] sets with totalValue: ${setsToClean}`)

  if (dryRun) {
    console.log('[cleanup] dry run — re-run with --apply to commit')
    return
  }

  const r1 = await db.collection('cards').updateMany(
    { cardmarketPrice: { $exists: true } },
    { $unset: { cardmarketPrice: '' } },
  )
  const r2 = await db.collection('sets').updateMany(
    { totalValue: { $exists: true } },
    { $unset: { totalValue: '' } },
  )
  console.log(`[cleanup] cards modified: ${r1.modifiedCount}; sets modified: ${r2.modifiedCount}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
