import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const challengeSchema = z.object({
  challenge_code: z.string().min(1),
})

const deletionPayloadSchema = z.object({
  metadata: z
    .object({
      topic: z.string().optional(),
      schemaVersion: z.string().optional(),
      deprecated: z.boolean().optional(),
    })
    .optional(),
  notification: z.object({
    notificationId: z.string(),
    eventDate: z.string(),
    publishDate: z.string(),
    publishAttemptCount: z.number().optional(),
    data: z.object({
      username: z.string(),
      userId: z.string(),
      eiasToken: z.string().optional(),
    }),
  }),
})

function getConfig() {
  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN
  const endpointUrl = process.env.EBAY_DELETION_ENDPOINT_URL
  if (!verificationToken || !endpointUrl) {
    return null
  }
  return { verificationToken, endpointUrl }
}

export async function GET(req: Request) {
  const config = getConfig()
  if (!config) {
    return NextResponse.json({ error: 'Endpoint not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = challengeSchema.safeParse({
    challenge_code: searchParams.get('challenge_code'),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing challenge_code' }, { status: 400 })
  }

  const hash = createHash('sha256')
  hash.update(parsed.data.challenge_code)
  hash.update(config.verificationToken)
  hash.update(config.endpointUrl)
  const challengeResponse = hash.digest('hex')

  return NextResponse.json(
    { challengeResponse },
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

export async function POST(req: Request) {
  const config = getConfig()
  if (!config) {
    return NextResponse.json({ error: 'Endpoint not configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new NextResponse(null, { status: 200 })
  }

  const parsed = deletionPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return new NextResponse(null, { status: 200 })
  }

  const { notificationId, eventDate, data } = parsed.data.notification

  try {
    const db = await getDb()
    await db.collection('ebayAccountDeletions').updateOne(
      { notificationId },
      {
        $set: {
          notificationId,
          eventDate,
          ebayUserId: data.userId,
          ebayUsername: data.username,
          receivedAt: new Date(),
        },
      },
      { upsert: true },
    )
  } catch (err) {
    console.error('[ebay-deletion] DB write failed', err)
  }

  return new NextResponse(null, { status: 200 })
}
