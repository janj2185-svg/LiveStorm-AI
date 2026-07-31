# Stage 2: dependency-ordered implementation roadmap

## Мета й принципи

Stage 2 перетворює executable design gallery на production platform через перевірювані вертикальні зрізи. Порядок нижче визначений залежностями та ризиком, не календарем. Повний scope не може бути правдиво завершений одним автономним запуском: він потребує продуктових рішень, зовнішніх credentials/approvals, інженерних і творчих дисциплін, security/compliance review та production verification.

Обов’язкові принципи:

1. Жоден production flow не читає `src/screens/data.ts` або local screen constants.
2. Жодна кнопка не вважається реалізованою без authorization, server command/query, durable result, error state, telemetry і тесту.
3. OpenAPI/AsyncAPI schemas та domain invariants є source of truth; клієнтські типи генеруються з контрактів.
4. Грошові, entitlement і moderation mutations є idempotent, audited та server-authoritative.
5. Зовнішній provider вмикається лише після поточного review його документації, credentials, approvals/scopes, quota та sandbox/live verification.
6. Production UI не показує synthetic operational data. Недоступна capability має явний unavailable state.
7. Privacy, accessibility, localization і abuse controls входять до acceptance criteria кожного phase.

## Цільова архітектура

### Modular monolith first

Початковий control/data plane має бути modular monolith, а не набір передчасних microservices:

```text
Web / Flutter clients
  → API gateway / BFF
    → modular application
      identity & access
      accounts & organizations
      social graph & content
      messaging & notifications
      ledger & entitlements
      commerce & learning
      trust & safety / admin
    → PostgreSQL
    → Redis for bounded ephemeral concerns
    → object storage
    → transactional outbox + workers
```

Межі модулів:

- окремі schemas/namespaces, application services та repositories;
- заборона прямих cross-module table writes;
- explicit command/query contracts;
- transaction boundary всередині одного module або orchestration через idempotent workflow;
- outbox подій у тій самій PostgreSQL transaction, що й state change;
- RBAC/ABAC та audit context передаються на кожну command.

Цей підхід дає транзакційну цілісність для identity, social graph, ledger, orders і moderation без distributed transaction failure modes. Deployment може бути один, але module boundaries мають дозволяти подальше вилучення.

### Незалежно масштабовані data planes

Не все слід тримати в monolith:

| Plane | Чому окремо | Початкова межа |
|---|---|---|
| Media/live | Високий bandwidth, GPU/CPU transcode, stateful sessions, регіональний ingest, жорсткі latency/SLO. | Ingest/session control API, media jobs, origin/packaging, playback authorization і QoE events. |
| AI/model gateway | Provider-specific rate/cost limits, data residency, safety policy, streaming responses, evaluation і швидка зміна моделей. | Versioned model gateway із policy, redaction, routing, budget, citations, tool authorization та audit. |
| Event delivery | Burst fan-out, replay, ordering і backpressure зростають інакше, ніж CRUD. | Спочатку PostgreSQL outbox + workers; окремий event backbone лише після виміряної потреби. |

Media control metadata може належати monolith, але ingest/transcode/playback не повинні виконуватися в його request process. AI business permissions залишаються у відповідному domain module; gateway не отримує права самостійно змінювати ledger, content або moderation state.

## Phase 1 — Foundations та identity

### Entry criteria

- затверджені product boundaries, supported regions, account types, age policy, data residency і legal entities;
- визначені production environments та власники domain/security/operations;
- обрані identity, email, object storage й observability providers після current provider review;
- зафіксовані SLO, RPO/RTO, data classification і retention baseline;
- існує рішення, які gallery screens переходять у перший real vertical slice.

### Реалізація

- створити окрему product application composition root і справжній router; gallery лишити окремим design reference;
- versioned API contract, error envelope, correlation/causation IDs, pagination, idempotency key convention;
- modular server skeleton, PostgreSQL migrations, repository boundaries, transaction manager, outbox і worker runtime;
- environment isolation, secret manager, least-privilege service identities, TLS, structured logs, metrics, traces;
- identity: registration, email verification, sign-in, sign-out, secure session rotation, recovery, account lockout, MFA/passkeys;
- OIDC/OAuth account linking із anti-CSRF `state`, PKCE, `nonce`, exact redirect allowlist і token vault;
- users, profiles, organizations, memberships, roles, consents, devices, sessions, account export/deletion workflow;
- server-side authorization middleware та policy tests; admin surface із окремою privileged policy;
- replace `AuthScreen`/onboarding fixtures real API state; явні loading, denied, expired і recovery states;
- security headers, CSP, CSRF defense, rate limits, abuse signals, dependency and secret scanning.

