# LiveStorm AI — Simple Deployment Guide
## GitHub → Hetzner VPS → Docker Compose

This is the cleanest path to get the server running on a real VPS.  
Total time: ~20 minutes from scratch.

---

## What you need before starting

- [ ] A [GitHub](https://github.com) account
- [ ] A [Hetzner Cloud](https://cloud.hetzner.com) account (€3.79/mo CX22)
- [ ] Your API keys ready: Clerk, OpenAI, Database URL
- [ ] A TikTok account that you can go LIVE on (for testing)

---

## Part 1 — Push to GitHub (do this once, on your computer)

### Step 1.1 — Create a GitHub repo

Go to [github.com/new](https://github.com/new):
- Repository name: `livestorm-ai`
- Visibility: **Private** ← important, keeps your code private
- Do NOT add README or .gitignore (the project already has them)
- Click **Create repository**

### Step 1.2 — Push from your computer

Open a terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/livestorm-ai.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

> **Confirm no secrets leaked:** After pushing, open GitHub in your browser,
> click through the files, and confirm there is NO `.env` file listed.
> `.env.example` should be there (it's safe — no real values), but `.env` must not be.

---

## Part 2 — Set up the VPS (do this once, on Hetzner)

### Step 2.1 — Create the server

1. Go to [cloud.hetzner.com](https://cloud.hetzner.com) → New Project → name it `livestorm`
2. Click **Add Server**:
   - Location: anything (Nuremberg is fine)
   - Image: **Ubuntu 22.04**
   - Type: **CX22** (€3.79/mo — 2 vCPU, 4 GB RAM)
   - SSH key: paste your public key (`cat ~/.ssh/id_rsa.pub` on your computer)
3. Click **Create & Buy now** — note the **IP address**

### Step 2.2 — SSH in and install Docker

```bash
# From your computer
ssh root@YOUR_VPS_IP

# Now on the server — paste this whole block:
apt-get update && apt-get upgrade -y
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git
```

### Step 2.3 — Clone the project

```bash
# Still on the server
git clone https://github.com/YOUR_USERNAME/livestorm-ai.git
cd livestorm-ai
```

GitHub will ask for your username and a **Personal Access Token** (not your password).
Generate one at: [github.com/settings/tokens](https://github.com/settings/tokens) → Generate new token (classic) → check `repo` → copy the token.

### Step 2.4 — Create your `.env` file

```bash
cp .env.example .env
nano .env
```

Fill in every value (Clerk keys, DATABASE_URL, OpenAI key). Save with **Ctrl+O → Enter → Ctrl+X**.

Confirm no value is still a placeholder:
```bash
grep "xxxxxxx\|your_\|password@host" .env && echo "⚠ Still has placeholders!" || echo "✅ Looks filled in"
```

### Step 2.5 — Build and start

```bash
docker compose up -d --build
```

First build takes 3–5 minutes. Watch progress:
```bash
docker compose logs -f
```

When you see `Server listening` — press **Ctrl+C** (server keeps running). Done.

---

## Part 3 — Verify TikTok works

```bash
# Check the server is in real mode
curl http://localhost:8080/api/tiktok/mode

# Test a real TikTok username — the account must be LIVE right now
docker compose exec api node /app/scripts/test-tiktok.mjs @yourtiktokusername
```

Expected success:
```
✅ Connected to @yourtiktokusername LIVE  (312ms)
✅ Real TikTok LIVE connection is working correctly.
```

Then open `VPS_ACCEPTANCE_CHECKLIST.md` and run all 10 checks.

---

## Part 4 — How to update the VPS later

Every time you push new code to GitHub, update the VPS with these 3 commands:

```bash
# SSH into the server
ssh root@YOUR_VPS_IP

# Pull latest code and rebuild
cd /root/livestorm-ai
git pull
docker compose up -d --build
```

That's it. Docker rebuilds only what changed, so subsequent builds are faster (1–2 min).

Watch the new version start:
```bash
docker compose logs -f
```

---

## Useful commands to know

```bash
# Check if everything is running
docker compose ps

# Live server logs
docker compose logs -f

# Last 50 lines of logs
docker compose logs --tail=50

# Stop the server
docker compose down

# Restart without rebuilding (after .env change)
docker compose restart

# Full rebuild (after code change)
docker compose up -d --build

# Open a shell inside the running container
docker compose exec api bash

# Run the TikTok test
docker compose exec api node /app/scripts/test-tiktok.mjs @username

# Check which env vars the server sees
docker compose exec api env | sort
```

---

## If something goes wrong

**Container won't start:**
```bash
docker compose logs api | tail -30
```

**"Port already in use":**
```bash
lsof -i :8080
kill -9 <PID>
docker compose up -d
```

**"git pull" asks for credentials every time:**
```bash
# Save GitHub credentials so you don't re-enter them
git config --global credential.helper store
git pull   # enter once — saved forever
```

**Forgot the server IP:**
```bash
# From your computer
ping livestorm-ai   # if you set a hostname
# Or just check cloud.hetzner.com → your project → server list
```

---

## Security checklist before going live

- [ ] `.env` is NOT visible on GitHub (check the repo file list)
- [ ] `.env.example` IS visible on GitHub (safe — no real values)
- [ ] Hetzner firewall: allow port 80, 443, 22 — block everything else
- [ ] Set up Nginx + Let's Encrypt for HTTPS (see `DEPLOY.md`)
- [ ] Use a strong SSH key, disable password login: `PasswordAuthentication no` in `/etc/ssh/sshd_config`

---

## Project status

🟡 **READY FOR VPS TESTING** — See `VPS_ACCEPTANCE_CHECKLIST.md` for the 10 checks required before this becomes production-ready.
