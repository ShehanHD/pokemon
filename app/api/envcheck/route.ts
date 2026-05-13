export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    MONGODB_URI: !!process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB ?? null,
    AUTH_URL: process.env.AUTH_URL ?? null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? null,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
  })
}