### Exit criteria

- новий користувач створює, підтверджує, захищає і видаляє account у production-like environment;
- session revoke працює на всіх devices; role/tenant isolation перевірена;
- жоден auth/onboarding flow не залежить від fixture data;
- schema rollback/forward strategy, backup і restore drill задокументовані та виконані;
- audit entries містять actor, subject, action, reason, correlation ID і immutable timestamp;
- external provider sandbox та окремий controlled live smoke test пройдені з реальними credentials.

### Tests

- unit/property tests для password/session/token/policy invariants;
- integration tests із реальною PostgreSQL/Redis інфраструктурою та migrations;
- OAuth/OIDC contract tests проти provider test configuration;
- end-to-end registration, verification, passkey/MFA, recovery, logout-all, export/delete;
- tenant escape, IDOR, CSRF, replay, brute-force і session fixation security tests;
- backup restore, migration rollback і secret rotation drills;
- accessibility та localization tests для auth і consent flows.

## Phase 2 — Social graph, content, messaging та notifications

### Entry criteria

- Phase 1 identity, sessions, policies, audit і outbox мають exit evidence;
- затверджені privacy model, follow/request/block semantics, community roles, content policy та retention;
- визначені message encryption-at-rest, abuse reporting і lawful handling requirements.

### Реалізація

- social graph: follow, private request, accept/decline, block, mute, relationship queries;
- profile, post, comment, reaction, repost, bookmark, chronological feed і explainable discovery inputs;
- communities, memberships, channels, permissions, invitations і moderation hooks;
- one-to-one messaging, conversations, attachments, delivery/read state, typing/presence як ephemeral state;
- durable notification inbox, preferences, deduplication, delivery attempts та provider fan-out;
- upload pipeline до object storage з MIME validation, malware scan, metadata stripping і signed access;
- replace Home/Feed/Search/Discover/Profile/Friends/Communities/Messages/Chat/Notifications fixtures;
- search спочатку через PostgreSQL full-text/trigram для bounded corpus; API має стабільну abstraction boundary.

### Exit criteria

- two-account e2e flow доводить privacy, follow/request/block, post/comment і message delivery;
- chronological feed ordering детермінований; blocked/private content не витікає через search, feed або notifications;
- message send є idempotent; duplicate delivery не створює duplicate message;
- attachment access відкликається разом із permission;
- moderation report створює durable case з evidence provenance.

### Tests

- graph invariant/property tests;
- API authorization matrix для owner/follower/blocked/community roles;
- concurrency tests для follow requests, reactions, unread counters і message retries;
- integration tests outbox → delivery → inbox;
- WebSocket reconnect, resume, ordering, duplicate й backpressure tests;
- malware/oversize/type-confusion attachment tests;
- feed/search privacy leakage і accessibility e2e.

## Phase 3 — Ledger, gifts, entitlements та payments

### Entry criteria

- stable identity, audit, outbox і organization ownership;
- legal/finance approval для currency model, refunds, minors, VAT/sales tax, chargebacks, creator payouts і supported countries;
- обраний PSP/acquirer та app-store billing strategy; live credentials ще не вмикаються до readiness review;
- chart of accounts і money/credit invariants затверджені finance owner.

### Реалізація

- immutable double-entry ledger з integer minor units, currencies, accounts, journal entries і reconciliation references;
- append-only wallet projection; balance ніколи не є client-authoritative mutable field;
- idempotent payment intent/top-up, webhook verification, refund, dispute, reserve, payout і reconciliation workflows;
- KYC/KYB/tax status та capability gating без зберігання зайвих payment secrets;
- gift catalogue, ownership/availability, recipient eligibility, atomic debit-credit-platform fee та entitlement grant;
- subscription/premium entitlements, renewals, grace period, revocation і store receipt verification;
- fraud/risk rules, velocity limits, sanctions/vendor handoff, manual review і dual control;
- ledger-backed Wallet/Gifts/Monetization/Premium/Inventory UI;
- provider-specific mobile billing rules для digital goods і virtual currency.

### Exit criteria

- кожна monetary state transition сходиться до balanced journal entry;
- duplicate/reordered webhooks і client retries не подвоюють charge, gift, entitlement або payout;
- reconciliation пояснює кожну різницю між PSP, bank/store та internal ledger;
- refunds, disputes, expired entitlements і payout failures мають durable recovery path;
- finance/security sign-off та controlled live low-value transaction пройдені.

