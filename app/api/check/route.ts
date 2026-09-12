import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// simple in-memory tracker for abuse protection (resets on server restart)
const ipAttempts = new Map<string, { count: number; resetAt: number }>()

function isIpBlocked(ip: string): boolean {
  const now = Date.now()
  const entry = ipAttempts.get(ip)

  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }

  entry.count++
  if (entry.count > 300) return true
  return false
}

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"

  if (isIpBlocked(ip)) {
    return NextResponse.json(
      { error: "Too many requests from this IP. Slow down." },
      { status: 429 }
    )
  }

  const apiKey = req.headers.get("x-api-key")
  const endUserId = req.headers.get("x-user-id") || "global"

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key. Send it in the 'x-api-key' header." },
      { status: 401 }
    )
  }

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
  })

  if (!keyRecord) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 })
  }

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