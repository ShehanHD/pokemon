import type { Tier } from '../lib/types'

export interface BaseSetEntry {
  id: number
  slug: string
  name: string
  tier: Tier
}

// 1999 Pokémon TCG Base Set — 53 unique species.
// Tiers: 5 free, 20 adfree, remaining 28 pro.
export const BASE_SET: BaseSetEntry[] = [
  { id: 1,   slug: 'bulbasaur',  name: 'Bulbasaur',  tier: 'free' },
  { id: 4,   slug: 'charmander', name: 'Charmander', tier: 'free' },
  { id: 7,   slug: 'squirtle',   name: 'Squirtle',   tier: 'free' },
  { id: 25,  slug: 'pikachu',    name: 'Pikachu',    tier: 'free' },
  { id: 150, slug: 'mewtwo',     name: 'Mewtwo',     tier: 'free' },

  { id: 6,   slug: 'charizard',  name: 'Charizard',  tier: 'adfree' },
  { id: 9,   slug: 'blastoise',  name: 'Blastoise',  tier: 'adfree' },
  { id: 3,   slug: 'venusaur',   name: 'Venusaur',   tier: 'adfree' },
  { id: 133, slug: 'eevee',      name: 'Eevee',      tier: 'adfree' },
  { id: 143, slug: 'snorlax',    name: 'Snorlax',    tier: 'adfree' },
  { id: 94,  slug: 'gengar',     name: 'Gengar',     tier: 'adfree' },
  { id: 149, slug: 'dragonite',  name: 'Dragonite',  tier: 'adfree' },
  { id: 130, slug: 'gyarados',   name: 'Gyarados',   tier: 'adfree' },
  { id: 68,  slug: 'machamp',    name: 'Machamp',    tier: 'adfree' },
  { id: 65,  slug: 'alakazam',   name: 'Alakazam',   tier: 'adfree' },
  { id: 144, slug: 'articuno',   name: 'Articuno',   tier: 'adfree' },
  { id: 145, slug: 'zapdos',     name: 'Zapdos',     tier: 'adfree' },
  { id: 146, slug: 'moltres',    name: 'Moltres',    tier: 'adfree' },
  { id: 151, slug: 'mew',        name: 'Mew',        tier: 'adfree' },
  { id: 134, slug: 'vaporeon',   name: 'Vaporeon',   tier: 'adfree' },
  { id: 135, slug: 'jolteon',    name: 'Jolteon',    tier: 'adfree' },
  { id: 136, slug: 'flareon',    name: 'Flareon',    tier: 'adfree' },
  { id: 131, slug: 'lapras',     name: 'Lapras',     tier: 'adfree' },
  { id: 80,  slug: 'slowbro',    name: 'Slowbro',    tier: 'adfree' },
  { id: 129, slug: 'magikarp',   name: 'Magikarp',   tier: 'adfree' },

  { id: 17,  slug: 'pidgeotto',  name: 'Pidgeotto',  tier: 'pro' },
  { id: 26,  slug: 'raichu',     name: 'Raichu',     tier: 'pro' },
  { id: 35,  slug: 'clefairy',   name: 'Clefairy',   tier: 'pro' },
  { id: 39,  slug: 'jigglypuff', name: 'Jigglypuff', tier: 'pro' },
  { id: 40,  slug: 'wigglytuff', name: 'Wigglytuff', tier: 'pro' },
  { id: 42,  slug: 'golbat',     name: 'Golbat',     tier: 'pro' },
  { id: 44,  slug: 'gloom',      name: 'Gloom',      tier: 'pro' },
  { id: 51,  slug: 'dugtrio',    name: 'Dugtrio',    tier: 'pro' },
  { id: 56,  slug: 'mankey',     name: 'Mankey',     tier: 'pro' },
  { id: 70,  slug: 'weepinbell', name: 'Weepinbell', tier: 'pro' },
  { id: 75,  slug: 'graveler',   name: 'Graveler',   tier: 'pro' },
  { id: 78,  slug: 'rapidash',   name: 'Rapidash',   tier: 'pro' },
  { id: 82,  slug: 'magneton',   name: 'Magneton',   tier: 'pro' },
  { id: 83,  slug: 'farfetchd',  name: 'Farfetch’d', tier: 'pro' },
  { id: 86,  slug: 'seel',       name: 'Seel',       tier: 'pro' },
  { id: 92,  slug: 'gastly',     name: 'Gastly',     tier: 'pro' },
  { id: 93,  slug: 'haunter',    name: 'Haunter',    tier: 'pro' },
  { id: 100, slug: 'voltorb',    name: 'Voltorb',    tier: 'pro' },
  { id: 102, slug: 'exeggcute',  name: 'Exeggcute',  tier: 'pro' },
  { id: 104, slug: 'cubone',     name: 'Cubone',     tier: 'pro' },
  { id: 106, slug: 'hitmonlee',  name: 'Hitmonlee',  tier: 'pro' },
  { id: 107, slug: 'hitmonchan', name: 'Hitmonchan', tier: 'pro' },
  { id: 113, slug: 'chansey',    name: 'Chansey',    tier: 'pro' },
  { id: 115, slug: 'kangaskhan', name: 'Kangaskhan', tier: 'pro' },
  { id: 123, slug: 'scyther',    name: 'Scyther',    tier: 'pro' },
  { id: 125, slug: 'electabuzz', name: 'Electabuzz', tier: 'pro' },
  { id: 142, slug: 'aerodactyl', name: 'Aerodactyl', tier: 'pro' },
  { id: 147, slug: 'dratini',    name: 'Dratini',    tier: 'pro' },
]
