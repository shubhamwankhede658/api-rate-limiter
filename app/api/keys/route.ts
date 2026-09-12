import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function GET() {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ keys })
}

// POST → create a new API key for the logged-in user
export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const label = body.label || "Untitled Key"
  const limit = Number(body.limit)
  const windowSec = Number(body.windowSec)

  if (!Number.isInteger(limit) || limit <= 0) {
    return NextResponse.json({ error: "Limit must be a positive number." }, { status: 400 })
  }

  if (!Number.isInteger(windowSec) || windowSec <= 0) {
    return NextResponse.json({ error: "Time window must be a positive number." }, { status: 400 })
  }

  const key = "sk_" + crypto.randomBytes(24).toString("hex")

  const apiKey = await prisma.apiKey.create({
    data: { key, label, limit, windowSec, userId: user.id },
  })

  return NextResponse.json({ apiKey })
}