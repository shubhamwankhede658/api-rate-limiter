import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const SHORT_LIMIT = 20 // max bad attempts allowed in 1 minute
const SHORT_WINDOW_MS = 60_000 // 1 minute

const LONG_LIMIT = 100 // max bad attempts allowed in 1 hour, even if spread out
const LONG_WINDOW_MS = 60 * 60_000 // 1 hour

const BLOCK_DURATION_MS = 30 * 60_000 // once blocked, stay blocked for 30 minutes

// Checks the IpAttempt table — stored in Postgres, not memory, so every
// Vercel server instance sees the same data. Valid, authenticated traffic
// never touches this table at all.
async function isIpBlocked(ip: string): Promise<boolean> {
  const record = await prisma.ipAttempt.findUnique({ where: { ip } })
  if (!record?.blockedUntil) return false
  return record.blockedUntil > new Date()
}

async function recordFailedAttempt(ip: string) {
  const now = new Date()
  const existing = await prisma.ipAttempt.findUnique({ where: { ip } })

  // Short window: catches a fast burst of bad attempts.
  const shortExpired =
    !existing || now.getTime() - existing.windowStart.getTime() > SHORT_WINDOW_MS
  const shortCount = shortExpired ? 1 : existing.count + 1
  const windowStart = shortExpired ? now : existing.windowStart

  // Long window: catches someone spamming slowly, staying under the
  // short-window limit every minute, but still clearly abusing the endpoint.
  const longExpired =
    !existing || now.getTime() - existing.longWindowStart.getTime() > LONG_WINDOW_MS
  const longCount = longExpired ? 1 : existing.longCount + 1
  const longWindowStart = longExpired ? now : existing.longWindowStart

  const shouldBlock = shortCount > SHORT_LIMIT || longCount > LONG_LIMIT
  const blockedUntil = shouldBlock
    ? new Date(now.getTime() + BLOCK_DURATION_MS)
    : existing?.blockedUntil ?? null

  await prisma.ipAttempt.upsert({
    where: { ip },
    create: {
      ip,
      count: shortCount,
      windowStart,
      longCount,
      longWindowStart,
      blockedUntil,
    },
    update: {
      count: shortCount,
      windowStart,
      longCount,
      longWindowStart,
      blockedUntil,
    },
  })
}

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"

  if (await isIpBlocked(ip)) {
    return NextResponse.json(
      { error: "Too many invalid attempts from this IP. Try again later." },
      { status: 429 }
    )
  }

  const apiKey = req.headers.get("x-api-key")
  const endUserId = req.headers.get("x-user-id") || "global"

  if (!apiKey) {
    await recordFailedAttempt(ip)
    return NextResponse.json(
      { error: "Missing API key. Send it in the 'x-api-key' header." },
      { status: 401 }
    )
  }

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
  })

  if (!keyRecord) {
    await recordFailedAttempt(ip)
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 })
  }

  // Valid key confirmed — this traffic is legitimate, and IpAttempt is
  // never touched here, so high-volume valid traffic is unaffected.

  const { id: apiKeyId, limit, windowSec } = keyRecord

  const now = Math.floor(Date.now() / 1000)
  const windowStartSec = Math.floor(now / windowSec) * windowSec
  const windowStart = new Date(windowStartSec * 1000)

  const result = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "ApiUsage" (id, "apiKeyId", "endUserId", "windowStart", count)
    VALUES (gen_random_uuid(), ${apiKeyId}, ${endUserId}, ${windowStart}, 1)
    ON CONFLICT ("apiKeyId", "endUserId", "windowStart")
    DO UPDATE SET count = "ApiUsage".count + 1
    RETURNING count;
  `

  const currentCount = result[0].count

  const remaining = Math.max(limit - currentCount, 0)
  const windowEndSec = windowStartSec + windowSec
  const retryAfter = windowEndSec - now

  if (currentCount > limit) {
    return NextResponse.json(
      {
        allowed: false,
        message: "Rate limit exceeded. Try again later.",
        limit,
        remaining: 0,
        retryAfter,
      },
      { status: 429 }
    )
  }

  return NextResponse.json({
    allowed: true,
    limit,
    remaining,
    retryAfter,
  })
}