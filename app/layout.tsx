import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { Manrope } from "next/font/google"
import type { Metadata } from "next"

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })

export const metadata: Metadata = {
  title: "API Rate Limiting",
  description: "Generate a key, set a limit, and check every request against it.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}