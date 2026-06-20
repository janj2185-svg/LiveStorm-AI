# LiveStorm AI — Backup Guide

> Цей документ описує як зберегти проєкт у безпеці на випадок призупинення Replit або іншої надзвичайної ситуації.

---

## 1. Статус GitHub (головний backup)

**Repository:** https://github.com/janj2185-svg/LiveStorm-AI  
**Branch:** `main`  
**Останній commit:** `18588eb` — "Update desktop app to use a configuration file for URLs"  
**Всього commits:** 750+  
**Розмір коду:** ~47,000 рядків TypeScript

### Що є в GitHub ✅
- Увесь вихідний код (frontend + API + desktop + libs)
- Dockerfile + docker-compose.yml
- DATABASE_SCHEMA.sql (повна схема БД)
- .env.production.example (шаблон всіх env vars)
- Electron Desktop App (artifacts/desktop/)
- Nginx конфіги (nginx/)
- pnpm-workspace.yaml + pnpm-lock.yaml

### Що НЕ є в GitHub (і не повинно бути) ❌
- `.env` файли з реальними ключами (secrets)
- `node_modules/` (встановлюється через pnpm install)
- `dist/` build артефакти
- `dist-desktop/` Electron builds
- Дані бази даних (тільки схема)

---

## 2. Повний список ENV змінних

> ⚠️ Зберегти ці значення в захищеному місці (1Password, Bitwarden, etc.)

### Обов'язкові

| Змінна | Де взяти |
|---|---|
| `DATABASE_URL` | Replit → Database panel |
| `CLERK_PUBLISHABLE_KEY` | dashboard.clerk.com → API Keys |
| `CLERK_SECRET_KEY` | dashboard.clerk.com → API Keys |
| `VITE_CLERK_PUBLISHABLE_KEY` | те саме що CLERK_PUBLISHABLE_KEY |
| `OPENAI_API_KEY` | platform.openai.com/api-keys |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | те саме що OPENAI_API_KEY |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | https://api.openai.com/v1 |
| `TIKTOOL_API_KEY` | tik.tools → особистий кабінет |
| `SIGN_API_KEY` | Replit → Secrets panel |
| `LIVE_PROVIDER` | "tiktools" або "euler" |
| `TIKTOK_MODE` | "real" або "demo" |

### Опціональні (Stripe, Google)

| Змінна | Де взяти |
|---|---|
| `STRIPE_SECRET_KEY` | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com |
| `GOOGLE_CLIENT_ID` | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | console.cloud.google.com |

### Replit-specific (не потрібні на VPS)

| Змінна | Примітка |
|---|---|
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit Object Storage |
| `PRIVATE_OBJECT_DIR` | Replit Object Storage |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit Object Storage |
| `REPL_IDENTITY` | Replit internal auth |
| `REPLIT_BASE_PATH` | Replit proxy path |
| `REPLIT_DEV_DOMAIN` | Replit dev domain |

---

## 3. Backup бази даних

### Швидкий dump (виконати прямо зараз)

```bash
# На Replit Shell:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M).sql
echo "Done: $(ls -la backup_*.sql | tail -1)"
```

### Що включає dump
- Повна схема (37 таблиць)
- Всі дані (streamers, users, viewers, sessions, etc.)
- Sequences, indexes, constraints

### Зберегти dump безпечно
```bash
# Варіант 1: Google Drive / Dropbox через rclone
# Варіант 2: Завантажити через Replit file browser

# На Replit: зробити zip для скачування
zip backup_full_$(date +%Y%m%d).zip backup_*.sql DATABASE_SCHEMA.sql
```

---

## 4. Checklist: Екстрений backup прямо зараз

```
□ 1. Зробити git commit і push всіх незакомічених змін
      git add -A
      git commit -m "emergency backup $(date)"
      git push origin main

□ 2. Зробити pg_dump
      pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

□ 3. Зберегти всі ENV values в 1Password/Bitwarden:
      □ CLERK_SECRET_KEY
      □ OPENAI_API_KEY
      □ TIKTOOL_API_KEY
      □ SIGN_API_KEY
      □ STRIPE_SECRET_KEY
      □ DATABASE_URL (поточний Replit)

□ 4. Перевірити GitHub: https://github.com/janj2185-svg/LiveStorm-AI
      □ Останній commit актуальний?
      □ Electron Desktop App є в artifacts/desktop/?
      □ docker-compose.yml є в корені?
```

---

## 5. Відновлення проєкту (новий Replit або VPS)

### На новому Replit

```bash
# 1. Створити новий Replit → Import from GitHub
#    https://github.com/janj2185-svg/LiveStorm-AI

# 2. Додати всі ENV vars в Secrets panel

# 3. Налаштувати нову PostgreSQL БД:
#    Replit → Database → Create PostgreSQL

# 4. Відновити дані:
psql $DATABASE_URL < backup_YYYYMMDD.sql

# 5. Запустити workflows
```

### На Hetzner VPS

```bash
# Дивись: LIVESTORM_DEPLOYMENT_GUIDE.md → Розділ 4
```

---

## 6. Автоматичний щоденний backup (cron на VPS)

```bash
# Додати до crontab на VPS після деплою:
cat >> /etc/cron.d/livestorm-backup << 'EOF'
# Щоденний dump о 3:00 UTC
0 3 * * * root docker compose -f /opt/livestorm/docker-compose.yml exec -T postgres \
  pg_dump -U livestorm livestormdb > /opt/backups/livestorm_$(date +\%Y\%m\%d).sql \
  && find /opt/backups/ -name "*.sql" -mtime +30 -delete
EOF

mkdir -p /opt/backups
```

---

## 7. Git — поточний стан

```
GitHub URL:   https://github.com/janj2185-svg/LiveStorm-AI
Branch:       main
Head commit:  18588eb — Update desktop app config file for URLs
Total commits: 750+
```

### Як запушити незбережені зміни

```bash
git add -A
git commit -m "backup: $(date '+%Y-%m-%d %H:%M')"
git push subrepl-25n71ba9 main
# або просто:
git push origin main
```

---

## 8. Контакти та ресурси

| Сервіс | URL | Примітка |
|---|---|---|
| GitHub | https://github.com/janj2185-svg/LiveStorm-AI | Основний код |
| Clerk | https://dashboard.clerk.com | Auth management |
| OpenAI | https://platform.openai.com | API keys |
| tik.tools | https://tik.tools | TikTok connector |
| Hetzner | https://console.hetzner.cloud | VPS hosting |
| Stripe | https://dashboard.stripe.com | Payments |
