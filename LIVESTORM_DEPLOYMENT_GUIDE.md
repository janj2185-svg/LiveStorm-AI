# LiveStorm AI — Deployment Guide

> Last updated: 2025-06-20 | Version: see `git log --oneline -1`

---

## 1. Огляд архітектури

```
┌─────────────────────────────────────────────────────────┐
│                    LiveStorm AI Stack                    │
├─────────────────────────────────────────────────────────┤
│  Browser / Desktop App (Electron)                        │
│      ↕ HTTPS / WSS                                       │
│  Nginx (reverse proxy + TLS)                             │
│      ├── /api/*   → API Server (Node.js, port 8080)      │
│      ├── /socket.io/* → API Server (WebSocket)           │
│      └── /*       → Frontend (React, static files)       │
│  PostgreSQL 16 (port 5432, internal only)                │
│  Object Storage (Replit / local /data)                   │
└─────────────────────────────────────────────────────────┘
```

**Компоненти:**
- **Frontend**: React + Vite + TailwindCSS (SPA)
- **API Server**: Node.js + Express + Socket.IO + Drizzle ORM
- **Database**: PostgreSQL 16 (37 таблиць)
- **Auth**: Clerk (hosted, не потребує self-host)
- **AI**: OpenAI GPT-4 + TTS
- **TikTok**: tik.tools або Eulerstream connector
- **Desktop**: Electron wrapper (Phase 1 = SaaS shell)

---

## 2. Вимоги до сервера

### Мінімум (тестування)
- CPU: 2 vCPU
- RAM: 4 GB
- Storage: 40 GB SSD
- OS: Ubuntu 22.04 LTS

### Рекомендовано (production)
- CPU: 4 vCPU
- RAM: 8 GB
- Storage: 80 GB SSD
- OS: Ubuntu 22.04 LTS або Debian 12

### Hetzner VPS рекомендація
- **CPX21**: 3 vCPU, 4 GB RAM, 80 GB SSD — ~5.77€/місяць ✅
- **CPX31**: 4 vCPU, 8 GB RAM, 160 GB SSD — ~11.52€/місяць (production)

---

## 3. Локальний запуск (розробка)

### Передумови
- Node.js 24+
- pnpm 10+
- PostgreSQL 16

```bash
# 1. Клонувати репозиторій
git clone https://github.com/janj2185-svg/LiveStorm-AI.git
cd LiveStorm-AI

# 2. Встановити залежності
pnpm install

# 3. Налаштувати env
cp .env.production.example .env
nano .env   # заповнити значення

# 4. Запустити базу даних (якщо локально)
createdb livestormdb
psql livestormdb < DATABASE_SCHEMA.sql

# 5. Запустити сервіси (два термінали)

# Термінал 1: API Server
PORT=8080 pnpm --filter @workspace/api-server run dev

# Термінал 2: Frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/livestorm-ai run dev

# 6. Відкрити http://localhost:5173
```

### Desktop App (dev)
```bash
# Переконатись що frontend запущений на localhost:5173
pnpm desktop:dev
# Electron відкриє вікно з http://localhost:5173
```

---

## 4. Розгортання на Hetzner VPS (Docker)

### 4.1 Підготовка сервера

```bash
# Підключитись до VPS
ssh root@YOUR_SERVER_IP

# Оновити систему
apt update && apt upgrade -y

# Встановити Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Встановити Docker Compose v2
apt install docker-compose-plugin -y

# Перевірити
docker --version
docker compose version
```

### 4.2 Отримати код

```bash
# На VPS
git clone https://github.com/janj2185-svg/LiveStorm-AI.git /opt/livestorm
cd /opt/livestorm
```

### 4.3 Налаштувати env

```bash
cp .env.production.example .env
nano .env
```

**Обов'язкові значення:**
```env
POSTGRES_PASSWORD=STRONG_RANDOM_PASSWORD_HERE
DATABASE_URL=postgresql://livestorm:STRONG_RANDOM_PASSWORD_HERE@postgres:5432/livestormdb
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
OPENAI_API_KEY=sk-...
TIKTOOL_API_KEY=your_tiktools_key
FRONTEND_URL=https://your-domain.com
TIKTOK_MODE=real
LIVE_PROVIDER=tiktools
```

### 4.4 Налаштувати TLS (Certbot)

```bash
apt install certbot -y
certbot certonly --standalone -d your-domain.com

# Створити папку для сертифікатів
mkdir -p /opt/livestorm/nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/livestorm/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/livestorm/nginx/ssl/

# Оновити domain в nginx/nginx.conf
sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN/g' /opt/livestorm/nginx/nginx.conf
```

