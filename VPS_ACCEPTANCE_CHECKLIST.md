# VPS Acceptance Checklist
## Project Status: 🟡 READY FOR VPS TESTING — NOT YET PRODUCTION-READY

All 10 items below must pass on a **real VPS** with a **real TikTok LIVE stream** before
this project can be considered production-ready. Record results in the Result column.

---

## Pre-flight (complete before starting the checklist)

```
VPS provider:       _______________________________________________
VPS IP / hostname:  _______________________________________________
Test TikTok account: @____________________________________________
Test date / time:   _______________________________________________
Tester:             _______________________________________________
```

Verify these before running the 10 checks:

- [ ] `docker compose up -d --build` completed without errors
- [ ] `docker compose logs api | grep "Server listening"` shows the server started
- [ ] `curl http://localhost:8080/api/tiktok/mode` returns `{"mode":"real",...}`
- [ ] The TikTok test account is **actively LIVE** on TikTok right now

---

## The 10 Acceptance Checks

| # | Check | How to verify | Pass criteria | Result |
|---|---|---|---|---|
| 1 | Connect to real TikTok LIVE | Run test script | `✅ Connected` + latency printed | ⬜ PASS / ⬜ FAIL |
| 2 | Receive real chat message | Watch Live Feed tab during stream | Chat event appears with real viewer name | ⬜ PASS / ⬜ FAIL |
| 3 | Receive real gift event | Ask a viewer to send a gift | Gift event appears with coin value | ⬜ PASS / ⬜ FAIL |
| 4 | Receive real follow event | Ask a viewer to follow | Follow event appears with viewer name | ⬜ PASS / ⬜ FAIL |
| 5 | Generate OpenAI reply | Chat event appears → AI Chat tab | AI reply visible within 5 seconds | ⬜ PASS / ⬜ FAIL |
| 6 | Generate OpenAI TTS audio | Enable Voice (OpenAI mode) → trigger reply | Audio plays in browser | ⬜ PASS / ⬜ FAIL |
| 7 | Send announcement to OBS overlay | Gift/follow event fires AI announcement | OBS overlay shows the announcement text | ⬜ PASS / ⬜ FAIL |
| 8 | Show REAL status badge | Check AI Co-Host page header | 🟢 REAL TIKTOK @username badge visible | ⬜ PASS / ⬜ FAIL |
| 9 | Run 30 min without disconnect | Leave session running | No CONNECTION FAILED banner after 30 min | ⬜ PASS / ⬜ FAIL |
| 10 | Final PASS / FAIL report | Complete this checklist | All 9 above are PASS | ⬜ PASS / ⬜ FAIL |

---

## Step-by-step test procedure

### Check 1 — TikTok LIVE connection
```bash
# Run inside the Docker container
docker compose exec api node /app/scripts/test-tiktok.mjs @yourtiktokusername
```
Expected output:
```
✅ Connected to @yourtiktokusername LIVE  (< 1000ms)
✅ Real TikTok LIVE connection is working correctly.
```

**Result:** _______________________________________________
**Latency:** _______________________________________________

---

### Check 2 — Real chat message received
1. Start a session on the AI Co-Host dashboard page
2. Confirm 🟢 **REAL TIKTOK** badge is shown in the header (→ verifies Check 8 simultaneously)
3. Have a real TikTok viewer type a chat message during the live stream
4. Watch the Live Feed tab

**Result:** _______________________________________________
**Viewer name seen:** _______________________________________________

---

### Check 3 — Real gift event received
1. While the session is running, have a viewer send any gift (e.g. Rose = 1 coin)
2. Confirm a gift event appears in the Live Feed tab with the correct gift name and coin value

**Result:** _______________________________________________
**Gift name / coins:** _______________________________________________

---

### Check 4 — Real follow event received
1. Have a viewer who is NOT already following click Follow during the stream
2. Confirm a follow event appears in the Live Feed tab

**Result:** _______________________________________________
**Viewer name:** _______________________________________________

---

### Check 5 — OpenAI reply generated
1. Confirm `AI_INTEGRATIONS_OPENAI_API_KEY` is set in `.env`
2. When a chat event appears, the AI Co-Host tab should show a generated reply within ~5s
3. Check: `docker compose logs api | grep -i "openai\|chat\|reply"` for any errors

