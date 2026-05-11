import 'dotenv/config'
import type { ObjectId } from 'mongodb'
import { getDb } from '../lib/db'

type CardKeyDoc = { pokemontcg_id?: string | null; tcgdex_id?: string | null }
type TcgdexIdDoc = { tcgdex_id?: string | null }
type UserCardKeyDoc = { _id: ObjectId; cardId?: string | null }

async function buildKeyMap(): Promise<Map<string, string>> {
  const db = await getDb()
  const cursor = db.collection<CardKeyDoc>('cards').find(
    { pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } },
    { projection: { _id: 0, pokemontcg_id: 1, tcgdex_id: 1 } },
  )
  const map = new Map<string, string>()
  for await (const doc of cursor) {
    if (
      typeof doc.pokemontcg_id === 'string' &&
      doc.pokemontcg_id.length > 0 &&
      typeof doc.tcgdex_id === 'string' &&
      doc.tcgdex_id.length > 0
    ) {
      map.set(doc.pokemontcg_id, doc.tcgdex_id)
    }
  }
  return map
}

async function buildTcgdexIdSet(): Promise<Set<string>> {
  const db = await getDb()
  const cursor = db.collection<TcgdexIdDoc>('cards').find(
    { tcgdex_id: { $ne: null } },
    { projection: { _id: 0, tcgdex_id: 1 } },
  )
  const set = new Set<string>()
  for await (const doc of cursor) {
    if (typeof doc.tcgdex_id === 'string' && doc.tcgdex_id.length > 0) {
      set.add(doc.tcgdex_id)
    }
  }
  return set
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply')
  const db = await getDb()

  const keyMap = await buildKeyMap()
  console.log(`[migrate] pokemontcg_id -> tcgdex_id pairs: ${keyMap.size}`)

  const tcgdexIds = await buildTcgdexIdSet()
  console.log(`[migrate] known tcgdex_id values: ${tcgdexIds.size}`)

  let alreadyMigrated = 0
  let toRewrite = 0
  let unknown = 0
  const unknownSamples: string[] = []

  const cursor = db
    .collection<UserCardKeyDoc>('userCards')
    .find({}, { projection: { _id: 1, cardId: 1 } })

  for await (const uc of cursor) {
    const rawId = uc.cardId
    if (typeof rawId !== 'string' || rawId.length === 0) continue
    const id: string = rawId

    if (tcgdexIds.has(id)) {
      alreadyMigrated += 1
      continue
    }

    const next = keyMap.get(id)
    if (typeof next !== 'string' || next.length === 0) {
      unknown += 1
      if (unknownSamples.length < 10) unknownSamples.push(id)
      continue
    }

    toRewrite += 1
    if (!dryRun) {
      await db
        .collection<UserCardKeyDoc>('userCards')
        .updateOne({ _id: uc._id, cardId: id }, { $set: { cardId: next } })
    }
  }

  console.log(`[migrate] already on tcgdex_id: ${alreadyMigrated}`)
  console.log(`[migrate] rewrites ${dryRun ? 'planned' : 'applied'}: ${toRewrite}`)
  console.log(`[migrate] unmatched legacy ids: ${unknown}`)
  if (unknownSamples.length > 0) {
    console.log(`[migrate] sample unmatched: ${unknownSamples.join(', ')}`)
  }
  if (dryRun) console.log('[migrate] dry run - re-run with --apply to commit')
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
