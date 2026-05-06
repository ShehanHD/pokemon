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
  createdAt: Date
  passwordHash?: string
}

export interface PokemonSet {
  _id?: string
  pokemontcg_id: string
  name: string
  series: string
  seriesSlug: string
  releaseDate: string       // "YYYY/MM/DD"
  totalCards: number
  logoUrl: string
  symbolUrl: string
}

export interface PokemonCard {
  _id?: string
  pokemontcg_id: string
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
  cardmarketPrice: number | null
}
