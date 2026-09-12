"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LayoutDashboard, BookOpen, LogOut, Shield } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/docs", label: "Documentation", icon: BookOpen },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div
      style={{
        width: "220px",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid var(--border)",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "var(--bg)",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 0.5rem", marginBottom: "2rem" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={17} color="var(--accent-text)" strokeWidth={2.4} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>API Rate Limiting</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--accent)" : "var(--text)",
                  background: active ? "var(--surface)" : "transparent",
                  textDecoration: "none",
                }}
              >
                <Icon size={17} strokeWidth={2.2} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text-dim)",
          padding: "0.6rem 0.8rem",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.85rem",
          textAlign: "left",
        }}
      >
        <LogOut size={16} strokeWidth={2.2} />
        Log out
      </button>
    </div>
  )
}