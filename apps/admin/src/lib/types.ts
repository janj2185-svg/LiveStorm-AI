// Mirrors services/api/app/schemas.py, business_schemas.py, gift_schemas.py,
// owner_config_schemas.py, and social_schemas.py response shapes exactly.
// Nothing here should invent fields the FastAPI service does not return.

export type UserStatus = "pending" | "active" | "suspended" | "deleted";

export interface TokenBundle {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface LoginResponse {
  mfa_required: boolean;
  challenge_token?: string | null;
  tokens?: TokenBundle | null;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  phone_e164?: string | null;
  phone_verified_at?: string | null;
  status: UserStatus;
  email_verified_at: string | null;
  created_at: string;
  roles: string[];
}

export interface AdminProfile {
  handle: string | null;
  display_name: string | null;
  locale?: string | null;
  timezone?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  status: UserStatus;
  email_verified_at: string | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  roles: string[];
  profile: AdminProfile | null;
}

export interface AdminUserSession {
  id: string;
  device_label: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface AdminUserDetail extends AdminUser {
  sessions: AdminUserSession[];
  workspace_memberships: Array<{ workspace_id: string; role: string; status: string }>;
  administration_actions: Array<{
    id: string;
    action: string;
    reason: string;
    actor_user_id: string;
    created_at: string;
  }>;
}

export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
}

export type FlagEnvironment = "development" | "test" | "staging" | "production";

export interface FeatureFlag {
  id: string;
  key: string;
  environments: FlagEnvironment[];
  enabled: boolean;
  rollout_bps: number;
  allow_subjects: string[];
  deny_subjects: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  version: number;
  value: Record<string, unknown> | null;
  secret: boolean;
  configured: boolean;
  created_at: string;
}

export interface AdminAnalytics {
  users: Record<string, number>;
  content: { total: number; published: number };
  live: { total: number; active: number };
  orders: { total: number; paid_or_fulfilled: number; gross_minor: number };
  gifts: { total: number };
  ai_usage: {
    requests: number;
    prompt_units: number;
    completion_units: number;
    cost_micros: number;
  };
  moderation: { open_reports: number; decisions: number };
  basis: string;
}

export interface ServiceHealthReportItem {
  id: string;
  service: string;
  instance: string;
  status: string;
  checks: Record<string, unknown>;
  observed_at: string;
  received_at: string;
}

export interface ServiceHealthResponse {
  reports: ServiceHealthReportItem[];
  scope: string;
  prometheus_replacement: boolean;
}

export interface SecurityDashboard {
  sessions: { active: number; revoked: number; reuse_detected: number };
  security_events: {
    total: number;
    failed_or_suspicious: number;
    persisted_action_filter: string[];
  };
  account_statuses: Record<string, number>;
  integrations: Record<string, number>;
  moderation: { open: number; decisions: number };
  basis: string;
}

export interface ModerationSummary {
  queue: Record<string, number>;
  decisions: Record<string, number>;
}

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface TrustSafetyReport {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  evidence: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface GiftRefundResponse {
  refund_id: string;
  ledger_transaction_id: string;
  status: "refunded";
}

export type OwnerProfile = "development" | "test" | "staging" | "production";
export type OwnerStatus = "connected" | "missing" | "invalid" | "expired" | string;

export interface OwnerProviderSummary {
  key: string;
  name: string;
  category: string;
  description: string;
  status: OwnerStatus;
  enabled: boolean;
  feature_flag_key: string;
  environment: OwnerProfile;
  related_features: string[];
  supports_live_test: boolean;
  version: number | null;
  last_tested_at: string | null;
}

export interface OwnerCatalogResponse {
  domain: string;
  environment: OwnerProfile;
  providers: OwnerProviderSummary[];
  connected_count: number;
  missing_count: number;
  invalid_count: number;
  expired_count: number;
  required_providers: string[];
  recommended_providers: string[];
  deploy_ready: boolean;
}

export interface OwnerDeployReadiness {
  environment: OwnerProfile;
  ready: boolean;
  blocking: string[];
  warnings: string[];
  required: string[];
  recommended: string[];
  provider_statuses: Record<string, string>;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  request_id?: string | null;
  invalid_fields?: string[];
  [key: string]: unknown;
}