### Tests

- property tests: debit = credit, no negative balance where prohibited, immutable history;
- concurrency/serializability tests для simultaneous gifts і withdrawals;
- provider sandbox tests для payment, refund, dispute, payout, webhook signature та retry;
- mobile receipt verification і entitlement restore tests;
- reconciliation fixtures отримані з provider sandbox exports, не з UI constants;
- fraud/velocity/authorization tests, audit completeness і privileged dual-control e2e;
- failure injection між provider response, DB commit та outbox dispatch.

## Phase 4 — Media, live та studio

### Entry criteria

- identity, entitlements, social permissions і ledger hooks стабільні;
- визначені target regions, codecs, resolutions, latency classes, concurrency, recording/retention і content-rights policy;
- зовнішні live-platform capabilities перевірені з provider contracts, approvals, quotas і test channels;
- встановлені device performance, network і cost budgets.

### Реалізація

- direct/resumable uploads, media metadata, virus/content scan, transcode ladder, thumbnails, captions, storage lifecycle;
- playback authorization, signed manifests/URLs, CDN, watch history та QoE telemetry;
- live session control: stream keys, RTMPS/SRT/WHIP where approved, ingest health, reconnect, recording;
- transcode/packaging, low-latency delivery, regional failover, capacity admission і cost guardrails;
- real-time live chat, moderation, slow mode, bans, replay і backpressure;
- browser/native capture й permissions; studio scenes/sources, audio controls і recoverable session state;
- OBS WebSocket integration лише через authenticated local bridge/desktop boundary, без відкриття local control plane до Internet;
- multistream orchestration лише для providers, де current official capability та approval підтверджені;
- replace all Media/Live screens synthetic surfaces реальними playback/session states.

### Exit criteria

- upload → transcode → publish → playback проходить для supported formats/devices;
- start → reconnect → failover → stop → recording path має verified state machine;
- жоден stream key або provider token не потрапляє до logs/client bundle;
- measured startup time, rebuffer rate, glass-to-glass latency, dropped frames і moderation latency відповідають SLO;
- quota exhaustion, region loss, encoder disconnect і provider rejection мають bounded degradation;
- rights, retention і takedown workflows затверджені.

### Tests

- codec/container/device compatibility matrix;
- golden manifest, caption, thumbnail і metadata integration tests;
- network impairment tests: loss, jitter, bandwidth collapse, reconnect, mobile backgrounding;
- load/soak tests ingest, chat, presence, playback authorization і fan-out;
- regional failover та capacity rejection drills;
- OBS authentication/version negotiation і local-threat tests;
- end-to-end multistream tests на approved provider test channels;
- accessibility tests captions, keyboard playback і reduced motion.

### AAA CGI gifts

Code може керувати catalogue, entitlement, playback trigger і device fallback, але не може правдиво створити повну AAA CGI library сам по собі. Потрібен реальний asset-production pipeline:

- authored або належно licensed 3D models, textures, rigs, shaders, particles, typography, music і sound effects;
- art direction, concept/3D/VFX/technical artists, sound design, review та rights provenance;
- source asset versioning, DCC export, LODs, mesh/texture compression, shader variants і deterministic packaging;
- device-tier budgets для GPU/CPU, memory, thermal load, download size, frame time і battery;
- engine/runtime validation на representative iOS, Android, web і desktop hardware;
- accessibility/reduced-motion variants, photosensitivity review і graceful static fallback;
- moderation/brand-safety review та legal clearance.

Exit evidence для gift library — не кількість записів у catalogue, а approved assets, rights manifest, performance captures, device matrix і runtime validation.

## Phase 5 — AI platform

### Entry criteria

- production data classifications, consent, retention і authorization scopes визначені;
- media/social/ledger APIs мають tool-safe commands з dry-run/approval semantics;
- model provider review підтвердив credentials, region, quota, data terms і acceptable use;
- затверджені evaluation datasets із lawful provenance та risk taxonomy.

### Реалізація

- independently deployable model gateway: provider adapters, model/version registry, routing, timeout, retry, quota, spend budget;
- prompt/template versioning, input/output redaction, tenant isolation, data residency та retention controls;
- retrieval pipeline з provenance, document ACL filtering і citation binding;
- tool registry із schema validation, scoped authorization, idempotency, human approval та immutable audit;
- safety classifiers/rules, prompt-injection defenses, output policy і abuse response;
- offline/online evaluation, regression gates, hallucination/citation metrics і model rollback;
- streaming response protocol і unavailable/degraded states;
- Assistant та moderation recommendations на реальних authorized sources; AI ніколи не є sole authority для destructive action.

