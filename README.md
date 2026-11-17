# 🛡️ API Rate Limiter

A rate limiting service for your own APIs. Sign in, generate an API key with a custom limit (for example, 100 requests per hour), and call one endpoint from your backend to check whether a request should be allowed or blocked.

Built with Next.js, PostgreSQL and Prisma. All counters live in the database, not in server memory, so it works correctly on serverless platforms like Vercel where many server instances run at once.

<!-- Add screenshots here, e.g.
![Dashboard](./screenshots/dashboard.png)
-->

## Features

- **Google sign-in** using NextAuth (Auth.js) with database sessions
- **Dashboard** to create, copy and delete API keys
- **Custom limits per key:** set the number of requests and the time window (minutes, hours, days or months)
- **Per end-user limits:** pass an optional `x-user-id` header so each of your users gets their own quota under the same key
- **Atomic counting:** a single SQL `INSERT ... ON CONFLICT DO UPDATE` increments the counter, so concurrent requests can't slip past the limit
- **Standard response data:** every check returns `limit`, `remaining` and `retryAfter`
- **Abuse protection:** IPs that keep sending missing or invalid API keys get temporarily blocked
- **Built-in docs page** with copy-paste examples
- **Secure dashboard pages:** no-store cache headers and a session guard that logs you out of cached pages after sign-out

## How it works

```mermaid
flowchart TD
    A["Your backend calls GET /api/check"] --> B{"IP currently blocked?"}
    B -->|Yes| X["429 Too many invalid attempts"]
    B -->|No| C{"x-api-key header present and valid?"}
    C -->|No| D["Record failed attempt for this IP"]
    D --> E["401 Missing or invalid key"]
    C -->|Yes| F["Work out the current time window"]
    F --> G["Atomically increment the counter for key, user and window"]
    G --> H{"Count above limit?"}
    H -->|Yes| I["429 allowed: false, retryAfter"]
    H -->|No| J["200 allowed: true, remaining, retryAfter"]
```

**Rate limiting algorithm:** fixed window counter. Time is split into windows of `windowSec` seconds. Each `(API key, end user, window)` combination has one row in the `ApiUsage` table, and each request increments its count. When the count goes above the key's limit, the request is rejected until the next window starts.

**Abuse protection:** requests with a missing or invalid key are recorded per IP in the `IpAttempt` table.

| Rule | Value |
| --- | --- |
| Short window | more than 20 bad attempts in 1 minute |
| Long window | more than 100 bad attempts in 1 hour |
| Block duration | 30 minutes |

Valid, authenticated traffic never touches this table.

## Tech stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js (App Router), React 19, TypeScript |
| Auth | NextAuth v5 (Auth.js) with Google provider and Prisma adapter |
| Database | PostgreSQL with Prisma ORM (`@prisma/adapter-pg`) |
| UI icons | lucide-react |
| Deployment | Vercel |

## Using the API

### 1. Get a key

Sign in, open the dashboard, set a limit and generate a key. It looks like `sk_9ebc3add...`.

### 2. Call the check endpoint

Before your server runs its real logic, call:

```bash
curl https://your-app.vercel.app/api/check \
  -H "x-api-key: sk_your_key_here" \
  -H "x-user-id: user_12345"
```

`x-user-id` is optional. Without it, all requests under the key share one bucket.

### 3. Read the response

Allowed (`200`):

```json
{
  "allowed": true,
  "limit": 100,
  "remaining": 87,
  "retryAfter": 42
}
```

Rate limit exceeded (`429`):

```json
{
  "allowed": false,
  "message": "Rate limit exceeded. Try again later.",
  "limit": 100,
  "remaining": 0,
  "retryAfter": 42
}
```

`retryAfter` is the number of seconds until the current window resets.

### Example: protecting an Express route

```js
app.get("/your-endpoint", async (req, res) => {
  const check = await fetch("https://your-app.vercel.app/api/check", {
    headers: {
      "x-api-key": "sk_your_key_here",
      "x-user-id": req.user?.id, // optional, per-user tracking
    },
  });
  const data = await check.json();

  if (!data.allowed) {
    return res.status(429).json({ error: "Too many requests, try later." });
  }

  res.json({ message: "success" });
});
```

### Endpoints

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/check` | `x-api-key` header | Count a request and return whether it's allowed |
| GET | `/api/keys` | Logged-in session | List your API keys |
| POST | `/api/keys` | Logged-in session | Create a key (`label`, `limit`, `windowSec`) |
| DELETE | `/api/keys/:id` | Logged-in session | Delete a key and its usage data |

## Project structure

```
api-rate-limiter/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth route
│   │   ├── check/                # Rate limit check endpoint
│   │   └── keys/                 # Create, list, delete API keys
│   ├── dashboard/                # Key management UI
│   ├── docs/                     # In-app usage docs
│   ├── components/               # Sidebar
│   └── hooks/                    # useSessionGuard
├── lib/                          # Prisma client, auth helpers
├── prisma/schema.prisma          # User, ApiKey, ApiUsage, IpAttempt + NextAuth tables
├── auth.ts                       # NextAuth config
└── middleware.ts                 # no-store cache headers for protected pages
```

## Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database
- A Google OAuth client ([Google Cloud Console](https://console.cloud.google.com/apis/credentials)). Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.

### Setup

```bash
git clone https://github.com/shubhamwankhede658/api-rate-limiter.git
cd api-rate-limiter
npm install
```

Create `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/rate_limiter
AUTH_SECRET=your_random_secret   # generate with: npx auth secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Create the database tables and start the app:

```bash
npx prisma db push --config prisma7.config.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Author

**Shubham Wankhede**
[GitHub](https://github.com/shubhamwankhede658)
