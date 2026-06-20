# Deploying LiveStorm AI — Real TikTok LIVE Mode

This guide covers deploying the API server on a VPS or any Docker host so it
connects to **real** TikTok LIVE streams instead of the built-in simulator.

---

## How the mode system works

| `TIKTOK_MODE` | Behaviour |
|---|---|
| `demo` *(default)* | Built-in simulator generates fake events. Safe for Replit / staging. |
| `real` | Connects to the actual TikTok LIVE WebSocket. Requires internet access. If the connection fails, the **exact error** is surfaced in the dashboard — no silent fallback. |

The current mode is always shown in the dashboard header as a coloured badge:  
🟡 **DEMO** · 🟢 **REAL TIKTOK** · 🔴 **CONNECTION FAILED**

---

## Requirements

- VPS or server with **unrestricted outbound internet** (ports 80/443)
- Docker + Docker Compose **≥ v2** (recommended), OR Node.js 20+
- A PostgreSQL database (Replit DB, Supabase, Neon, Railway, etc.)
- Clerk account for auth
- OpenAI API key for AI features

---

## Quick start (Docker Compose)

### 1. Clone and configure

```bash
git clone <your-repo-url> livestorm-ai
cd livestorm-ai
cp .env.example .env   # or create .env manually (see below)
```

### 2. Create `.env`

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...

# TikTok mode: set to "real" for live connections
TIKTOK_MODE=real

# Optional
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Build and start

```bash
docker compose up -d --build
```

The API server starts on port **8080**. Put Nginx or Caddy in front for TLS.

---

## Testing real TikTok connectivity

Before starting a full session, verify your server can reach TikTok:

```bash
# Install the connector in the api-server directory
cd artifacts/api-server
npm install tiktok-live-connector

# Run the test script (the account must be LIVE right now)
node ../../scripts/test-tiktok.mjs @yourtiktokusername
```

**Success output:**
```
✅ Connected to @yourtiktokusername LIVE  (342ms)
   Listening for 10 seconds to verify real events...

📊 Events received in 10s:
   chat: 12
   like: 48
   roomUser: 3

✅ Real TikTok LIVE connection is working correctly.
```

**Common errors and fixes:**

| Error | Fix |
|---|---|
| `@username is not currently LIVE` | Start a TikTok LIVE on that account first |
| `tiktok-live-connector not installed` | `npm install tiktok-live-connector` in `artifacts/api-server/` |
| `ENOTFOUND` / `ECONNREFUSED` | VPS firewall is blocking outbound — open port 443 |
| `429 / rate limited` | Your VPS IP was rate-limited by TikTok. Wait ~5 min or switch IPs |

---

## Runtime connection test via dashboard

When a session is running, open the **AI Co-Host** page → sidebar → **TikTok Connection**.  
Enter any username and click **Test** — the server will attempt a live connection and
report success (with latency) or the exact error message.

This works via `POST /api/tiktok/test-connection` — no session restart needed.

---

## Without Docker (bare Node.js)

```bash
# Install deps
npm install -g pnpm@9
pnpm install

# Install TikTok connector
cd artifacts/api-server
npm install tiktok-live-connector

# Build
cd ../..
pnpm --filter @workspace/api-server run build

# Set env vars and start
export DATABASE_URL=...
export CLERK_PUBLISHABLE_KEY=...
export CLERK_SECRET_KEY=...
export AI_INTEGRATIONS_OPENAI_API_KEY=...
export TIKTOK_MODE=real
export PORT=8080

node --enable-source-maps artifacts/api-server/dist/index.mjs
```

---

## Nginx config (TLS termination)

```nginx
server {
    listen 443 ssl;
    server_name api.yourapp.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourapp.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:8080;
        proxy_http_version 1.1;
        # Required for Socket.IO websocket upgrade
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

---

## Troubleshooting

**Dashboard shows DEMO even after setting `TIKTOK_MODE=real`**  
→ Confirm the env var is set inside the container: `docker exec -it <container> env | grep TIKTOK`  
→ Rebuild after changing `.env`: `docker compose up -d --build`

**CONNECTION FAILED badge in dashboard**  
→ Hover or expand the error panel to see the exact message.  
→ Run `node scripts/test-tiktok.mjs @username` for detailed diagnostics.

**Session ends immediately**  
→ Check `/api/sessions/active` returns `mode: "error"` — TikTok rejected the connection.

**Socket events not reaching browser**  
→ Ensure Nginx forwards the `Upgrade` header (see config above).  
→ Socket.IO path is `/api/socket.io` — do NOT strip the `/api` prefix.
