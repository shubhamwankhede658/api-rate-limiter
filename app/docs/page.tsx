"use client"

import { useEffect } from "react"
import Link from "next/link"
import Sidebar from "../components/Sidebar"

export default function DocsPage() {
  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("/api/auth/session")
      const data = await res.json()
      if (!data?.user) {
        window.location.replace("/")
      }
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkSession()
      }
    }

    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [])

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "2rem 2.5rem", overflowY: "auto", height: "100vh" }}>
        <div style={{ maxWidth: "800px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.4rem" }}>
            How to use your API key
          </h1>
          <p style={{ color: "var(--text-dim)", marginBottom: "2rem", fontSize: "0.92rem" }}>
            Protect any endpoint in your app by checking it against your rate limit before running your real logic.
          </p>

          <Section title="1. Get your API key">
            <p>
              Go to your <Link href="/dashboard" style={linkStyle}>dashboard</Link>, generate a key, and set a limit —
              for example, 100 requests per hour. Copy the key, it looks like:
            </p>
            <Code>sk_9ebc3addb04a39b0c9e521e428be5bb268d13c28045db0a4</Code>
          </Section>

          <Section title="2. Call the check endpoint">
            <p>
              Before your server does its real work, send a request to this endpoint with your key in the{" "}
              <code style={inlineCode}>x-api-key</code> header:
            </p>
            <Code>{`GET https://your-app.vercel.app/api/check
Header: x-api-key: sk_your_key_here`}</Code>
          </Section>

          <Section title="2b. (Optional) Track limits per end-user">
            <p>
              By default, all requests through one key share the same limit. If your app
              has multiple end-users and you want each of them to get their own separate
              quota, pass an extra header identifying who's making the request:
            </p>
            <Code>{`GET /api/check
Headers:
  x-api-key: sk_your_key_here
  x-user-id: user_12345`}</Code>
            <p style={{ marginTop: "1rem" }}>
              Each unique <code style={inlineCode}>x-user-id</code> gets tracked separately
              against your key's limit. If you don't send this header, all requests are
              tracked together under one shared bucket.
            </p>
          </Section>

          <Section title="3. Read the response">
            <p>If the request is allowed, you'll get:</p>
            <Code>{`{
  "allowed": true,
  "limit": 100,
  "remaining": 87,
  "retryAfter": 42
}`}</Code>
            <p style={{ marginTop: "1rem" }}>If the limit is reached, you'll get a 429 status with:</p>
            <Code>{`{
  "allowed": false,
  "message": "Rate limit exceeded. Try again later.",
  "limit": 100,
  "remaining": 0,
  "retryAfter": 42
}`}</Code>
          </Section>

          <Section title="4. Example: using it in your own backend">
            <p>Here's how you'd wire it into a real route (Node/Express example):</p>
            <Code>{`app.get("/your-endpoint", async (req, res) => {
  const check = await fetch("https://your-app.vercel.app/api/check", {
    headers: {
      "x-api-key": "sk_your_key_here",
      "x-user-id": req.user?.id, // optional, per-user tracking
    },
  })
  const data = await check.json()

  if (!data.allowed) {
    return res.status(429).json({ error: "Too many requests, try later." })
  }

  res.json({ message: "success" })
})`}</Code>
          </Section>

          <Section title="5. Testing without writing code">
            <p>You can test your key directly from a terminal using PowerShell:</p>
            <Code>{`Invoke-WebRequest -Uri "https://your-app.vercel.app/api/check" -Headers @{"x-api-key"="sk_your_key_here"}`}</Code>
            <p style={{ marginTop: "1rem" }}>Or with curl (Mac/Linux/Git Bash):</p>
            <Code>{`curl https://your-app.vercel.app/api/check -H "x-api-key: sk_your_key_here"`}</Code>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "2.2rem" }}>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "0.7rem" }}>{title}</h2>
      <div style={{ color: "var(--text)", lineHeight: 1.6, fontSize: "0.92rem" }}>{children}</div>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className="mono"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "1rem",
        overflowX: "auto",
        fontSize: "0.8rem",
        marginTop: "0.6rem",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </pre>
  )
}

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "underline",
}

const inlineCode: React.CSSProperties = {
  background: "var(--surface)",
  padding: "0.1rem 0.4rem",
  borderRadius: "4px",
  fontSize: "0.85rem",
}