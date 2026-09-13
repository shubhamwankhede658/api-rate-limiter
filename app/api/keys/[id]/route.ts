import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }

  const { id } = await params

  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // ApiUsage rows for this key are deleted automatically (onDelete: Cascade in schema.prisma)
  await prisma.apiKey.delete({ where: { id } })

  return NextResponse.json({ success: true })
}