import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"
import { Shield, KeyRound, ShieldCheck, Lock } from "lucide-react"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div style={{ width: "100%" }}>
      {/* Navbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.2rem 2.5rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={16} color="var(--accent-text)" strokeWidth={2.4} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>API Rate Limiting</span>
        </div>

        <SignInButton compact />
      </div>

      {/* Hero */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "3rem",
          padding: "4rem 2.5rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ flex: "1 1 400px" }}>
          <div style={{ color: "var(--accent)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.8rem" }}>
            SIMPLE · SECURE · DEVELOPER FRIENDLY
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, lineHeight: 1.15, marginBottom: "1rem" }}>
            API Rate Limiting made simple
          </h1>
          <p style={{ color: "var(--text-dim)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "1.8rem" }}>
            Generate a key, set a limit, and check every request against it —
            100 a minute, 1,000 a day, whatever your API needs.
          </p>
          <SignInButton />
        </div>

        <div style={{ flex: "1 1 380px" }}>
          <div
            style={{
              background: "#0B2B2B",
              borderRadius: "14px",
              padding: "1.5rem",
              color: "#E1F9F4",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.8rem" }}>
              <span>API Request</span>
              <span style={{ color: "var(--green)" }}>Allowed</span>
            </div>
            <pre className="mono" style={{ fontSize: "0.8rem", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
{`GET /api/check
x-api-key: sk_9ebc3addb04a39b0c9e521e42...

HTTP 200
{
  "allowed": true,
  "remaining": 87
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: "3rem 2.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Everything you need to manage your API usage
        </h2>
        <p style={{ color: "var(--text-dim)", maxWidth: "480px", margin: "0 auto 2.5rem" }}>
          Simple features to help you protect your endpoints and control access with ease.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.2rem",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          <FeatureCard icon={KeyRound} title="Generate API Keys" desc="Create secure API keys in seconds and start using your APIs right away." />
          <FeatureCard icon={ShieldCheck} title="Set Rate Limits" desc="Define requests per minute, hour, day or month based on your needs." />
          <FeatureCard icon={Lock} title="Secure & Reliable" desc="Keep your APIs safe with simple and effective rate limiting." />
        </div>
      </div>

      {/* CTA banner */}
      <div style={{ background: "#0B2B2B", color: "#fff", textAlign: "center", padding: "3.5rem 2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Ready to secure your APIs?
        </h2>
        <p style={{ color: "#9FC9C4", marginBottom: "1.5rem" }}>
          Get started in seconds. No credit card required.
        </p>
        <SignInButton />
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "1.5rem", textAlign: "left" }}>
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: "#fff",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} color="var(--accent)" strokeWidth={2.2} />
      </div>
      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem" }}>{title}</div>
      <div style={{ color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

function SignInButton({ compact = false }: { compact?: boolean }) {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("google", { redirectTo: "/dashboard" })
      }}
    >
      <button
        type="submit"
        style={{
          background: "var(--accent)",
          color: "var(--accent-text)",
          padding: compact ? "0.55rem 1.1rem" : "0.75rem 1.6rem",
          borderRadius: "10px",
          fontWeight: 700,
          fontSize: compact ? "0.85rem" : "0.95rem",
          border: "none",
          cursor: "pointer",
        }}
      >
        Sign in with Google
      </button>
    </form>
  )
}