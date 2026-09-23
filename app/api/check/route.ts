import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const FAILED_ATTEMPT_LIMIT = 20 // max bad attempts allowed per minute
const BLOCK_DURATION_MS = 30 * 60_000 // once over the limit, blocked for 30 minutes
const WINDOW_MS = 60_000 // 1 minute

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

  const windowExpired =
    !existing || now.getTime() - existing.windowStart.getTime() > WINDOW_MS

  if (windowExpired) {
    await prisma.ipAttempt.upsert({
      where: { ip },
      create: { ip, count: 1, windowStart: now, blockedUntil: null },
      update: { count: 1, windowStart: now, blockedUntil: null },
    })
    return
  }

  const newCount = existing.count + 1
  const blockedUntil =
    newCount > FAILED_ATTEMPT_LIMIT
      ? new Date(now.getTime() + BLOCK_DURATION_MS)
      : existing.blockedUntil

  await prisma.ipAttempt.update({
    where: { ip },
    data: { count: newCount, blockedUntil },
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