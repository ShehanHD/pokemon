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
