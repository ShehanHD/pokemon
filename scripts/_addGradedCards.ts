import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB ?? 'pokemon'

const USER_ID = '69fb026f1f2aff0f2fb5927d'

interface Insert {
  cardId: string
  acquiredAt: Date
  grade: number
  gradedValue: number
  label: string
}

const inserts: Insert[] = [
  // Batch 1 — graded 2025-10-18
  { cardId: 'swshp-SWSH234', acquiredAt: new Date('2025-10-18'), grade: 9.5, gradedValue: 30,  label: 'GO Pikachu SWSH234' },
  { cardId: 'sv8pt5-149',    acquiredAt: new Date('2025-10-18'), grade: 9.5, gradedValue: 300, label: 'PRE Vaporeon ex 149' },
  { cardId: 'sv1-244',       acquiredAt: new Date('2025-10-18'), grade: 9.5, gradedValue: 30,  label: 'SVI Miraidon ex 244' },
  { cardId: 'sv6-186',       acquiredAt: new Date('2025-10-18'), grade: 9.5, gradedValue: 40,  label: 'TWM Tatsugiri 186' },
  // Batch 2 — graded 2026-04-03
  { cardId: 'me3-118',       acquiredAt: new Date('2026-04-03'), grade: 9.5, gradedValue: 100, label: 'POR Mega Starmie ex 118' },
  { cardId: 'me3-119',       acquiredAt: new Date('2026-04-03'), grade: 9.5, gradedValue: 100, label: 'POR Mega Clefable ex 119' },
  { cardId: 'sv3pt5-173',    acquiredAt: new Date('2026-04-03'), grade: 9,   gradedValue: 75,  label: 'MEW Pikachu 173' },
  { cardId: 'swshp-SWSH234', acquiredAt: new Date('2026-04-03'), grade: 8.5, gradedValue: 20,  label: 'GO Pikachu SWSH234 (2nd copy)' },
  { cardId: 'sv4-251',       acquiredAt: new Date('2026-04-03'), grade: 9.5, gradedValue: 120, label: 'PAR Roaring Moon ex 251' },
]

async function main() {
  const c = await new MongoClient(uri).connect()
  const db = c.db(dbName)
  const cards = db.collection('cards')
  const userCards = db.collection('userCards')

  // Verify all referenced cards exist before any write
  const ids = Array.from(new Set(inserts.map((i) => i.cardId)))
  const found = await cards.find({ pokemontcg_id: { $in: ids } }).project({ pokemontcg_id: 1, name: 1, number: 1, set_id: 1, rarity: 1 }).toArray()
  const byId = new Map(found.map((d) => [d.pokemontcg_id, d]))

  console.log('--- card lookup ---')
  for (const id of ids) {
    const d = byId.get(id)
    if (!d) {
      console.error(`  MISSING: ${id}`)
      process.exit(1)
    }
    console.log(`  ${id} | ${d.name} #${d.number} | ${d.set_id} | ${d.rarity}`)
  }

  const now = new Date()
  const docs = inserts.map((i) => ({
    _id: new ObjectId().toHexString(),
    userId: USER_ID,
    cardId: i.cardId,
    variant: 'holo' as const,
    acquiredAt: i.acquiredAt,
    type: 'graded' as const,
    gradingCompany: 'GRAAD' as const,
    grade: i.grade,
    gradedValue: i.gradedValue,
    createdAt: now,
    updatedAt: now,
  }))

  console.log('\n--- inserting graded userCards ---')
  for (const d of docs) {
    console.log(`  + ${d.cardId} | grade ${d.grade} | €${d.gradedValue} | ${d.acquiredAt.toISOString().slice(0, 10)}`)
  }

  const res = await userCards.insertMany(docs)
  console.log(`\nInserted: ${res.insertedCount}`)

  // Verify post-state
  const gradedCount = await userCards.countDocuments({ userId: USER_ID, type: 'graded' })
  const totalCount = await userCards.countDocuments({ userId: USER_ID })
  console.log(`User now has: ${totalCount} userCards total (${gradedCount} graded)`)

  await c.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
