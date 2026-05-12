import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const db = await getDb()

  const setsTotal = await db.collection('sets').countDocuments({})
  const setsWithTcgdex = await db.collection('sets').countDocuments({ tcgdex_id: { $ne: null } })
  const setsWithPokemontcg = await db.collection('sets').countDocuments({ pokemontcg_id: { $ne: null } })

  const cardsTotal = await db.collection('cards').countDocuments({})
  const cardsWithTcgdex = await db.collection('cards').countDocuments({ tcgdex_id: { $ne: null } })
  const cardsWithPokemontcg = await db.collection('cards').countDocuments({ pokemontcg_id: { $ne: null } })
  const cardsWithBoth = await db.collection('cards').countDocuments({
    tcgdex_id: { $ne: null },
    pokemontcg_id: { $ne: null },
  })
  const cardsWithPriceEUR = await db.collection('cards').countDocuments({ priceEUR: { $ne: null } })
  const cardsWithCardmarketPrice = await db.collection('cards').countDocuments({ cardmarketPrice: { $exists: true } })

  const userCardsTotal = await db.collection('userCards').countDocuments({})

  console.log('=== Sets ===')
  console.log('  total:           ', setsTotal)
  console.log('  with tcgdex_id:  ', setsWithTcgdex)
  console.log('  with pokemontcg: ', setsWithPokemontcg)
  console.log('=== Cards ===')
  console.log('  total:               ', cardsTotal)
  console.log('  with tcgdex_id:      ', cardsWithTcgdex)
  console.log('  with pokemontcg_id:  ', cardsWithPokemontcg)
  console.log('  with BOTH keys:      ', cardsWithBoth)
  console.log('  with priceEUR:       ', cardsWithPriceEUR)
  console.log('  with cardmarketPrice:', cardsWithCardmarketPrice)
  console.log('=== UserCards ===')
  console.log('  total:           ', userCardsTotal)

  const tcgdexSample = await db.collection('sets').findOne({ tcgdex_id: { $ne: null } })
  console.log('--- sample set WITH tcgdex_id ---')
  console.log(tcgdexSample ? JSON.stringify(tcgdexSample, null, 2) : 'NONE FOUND')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
