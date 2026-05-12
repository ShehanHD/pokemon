import Link from 'next/link'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getSeriesWithSets, searchSets, getPrintedTotalsBySetId, getSetsByIds } from '@/lib/sets'
import { searchCards, listAllCards, type CardsSort } from '@/lib/cards'
import { normalisedRaritySchema, type NormalisedRarity } from '@/lib/taxonomy/rarity'
import { getOwnedVariantCountsBySet, getOwnedUniqueCardCountsBySet, getOwnedRarityCountsBySet, getCollectionValueBySet, getCollectionCostBySet, getOwnedCardIds, getOwnedCountsByCardVariantForCards } from '@/lib/userCards'
import { getRarityTotalsBySet } from '@/lib/cards'
import { getWishlistContext } from '@/lib/wishlist'
import SetCard from '@/components/catalog/SetCard'
import CollectionFilter from '@/components/catalog/CollectionFilter'
import CardSearchResult from '@/components/catalog/CardSearchResult'
import Pagination from '@/components/catalog/Pagination'
import BrowseFilters from '@/components/catalog/BrowseFilters'
import { CardSizeSlider, ResizableCardGrid } from '@/components/catalog/CardGridSize'

export const metadata = { title: 'Browse — PokeVault' }

const collectionSchema = z.enum(['all', 'owned', 'not-owned']).catch('all')
const viewSchema = z.enum(['sets', 'cards']).catch('sets')
const querySchema = z.string().trim().max(100).catch('')
const pageSchema = z.coerce.number().int().min(1).catch(1)
const sortSchema = z.enum(['name', 'name-desc', 'price-desc', 'price-asc', 'release-desc', 'release-asc']).catch('name')
const rarityFilterSchema = normalisedRaritySchema.exclude(['Unknown']).optional().catch(undefined)
const supertypeSchema = z.enum(['Pokémon', 'Trainer', 'Energy']).optional().catch(undefined)

