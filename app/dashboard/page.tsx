"use client"

import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useSessionGuard } from "../hooks/useSessionGuard"

type ApiKey = {
  id: string
  key: string
  label: string | null
  limit: number
  windowSec: number
}

const UNIT_SECONDS = {
  minutes: 60,
  hours: 3600,
  days: 86400,
  months: 2592000,
}

export default function DashboardPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState("")
  const [limit, setLimit] = useState("100")
  const [windowValue, setWindowValue] = useState("1")
  const [windowUnit, setWindowUnit] = useState<keyof typeof UNIT_SECONDS>("minutes")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useSessionGuard()

  const fetchKeys = async () => {
    const res = await fetch("/api/keys")
    const data = await res.json()
    setKeys(data.keys || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  // Keeps number inputs clean — turns "050" into "50", and blocks
  // anything that isn't a digit, so the box always shows exactly
  // what the stored value is (no leftover leading zeros).
  const sanitizeNumberInput = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, "")
    if (digitsOnly === "") return ""
    return String(Number(digitsOnly))
  }

  const createKey = async () => {
    const windowSec = (Number(windowValue) || 1) * UNIT_SECONDS[windowUnit]
    await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label || "Untitled key", limit: Number(limit) || 1, windowSec }),
    })
    setLabel("")
    fetchKeys()
  }

  const deleteKey = async (id: string, keyLabel: string | null) => {
    const confirmed = window.confirm(`Delete "${keyLabel}"? This cannot be undone.`)
    if (!confirmed) return
    await fetch(`/api/keys/${id}`, { method: "DELETE" })
    fetchKeys()
  }

  const copyKey = async (id: string, key: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const formatWindow = (sec: number) => {
    const units = Object.entries(UNIT_SECONDS).reverse() // months → hours → days → minutes
    for (const [name, unitSec] of units) {
      if (sec % unitSec === 0) {
        const value = sec / unitSec
        return `${value} ${name.slice(0, -1)}${value > 1 ? "s" : ""}` // "1 month", "2 months"
      }
    }
    return `${sec} seconds`
  }

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "2rem 2.5rem", overflowY: "auto", height: "100vh" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Your API keys</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", marginTop: "0.3rem" }}>
            Manage your API keys and track usage against your rate limits.
          </p>
        </div>

        {/* Create key form */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.2rem" }}>
            Set request limit
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "1rem" }}>
            Choose how many requests are allowed per time period when generating a new key.
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: "2 1 200px" }}>
              <label style={labelStyle}>Label</label>
              <input
                placeholder="name your api"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: "1 1 110px" }}>
              <label style={labelStyle}>Requests</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(sanitizeNumberInput(e.target.value))}
                style={inputStyle}
                className="no-spinner"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: "1 1 110px" }}>
              <label style={labelStyle}>Per</label>
              <input
                type="number"
                min={1}
                value={windowValue}
                onChange={(e) => setWindowValue(sanitizeNumberInput(e.target.value))}
                style={inputStyle}
                className="no-spinner"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Unit</label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {(["minutes", "hours", "days", "months"] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setWindowUnit(unit)}
                    style={{
                      ...pillButtonStyle,
                      background: windowUnit === unit ? "#fff" : "transparent",
                      color: windowUnit === unit ? "var(--accent)" : "var(--text-dim)",
                      border: windowUnit === unit ? "1px solid var(--accent)" : "1px solid var(--border)",
                      fontWeight: windowUnit === unit ? 700 : 500,
                    }}
                  >
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={createKey} style={{ ...primaryButtonStyle, height: "42px" }}>
              Generate
            </button>
          </div>
        </div>

        {/* Keys list */}
        <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>Your API keys</div>

        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading…</p>
        ) : keys.length === 0 ? (
          <div
            style={{
              color: "var(--text-dim)",
              padding: "3rem 1rem",
              textAlign: "center",
              border: "1px dashed var(--border)",
              borderRadius: "14px",
            }}
          >
            No keys yet. Generate one above to start checking requests against a limit.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            {keys.map((k, i) => (
              <div
                key={k.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1.3rem 1.5rem",
                  borderBottom: i < keys.length - 1 ? "1px solid var(--border)" : "none",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ minWidth: "160px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{k.label}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                    {k.limit} req / {formatWindow(k.windowSec)}
                  </div>
                </div>

                <div className="mono" style={{ fontSize: "0.85rem", color: "var(--text-dim)", flex: 1 }}>
                  {k.key}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => copyKey(k.id, k.key)} style={copyButtonStyle}>
                    {copiedId === k.id ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={() => deleteKey(k.id, k.label)} style={deleteButtonStyle}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--border)",
  color: "var(--text)",
  padding: "0.65rem 0.9rem",
  borderRadius: "10px",
  fontSize: "0.9rem",
  width: "100%",
  height: "42px",
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-dim)",
  fontWeight: 600,
}

const pillButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "0.88rem",
  height: "42px",
}

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  border: "none",
  padding: "0.6rem 1.3rem",
  borderRadius: "10px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.88rem",
}

const copyButtonStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  padding: "0.4rem 0.9rem",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 600,
}

const deleteButtonStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--red)",
  color: "var(--red)",
  padding: "0.4rem 0.9rem",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 600,
}