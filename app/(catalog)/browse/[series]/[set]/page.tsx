import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getSetById } from '@/lib/sets'
import { getCardsBySet } from '@/lib/cards'
import { getOwnedCountsByCardVariant, getCollectionValueForSet, getCollectionCostForSet } from '@/lib/userCards'
import { getWishlistContext } from '@/lib/wishlist'
import { setCodeFor } from '@/lib/taxonomy/setCode'
import { normaliseRarity } from '@/lib/taxonomy/rarity'
import { applicableVariantsForSet, variantLabel, chipsForCard } from '@/lib/taxonomy/variant'
import { formatTcgcReleaseDate } from '@/lib/dateFormat'
import FilterBar from '@/components/catalog/FilterBar'
import SortMenu from '@/components/catalog/SortMenu'
import CardsGrid from '@/components/catalog/CardsGrid'
import CollectionFilter from '@/components/catalog/CollectionFilter'
import SetInfoDialog from '@/components/catalog/SetInfoDialog'
import type { PokemonCard } from '@/lib/types'

const sortSchema = z.enum(['set-order','name-asc','name-desc','number-asc','number-desc','rarity','price-asc','price-desc']).catch('set-order')
const collectionSchema = z.enum(['all', 'owned', 'not-owned']).catch('all')

function parseCardNumber(num: string): number {
  const n = parseInt(num, 10)
  return isNaN(n) ? Infinity : n
}

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ series: string; set: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { set: setId } = await params
  const sp = await searchParams
  const session = await auth()
  const userId = session?.user?.id
  const set = await getSetById(setId)
  if (!set) return <main className="p-6"><p>Set not found.</p></main>

  const [cards, variantCounts, collectionValue, collectionCost, wishlistCtx] = await Promise.all([
    getCardsBySet(setId),
    userId ? getOwnedCountsByCardVariant(userId, setId) : Promise.resolve(new Map<string, number>()),
    userId ? getCollectionValueForSet(userId, setId) : Promise.resolve(undefined as number | undefined),
    userId ? getCollectionCostForSet(userId, setId) : Promise.resolve(undefined as number | undefined),
    getWishlistContext(userId, session?.user?.tier),
  ])
  const code = setCodeFor(set)
  const isPromo = set.name.toLowerCase().includes('promo')

  const arr = (k: string) => {
    const v = sp[k]
    return Array.isArray(v) ? v : v ? [v] : []
  }
  const rarityFilters = new Set(arr('rarity'))
  const typeFilters = new Set(arr('type'))
  const subtypeFilters = new Set(arr('subtype'))
  const variantFilters = new Set(arr('variant'))
  const sort = sortSchema.parse(typeof sp.sort === 'string' ? sp.sort : 'set-order')
  const collection = collectionSchema.parse(typeof sp.collection === 'string' ? sp.collection : 'all')

  const isCardOwned = (c: PokemonCard) =>
    chipsForCard(c, set).some((chip) => (variantCounts.get(`${c.pokemontcg_id}:${chip.variant}`) ?? 0) > 0)

  let visible = cards.filter((c) => {
    if (rarityFilters.size > 0 && !rarityFilters.has(normaliseRarity(c.rarity))) return false
    if (typeFilters.size > 0 && !c.types.some((t) => typeFilters.has(t))) return false
    if (subtypeFilters.size > 0 && !c.subtypes.some((s) => subtypeFilters.has(s))) return false
    if (variantFilters.size > 0 && !chipsForCard(c, set).some((chip) => variantFilters.has(chip.label))) return false
    if (userId && collection === 'owned') return isCardOwned(c)
    if (userId && collection === 'not-owned') return !isCardOwned(c)
    return true
  })

  const compare: Record<typeof sort, (a: PokemonCard, b: PokemonCard) => number> = {
    'set-order':   (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number) || a.number.localeCompare(b.number),
    'name-asc':    (a, b) => a.name.localeCompare(b.name),
    'name-desc':   (a, b) => b.name.localeCompare(a.name),
    'number-asc':  (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number),
    'number-desc': (a, b) => parseCardNumber(b.number) - parseCardNumber(a.number),
    'rarity':      (a, b) => normaliseRarity(a.rarity).localeCompare(normaliseRarity(b.rarity)),
    'price-asc':   (a, b) => (a.priceEUR ?? Infinity) - (b.priceEUR ?? Infinity),
    'price-desc':  (a, b) => (b.priceEUR ?? -Infinity) - (a.priceEUR ?? -Infinity),
  }
  visible = [...visible].sort(compare[sort])

  const allRarities = Array.from(new Set(cards.map((c) => normaliseRarity(c.rarity)))).sort()
  const allTypes = Array.from(new Set(cards.flatMap((c) => c.types))).sort()
  const allSubtypes = Array.from(new Set(cards.flatMap((c) => c.subtypes))).sort()
  const allVariants = applicableVariantsForSet(set).map(variantLabel)

  const ownedCount = userId ? cards.filter(isCardOwned).length : 0
  const totalCount = cards.length
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0

  // Derive dialog data from already-fetched data
  const dialogVariantCounts = new Map<string, number>()
  for (const [key, count] of variantCounts) {
    const variant = key.slice(key.indexOf(':') + 1)
    dialogVariantCounts.set(variant, (dialogVariantCounts.get(variant) ?? 0) + count)
  }

  const rarityTotals = new Map<string, number>()
  for (const card of cards) {
    const r = normaliseRarity(card.rarity)
    rarityTotals.set(r, (rarityTotals.get(r) ?? 0) + 1)
  }

  const ownedCardIds = new Set<string>()
  for (const [key, count] of variantCounts) {
    if (count > 0) ownedCardIds.add(key.slice(0, key.indexOf(':')))
  }
  const rarityOwnedCounts = new Map<string, number>()
  for (const card of cards) {
    if (ownedCardIds.has(card.pokemontcg_id)) {
      const r = normaliseRarity(card.rarity)
      rarityOwnedCounts.set(r, (rarityOwnedCounts.get(r) ?? 0) + 1)
    }
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        {isPromo && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-base border border-surface0 text-mauve">{code}</span>}
        <h1 className="text-2xl font-russo">{set.name}</h1>
        <span className="text-overlay0 text-xs">{formatTcgcReleaseDate(set.releaseDate)}</span>
        <SetInfoDialog
          set={set}
          variantCounts={userId ? dialogVariantCounts : undefined}
          ownedUniqueCount={userId ? ownedCount : undefined}
          rarityTotals={rarityTotals}
          rarityOwnedCounts={userId ? rarityOwnedCounts : undefined}
          collectionValue={collectionValue}
          collectionCost={collectionCost}
          buttonClassName="text-overlay0 hover:text-blue transition-colors p-0.5 ml-1"
        />
      </header>

      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterBar
            rarities={allRarities}
            types={allTypes}
            variants={allVariants}
            subtypes={allSubtypes}
          />
          {userId && <CollectionFilter value={collection} />}
          {visible.length < totalCount && (
            <span className="text-[11px] text-overlay0 tabular-nums">
              {visible.length} of {totalCount}
            </span>
          )}
        </div>
        <SortMenu />
      </div>

      {userId && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-surface0 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] text-overlay0 tabular-nums shrink-0">{ownedCount}/{totalCount}</span>
        </div>
      )}

      <CardsGrid
        cards={visible}
        set={set}
        variantCounts={userId ? variantCounts : undefined}
        wishlistedIds={wishlistCtx.wishlistedIds}
        userState={wishlistCtx.userState}
      />
    </main>
  )
}
