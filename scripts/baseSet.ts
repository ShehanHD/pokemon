import type { Tier } from '../lib/types'

export interface BaseSetEntry {
  id: number
  slug: string
  name: string
  tier: Tier
}

// 1999 Pokémon TCG Base Set — 53 unique species.
// Tiers reflect cultural recognition: most iconic Pokémon are gated to pro,
// less-iconic species are spread across adfree and free.
// Counts: 10 free, 15 adfree, 28 pro.
export const BASE_SET: BaseSetEntry[] = [
  // Free — least-iconic of the set
  { id: 56,  slug: 'mankey',     name: 'Mankey',     tier: 'free' },
  { id: 70,  slug: 'weepinbell', name: 'Weepinbell', tier: 'free' },
  { id: 75,  slug: 'graveler',   name: 'Graveler',   tier: 'free' },
  { id: 82,  slug: 'magneton',   name: 'Magneton',   tier: 'free' },
  { id: 83,  slug: 'farfetchd',  name: 'Farfetch’d', tier: 'free' },
  { id: 86,  slug: 'seel',       name: 'Seel',       tier: 'free' },
  { id: 100, slug: 'voltorb',    name: 'Voltorb',    tier: 'free' },
  { id: 102, slug: 'exeggcute',  name: 'Exeggcute',  tier: 'free' },
  { id: 51,  slug: 'dugtrio',    name: 'Dugtrio',    tier: 'free' },
  { id: 44,  slug: 'gloom',      name: 'Gloom',      tier: 'free' },

  // Adfree — moderately recognizable
  { id: 17,  slug: 'pidgeotto',  name: 'Pidgeotto',  tier: 'adfree' },
  { id: 42,  slug: 'golbat',     name: 'Golbat',     tier: 'adfree' },
  { id: 78,  slug: 'rapidash',   name: 'Rapidash',   tier: 'adfree' },
  { id: 92,  slug: 'gastly',     name: 'Gastly',     tier: 'adfree' },
  { id: 93,  slug: 'haunter',    name: 'Haunter',    tier: 'adfree' },
  { id: 104, slug: 'cubone',     name: 'Cubone',     tier: 'adfree' },
  { id: 106, slug: 'hitmonlee',  name: 'Hitmonlee',  tier: 'adfree' },
  { id: 107, slug: 'hitmonchan', name: 'Hitmonchan', tier: 'adfree' },
  { id: 113, slug: 'chansey',    name: 'Chansey',    tier: 'adfree' },
  { id: 115, slug: 'kangaskhan', name: 'Kangaskhan', tier: 'adfree' },
  { id: 123, slug: 'scyther',    name: 'Scyther',    tier: 'adfree' },
  { id: 125, slug: 'electabuzz', name: 'Electabuzz', tier: 'adfree' },
  { id: 147, slug: 'dratini',    name: 'Dratini',    tier: 'adfree' },
  { id: 40,  slug: 'wigglytuff', name: 'Wigglytuff', tier: 'adfree' },
  { id: 80,  slug: 'slowbro',    name: 'Slowbro',    tier: 'adfree' },

  // Pro — the iconic 28
  { id: 1,   slug: 'bulbasaur',  name: 'Bulbasaur',  tier: 'pro' },
  { id: 4,   slug: 'charmander', name: 'Charmander', tier: 'pro' },
  { id: 7,   slug: 'squirtle',   name: 'Squirtle',   tier: 'pro' },
  { id: 25,  slug: 'pikachu',    name: 'Pikachu',    tier: 'pro' },
  { id: 26,  slug: 'raichu',     name: 'Raichu',     tier: 'pro' },
  { id: 35,  slug: 'clefairy',   name: 'Clefairy',   tier: 'pro' },
  { id: 39,  slug: 'jigglypuff', name: 'Jigglypuff', tier: 'pro' },
  { id: 3,   slug: 'venusaur',   name: 'Venusaur',   tier: 'pro' },
  { id: 6,   slug: 'charizard',  name: 'Charizard',  tier: 'pro' },
  { id: 9,   slug: 'blastoise',  name: 'Blastoise',  tier: 'pro' },
  { id: 65,  slug: 'alakazam',   name: 'Alakazam',   tier: 'pro' },
  { id: 68,  slug: 'machamp',    name: 'Machamp',    tier: 'pro' },
  { id: 94,  slug: 'gengar',     name: 'Gengar',     tier: 'pro' },
  { id: 129, slug: 'magikarp',   name: 'Magikarp',   tier: 'pro' },
  { id: 130, slug: 'gyarados',   name: 'Gyarados',   tier: 'pro' },
  { id: 131, slug: 'lapras',     name: 'Lapras',     tier: 'pro' },
  { id: 133, slug: 'eevee',      name: 'Eevee',      tier: 'pro' },
  { id: 134, slug: 'vaporeon',   name: 'Vaporeon',   tier: 'pro' },
  { id: 135, slug: 'jolteon',    name: 'Jolteon',    tier: 'pro' },
  { id: 136, slug: 'flareon',    name: 'Flareon',    tier: 'pro' },
  { id: 142, slug: 'aerodactyl', name: 'Aerodactyl', tier: 'pro' },
  { id: 143, slug: 'snorlax',    name: 'Snorlax',    tier: 'pro' },
  { id: 144, slug: 'articuno',   name: 'Articuno',   tier: 'pro' },
  { id: 145, slug: 'zapdos',     name: 'Zapdos',     tier: 'pro' },
  { id: 146, slug: 'moltres',    name: 'Moltres',    tier: 'pro' },
  { id: 149, slug: 'dragonite',  name: 'Dragonite',  tier: 'pro' },
  { id: 150, slug: 'mewtwo',     name: 'Mewtwo',     tier: 'pro' },
  { id: 151, slug: 'mew',        name: 'Mew',        tier: 'pro' },
]