**Result:** _______________________________________________
**Sample reply text:** _______________________________________________

---

### Check 6 — OpenAI TTS audio
1. Go to the sidebar → Voice section → select **OpenAI** mode
2. Select a voice (e.g. nova)
3. When the AI generates an announcement, audio should play in the browser
4. Check for TTS errors in the browser console (F12 → Console)

**Result:** _______________________________________________
**Voice used:** _______________________________________________

---

### Check 7 — OBS overlay announcement
1. Open the OBS overlay URL in a browser (from the OBS page in the dashboard)
2. Trigger an event (gift/follow) that fires an AI announcement
3. Confirm the announcement text appears on the overlay within ~5s

```bash
# Check socket events are reaching the overlay
docker compose logs api | grep -i "announcement\|obs"
```

**Result:** _______________________________________________
**Announcement text seen:** _______________________________________________

---

### Check 8 — REAL status badge
1. On the AI Co-Host page, the header should show: 🟢 **REAL TIKTOK @username**
2. The TikTok Connection sidebar section should show: "Real TikTok LIVE"
3. NO red CONNECTION FAILED banner should be visible

**Result:** _______________________________________________

---

### Check 9 — 30-minute stability
Start a timer after Check 1 passes. At the 30-minute mark, verify:

```bash
# No error spikes in logs
docker compose logs --since 30m api | grep -i "error\|disconnect\|failed" | tail -20

# Process still running
docker compose ps
```

- [ ] Server process still running (`Up` in `docker compose ps`)
- [ ] No TikTok disconnect errors in last 30 min of logs
- [ ] No CONNECTION FAILED banner in the dashboard
- [ ] Live event count still incrementing (check viewer/chat stats)

**Result:** _______________________________________________
**Events received in 30 min:** _______________________________________________
**Any disconnects?** _______________________________________________

---

### Check 10 — Final report

Fill in after all checks are complete:

| Check | Result | Notes |
|---|---|---|
| 1. TikTok LIVE connection | | |
| 2. Chat message received | | |
| 3. Gift event received | | |
| 4. Follow event received | | |
| 5. OpenAI reply generated | | |
| 6. OpenAI TTS audio | | |
| 7. OBS overlay announcement | | |
| 8. REAL status badge | | |
| 9. 30-min stability | | |

**FINAL VERDICT:**

```
⬜  ALL PASS — Project is PRODUCTION-READY
⬜  PARTIAL — X/9 passed. Failing items: ________________
⬜  ALL FAIL — Not ready. Root cause: ________________
```

**Sign-off:** _______________________________________________
**Date:** _______________________________________________

---

## If something fails

| Symptom | Where to look | Likely fix |
|---|---|---|
| Check 1 fails — `not LIVE` | Account must be actively streaming | Start a TikTok LIVE on the account |
| Check 1 fails — `ENOTFOUND` | VPS firewall | `ufw allow out 443` |
| Check 1 fails — `429` | TikTok rate limit | Wait 5–10 min, retry |
| Checks 2-4 fail — no events | Logs for runtime errors | `docker compose logs -f api \| grep TikTok` |
| Check 5 fails — no AI reply | OpenAI API key | `curl -H "Authorization: Bearer $KEY" https://api.openai.com/v1/models` |
| Check 6 fails — no audio | Browser permissions | Allow audio autoplay; check browser console |
| Check 7 fails — OBS blank | Socket.IO path | Nginx must forward `Upgrade` header — see DEPLOY.md |
| Check 8 wrong badge | TIKTOK_MODE env var | `docker compose exec api env \| grep TIKTOK` |
| Check 9 disconnects | TikTok session timeout | Check logs for `disconnected` events; connector may need auto-reconnect logic |

---

## Project status history

| Date | Status | Notes |
|---|---|---|
| 2026-06-07 | 🟡 READY FOR VPS TESTING | All code complete, untested on real VPS |
| | | |
| | | |

*Update this table after each test run. Change status to 🟢 PRODUCTION-READY only when Check 10 shows ALL PASS.*
