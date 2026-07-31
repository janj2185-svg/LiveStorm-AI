import type { RuntimeManifest } from "@sylora/gift-runtime";

export type GiftLifecycle = "draft" | "review" | "published" | "retired";
export type GiftTier =
  | "simple"
  | "rare"
  | "epic"
  | "legendary"
  | "mythical"
  | "exclusive"
  | "seasonal"
  | "holiday"
  | "collectible"
  | "limited"
  | "vip"
  | "ultra_premium";
export type AssetPlatform = "universal" | "web" | "flutter" | "unity" | "unreal" | "source";
export type AssetQuality = "low" | "medium" | "high" | "source";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface GiftDefinition {
  id: string;
  author_user_id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string;
  price_minor: number;
  creator_revenue_share_bps: number;
  tier: GiftTier;
  state: GiftLifecycle;
  available_from: string | null;
  available_until: string | null;
  supply_cap: number | null;
  sold_count: number;
  per_user_limit: number | null;
  required_subscription_tier: string | null;
  minimum_level: number | null;
  required_achievement: string | null;
  required_event: string | null;
  search_tags: string[];
  locale_metadata: Record<string, string>;
}

export interface GiftVersion {
  id: string;
  gift_definition_id: string;
  version_number: number;
  state: GiftLifecycle;
  runtime_manifest: RuntimeManifest | null;
  created_by_id: string;
  submitted_by_id: string | null;
  reviewed_by_id: string | null;
  created_at: string;
  submitted_at: string | null;
  published_at: string | null;
  retired_at: string | null;
}

export interface CatalogRuntimeAsset {
  id: string;
  content_type: string;
  byte_size: number;
  sha256: string;
  platform: AssetPlatform;
  quality_tier: AssetQuality;
}

export interface CatalogRuntimePayload {
  gift_definition_id: string;
  gift_version_id: string;
  version_number: number;
  manifest: RuntimeManifest;
  assets: CatalogRuntimeAsset[];
}

export interface GiftAsset {
  id: string;
  gift_version_id: string;
  content_type: string;
  byte_size: number;
  sha256: string;
  platform: AssetPlatform;
  quality_tier: AssetQuality;
  state: "pending" | "verified" | "rejected";
  verified_at: string | null;
  rejection_code: string | null;
}

export interface UploadGrant {
  asset: GiftAsset;
  upload_url: string;
  required_headers: Record<string, string>;
  expires_in_seconds: number;
}

export interface ValidationResult {
  valid: boolean;
  checks: string[];
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  [key: string]: unknown;
}

export interface DefinitionDraft {
  category_id: string;
  slug: string;
  name: string;
  description: string;
  price_minor: number;
  creator_revenue_share_bps: number;
  tier: GiftTier;
  available_from: string | null;
  available_until: string | null;
  supply_cap: number | null;
  per_user_limit: number | null;
  required_subscription_tier: string | null;
  minimum_level: number | null;
  required_achievement: string | null;
  required_event: string | null;
  search_tags: string[];
  locale_metadata: Record<string, string>;
}
