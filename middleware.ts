import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set("Cache-Control", "no-store, must-revalidate")
  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/docs/:path*"],
}