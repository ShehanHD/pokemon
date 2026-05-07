function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`Invalid hex: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function tintWhite(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex)
  const k = Math.max(0, Math.min(1, ratio))
  const mix = (c: number) => c * k + 255 * (1 - k)
  return rgbToHex(mix(r), mix(g), mix(b))
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0)
      break
    case gn:
      h = (bn - rn) / d + 2
      break
    default:
      h = (rn - gn) / d + 4
  }
  return [h / 6, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = l * 255
    return [v, v, v]
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = hue2rgb(p, q, h + 1 / 3)
  const g = hue2rgb(p, q, h)
  const b = hue2rgb(p, q, h - 1 / 3)
  return [r * 255, g * 255, b * 255]
}

export function tintHSL(
  hex: string,
  opts: { lightness: number; satFloor: number },
): string {
  const [r, g, b] = hexToRgb(hex)
  const [h, s] = rgbToHsl(r, g, b)
  const L = Math.max(0, Math.min(1, opts.lightness))
  const S = Math.max(s, Math.max(0, Math.min(1, opts.satFloor)))
  const [r2, g2, b2] = hslToRgb(h, S, L)
  return rgbToHex(r2, g2, b2)
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const ch = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

export function contrastRatio(fg: string, bg: string): number {
  const Lfg = relativeLuminance(hexToRgb(fg))
  const Lbg = relativeLuminance(hexToRgb(bg))
  const [hi, lo] = Lfg >= Lbg ? [Lfg, Lbg] : [Lbg, Lfg]
  return (hi + 0.05) / (lo + 0.05)
}

interface EnsureOptions {
  maxSteps?: number
  stepFactor?: number
}

export function ensureContrast(
  fg: string,
  bg: string,
  target: number,
  opts: EnsureOptions = {},
): string | null {
  const { maxSteps = 32, stepFactor = 0.95 } = opts
  let [r, g, b] = hexToRgb(fg)
  let current = rgbToHex(r, g, b)
  if (contrastRatio(current, bg) >= target) return current
  for (let i = 0; i < maxSteps; i++) {
    r *= stepFactor
    g *= stepFactor
    b *= stepFactor
    current = rgbToHex(r, g, b)
    if (contrastRatio(current, bg) >= target) return current
  }
  return null
}
