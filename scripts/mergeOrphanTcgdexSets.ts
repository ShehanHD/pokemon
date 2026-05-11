/**
 * One-off: reconcile TCGdex card data into legacy card docs across the cards collection.
 *
 * Two phases:
 *
 *   1. Set-level orphan merge:
 *      For 8 popular sets where seedSeriesTcgdex's name+ID heuristic failed (Italian names,
 *      zero-padded TCGdex ids like sv03 vs legacy sv3), merge each TCGdex-only set doc onto
 *      its legacy counterpart, then merge the cards (phase 2 handles the cards).
 *
 *   2. Card-level reconciliation (covers ALL merged sets including phase-1 results):
 *      For every set with both pokemontcg_id and tcgdex_id, find the TCGdex-style cards parked
 *      at `set_id = <tcgdex_id>` and copy their fields onto the matching legacy doc
 *      (set_id = <legacy_id>, no tcgdex_id) joined by NORMALIZED number — leading zeros
 *      stripped, so "001" ≡ "1". Tcgdex duplicate docs are deleted after merging.
 *      Tcgdex cards that have no legacy counterpart are re-parented onto the legacy set_id.
 *
 * Idempotent: re-running is a no-op once reconciled.
 * Run dry-run by default. Pass --apply to commit changes.
 */

import 'dotenv/config'
import type { ObjectId } from 'mongodb'
import { getDb } from '../lib/db'

const APPLY = process.argv.includes('--apply')

const SET_MAPPING: { legacy: string; tcgdex: string }[] = [
  { legacy: 'me1', tcgdex: 'me01' },
  { legacy: 'me2pt5', tcgdex: 'me02.5' },
  { legacy: 'me3', tcgdex: 'me03' },
  { legacy: 'rsv10pt5', tcgdex: 'sv10.5w' },
  { legacy: 'sv3', tcgdex: 'sv03' },
  { legacy: 'sv4', tcgdex: 'sv04' },
  { legacy: 'sv8pt5', tcgdex: 'sv08.5' },
  { legacy: 'sv9', tcgdex: 'sv09' },
]

type SetDoc = {
  _id: ObjectId
  pokemontcg_id?: string | null
  tcgdex_id?: string | null
  name?: string
  series?: string
  seriesSlug?: string
  releaseDate?: string
  totalCards?: number
  printedTotal?: number
  logoUrl?: string
  symbolUrl?: string
  language?: string
  totalValueEUR?: number | null
  totalValueUSD?: number | null
  totalValue?: number | null
}

type CardDoc = {
  _id: ObjectId
  pokemontcg_id?: string | null
  tcgdex_id?: string | null
  set_id?: string
  number?: string
  name?: string
  rarity?: string | null
  types?: string[]
  subtypes?: string[]
  supertype?: string
  variants?: Record<string, boolean>
  imageUrl?: string
  imageUrlHiRes?: string
  priceEUR?: number | null
  priceUSD?: number | null
  pricing?: unknown
  language?: string
}

function normalizeNumber(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  // Strip leading zeros from purely-numeric prefixes while preserving suffix.
  // Examples: "001" -> "1", "012a" -> "12a", "TG01" -> "TG01" (unchanged), "100" -> "100"
  const m = trimmed.match(/^0*(\d+)([^\d].*)?$/)
  if (m) {
    return `${m[1]}${m[2] ?? ''}`
  }
  return trimmed
}

type ReconcileCounters = {
  merged: number
  reparented: number
  deletedDupes: number
}

async function reconcileCardsForSet(
  legacyId: string,
  tcgdexId: string,
  apply: boolean,
): Promise<ReconcileCounters> {
  const db = await getDb()
  const cards = db.collection<CardDoc>('cards')

  // TCGdex-style cards parked under set_id = <tcgdex id> OR set_id = <legacy id>
  // (covers two cases: (a) seeder used the tcgdex id; (b) seeder reused the legacy id
  // because the set was already merged at seed time — e.g. sv3pt5/sv03.5).
  // Require pokemontcg_id IS null so we don't re-process already-merged docs.
  const setIdFilter = legacyId === tcgdexId ? legacyId : { $in: [legacyId, tcgdexId] }
  const tcgdexCards = await cards
    .find({
      set_id: setIdFilter as string,
      tcgdex_id: { $ne: null },
      pokemontcg_id: { $in: [null, undefined] },
    })
    .toArray()
  // Legacy cards that don't have tcgdex_id yet
  const legacyCards = await cards
    .find(
      { set_id: legacyId, tcgdex_id: { $in: [null, undefined] } },
      { projection: { _id: 1, number: 1, pokemontcg_id: 1 } },
    )
    .toArray()

  // Map legacy by normalized number
  const legacyByNormNumber = new Map<string, { _id: ObjectId; pokemontcg_id?: string | null; rawNumber?: string }>()
  for (const c of legacyCards) {
    const norm = normalizeNumber(c.number)
    if (norm !== null && !legacyByNormNumber.has(norm)) {
      legacyByNormNumber.set(norm, { _id: c._id, pokemontcg_id: c.pokemontcg_id, rawNumber: c.number })
    }
  }

  const counters: ReconcileCounters = { merged: 0, reparented: 0, deletedDupes: 0 }

  for (const tc of tcgdexCards) {
    const normT = normalizeNumber(tc.number)
    const legacyMatch = normT !== null ? legacyByNormNumber.get(normT) : undefined
    if (legacyMatch) {
      if (apply) {
        // Delete the duplicate tcgdex card first so the unique tcgdex_id index
        // frees up before we $set it onto the legacy doc.
        await cards.deleteOne({ _id: tc._id })
        await cards.updateOne(
          { _id: legacyMatch._id },
          {
            $set: {
              tcgdex_id: tc.tcgdex_id,
              language: tc.language ?? 'it',
              name: tc.name,
              rarity: tc.rarity ?? null,
              types: tc.types ?? [],
              subtypes: tc.subtypes ?? [],
              supertype: tc.supertype ?? '',
              variants: tc.variants ?? {},
              imageUrl: tc.imageUrl ?? '',
              imageUrlHiRes: tc.imageUrlHiRes ?? '',
              priceEUR: tc.priceEUR ?? null,
              priceUSD: null,
              pricing: tc.pricing ?? null,
            },
          },
        )
        counters.deletedDupes++
      } else {
        counters.deletedDupes++
      }
      counters.merged++
    } else {
      // No matching legacy by normalized number — re-parent the tcgdex doc onto legacy set_id
      if (apply) {
        await cards.updateOne({ _id: tc._id }, { $set: { set_id: legacyId } })
      }
      counters.reparented++
    }
  }

  return counters
}

