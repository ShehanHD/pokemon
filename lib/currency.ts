import type { Currency } from './types'

const SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
}

export function currencySymbol(currency: Currency): string {
  return SYMBOLS[currency]
}

export function formatCurrency(amount: number, currency: Currency): string {
  const fractionDigits = currency === 'JPY' ? 0 : 2
  return `${SYMBOLS[currency]}${amount.toFixed(fractionDigits)}`
}
