"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"

// Redirects to "/" if the session becomes invalid.
export function useSessionGuard() {
  const { status, update } = useSession()

  // Redirect whenever next-auth tells us we're logged out.
  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/")
    }
  }, [status])

  // The browser's back/forward button restores the page from memory
  // (bfcache) without reloading it, and does NOT trigger next-auth's
  // normal "recheck on tab focus" behavior if the tab was never
  // unfocused. "pageshow" is the one event that reliably fires when
  // this happens, so we use it to force a fresh session check.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        update()
      }
    }
    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [update])
}