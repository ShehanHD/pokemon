import { describe, it, expect } from 'vitest'

// Stub env vars before dynamic import so Auth.js and MongoClient don't throw
// at module-evaluation time.
process.env.MONGODB_URI ??= 'mongodb://localhost:27017'
process.env.AUTH_SECRET ??= 'test-secret-at-least-32-chars-long!!'
process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret'

describe('auth config', () => {
  it('exports handlers and auth', async () => {
    const mod = await import('../auth')
    expect(typeof mod.auth).toBe('function')
    expect(typeof mod.handlers).toBe('object')
    expect(typeof mod.signIn).toBe('function')
    expect(typeof mod.signOut).toBe('function')
  })
})
