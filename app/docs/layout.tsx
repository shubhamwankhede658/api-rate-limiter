import { requireSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return <>{children}</>
}