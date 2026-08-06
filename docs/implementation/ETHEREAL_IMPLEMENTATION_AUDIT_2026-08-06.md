# Ethereal implementation kickoff audit — 2026-08-06

Founder: **APPROVE ETHEREAL FINAL**. Implementation begins.

## Architecture snapshot
- Flutter routes: complete shell + deep links (auth, social, live, aura, gifts, wallet, market, learning, business, admin, music, conferences).
- API `/v1`: auth, social, messaging, wallet/payments, gifts, AI, live, conferences, music, creator, marketplace, learning, business, admin, owner-config — present.
- DB: migrations through owner-config / BGM; domains covered.
- Integrations: MediaMTX wired; OpenAI/Aura wired when keyed; Celery wired; Stripe/OAuth/SMS often fail-closed without secrets; in-app Live viewer incomplete; TURN often empty.

## Implementation order (this branch)
1. Ethereal tokens + Liquid S + components + shell IA  
2. Landing (web aether + Flutter) + Auth  
3. Home / social / profile  
4. Messages + Aura (hidden default)  
5. Live / Studio / Gifts  
6. Wallet / Market / Business / Learning / Music / Settings / Admin  
7. Harden Live viewer + money/auth where secrets exist  
8. Deploy + manual E2E per module  

## Founder-approved IA (from Product Map — implementing)
- Mobile bottom: Home · Live · Create · Messages · More (Aura via More / contextual, not always in island)
- Wallet / Gift Shop / Settings single homes
- Gifts sent only in Live

## Improvements deferred pending separate approval
None staged beyond approved Ethereal pack. New product capabilities beyond the pack will be proposed before coding.
