import { z } from 'zod'
import { getSetById } from '@/lib/sets'
import { getCardsBySet } from '@/lib/cards'
import { seriesToEra } from '@/lib/taxonomy/era'
import { setCodeFor } from '@/lib/taxonomy/setCode'
import { normaliseRarity } from '@/lib/taxonomy/rarity'
import { applicableVariantsForSet, variantLabel } from '@/lib/taxonomy/variant'
import { formatTcgcReleaseDate } from '@/lib/dateFormat'
import FilterBar from '@/components/catalog/FilterBar'
import SortMenu from '@/components/catalog/SortMenu'
import CardsGrid from '@/components/catalog/CardsGrid'
import type { PokemonCard } from '@/lib/types'

const sortSchema = z.enum(['set-order','name-asc','name-desc','number-asc','number-desc','rarity']).catch('set-order')

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
  const set = await getSetById(setId)
  if (!set) return <main className="p-6"><p>Set not found.</p></main>

  const cards = await getCardsBySet(setId)
  const era = seriesToEra(set.series)
  const code = setCodeFor(set)

  const arr = (k: string) => {
    const v = sp[k]
    return Array.isArray(v) ? v : v ? [v] : []
  }
  const rarityFilters = new Set(arr('rarity'))
  const typeFilters = new Set(arr('type'))
  const subtypeFilters = new Set(arr('subtype'))
  const sort = sortSchema.parse(typeof sp.sort === 'string' ? sp.sort : 'set-order')

  let visible = cards.filter((c) => {
    if (rarityFilters.size > 0 && !rarityFilters.has(normaliseRarity(c.rarity))) return false
    if (typeFilters.size > 0 && !c.types.some((t) => typeFilters.has(t))) return false
    if (subtypeFilters.size > 0 && !c.subtypes.some((s) => subtypeFilters.has(s))) return false
    return true
  })

  const compare: Record<typeof sort, (a: PokemonCard, b: PokemonCard) => number> = {
    'set-order':   (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number) || a.number.localeCompare(b.number),
    'name-asc':    (a, b) => a.name.localeCompare(b.name),
    'name-desc':   (a, b) => b.name.localeCompare(a.name),
    'number-asc':  (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number),
    'number-desc': (a, b) => parseCardNumber(b.number) - parseCardNumber(a.number),
    'rarity':      (a, b) => normaliseRarity(a.rarity).localeCompare(normaliseRarity(b.rarity)),
  }
  visible = [...visible].sort(compare[sort])

  const allRarities = Array.from(new Set(cards.map((c) => normaliseRarity(c.rarity)))).sort()
  const allTypes = Array.from(new Set(cards.flatMap((c) => c.types))).sort()
  const allSubtypes = Array.from(new Set(cards.flatMap((c) => c.subtypes))).sort()
  const allVariants = applicableVariantsForSet(set).map(variantLabel)

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-mauve/20 text-mauve">{era} era</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-base border border-surface0 text-mauve">{code}</span>
        <h1 className="text-2xl font-russo">{set.name}</h1>
        <span className="text-overlay0 text-xs">{formatTcgcReleaseDate(set.releaseDate)}</span>
      </header>

      <div className="flex justify-between items-start gap-4 mb-3">
        <FilterBar
          rarities={allRarities}
          types={allTypes}
          variants={allVariants}
          subtypes={allSubtypes}
        />
        <SortMenu />
      </div>

      <CardsGrid cards={visible} printedTotal={set.printedTotal} />
    </main>
  )
}
