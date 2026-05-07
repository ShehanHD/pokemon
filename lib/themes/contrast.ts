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
