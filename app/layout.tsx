import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { Manrope } from "next/font/google"

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}