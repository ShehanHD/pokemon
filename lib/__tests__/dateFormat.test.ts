import { describe, expect, it } from 'vitest'
import { formatTcgcReleaseDate } from '../dateFormat'

describe('formatTcgcReleaseDate', () => {
  it('formats YYYY/MM/DD as "Mon DD, YYYY"', () => {
    expect(formatTcgcReleaseDate('2023/03/31')).toBe('Mar 31, 2023')
    expect(formatTcgcReleaseDate('2024/11/01')).toBe('Nov 1, 2024')
  })

  it('returns the raw input for malformed dates', () => {
    expect(formatTcgcReleaseDate('not-a-date')).toBe('not-a-date')
  })
})
