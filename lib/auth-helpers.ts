import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

// Looks up the logged-in user from the session.
// Returns null if not logged in OR if the user record doesn't exist.
export async function getAuthenticatedUser() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  return user
}

// Used in server layouts to protect a whole route group.
// Redirects to "/" if there's no logged-in session.
export async function requireSession() {
  const session = await auth()
  if (!session) redirect("/")
  return session
}