"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"

// Redirects to "/" if the session becomes invalid — including when the
// browser restores this page from cache via the back/forward button
// (next-auth's SessionProvider already re-checks the session when the
// tab regains focus, so this hook just reacts to that).
export function useSessionGuard() {
  const { status } = useSession()

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/")
    }
  }, [status])
}