# LiveStorm AI Desktop App — Testing Guide (Phase 1)

## Для тестувальника

Ця інструкція пояснює як запустити та протестувати LiveStorm AI Desktop App на Windows.

---

## Крок 1 — Отримати білд

### Варіант A: Отримати zip від команди

1. Скачати `LiveStorm-AI-Desktop-Win.zip`
2. Розпакувати в будь-яку папку (наприклад `C:\LiveStorm\`)

### Варіант B: Зібрати з вихідного коду

```powershell
# Потрібно: Node.js 18+ та pnpm
git clone [repo-url]
cd [repo]
pnpm install
pnpm desktop:build:win
# Результат: artifacts/desktop/dist-desktop/win-unpacked/
```

---

## Крок 2 — Налаштувати URL (обов'язково)

В папці з `LiveStorm AI.exe` є файл `config.json`.
Відкрий його в Notepad і встанови правильний URL:

```json
{
  "appUrl": "https://YOUR-LIVESTORM-URL.replit.app"
}
```

> Якщо `config.json` немає — створи його вручну поруч з `.exe`.

---

## Крок 3 — Запустити

1. Відкрий папку з розпакованим білдом
2. Запусти **`LiveStorm AI.exe`** подвійним кліком
3. Зачекай 3-5 секунд поки завантажиться

**Очікуваний результат:** відкривається вікно з LiveStorm AI — чорний інтерфейс із заголовком "Turn Your Stream Into A Living Game"

---

## Крок 4 — Тестовий сценарій

### 4.1 Базовий запуск
- [ ] App відкривається без помилок
- [ ] Видно LiveStorm AI UI (не порожнє вікно, не помилка)
- [ ] Заголовок вікна показує "LiveStorm AI"

### 4.2 Clerk Auth
- [ ] Натисни **"Log in"** або **"Get Started"**
- [ ] З'являється форма входу Clerk
- [ ] Можна ввести email + пароль і увійти
- [ ] Після входу відображається Dashboard

### 4.3 WebSocket підключення
- [ ] Після логіну перейди на сторінку LIVE session
- [ ] В консолі Electron (Ctrl+Shift+I → Console) немає помилок WebSocket
- [ ] Індикатор з'єднання зелений

### 4.4 Мікрофон
- [ ] На сторінці з мікрофоном — Windows показує popup з дозволом
- [ ] Дай дозвіл → мікрофон підключається
- [ ] Рівень звуку відображається

### 4.5 TikTok LIVE підключення
- [ ] Введи TikTok username
- [ ] Натисни "Connect"
- [ ] З'являється статус підключення

### 4.6 Зовнішні посилання
- [ ] Натисни будь-яке посилання, що веде на зовнішній сайт (Docs, Terms, etc.)
- [ ] Посилання відкривається у браузері (Chrome/Edge/Firefox) — НЕ всередині app

### 4.7 Перевірка що web-версія не зламана
- [ ] Відкрий той самий URL у звичайному браузері
- [ ] Все працює нормально (web-версія незалежна від Desktop App)

---

## Що НЕ тестувати зараз

- Auto-update — не реалізований (Phase 2)
- Offline режим — не підтримується (Phase 1 = SaaS URL)
- macOS/Linux версія — пізніше

---

## Відомі обмеження Phase 1

| Обмеження | Пояснення |
|---|---|
| Потрібен інтернет | App завантажує живий SaaS — без інтернету не працює |
| Без installer | Zip-версія, не .msi/.exe installer — розпакувати і запустити |
| macOS не підписаний | macOS-версія потребує Apple Developer Certificate |
| NSIS installer | Потребує збірки на Windows або VM з wine |

---

## Куди надсилати баги

**Формат звіту:**

```
Версія: LiveStorm AI Desktop 1.0.0 (Electron 32.3.3)
OS: Windows 10/11 (вказати версію)
Кроки відтворення:
  1. ...
  2. ...
Очікуваний результат: ...
Фактичний результат: ...
Скріншот: [додати]
Лог (F12 → Console): [вставити помилки якщо є]
```

**Надсилати:** [вказати контакт / GitHub Issues / Telegram]

---

## Технічна довідка для тестувальника

### Відкрити DevTools (для логів)

В запущеному Desktop App: `Ctrl + Shift + I`

### Лог Electron

Якщо app не запускається — запусти з командного рядка:

```powershell
cd "C:\LiveStorm\"
"LiveStorm AI.exe" 2>&1 | Tee-Object -FilePath electron-log.txt
```

### URL що відкривається

Перевірити в DevTools → Network або через config.json

### Версія Electron

Кнопка About або в DevTools → Console:
```javascript
console.log(navigator.userAgent)
```