### Exit criteria

- кожна citation резолвиться до source, доступного поточному user;
- tool execution перевіряє policy на server і не покладається на client approval flag;
- provider outage/quota має fallback або чіткий unavailable state без fabricated answer;
- evaluations проходять затверджені quality/safety thresholds;
- prompt/model/tool version відновлюється з audit record;
- security/privacy/legal/model-risk sign-off отримано.

### Tests

- provider contract, timeout, retry, rate-limit і failover tests;
- retrieval ACL leakage, cross-tenant, deletion/retention tests;
- prompt injection, tool escalation, data exfiltration і indirect injection red-team suite;
- citation entailment/provenance й hallucination evaluations;
- cost/token budget, load і streaming cancellation tests;
- human-approval race/replay та destructive-action denial tests;
- model upgrade regression і rollback drill.

## Phase 6 — Commerce, learning, business та admin

### Entry criteria

- ledger/payments, identity/organizations, media, social і audit є production-capable;
- tax/licensing/refund/certificate/campaign/moderation policies затверджені;
- data warehouse/analytics event contracts стабільні.

### Реалізація

- marketplace catalogue, seller onboarding, versioned files, licenses, cart/order, tax, delivery, refund і reviews;
- courses: curriculum, enrollment, progress, assessment, certificate, instructor permissions;
- events: capacity, waitlist, registration, entitlement, reminders, attendance і cancellation/refund;
- business organizations, campaign budgets, creator contracts, attribution, approvals, invoicing і team roles;
- admin/moderation data з real services, policy versioning, evidence provenance, appeals, dual-control actions;
- operational dashboards із SLO-backed telemetry, а не hard-coded health;
- analytics ingestion, semantic metrics, lineage, late-event correction і role-filtered queries;
- feature flags із server-side evaluation, approval, rollout guardrail та audited rollback.

### Exit criteria

- buyer/seller/course/event/campaign/admin vertical flows завершуються durable outcomes;
- цифровий файл доступний лише законному entitlement holder і може бути відкликаний;
- tax/refund/license documents відтворюються з source records;
- moderation/admin action має policy version, evidence chain, actor і appeal path;
- dashboards узгоджуються з authoritative sources і показують freshness/quality.

### Tests

- order/entitlement/delivery/refund integration and concurrency tests;
- tax/location/store-policy matrix;
- enrollment/progress/certificate and event capacity race tests;
- organization role/approval/segregation-of-duties tests;
- moderation evidence integrity, appeal і policy migration tests;
- analytics reconciliation, late/duplicate event і metric lineage tests;
- admin destructive-action, audit immutability й accessibility e2e.

## Phase 7 — Flutter platforms

### Entry criteria

- API contracts стабільні й versioned;
- web vertical flows і observability мають production evidence;
- iOS/Android bundle IDs, developer accounts, signing, privacy manifests, push і store products доступні;
- mobile product scope, offline policy, deep links і minimum OS versions затверджені.

### Реалізація

- Flutter workspace з domain/API clients, secure token storage, design tokens і accessibility semantics;
- feature slices для identity, social/messaging, wallet/gifts, media/live, AI й commerce відповідно до rollout scope;
- platform plugins для camera/mic, backgrounding, media playback, secure storage, share/deep links, APNs/FCM;
- StoreKit/Google Play Billing receipt flow та entitlement sync;
- offline read cache лише для дозволених data classes; mutation queue з idempotency;
- crash/performance telemetry, remote config, staged rollout і rollback;
- tablet/phone adaptations; platform-native permission and recovery states.

### Exit criteria

- supported iOS/Android device matrix проходить core journeys;
- deep link, push, auth callback, purchase restore, background/resume і network recovery verified;
- secrets/tokens зберігаються platform-secure; rooted/jailbroken risk policy визначена;
- store review metadata/privacy disclosures відповідають фактичній поведінці;
- staged distribution, crash-free і performance gates пройдені до wider rollout.

### Tests

- Dart unit/widget tests і generated API contract compatibility;
- integration tests на real device farm для permissions, camera/mic, backgrounding і push;
- network loss/offline/retry/idempotency tests;
- StoreKit/Play Billing sandbox purchase, cancel, renew, revoke і restore;
- accessibility, localization, dynamic type, screen reader і reduced-motion matrix;
- cold start, frame timing, memory, battery/thermal і media QoE measurements.

