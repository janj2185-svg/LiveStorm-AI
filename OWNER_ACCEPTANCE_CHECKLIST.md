# SYLORA — Owner Acceptance Checklist

Fill this while testing your local stack.  
**Do not mark Pass unless you personally observed the expected result.**

| Meta | Value |
|---|---|
| Tester | |
| Date | |
| Branch | `cursor/sylora-gift-library-5b96` |
| Commit | |
| Startup mode | Docker / Host |
| Notes | |

Legend: **Pass** / **Fail** / **Blocked** / **N/A**

---

## How to use each row

For every test below, record:

- **Steps** (given)  
- **Expected** (given)  
- **Actual:**  
- **Result:** Pass / Fail / Blocked / N/A  
- **Screenshot path:**  
- **Bug notes:**  

---

### Registration
- **Steps:** `POST /v1/auth/register` with a new email OR gallery entry flow if wired.  
- **Expected:** `202 verification_queued` (or seeded users already active).  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Login
- **Steps:** Login as `owner@sylora.dev` / `OwnerTest!2026Local` via API.  
- **Expected:** `200` with access + refresh tokens.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Logout
- **Steps:** Call logout/revoke session endpoint with bearer token.  
- **Expected:** Session invalidated; refresh fails.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Profile
- **Steps:** `GET /v1/users/me` (or profile route) after login.  
- **Expected:** Display name / email for owner.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Feed
- **Steps:** Open gallery `#/home` or social feed API.  
- **Expected:** UI renders; API returns feed or empty list (not 500).  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Comments
- **Steps:** Create comment on a post via API if social seeded; else mark Blocked.  
- **Expected:** Comment persisted or clear validation error.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Likes
- **Steps:** React to a post via API.  
- **Expected:** Reaction accepted or idempotent.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Follows
- **Steps:** `user@sylora.dev` follows `creator@sylora.dev`.  
- **Expected:** Follow relation created.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Messaging
- **Steps:** Open `#/messages`; send DM via messaging API if available.  
- **Expected:** UI loads; WS ticket or REST message works.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Notifications
- **Steps:** Trigger a follow/gift and check notification list.  
- **Expected:** Notification appears or empty list without crash.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Creator account
- **Steps:** Login `creator@sylora.dev`; open `#/studio`.  
- **Expected:** Creator role present; studio UI loads.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Marketplace
- **Steps:** Open `#/marketplace`.  
- **Expected:** Gallery screen loads (demo catalog OK). Checkout API may be Provider not configured.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Education
- **Steps:** Open `#/learning`.  
- **Expected:** Learning UI loads.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Business CRM
- **Steps:** Open `#/business` as owner.  
- **Expected:** Business dashboard UI loads.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Admin panel
- **Steps:** Open `#/admin`; call an admin API with owner token.  
- **Expected:** UI loads; admin permission accepted.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Wallet
- **Steps:** Open `#/wallet`; `GET` wallet/ledger endpoints.  
- **Expected:** UI loads; top-up fails closed without payment provider.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift catalog
- **Steps:** Open `#/gift-library-store`; read counts.  
- **Expected:** READY=0; PARTIAL gifts listed; no claim of 100 ready.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift preview
- **Steps:** Open a PARTIAL gift folder `artifacts/gift-library/<slug>/preview.mp4`.  
- **Expected:** Video plays locally.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift sound
- **Steps:** Play `artifacts/gift-library/<slug>/sound/main.wav`.  
- **Expected:** Audio audible.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift animation
- **Steps:** Inspect GLB in Gift Studio or Blender; play preview MP4.  
- **Expected:** Animation present in preview (PARTIAL quality — not Pixar).  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift purchase
- **Steps:** Attempt purchase via API.  
- **Expected:** Fails closed — payment **Provider not configured** (not fake success).  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift send
- **Steps:** After inventory credit (if issuable by admin), send gift user→viewer.  
- **Expected:** Send succeeds only with real ledger; else clear error.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift receive
- **Steps:** Login as `viewer@sylora.dev`; check received gifts.  
- **Expected:** History shows gift if send succeeded.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Gift history
- **Steps:** Query gift history endpoints for sender and receiver.  
- **Expected:** Consistent records.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### AI microphone input
- **Steps:** Open assistant/cohost UI; grant mic if prompted.  
- **Expected:** UI handles permission; no crash without provider.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### AI speech recognition
- **Steps:** Attempt STT without provider keys.  
- **Expected:** Provider not configured / clear error.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### AI text response
- **Steps:** Send chat without OpenAI key.  
- **Expected:** Fail closed, not hallucinated “success”.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### AI voice response
- **Steps:** Request TTS without voice provider.  
- **Expected:** Provider not configured.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### AI emotion state
- **Steps:** Open cohost emotion UI.  
- **Expected:** UI renders; backend state only if configured.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Live chat input
- **Steps:** Open live UI; type chat.  
- **Expected:** UI accepts input; live session API may require MediaMTX.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### WebSocket updates
- **Steps:** Connect to documented WS path with auth ticket.  
- **Expected:** Accept + heartbeat or clear auth error (not server crash).  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Error handling
- **Steps:** Call unknown route; call payment without provider.  
- **Expected:** Structured API errors; no stack trace leak to clients.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Mobile layout
- **Steps:** Gallery device = phone; open home, gifts, wallet.  
- **Expected:** No horizontal overflow; usable tap targets.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Desktop layout
- **Steps:** Gallery device = desktop; open admin, marketplace, diagnostics.  
- **Expected:** Layout stable; diagnostics readable.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

### Diagnostics page
- **Steps:** Open `#/diagnostics`; confirm JSON `/v1/diagnostics`.  
- **Expected:** DB/Redis/backend statuses; missing providers listed; no secrets.  
- **Actual:**  
- **Result:**  
- **Screenshot path:**  
- **Bug notes:**  

---

## Sign-off

| | |
|---|---|
| Ready for my personal deeper testing? | Yes / No |
| Blocking issues | |
| Signature | |
