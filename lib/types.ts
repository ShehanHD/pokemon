export type Tier = 'free' | 'adfree' | 'pro'

export interface User {
  _id?: string
  email: string
  name: string
  image?: string
  provider: 'credentials' | 'google'
  tier: Tier
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  themePokemonId?: number
  createdAt: Date
  passwordHash?: string
}

export interface PokemonSet {
  _id?: string
  pokemontcg_id?: string | null
  tcgdex_id: string
  language?: string | null
  name: string
  series: string
  seriesSlug: string
  releaseDate: string       // "YYYY/MM/DD"
  totalCards: number
  printedTotal: number
  totalValueEUR?: number | null
  totalValueUSD?: number | null
  logoUrl: string
  symbolUrl: string
}

export interface PokemonCard {
  _id?: string
  pokemontcg_id: string
  tcgdex_id?: string | null
  language?: string | null
  name: string
  number: string
  set_id: string
  setName: string
  series: string
  seriesSlug: string
  rarity: string | null
  types: string[]
  subtypes: string[]
  supertype: string
  imageUrl: string
  imageUrlHiRes: string
  priceEUR?: number | null
  priceUSD?: number | null
  variants?: {
    firstEdition: boolean
    holo: boolean
    normal: boolean
    reverse: boolean
    wPromo: boolean
  } | null
  pricing?: {
    cardmarket?: Record<string, unknown>
    tcgplayer?: Record<string, unknown>
  } | null
}

export type CardVariant =
  | 'normal'
  | 'holo'
  | 'reverse-holo'
  | '1st-edition'
  | 'shadowless'
  | 'promo'
  | 'full-art'
  | 'alt-art'
  | 'holofoil'
  | 'reverse-holofoil'
  | 'pokeball-pattern'
  | 'masterball-pattern'
  | 'cosmos-holo'
  | 'crosshatch-holo'
  | 'galaxy-holo'

export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'

export type GradingCompany = 'PSA' | 'GRAAD' | 'BGS' | 'CGC' | 'SGC' | 'TAG' | 'Ace' | 'GMA' | 'Other'

interface UserCardBase {
  _id?: string
  userId: string
  cardId: string
  variant: CardVariant
  acquiredAt: Date
  cost?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type UserCardRaw = UserCardBase & {
  type: 'raw'
  condition: CardCondition
  centering?: string
}

export type UserCardGraded = UserCardBase & {
  type: 'graded'
  gradingCompany: GradingCompany
  grade: number
  gradedValue: number
}

export type UserCard = UserCardRaw | UserCardGraded

export interface OwnedCardGroup {
  cardId: string
  card: PokemonCard
  copyCount: number
  rawCount: number
  gradedCount: number
  totalCost: number
  estValue: number
  lastAcquiredAt: Date
  variants: CardVariant[]
}

export type OwnedCardsSort =
  | 'recent'
  | 'name'
  | 'release'
  | 'count'
  | 'cost'

export interface OwnedCardsQuery {
  series?: string
  set?: string
  rarity?: string
  variant?: CardVariant
  type?: 'raw' | 'graded'
  condition?: CardCondition
  q?: string
  sort: OwnedCardsSort
}

export interface CollectionStats {
  totalCopies: number
  uniqueCards: number
  totalSpend: number
  estValue: number
}

export type WishlistPriority = 'low' | 'med' | 'high'

export interface WishlistItem {
  _id?: string
  userId: string
  cardId: string
  addedAt: Date
  note?: string
  priority?: WishlistPriority
}
