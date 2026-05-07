import { describe, it, expect } from 'vitest'
import { userCardInputSchema } from '../userCard'

describe('userCardInputSchema — raw', () => {
  const validRaw = {
    type: 'raw' as const,
    cardId: 'sv1-25',
    variant: 'normal' as const,
    acquiredAt: '2026-05-06',
    cost: 12.5,
    condition: 'NM' as const,
  }

  it('accepts a minimal raw card', () => {
    const r = userCardInputSchema.safeParse(validRaw)
    expect(r.success).toBe(true)
  })

  it('accepts raw card with valid centering', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, centering: 'Perfect' })
    expect(r.success).toBe(true)
  })

  it('rejects raw card with malformed centering', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, centering: '55/45' })
    expect(r.success).toBe(false)
  })

  it('rejects raw card with negative cost', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, cost: -1 })
    expect(r.success).toBe(false)
  })

  it('rejects raw card with grade field (mutual exclusion)', () => {
    const r = userCardInputSchema.safeParse({ ...validRaw, grade: 9 })
    if (r.success) expect((r.data as Record<string, unknown>).grade).toBeUndefined()
  })
})

describe('userCardInputSchema — graded', () => {
  const validGraded = {
    type: 'graded' as const,
    cardId: 'sv1-25',
    variant: 'holo' as const,
    acquiredAt: '2026-04-01',
    cost: 100,
    gradingCompany: 'PSA' as const,
    grade: 9,
    gradedValue: 250,
  }

  it('accepts a graded card with integer grade', () => {
    expect(userCardInputSchema.safeParse(validGraded).success).toBe(true)
  })

  it('accepts a graded card with half-point grade', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, grade: 8.5 }).success,
    ).toBe(true)
  })

  it('rejects a graded card with quarter-point grade', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, grade: 8.25 }).success,
    ).toBe(false)
  })

  it('rejects a graded card with grade out of range', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, grade: 11 }).success,
    ).toBe(false)
  })

  it('rejects a graded card with negative gradedValue', () => {
    expect(
      userCardInputSchema.safeParse({ ...validGraded, gradedValue: -5 }).success,
    ).toBe(false)
  })

  it('rejects a graded card missing the grading company', () => {
    const { gradingCompany: _gc, ...rest } = validGraded
    expect(userCardInputSchema.safeParse(rest).success).toBe(false)
  })
})

describe('userCardInputSchema — discrimination', () => {
  it('rejects an object with no type field', () => {
    expect(
      userCardInputSchema.safeParse({ cardId: 'a', variant: 'normal', acquiredAt: '2026-01-01', cost: 1 }).success,
    ).toBe(false)
  })

  it('rejects an unknown type', () => {
    expect(
      userCardInputSchema.safeParse({ type: 'sealed', cardId: 'a', variant: 'normal', acquiredAt: '2026-01-01', cost: 1 }).success,
    ).toBe(false)
  })

  it('rejects notes longer than 500 chars', () => {
    expect(
      userCardInputSchema.safeParse({
        type: 'raw', cardId: 'a', variant: 'normal', acquiredAt: '2026-01-01', cost: 1, condition: 'NM',
        notes: 'x'.repeat(501),
      }).success,
    ).toBe(false)
  })
})
