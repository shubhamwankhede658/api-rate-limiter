import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Tracks IPs that repeatedly send INVALID or MISSING API keys.
// Valid, authenticated traffic never touches this — so a legitimate
// high-volume client (like an app with thousands of users, all sharing
// one server IP) is never affected, no matter how many requests it sends.
const ipFailedAttempts = new Map<
  string,
  { count: number; windowStart: number; blockedUntil: number }
>()

const FAILED_ATTEMPT_LIMIT = 20 // max bad attempts allowed per minute
const BLOCK_DURATION_MS = 30 * 60_000 // once over the limit, blocked for 30 minutes

function isIpBlocked(ip: string): boolean {
  const entry = ipFailedAttempts.get(ip)
  if (!entry) return false
  return Date.now() < entry.blockedUntil
}

function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const entry = ipFailedAttempts.get(ip)

  if (!entry || now > entry.windowStart + 60_000) {
    ipFailedAttempts.set(ip, { count: 1, windowStart: now, blockedUntil: 0 })
    return
  }

  entry.count++
  if (entry.count > FAILED_ATTEMPT_LIMIT) {
    entry.blockedUntil = now + BLOCK_DURATION_MS
  }
}

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"

  // Cheap, in-memory check — runs before touching the database at all.
  if (isIpBlocked(ip)) {
    return NextResponse.json(
      { error: "Too many invalid attempts from this IP. Try again later." },
      { status: 429 }
    )
  }

  const apiKey = req.headers.get("x-api-key")
  const endUserId = req.headers.get("x-user-id") || "global"

  if (!apiKey) {
    recordFailedAttempt(ip)
    return NextResponse.json(
      { error: "Missing API key. Send it in the 'x-api-key' header." },
      { status: 401 }
    )
  }

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
  })

  if (!keyRecord) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 })
  }

  // Valid key confirmed — this traffic is legitimate. We deliberately do
  // NOT touch ipFailedAttempts here, so a busy client sending thousands of
  // valid requests per minute (e.g. a dating app's backend, on one server
  // IP, serving many end users) is never penalized by this system at all.
  // Its actual limit is enforced below, per key and per end-user.

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