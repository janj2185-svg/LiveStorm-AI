"""Catalog of owner-configurable third-party integrations.

Provider definitions live in code (fields, env mapping, setup instructions).
Secret values are never stored here — only in encrypted DB rows / runtime store.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


FieldKind = Literal["text", "password", "url", "email", "number", "json", "boolean", "textarea"]


@dataclass(frozen=True)
class OwnerFieldSpec:
    key: str
    label: str
    env_var: str
    secret: bool = False
    required: bool = True
    kind: FieldKind = "text"
    placeholder: str = ""
    help_text: str = ""
    default: str | None = None


@dataclass(frozen=True)
class OwnerProviderSpec:
    key: str
    name: str
    category: str
    description: str
    feature_flag_key: str
    fields: tuple[OwnerFieldSpec, ...]
    setup_instructions: tuple[str, ...]
    callback_urls: tuple[str, ...] = ()
    webhook_urls: tuple[str, ...] = ()
    dns_requirements: tuple[str, ...] = ()
    related_features: tuple[str, ...] = ()
    supports_live_test: bool = True
    aliases: tuple[str, ...] = ()


def _oauth_fields(provider: str, *, include_team_id: bool = False) -> tuple[OwnerFieldSpec, ...]:
    upper = provider.upper()
    fields: list[OwnerFieldSpec] = [
        OwnerFieldSpec(
            key="client_id",
            label="Client ID",
            env_var=f"OAUTH_{upper}_CLIENT_ID",
            required=True,
            placeholder=f"{provider}-client-id",
        ),
        OwnerFieldSpec(
            key="client_secret",
            label="Client Secret",
            env_var=f"OAUTH_{upper}_CLIENT_SECRET",
            secret=True,
            required=True,
            kind="password",
        ),
        OwnerFieldSpec(
            key="redirect_uri",
            label="Redirect URI",
            env_var=f"OAUTH_{upper}_REDIRECT_URI",
            required=True,
            kind="url",
            placeholder="https://getsylora.com/oauth/callback",
            help_text="Must exactly match the provider console callback URL.",
        ),
    ]
    if include_team_id:
        fields.append(
            OwnerFieldSpec(
                key="team_id",
                label="Apple Team ID",
                env_var=f"OAUTH_{upper}_TEAM_ID",
                required=False,
                help_text="Required for Sign in with Apple on native apps.",
            )
        )
        fields.append(
            OwnerFieldSpec(
                key="key_id",
                label="Apple Key ID",
                env_var=f"OAUTH_{upper}_KEY_ID",
                required=False,
            )
        )
        fields.append(
            OwnerFieldSpec(
                key="private_key",
                label="Apple Private Key (.p8)",
                env_var=f"OAUTH_{upper}_PRIVATE_KEY",
                secret=True,
                required=False,
                kind="textarea",
                help_text="Paste the full .p8 private key contents.",
            )
        )
    return tuple(fields)


OWNER_PROVIDERS: tuple[OwnerProviderSpec, ...] = (
    OwnerProviderSpec(
        key="openai",
        name="OpenAI",
        category="ai",
        description="Aura chat, embeddings, moderation, image, and voice (TTS).",
        feature_flag_key="integrations.openai",
        related_features=("Aura", "AI moderation", "Embeddings", "TTS"),
        fields=(
            OwnerFieldSpec(
                key="api_key",
                label="API Key",
                env_var="OPENAI_API_KEY",
                secret=True,
                kind="password",
                placeholder="sk-...",
            ),
            OwnerFieldSpec(
                key="base_url",
                label="Base URL",
                env_var="OPENAI_BASE_URL",
                required=False,
                kind="url",
                default="https://api.openai.com/v1",
                placeholder="https://api.openai.com/v1",
            ),
            OwnerFieldSpec(
                key="chat_model",
                label="Chat model",
                env_var="OPENAI_CHAT_MODEL",
                required=False,
                default="gpt-4o-mini",
            ),
            OwnerFieldSpec(
                key="embedding_model",
                label="Embedding model",
                env_var="OPENAI_EMBEDDING_MODEL",
                required=False,
                default="text-embedding-3-small",
            ),
        ),
        setup_instructions=(
            "Create an API key at https://platform.openai.com/api-keys",
            "Restrict the key to Models + Chat Completions + Embeddings + Moderations + Images + Audio",
            "Paste the key here and run Test Connection — secrets never leave the server",
            "After Connected, Aura and AI features unlock automatically",
        ),
    ),
    OwnerProviderSpec(
        key="smtp",
        name="SMTP / Resend",
        category="messaging",
        description="Transactional email (verification, password reset, notifications).",
        feature_flag_key="integrations.smtp",
        related_features=("Email verification", "Password reset", "Outbox delivery"),
        fields=(
            OwnerFieldSpec(
                key="host",
                label="SMTP host",
                env_var="SMTP_HOST",
                default="smtp.resend.com",
                placeholder="smtp.resend.com",
            ),
            OwnerFieldSpec(
                key="port",
                label="Port",
                env_var="SMTP_PORT",
                kind="number",
                default="587",
            ),
            OwnerFieldSpec(
                key="username",
                label="Username",
                env_var="SMTP_USERNAME",
                default="resend",
                help_text="For Resend use username `resend`.",
            ),
            OwnerFieldSpec(
                key="password",
                label="Password / API key",
                env_var="SMTP_PASSWORD",
                secret=True,
                kind="password",
                placeholder="re_...",
            ),
            OwnerFieldSpec(
                key="from_email",
                label="From email",
                env_var="SMTP_FROM_EMAIL",
                kind="email",
                placeholder="noreply@getsylora.com",
            ),
            OwnerFieldSpec(
                key="from_name",
                label="From name",
                env_var="SMTP_FROM_NAME",
                required=False,
                default="SYLORA",
            ),
            OwnerFieldSpec(
                key="start_tls",
                label="STARTTLS",
                env_var="SMTP_START_TLS",
                kind="boolean",
                required=False,
                default="true",
            ),
        ),
        setup_instructions=(
            "Create a Resend API key at https://resend.com/api-keys (Sending access)",
            "Add and verify your domain at https://resend.com/domains",
            "Publish SPF, DKIM, and (recommended) DMARC DNS records Resend shows",
            "Use SMTP host smtp.resend.com, port 587, username resend, password = API key",
            "From address must use the verified domain (e.g. noreply@getsylora.com)",
        ),
        dns_requirements=(
            "SPF TXT for your sending domain",
            "DKIM CNAME/TXT records from Resend",
            "Optional DMARC TXT (_dmarc.yourdomain)",
        ),
    ),
    OwnerProviderSpec(
        key="stripe",
        name="Stripe",
        category="payments",
        description="Wallet top-ups, marketplace checkout, creator payouts.",
        feature_flag_key="integrations.stripe",
        related_features=("Wallet top-up", "Marketplace checkout", "Creator payouts"),
        fields=(
            OwnerFieldSpec(
                key="secret_key",
                label="Secret key",
                env_var="STRIPE_SECRET_KEY",
                secret=True,
                kind="password",
                placeholder="sk_live_... or sk_test_...",
            ),
            OwnerFieldSpec(
                key="publishable_key",
                label="Publishable key",
                env_var="STRIPE_PUBLISHABLE_KEY",
                required=False,
                placeholder="pk_live_... or pk_test_...",
                help_text="Safe to expose to clients; still stored server-side for admin visibility.",
            ),
            OwnerFieldSpec(
                key="webhook_secret",
                label="Webhook signing secret",
                env_var="STRIPE_WEBHOOK_SECRET",
                secret=True,
                kind="password",
                placeholder="whsec_...",
            ),
            OwnerFieldSpec(
                key="payment_provider",
                label="Payment provider flag",
                env_var="PAYMENT_PROVIDER",
                required=False,
                default="stripe",
            ),
        ),
        setup_instructions=(
            "Create a Stripe account and copy Secret + Publishable keys",
            "Create a webhook endpoint pointing to the URL shown below",
            "Subscribe to: checkout.session.completed, payment_intent.succeeded,"
            " charge.refunded, payout.paid, account.updated",
            "Paste the webhook signing secret (whsec_...) here",
            "Use live keys only on production; test keys are for staging",
        ),
        webhook_urls=("https://{domain}/v1/payments/webhooks/stripe",),
    ),
    OwnerProviderSpec(
        key="s3",
        name="Cloudflare R2 / Amazon S3",
        category="storage",
        description="Object storage for media, gifts, backups, and uploads.",
        feature_flag_key="integrations.s3",
        related_features=("Media uploads", "Gift assets", "Backups"),
        fields=(
            OwnerFieldSpec(
                key="endpoint_url",
                label="Endpoint URL",
                env_var="S3_ENDPOINT_URL",
                kind="url",
                placeholder="https://ACCOUNT_ID.r2.cloudflarestorage.com",
            ),
            OwnerFieldSpec(
                key="bucket",
                label="Bucket",
                env_var="S3_BUCKET",
                placeholder="sylora-app",
            ),
            OwnerFieldSpec(
                key="region",
                label="Region",
                env_var="S3_REGION",
                required=False,
                default="auto",
            ),
            OwnerFieldSpec(
                key="access_key_id",
                label="Access key ID",
                env_var="S3_ACCESS_KEY_ID",
                secret=True,
                kind="password",
            ),
            OwnerFieldSpec(
                key="secret_access_key",
                label="Secret access key",
                env_var="S3_SECRET_ACCESS_KEY",
                secret=True,
                kind="password",
            ),
            OwnerFieldSpec(
                key="presign_seconds",
                label="Presign TTL (seconds)",
                env_var="S3_PRESIGN_SECONDS",
                kind="number",
                required=False,
                default="900",
            ),
        ),
        setup_instructions=(
            "Cloudflare: R2 → Create bucket → Manage R2 API Tokens",
            "Grant Object Read & Write on the app bucket (and backups bucket if separate)",
            "Endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
            "Region can be `auto` for R2",
            "AWS S3: use the regional endpoint and IAM user with s3:PutObject/GetObject/ListBucket",
        ),
    ),
    OwnerProviderSpec(
        key="fcm",
        name="Firebase Cloud Messaging",
        category="push",
        description="Mobile and web push notifications.",
        feature_flag_key="integrations.fcm",
        related_features=("Push notifications", "Call ringing", "Live alerts"),
        fields=(
            OwnerFieldSpec(
                key="project_id",
                label="Firebase project ID",
                env_var="FCM_PROJECT_ID",
                placeholder="sylora-prod",
            ),
            OwnerFieldSpec(
                key="service_account_json",
                label="Service account JSON",
                env_var="FCM_SERVICE_ACCOUNT_JSON",
                secret=True,
                kind="json",
                help_text="Paste the full Firebase Admin SDK service account JSON.",
            ),
            OwnerFieldSpec(
                key="push_enabled",
                label="Enable push",
                env_var="PUSH_ENABLED",
                kind="boolean",
                required=False,
                default="true",
            ),
        ),
        setup_instructions=(
            "Firebase Console → Project settings → Service accounts → Generate new private key",
            "Enable Cloud Messaging API in Google Cloud for the same project",
            "Add Android/iOS/Web apps and download google-services / GoogleService-Info as needed",
            "Paste project_id and the full service account JSON here (never commit it)",
        ),
    ),
    OwnerProviderSpec(
        key="google_oauth",
        name="Google OAuth",
        category="oauth",
        description="Sign in with Google for consumers and creators.",
        feature_flag_key="integrations.oauth.google",
        related_features=("Social login",),
        fields=_oauth_fields("google"),
        setup_instructions=(
            "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs",
            "Application type: Web application",
            "Authorized redirect URIs must include the callback URL below exactly",
            "Enable Google Identity / People API as required by your consent screen",
        ),
        callback_urls=("https://{domain}/v1/auth/oauth/google/callback",),
    ),
    OwnerProviderSpec(
        key="apple_oauth",
        name="Apple OAuth",
        category="oauth",
        description="Sign in with Apple.",
        feature_flag_key="integrations.oauth.apple",
        related_features=("Social login",),
        fields=_oauth_fields("apple", include_team_id=True),
        setup_instructions=(
            "Apple Developer → Certificates, Identifiers & Profiles → Services ID",
            "Enable Sign in with Apple and configure domains + return URLs",
            "Create a Key with Sign in with Apple, download .p8 once",
            "Fill Team ID, Key ID, and private key for native flows",
        ),
        callback_urls=("https://{domain}/v1/auth/oauth/apple/callback",),
    ),
    OwnerProviderSpec(
        key="facebook_oauth",
        name="Facebook OAuth",
        category="oauth",
        description="Sign in with Facebook / Meta.",
        feature_flag_key="integrations.oauth.facebook",
        related_features=("Social login",),
        fields=_oauth_fields("facebook"),
        setup_instructions=(
            "Meta for Developers → My Apps → Create App → Consumer",
            "Add Facebook Login product and set Valid OAuth Redirect URIs",
            "Copy App ID (client_id) and App Secret (client_secret)",
            "Submit for App Review if requesting public permissions beyond email",
        ),
        callback_urls=("https://{domain}/v1/auth/oauth/facebook/callback",),
    ),
    OwnerProviderSpec(
        key="tiktok_oauth",
        name="TikTok OAuth",
        category="oauth",
        description="Sign in with TikTok (Login Kit).",
        feature_flag_key="integrations.oauth.tiktok",
        related_features=("Social login",),
        fields=_oauth_fields("tiktok"),
        setup_instructions=(
            "TikTok Developers → Create an app with Login Kit",
            "Add redirect URI exactly as shown below",
            "Copy Client Key and Client Secret",
            "Live streaming to TikTok requires a separately approved provider — not this OAuth login",
        ),
        callback_urls=("https://{domain}/v1/auth/oauth/tiktok/callback",),
    ),
    OwnerProviderSpec(
        key="sentry",
        name="Sentry",
        category="observability",
        description="Error tracking and performance monitoring.",
        feature_flag_key="integrations.sentry",
        related_features=("Crash reporting", "Performance traces"),
        fields=(
            OwnerFieldSpec(
                key="dsn",
                label="DSN",
                env_var="SENTRY_DSN",
                secret=True,
                kind="url",
                placeholder="https://...@o....ingest.sentry.io/...",
            ),
            OwnerFieldSpec(
                key="environment",
                label="Environment label",
                env_var="SENTRY_ENVIRONMENT",
                required=False,
                default="production",
            ),
            OwnerFieldSpec(
                key="traces_sample_rate",
                label="Traces sample rate",
                env_var="SENTRY_TRACES_SAMPLE_RATE",
                kind="number",
                required=False,
                default="0.1",
            ),
        ),
        setup_instructions=(
            "Sentry → Projects → Client Keys (DSN)",
            "Create separate projects for API and Flutter if desired",
            "Paste the DSN here; sample rate 0.1 is a good production start",
        ),
    ),
    OwnerProviderSpec(
        key="translation",
        name="Translation provider",
        category="ai",
        description="Live / call AI translation (DeepL or OpenAI-compatible).",
        feature_flag_key="integrations.translation",
        related_features=("Call AI translation", "Live captions"),
        fields=(
            OwnerFieldSpec(
                key="provider",
                label="Provider",
                env_var="TRANSLATION_PROVIDER",
                default="deepl",
                placeholder="deepl | openai",
            ),
            OwnerFieldSpec(
                key="api_key",
                label="API key",
                env_var="TRANSLATION_API_KEY",
                secret=True,
                kind="password",
            ),
            OwnerFieldSpec(
                key="base_url",
                label="API base URL",
                env_var="TRANSLATION_BASE_URL",
                required=False,
                kind="url",
                default="https://api-free.deepl.com",
                help_text="DeepL Free: api-free.deepl.com — Pro: api.deepl.com",
            ),
        ),
        setup_instructions=(
            "DeepL: create an API key at https://www.deepl.com/pro-api",
            "Or set provider=openai and reuse an OpenAI key dedicated to translation",
            "Enable after Test Connection succeeds to unlock call translation controls",
        ),
    ),
    OwnerProviderSpec(
        key="speech_to_text",
        name="Speech-to-Text",
        category="media",
        description="Transcription for calls, voice rooms, and content.",
        feature_flag_key="integrations.stt",
        related_features=("Call captions", "Voice notes transcription"),
        fields=(
            OwnerFieldSpec(
                key="provider",
                label="Provider",
                env_var="STT_PROVIDER",
                default="openai",
                placeholder="openai | deepgram",
            ),
            OwnerFieldSpec(
                key="api_key",
                label="API key",
                env_var="STT_API_KEY",
                secret=True,
                kind="password",
            ),
            OwnerFieldSpec(
                key="base_url",
                label="Base URL",
                env_var="STT_BASE_URL",
                required=False,
                kind="url",
                default="https://api.openai.com/v1",
            ),
            OwnerFieldSpec(
                key="model",
                label="Model",
                env_var="STT_MODEL",
                required=False,
                default="whisper-1",
            ),
        ),
        setup_instructions=(
            "OpenAI Whisper: use an OpenAI secret key with Audio permissions",
            "Deepgram: create a key at https://console.deepgram.com",
            "Test Connection verifies the credential against the provider API",
        ),
    ),
    OwnerProviderSpec(
        key="text_to_speech",
        name="Text-to-Speech",
        category="media",
        description="Aura voice and announcement synthesis.",
        feature_flag_key="integrations.tts",
        related_features=("Aura voice", "Accessibility read-aloud"),
        fields=(
            OwnerFieldSpec(
                key="provider",
                label="Provider",
                env_var="TTS_PROVIDER",
                default="openai",
                placeholder="openai | elevenlabs",
            ),
            OwnerFieldSpec(
                key="api_key",
                label="API key",
                env_var="TTS_API_KEY",
                secret=True,
                kind="password",
            ),
            OwnerFieldSpec(
                key="base_url",
                label="Base URL",
                env_var="TTS_BASE_URL",
                required=False,
                kind="url",
                default="https://api.openai.com/v1",
            ),
            OwnerFieldSpec(
                key="model",
                label="Model / voice engine",
                env_var="TTS_MODEL",
                required=False,
                default="gpt-4o-mini-tts",
            ),
            OwnerFieldSpec(
                key="default_voice",
                label="Default voice",
                env_var="TTS_DEFAULT_VOICE",
                required=False,
                default="alloy",
            ),
        ),
        setup_instructions=(
            "OpenAI: enable Audio / TTS on the API key",
            "ElevenLabs: create a key at https://elevenlabs.io/app/settings/api-keys",
            "After Connected, Aura voice jobs use this provider",
        ),
    ),
    OwnerProviderSpec(
        key="maps",
        name="Maps",
        category="maps",
        description="Maps and geocoding (Mapbox or Google Maps).",
        feature_flag_key="integrations.maps",
        related_features=("Event locations", "Creator meetup maps"),
        fields=(
            OwnerFieldSpec(
                key="provider",
                label="Provider",
                env_var="MAPS_PROVIDER",
                default="mapbox",
                placeholder="mapbox | google",
            ),
            OwnerFieldSpec(
                key="api_key",
                label="API key / access token",
                env_var="MAPS_API_KEY",
                secret=True,
                kind="password",
            ),
        ),
        setup_instructions=(
            "Mapbox: https://account.mapbox.com/access-tokens/",
            "Google Maps: enable Maps SDK + Geocoding API, create an API key with HTTP referrer restrictions",
            "Never ship unrestricted browser keys without domain/app restrictions",
        ),
    ),
    OwnerProviderSpec(
        key="analytics",
        name="Analytics",
        category="analytics",
        description="Optional product analytics (PostHog / Plausible / GA4).",
        feature_flag_key="integrations.analytics",
        related_features=("Product analytics",),
        fields=(
            OwnerFieldSpec(
                key="provider",
                label="Provider",
                env_var="ANALYTICS_PROVIDER",
                default="posthog",
                placeholder="posthog | plausible | ga4",
            ),
            OwnerFieldSpec(
                key="api_key",
                label="API key / measurement ID",
                env_var="ANALYTICS_API_KEY",
                secret=True,
                kind="password",
                required=False,
            ),
            OwnerFieldSpec(
                key="host",
                label="Ingest host",
                env_var="ANALYTICS_HOST",
                required=False,
                kind="url",
                placeholder="https://eu.i.posthog.com",
            ),
        ),
        setup_instructions=(
            "PostHog: Project → Project API Key (+ optional self-hosted host)",
            "Plausible: use domain + shared link token if enabling server-side",
            "GA4: Measurement ID is public; Measurement Protocol secret stays server-side",
            "First-party /admin/analytics always works without this provider",
        ),
        supports_live_test=True,
    ),
    OwnerProviderSpec(
        key="custom",
        name="Custom integration",
        category="custom",
        description="Future third-party integration — store encrypted credentials generically.",
        feature_flag_key="integrations.custom",
        related_features=("Extensibility",),
        fields=(
            OwnerFieldSpec(
                key="integration_name",
                label="Integration name",
                env_var="CUSTOM_INTEGRATION_NAME",
                placeholder="my-vendor",
            ),
            OwnerFieldSpec(
                key="api_key",
                label="API key",
                env_var="CUSTOM_INTEGRATION_API_KEY",
                secret=True,
                kind="password",
                required=False,
            ),
            OwnerFieldSpec(
                key="base_url",
                label="Base URL",
                env_var="CUSTOM_INTEGRATION_BASE_URL",
                required=False,
                kind="url",
            ),
            OwnerFieldSpec(
                key="extra_json",
                label="Extra config (JSON)",
                env_var="CUSTOM_INTEGRATION_EXTRA_JSON",
                required=False,
                kind="json",
                secret=False,
                help_text="Non-secret structured config for a future adapter.",
            ),
        ),
        setup_instructions=(
            "Use this slot for a vendor not yet listed",
            "After the adapter ships, map these fields in code without rotating secrets",
            "Test Connection performs format checks; live vendor tests require a dedicated adapter",
        ),
        supports_live_test=False,
    ),
)


PROVIDER_BY_KEY: dict[str, OwnerProviderSpec] = {item.key: item for item in OWNER_PROVIDERS}


def get_provider_spec(key: str) -> OwnerProviderSpec | None:
    return PROVIDER_BY_KEY.get(key.strip().lower())


def all_env_var_names() -> list[str]:
    names: list[str] = []
    for provider in OWNER_PROVIDERS:
        for field_spec in provider.fields:
            if field_spec.env_var not in names:
                names.append(field_spec.env_var)
    return names
