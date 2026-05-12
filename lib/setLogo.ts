import type { PokemonSet } from './types'

export const PROMO_FALLBACK_LOGO = 'https://assets.tcgdex.net/en/swsh/swshp/logo.webp'

const ID_FALLBACK: Record<string, string> = {
  'sm3.5': 'https://assets.tcgdex.net/en/sm/sm35/logo.webp',
  'sm7.5': 'https://assets.tcgdex.net/en/sm/sm75/logo.webp',
  sma: 'https://assets.tcgdex.net/en/sm/sm115/logo.webp',
  A3a: 'https://assets.tcgdex.net/en/tcgp/A3/logo.webp',
  A3b: 'https://assets.tcgdex.net/en/tcgp/A3/logo.webp',
  B1a: 'https://assets.tcgdex.net/en/tcgp/B1/logo.webp',
  B2a: 'https://assets.tcgdex.net/en/tcgp/B2/logo.webp',
  mee: 'https://assets.tcgdex.net/en/me/me01/logo.webp',
  mep: 'https://assets.tcgdex.net/en/me/me01/logo.webp',
  sve: 'https://assets.tcgdex.net/en/sv/sv01/logo.webp',
  svp: 'https://assets.tcgdex.net/en/sv/sv01/logo.webp',
  sv05: 'https://assets.tcgdex.net/en/sv/sv01/logo.webp',
  wp: 'https://assets.tcgdex.net/en/base/base1/logo.webp',
  rc: 'https://assets.tcgdex.net/en/bw/bw1/logo.webp',
  sp: 'https://assets.tcgdex.net/en/ecard/ecard1/logo.webp',
  bog: 'https://assets.tcgdex.net/en/ecard/ecard1/logo.webp',
  'ex5.5': 'https://assets.tcgdex.net/en/ex/ex1/logo.webp',
  exu: 'https://assets.tcgdex.net/en/ex/ex1/logo.webp',
}

const TK_PREFIX: ReadonlyArray<readonly [string, string]> = [
  ['tk-ex-', 'ex/ex1'],
  ['tk-dp-', 'dp/dp1'],
  ['tk-hs-', 'hgss/hgss1'],
  ['tk-xy-', 'xy/xy1'],
  ['tk-bw-', 'bw/bw1'],
  ['tk-sm-', 'sm/sm1'],
]

const MCD_SUFFIX: ReadonlyArray<readonly [string, string]> = [
  ['swsh', 'swsh/swsh1'],
  ['bw', 'bw/bw1'],
  ['xy', 'xy/xy1'],
  ['sm', 'sm/sm1'],
  ['sv', 'sv/sv01'],
]

type LogoInput = Pick<PokemonSet, 'tcgdex_id' | 'logoUrl' | 'name' | 'seriesSlug'>

export function getDisplayLogo(set: LogoInput): string {
  if (set.logoUrl) return set.logoUrl

  if (/promo/i.test(set.name)) return PROMO_FALLBACK_LOGO

  const id = set.tcgdex_id
  if (id && ID_FALLBACK[id]) return ID_FALLBACK[id]

  if (id) {
    for (const [prefix, parent] of TK_PREFIX) {
      if (id.startsWith(prefix)) return `https://assets.tcgdex.net/en/${parent}/logo.webp`
    }
    if (set.seriesSlug === 'mcdonald-s-collection') {
      for (const [suffix, parent] of MCD_SUFFIX) {
        if (id.endsWith(suffix)) return `https://assets.tcgdex.net/en/${parent}/logo.webp`
      }
    }
  }

  return ''
}
