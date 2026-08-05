# SYLORA — go live tonight (getsylora.com)

## Host (you)
1. Open https://getsylora.com and sign up / sign in.
2. **More** → under **Public stand · go-live role** tap **creator** (or streamer).
3. Open **Creator Studio** (or Live → create session → Creator Studio).
4. Allow camera + microphone when the browser asks.
5. Select your session (or create one from Live).
6. Tap **Go live** — one tap runs preflight → WHIP publish → start.
7. Watch link is **copied automatically**. Send it to friends.

## Friends
- Open the shared link: `https://getsylora.com/watch.html?src=…`
- Or open the HLS URL directly in Safari / VLC.
- No account required to watch.

## If something blocks
- Camera/mic denied → allow in browser site settings, retry Go live.
- Preflight fails → More → creator role again, create a **new** session (old sessions created before MediaMTX may lack a path).
- Friends see “Stream unavailable” until you finish Go live and are actually publishing video.

## Ops notes (already on the server)
- MediaMTX lite + `/webrtc` + `/hls` proxies
- WebRTC ICE UDP/TCP **8189** open to `46.225.84.210`
- API smoke verified: register → assume creator → create → preflight → credentials → **start live**