const CARDS_PER_PAGE = 60

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const session = await auth()
  const userId = session?.user?.id
  const collection = collectionSchema.parse(typeof sp.collection === 'string' ? sp.collection : 'all')
  const view = viewSchema.parse(typeof sp.view === 'string' ? sp.view : 'sets')
  const query = querySchema.parse(typeof sp.q === 'string' ? sp.q : '')
  const page = pageSchema.parse(typeof sp.page === 'string' ? sp.page : 1)
  const sort: CardsSort = sortSchema.parse(typeof sp.sort === 'string' ? sp.sort : 'name')
  const rarityFilter: NormalisedRarity | undefined = rarityFilterSchema.parse(typeof sp.rarity === 'string' ? sp.rarity : undefined)
  const supertypeFilter = supertypeSchema.parse(typeof sp.supertype === 'string' ? sp.supertype : undefined)

  if (view === 'cards') {
    const ownedIds = userId ? await getOwnedCardIds(userId) : new Set<string>()
    const [{ cards, total }, printedTotalsBySetId] = await Promise.all([
      listAllCards({
        q: query,
        limit: CARDS_PER_PAGE,
        skip: (page - 1) * CARDS_PER_PAGE,
        sort,
        rarity: rarityFilter ?? null,
        supertype: supertypeFilter ?? null,
        ownedIds: userId ? ownedIds : null,
        collection,
      }),
      getPrintedTotalsBySetId(),
    ])
    const pageCount = Math.max(1, Math.ceil(total / CARDS_PER_PAGE))

    const cardIds = cards.map((c) => c.pokemontcg_id)
    const uniqueSetIds = Array.from(new Set(cards.map((c) => c.set_id)))
    const [setsForCards, variantCounts, wishlistCtx] = await Promise.all([
      getSetsByIds(uniqueSetIds),
      userId ? getOwnedCountsByCardVariantForCards(userId, cardIds) : Promise.resolve(new Map<string, number>()),
      getWishlistContext(userId, session?.user?.tier),
    ])
    const setMap = new Map(setsForCards.map((s) => [s.tcgdex_id, s]))

    const buildHref = (p: number) => {
      const params = new URLSearchParams()
      params.set('view', 'cards')
      if (query) params.set('q', query)
      if (sort !== 'name') params.set('sort', sort)
      if (rarityFilter) params.set('rarity', rarityFilter)
      if (supertypeFilter) params.set('supertype', supertypeFilter)
      if (collection !== 'all') params.set('collection', collection)
      if (p > 1) params.set('page', String(p))
      const qs = params.toString()
      return qs ? `/browse?${qs}` : '/browse'
    }

    return (
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {userId && <CollectionFilter value={collection} />}
          <BrowseFilters sort={sort} rarity={rarityFilter ?? ''} supertype={supertypeFilter ?? ''} />
          {total > 0 && <div className="ml-auto"><CardSizeSlider /></div>}
        </div>

        {total === 0 ? (
          <div className="text-center py-16">
            <p className="text-overlay0 text-sm">
              {query ? `No cards match "${query}".` : 'No cards yet.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-overlay0 tabular-nums mb-3">
              {total.toLocaleString()} card{total === 1 ? '' : 's'}
            </p>
            <ResizableCardGrid>
              {cards.map((card, idx) => (
                <CardSearchResult
                  key={`${card.pokemontcg_id ?? 'card'}-${idx}`}
                  card={card}
                  set={setMap.get(card.set_id)}
                  variantCounts={userId ? variantCounts : undefined}
                  wishlistedIds={wishlistCtx.wishlistedIds}
                  userState={wishlistCtx.userState}
                  owned={!userId || ownedIds.has(card.pokemontcg_id)}
                  printedTotal={printedTotalsBySetId.get(card.set_id)}
                />
              ))}
            </ResizableCardGrid>
            <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
          </>
        )}
      </div>
    )
  }

  if (query) {
    const [matchedSets, matchedCards, variantCountsBySet, uniqueCountsBySet, rarityTotalsBySet, rarityOwnedBySet, collectionValueBySet, collectionCostBySet, ownedIds, printedTotalsBySetId, wishlistCtx] = await Promise.all([
      searchSets(query),
      searchCards(query),
      userId ? getOwnedVariantCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
      userId ? getOwnedUniqueCardCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
      getRarityTotalsBySet(),
      userId ? getOwnedRarityCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
      userId ? getCollectionValueBySet(userId) : Promise.resolve(new Map<string, number>()),
      userId ? getCollectionCostBySet(userId) : Promise.resolve(new Map<string, number>()),
      userId ? getOwnedCardIds(userId) : Promise.resolve(new Set<string>()),
      getPrintedTotalsBySetId(),
      getWishlistContext(userId, session?.user?.tier),
    ])

    const matchedCardIds = matchedCards.map((c) => c.pokemontcg_id)
    const matchedUniqueSetIds = Array.from(new Set(matchedCards.map((c) => c.set_id)))
    const [setsForMatchedCards, matchedVariantCounts] = await Promise.all([
      matchedUniqueSetIds.length > 0 ? getSetsByIds(matchedUniqueSetIds) : Promise.resolve([]),
      userId && matchedCardIds.length > 0
        ? getOwnedCountsByCardVariantForCards(userId, matchedCardIds)
        : Promise.resolve(new Map<string, number>()),
    ])
    const matchedSetMap = new Map(setsForMatchedCards.map((s) => [s.tcgdex_id, s]))

    return (
      <div>
        {matchedSets.length === 0 && matchedCards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-overlay0 text-sm">No sets or cards match &ldquo;{query}&rdquo;.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {matchedSets.length > 0 && (
              <section>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-sm font-russo text-text">Sets</h2>
                  <span className="text-[10px] text-overlay0 tabular-nums">{matchedSets.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {matchedSets.map((set) => (
                    <SetCard
                      key={set.tcgdex_id}
                      set={set}
                      seriesSlug={set.seriesSlug}
                      variantCounts={userId ? (variantCountsBySet.get(set.tcgdex_id) ?? new Map()) : undefined}
                      ownedUniqueCount={userId ? (uniqueCountsBySet.get(set.tcgdex_id) ?? 0) : undefined}
                      rarityTotals={rarityTotalsBySet.get(set.tcgdex_id)}
                      rarityOwnedCounts={userId ? rarityOwnedBySet.get(set.tcgdex_id) : undefined}
                      collectionValue={userId ? collectionValueBySet.get(set.tcgdex_id) : undefined}
                      collectionCost={userId ? collectionCostBySet.get(set.tcgdex_id) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {matchedCards.length > 0 && (
              <section>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-sm font-russo text-text">Cards</h2>
                  <span className="text-[10px] text-overlay0 tabular-nums">{matchedCards.length}</span>
                  <div className="ml-auto"><CardSizeSlider /></div>
                </div>
                <ResizableCardGrid>
                  {matchedCards.map((card, idx) => (
                    <CardSearchResult
                      key={`${card.pokemontcg_id ?? 'card'}-${idx}`}
                      card={card}
                      set={matchedSetMap.get(card.set_id)}
                      variantCounts={userId ? matchedVariantCounts : undefined}
                      wishlistedIds={wishlistCtx.wishlistedIds}
                      userState={wishlistCtx.userState}
                      owned={!userId || ownedIds.has(card.pokemontcg_id)}
                      printedTotal={printedTotalsBySetId.get(card.set_id)}
                    />
                  ))}
                </ResizableCardGrid>
              </section>
            )}
          </div>
        )}
      </div>
    )
  }

  const [series, variantCountsBySet, uniqueCountsBySet, rarityTotalsBySet, rarityOwnedBySet, collectionValueBySet, collectionCostBySet] = await Promise.all([
    getSeriesWithSets(),
    userId ? getOwnedVariantCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
    userId ? getOwnedUniqueCardCountsBySet(userId) : Promise.resolve(new Map<string, number>()),
    getRarityTotalsBySet(),
    userId ? getOwnedRarityCountsBySet(userId) : Promise.resolve(new Map<string, Map<string, number>>()),
    userId ? getCollectionValueBySet(userId) : Promise.resolve(new Map<string, number>()),
    userId ? getCollectionCostBySet(userId) : Promise.resolve(new Map<string, number>()),
  ])

  const isSetOwned = (setId: string) => (uniqueCountsBySet.get(setId) ?? 0) > 0
  const matchesCollection = (setId: string) => {
    if (!userId || collection === 'all') return true
    return collection === 'owned' ? isSetOwned(setId) : !isSetOwned(setId)
  }

  const filteredSeries = series
    .map((s) => ({ ...s, sets: s.sets.filter((set) => matchesCollection(set.tcgdex_id)) }))
    .filter((s) => s.sets.length > 0)

  const totalSetCount = series.reduce((n, s) => n + s.sets.length, 0)
  const visibleSetCount = filteredSeries.reduce((n, s) => n + s.sets.length, 0)

  return (
    <div>
      {series.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-overlay0 text-sm mb-2">No series yet.</p>
          <p className="text-overlay0 text-xs">Run <code className="text-mauve">npm run seed</code> to import card data.</p>
        </div>
      ) : (
        <>
          {userId && (
            <div className="flex items-center gap-2 mb-4">
              <CollectionFilter value={collection} />
              {visibleSetCount < totalSetCount && (
                <span className="text-[11px] text-overlay0 tabular-nums">
                  {visibleSetCount} of {totalSetCount}
                </span>
              )}
            </div>
          )}

          {filteredSeries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-overlay0 text-sm">No sets match this filter.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredSeries.map((s) => (
                <section key={s.slug}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <Link href={`/browse/${s.slug}`} className="text-sm font-russo text-text hover:text-blue transition-colors">{s.name}</Link>
                    <span className="text-[10px] text-overlay0 tabular-nums">{s.releaseRange}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {s.sets.map((set) => (
                      <SetCard
                        key={set.tcgdex_id}
                        set={set}
                        seriesSlug={s.slug}
                        variantCounts={userId ? (variantCountsBySet.get(set.tcgdex_id) ?? new Map()) : undefined}
                        ownedUniqueCount={userId ? (uniqueCountsBySet.get(set.tcgdex_id) ?? 0) : undefined}
                        rarityTotals={rarityTotalsBySet.get(set.tcgdex_id)}
                        rarityOwnedCounts={userId ? rarityOwnedBySet.get(set.tcgdex_id) : undefined}
                        collectionValue={userId ? collectionValueBySet.get(set.tcgdex_id) : undefined}
                        collectionCost={userId ? collectionCostBySet.get(set.tcgdex_id) : undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