### 4.5 Зібрати frontend

```bash
# На VPS або локально (потім скопіювати dist/)
npm install -g pnpm
pnpm install
PORT=443 BASE_PATH=/ pnpm --filter @workspace/livestorm-ai run build
# Результат: artifacts/livestorm-ai/dist/public/
```

### 4.6 Запустити стек

```bash
cd /opt/livestorm

# Перший запуск (збудує Docker image)
docker compose up -d --build

# Перевірити статус
docker compose ps
docker compose logs api --tail=50
docker compose logs postgres --tail=20
```

### 4.7 Перевірити роботу

```bash
# Health check API
curl http://localhost:8080/api/health

# Перевірити через nginx
curl https://your-domain.com/api/health

# Перевірити БД
docker compose exec postgres psql -U livestorm -d livestormdb -c "\dt"
```

---

## 5. Оновлення (деплой нової версії)

```bash
cd /opt/livestorm

# 1. Отримати нові зміни
git pull origin main

# 2. Перезібрати frontend
PORT=443 BASE_PATH=/ pnpm --filter @workspace/livestorm-ai run build

# 3. Перезапустити API (з новим image)
docker compose up -d --build api

# 4. Перезапустити nginx (нові статичні файли)
docker compose restart nginx

# Перевірити
docker compose logs api --tail=30
```

---

## 6. База даних

### Схема
- **Файл**: `DATABASE_SCHEMA.sql` (2558 рядків)
- **Таблиць**: 37
- **Drizzle ORM**: `lib/db/src/schema/`

### Експорт даних
```bash
# На Replit (поточна БД)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# На VPS
docker compose exec postgres pg_dump -U livestorm livestormdb > backup_$(date +%Y%m%d).sql
```

### Імпорт даних (міграція з Replit на VPS)
```bash
# 1. На Replit — зробити dump
pg_dump $DATABASE_URL > replit_data_backup.sql

# 2. Перекинути на VPS
scp replit_data_backup.sql root@YOUR_VPS_IP:/opt/livestorm/

# 3. На VPS — відновити
docker compose exec -T postgres psql -U livestorm livestormdb < /opt/livestorm/replit_data_backup.sql
```

### Міграції Drizzle
```bash
# Генерувати нову міграцію (після зміни schema)
cd lib/db && npx drizzle-kit generate

# Застосувати міграцію
npx drizzle-kit migrate
```

---

## 7. Моніторинг

```bash
# Логи в реальному часі
docker compose logs -f api
docker compose logs -f postgres
docker compose logs -f nginx

# Використання ресурсів
docker stats

# Розмір даних БД
docker compose exec postgres psql -U livestorm -d livestormdb -c "
SELECT pg_size_pretty(pg_database_size('livestormdb')) as db_size;"
```

---

## 8. Автоматичне оновлення TLS (cron)

```bash
# Додати до crontab
echo "0 12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /opt/livestorm/nginx/ssl/ && docker compose -f /opt/livestorm/docker-compose.yml restart nginx" | crontab -
```

---

## 9. Відомі обмеження VPS vs Replit

| Функція | Replit | VPS |
|---|---|---|
| Object Storage | Replit buckets (авто) | Локальна папка /data |
| Clerk Auth | ✅ Однаково | ✅ Однаково |
| OpenAI | Через Replit proxy | Прямо до api.openai.com |
| TikTok LIVE | tiktools/eulerstream | tiktools/eulerstream |
| TLS/HTTPS | Replit proxy | Certbot + Nginx |
| WebSocket | ✅ | ✅ |

---

## 10. Структура проєкту

```
LiveStorm-AI/
├── artifacts/
│   ├── api-server/          ← Node.js API (Express + Socket.IO)
│   ├── livestorm-ai/        ← React frontend (Vite + TailwindCSS)
│   ├── desktop/             ← Electron desktop app
│   └── mockup-sandbox/      ← Component preview (dev only)
├── lib/
│   ├── db/                  ← Drizzle ORM schema + config
│   ├── api-spec/            ← OpenAPI spec
│   ├── api-zod/             ← Zod validators
│   ├── api-client-react/    ← React Query hooks
│   └── integrations-openai-ai-server/
├── nginx/                   ← Nginx configs
├── scripts/                 ← Post-merge + test scripts
├── Dockerfile               ← API server Docker image
├── docker-compose.yml       ← Full stack compose
├── DATABASE_SCHEMA.sql      ← PostgreSQL schema (37 tables)
├── .env.production.example  ← All env vars template
└── pnpm-workspace.yaml      ← pnpm monorepo config
```