async function main() {
  const db = await getDb()
  const sets = db.collection<SetDoc>('sets')

  console.log(APPLY ? '=== APPLY MODE ===\n' : '=== DRY RUN — pass --apply to commit ===\n')

  // === Phase 1: explicit orphan set merges ===
  console.log('--- Phase 1: orphan set merges ---')
  for (const { legacy, tcgdex } of SET_MAPPING) {
    const legacySet = await sets.findOne({ pokemontcg_id: legacy })
    const tcgdexSet = await sets.findOne({ tcgdex_id: tcgdex, pokemontcg_id: { $in: [null, undefined] } })
    if (!legacySet) {
      console.log(`  skip: no legacy set for "${legacy}"`)
      continue
    }
    if (!tcgdexSet) {
      const merged = await sets.findOne({ pokemontcg_id: legacy, tcgdex_id: tcgdex })
      if (merged) {
        console.log(`  ${legacy} <-> ${tcgdex}: already merged at set level — skip set step`)
        continue
      }
      console.log(`  skip: no orphan TCGdex set for "${tcgdex}"`)
      continue
    }
    console.log(`  ${legacy} <-> ${tcgdex}: merging set "${tcgdexSet.name}" -> "${legacySet.name}"`)

    const setMerge: Partial<SetDoc> = {
      tcgdex_id: tcgdex,
      language: tcgdexSet.language ?? 'it',
      name: tcgdexSet.name ?? legacySet.name,
      series: tcgdexSet.series ?? legacySet.series,
      seriesSlug: tcgdexSet.seriesSlug ?? legacySet.seriesSlug,
      releaseDate: tcgdexSet.releaseDate || legacySet.releaseDate,
      totalCards: tcgdexSet.totalCards ?? legacySet.totalCards,
      printedTotal: tcgdexSet.printedTotal ?? legacySet.printedTotal,
      logoUrl: tcgdexSet.logoUrl ?? legacySet.logoUrl,
      symbolUrl: tcgdexSet.symbolUrl ?? legacySet.symbolUrl,
      totalValueEUR: tcgdexSet.totalValueEUR ?? null,
      totalValueUSD: null,
      totalValue: tcgdexSet.totalValueEUR ?? null,
    }
    if (APPLY) {
      // Delete the tcgdex-only doc first so the unique tcgdex_id index frees up
      // before we $set it onto the legacy doc.
      await sets.deleteOne({ _id: tcgdexSet._id })
      await sets.updateOne({ _id: legacySet._id }, { $set: setMerge })
    }
  }

  // === Phase 2: card-level reconciliation across ALL merged sets ===
  console.log('\n--- Phase 2: card reconciliation (normalized numbers) ---')
  // Reload merged sets (phase 1 may have added some)
  const mergedSets = await sets
    .find({ pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } }, { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1 } })
    .toArray()

  let totalMerged = 0
  let totalReparented = 0
  let totalDeleted = 0
  let setsTouched = 0
  let setsSkipped = 0

  for (const s of mergedSets) {
    const legacy = s.pokemontcg_id!
    const tcgdex = s.tcgdex_id!
    const c = await reconcileCardsForSet(legacy, tcgdex, APPLY)
    if (c.merged === 0 && c.reparented === 0) {
      setsSkipped++
      continue
    }
    setsTouched++
    totalMerged += c.merged
    totalReparented += c.reparented
    totalDeleted += c.deletedDupes
    if (setsTouched <= 30 || c.merged + c.reparented > 50) {
      console.log(`  ${legacy} <-> ${tcgdex} "${s.name}": merge=${c.merged} reparent=${c.reparented} delete=${c.deletedDupes}`)
    }
  }

  console.log('\n=== Phase 2 totals ===')
  console.log(`  sets touched: ${setsTouched} (skipped clean: ${setsSkipped})`)
  console.log(`  cards merged into legacy: ${totalMerged}`)
  console.log(`  cards re-parented (no number match): ${totalReparented}`)
  console.log(`  duplicate tcgdex docs deleted: ${totalDeleted}`)

  // === Summary ===
  console.log('\n=== Post-merge state ===')
  const totalSets = await sets.countDocuments({})
  const tcgdexOnly = await sets.countDocuments({ tcgdex_id: { $ne: null }, pokemontcg_id: { $in: [null, undefined] } })
  const legacyOnly = await sets.countDocuments({ pokemontcg_id: { $ne: null }, tcgdex_id: { $in: [null, undefined] } })
  const merged = await sets.countDocuments({ pokemontcg_id: { $ne: null }, tcgdex_id: { $ne: null } })
  console.log(`  total sets=${totalSets} merged=${merged} tcgdex-only=${tcgdexOnly} legacy-only=${legacyOnly}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