## Phase 8 — Hardening та GO qualification

### Entry criteria

- усі capabilities запланованого release мають phase exit evidence;
- scope freeze, ownership, on-call, support і incident roles визначені;
- data inventory, vendors/subprocessors і legal basis актуальні.

### Реалізація

- formal threat model і abuse cases для identity, social, payments, live, AI, admin та mobile;
- SAST, dependency, secret, IaC, container й dynamic scanning у release gates;
- key/secret rotation, least privilege review, network segmentation, WAF/DDoS і egress controls;
- backups, point-in-time recovery, cross-region strategy, DR runbooks і restore drills;
- SLO dashboards, alerts, synthetic journeys, capacity model, autoscaling і cost budgets;
- privacy rights, retention deletion, legal hold, consent/version records і breach process;
- payment reconciliation, reserve/dispute procedures й finance close;
- content safety staffing, escalation, law-enforcement process, rights/takedown і appeals;
- release provenance, signed artifacts, SBOM, change approval, canary і rollback.

### Exit criteria

- `PRODUCTION_READINESS.md` GO conditions мають named owner та current evidence;
- критичні/high security findings закриті або formal risk-accepted уповноваженим owner;
- load/soak/failover/restore/incident exercises проходять SLO/RPO/RTO;
- external live, payment, email, OAuth, AI і push providers verified у production configuration;
- support/on-call/runbooks і rollback перевірені game day;
- compliance/legal/finance/security/operations/product sign-off задокументований.

### Tests

- independent penetration test і remediation retest;
- abuse/fraud/red-team exercises;
- peak + failover capacity, long soak і dependency degradation;
- backup restore, region evacuation, key rotation і provider failover drills;
- production synthetic journeys з low-risk controlled accounts;
- reconciliation, privacy export/delete і incident evidence exercises;
- canary rollback та observability completeness.

## Коли виправдані Kafka, Elasticsearch і Milvus

### Kafka

Початок: PostgreSQL transactional outbox, durable workers і idempotent consumers.

Kafka стає виправданою, коли вимірювання показують одночасну потребу в:

- багатьох незалежних consumer groups;
- великому sustained throughput і burst buffering;
- replay за тривалий період;
- partition ordering за account/stream/order;
- decoupling media telemetry, notifications, analytics, moderation і ledger projections;
- операційному володінні schema registry, partitions, retention, rebalancing і disaster recovery.

Вона не виправдана лише тому, що система має «events». Передчасне додавання створює dual-write ризик, schema evolution burden, lag/replay incidents та окремий security/operations plane.

### Elasticsearch

Початок: PostgreSQL full-text/trigram search із privacy-aware query filters.

Elasticsearch стає виправданим, коли production corpus і query evidence вимагають:

- складного relevance tuning, analyzers, multilingual morphology, synonyms/facets;
- search latency/throughput, яких не дає PostgreSQL у встановленому budget;
- незалежного scaling read/search workload;
- operational team для index lifecycle, mapping migrations, shard sizing, snapshots і reindex.

Search index є derived state. Потрібні outbox-driven indexing, delete/privacy propagation, freshness SLO та rebuild procedure. Без цього Elasticsearch розширює поверхню витоку даних.

### Milvus

Початок: немає vector store до доведеного retrieval use case; для bounded scale достатньо PostgreSQL + `pgvector` після окремого рішення.

Milvus стає виправданим, коли measured evaluation і scale вимагають:

- сотень мільйонів або більше embeddings;
- high-QPS approximate nearest-neighbor search;
- independent vector lifecycle/partitioning;
- hybrid retrieval, який не вкладається у latency/recall/cost budget простішого рішення;
- dedicated ownership для compaction, index build, backup, consistency, metadata ACL і deletion propagation.

Vector similarity не забезпечує authorization. ACL filter, tenant isolation, source deletion і citation provenance мають виконуватися незалежно від engine.

### Чому не слід одразу використовувати всі названі технології

Кожна нова datastore/broker додає:

- окрему consistency model, backup/restore і schema/index migration;
- credentials, network policy, encryption і vulnerability surface;
- capacity planning, monitoring, paging і on-call expertise;
- data deletion/retention propagation;
- failure modes між authoritative та derived state;
- vendor і infrastructure cost до появи підтвердженої користі.

Правило Stage 2: технологію додають після конкретного bottleneck/requirement, benchmark, failure analysis, owner і rollback plan — не за назвою в бажаному stack.
