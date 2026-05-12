import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const d = await getDb()
  const cardsWithoutTcgdexId = await d.collection('cards').countDocuments({ tcgdex_id: null })
  const cardsWithLegacyPrice = await d.collection('cards').countDocuments({ cardmarketPrice: { $exists: true } })
  const setsWithLegacyTotalValue = await d.collection('sets').countDocuments({ totalValue: { $exists: true } })
  const userCards = await d.collection('userCards').countDocuments({})
  const cardIds = await d.collection('userCards').distinct('cardId')
  const userCardsResolved = await d.collection('cards').countDocuments({ tcgdex_id: { $in: cardIds } })
  console.log(JSON.stringify({
    cardsWithoutTcgdexId,
    cardsWithLegacyPrice,
    setsWithLegacyTotalValue,
    userCards,
    distinctCardIds: cardIds.length,
    userCardsResolved,
  }, null, 2))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
