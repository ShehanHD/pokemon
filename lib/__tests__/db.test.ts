import { describe, it, expect } from 'vitest'

// Set a syntactically valid URI before the dynamic import so MongoClient
// can parse it without throwing at module-evaluation time.
process.env.MONGODB_URI ??= 'mongodb://localhost:27017'

// We test the module structure, not the live connection
describe('db module', () => {
  it('exports getDb function', async () => {
    // Dynamic import avoids module-level connection during tests
    const mod = await import('../db')
    expect(typeof mod.getDb).toBe('function')
  })
})
