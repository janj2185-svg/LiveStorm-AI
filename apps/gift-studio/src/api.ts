import {
  CatalogRuntimeResponseSchema,
  parseRuntimeManifest,
  referencedAssetIds,
  type RuntimeManifest
} from "@sylora/gift-runtime";
import { z } from "zod";
import type {
  CatalogRuntimePayload,
  Category,
  DefinitionDraft,
  GiftAsset,
  GiftDefinition,
  GiftVersion,
  ProblemDetails,
  UploadGrant,
  ValidationResult
} from "./types";

const LifecycleSchema = z.enum(["draft", "review", "published", "retired"]);
const TierSchema = z.enum([
  "simple", "rare", "epic", "legendary", "mythical", "exclusive",
  "seasonal", "holiday", "collectible", "limited", "vip", "ultra_premium"
]);
const PlatformSchema = z.enum(["universal", "web", "flutter", "unity", "unreal", "source"]);
const QualitySchema = z.enum(["low", "medium", "high", "source"]);

const CategorySchema = z.strictObject({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable()
});

const DefinitionSchema = z.strictObject({
  id: z.uuid(),
  author_user_id: z.uuid(),
  category_id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  price_minor: z.number().int(),
  creator_revenue_share_bps: z.number().int(),
  tier: TierSchema,
  state: LifecycleSchema,
  available_from: z.string().nullable(),
  available_until: z.string().nullable(),
  supply_cap: z.number().int().nullable(),
  sold_count: z.number().int(),
  per_user_limit: z.number().int().nullable(),
  required_subscription_tier: z.string().nullable(),
  minimum_level: z.number().int().nullable(),
  required_achievement: z.string().nullable(),
  required_event: z.string().nullable(),
  search_tags: z.array(z.string()),
  locale_metadata: z.record(z.string(), z.string())
});

const RawVersionSchema = z.strictObject({
  id: z.uuid(),
  gift_definition_id: z.uuid(),
  version_number: z.number().int().positive(),
  state: LifecycleSchema,
  runtime_manifest: z.unknown(),
  created_by_id: z.uuid(),
  submitted_by_id: z.uuid().nullable(),
  reviewed_by_id: z.uuid().nullable(),
  created_at: z.string(),
  submitted_at: z.string().nullable(),
  published_at: z.string().nullable(),
  retired_at: z.string().nullable()
});

const AssetSchema = z.strictObject({
  id: z.uuid(),
  gift_version_id: z.uuid(),
  content_type: z.string(),
  byte_size: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  platform: PlatformSchema,
  quality_tier: QualitySchema,
  state: z.enum(["pending", "verified", "rejected"]),
  verified_at: z.string().nullable(),
  rejection_code: z.string().nullable()
});

const UploadGrantSchema = z.strictObject({
  asset: AssetSchema,
  upload_url: z.url(),
  required_headers: z.record(z.string(), z.string()),
  expires_in_seconds: z.number().int().positive()
});

const SignedDownloadSchema = z.strictObject({
  download_url: z.url(),
  expires_in_seconds: z.number().int().positive()
});

const ValidationSchema = z.strictObject({
  valid: z.boolean(),
  checks: z.array(z.string())
});

function parseVersion(value: unknown): GiftVersion {
  const raw = RawVersionSchema.parse(value);
  const empty = raw.runtime_manifest !== null &&
    typeof raw.runtime_manifest === "object" &&
    !Array.isArray(raw.runtime_manifest) &&
    Object.keys(raw.runtime_manifest).length === 0;
  return {
    ...raw,
    runtime_manifest: empty ? null : parseRuntimeManifest(raw.runtime_manifest)
  };
}

export class MemoryToken {
  #value: string | undefined;

  set(value: string): void {
    this.#value = value;
  }

  get(): string | undefined {
    return this.#value;
  }

  clear(): void {
    this.#value = undefined;
  }
}

export class ApiProblem extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = "ApiProblem";
  }
}

export interface ApiResponse<T> {
  data: T;
  etag?: string;
}

function apiOrigin(value: string): string {
  const url = new URL(value);
  const localhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(localhost && url.protocol === "http:")) {
    throw new Error("API base must use HTTPS (HTTP is allowed only for local development)");
  }
  if (url.username || url.password || url.hash) throw new Error("API base cannot include credentials or a fragment");
  return url.origin;
}

function optionalHeader(value: string | null): string | undefined {
  return value || undefined;
}

export class GiftApiClient {
  readonly #base: string;
  readonly #token: MemoryToken;
  readonly #fetcher: typeof fetch;

  constructor(apiBase: string, token: MemoryToken, fetcher: typeof fetch = fetch) {
    this.#base = apiOrigin(apiBase);
    this.#token = token;
    this.#fetcher = fetcher;
  }

  get base(): string {
    return this.#base;
  }

  async categories(): Promise<Category[]> {
    return z.array(CategorySchema).parse(
      (await this.#request<unknown>("/v1/gifts/author/categories")).data
    );
  }

  async definitions(state?: GiftDefinition["state"], limit = 100): Promise<GiftDefinition[]> {
    const query = new URLSearchParams({ limit: String(Math.max(1, Math.min(200, limit))) });
    if (state) query.set("state", state);
    return z.array(DefinitionSchema).parse(
      (await this.#request<unknown>(`/v1/gifts/author/definitions?${query}`)).data
    );
  }

  async definition(definitionId: string): Promise<GiftDefinition> {
    return DefinitionSchema.parse(
      (await this.#request<unknown>(
        `/v1/gifts/author/definitions/${encodeURIComponent(definitionId)}`
      )).data
    );
  }

  async versions(definitionId: string): Promise<GiftVersion[]> {
    const values = z.array(z.unknown()).parse(
      (await this.#request<unknown>(
        `/v1/gifts/author/definitions/${encodeURIComponent(definitionId)}/versions`
      )).data
    );
    return values.map(parseVersion);
  }

  async version(versionId: string): Promise<ApiResponse<GiftVersion>> {
    const response = await this.#request<unknown>(
      `/v1/gifts/author/versions/${encodeURIComponent(versionId)}`
    );
    return response.etag
      ? { data: parseVersion(response.data), etag: response.etag }
      : { data: parseVersion(response.data) };
  }

  async assets(versionId: string): Promise<GiftAsset[]> {
    return z.array(AssetSchema).parse(
      (await this.#request<unknown>(
        `/v1/gifts/author/versions/${encodeURIComponent(versionId)}/assets`
      )).data
    );
  }

  async createCategory(payload: { slug: string; name: string; description: string | null }): Promise<Category> {
    return CategorySchema.parse(
      (await this.#request<unknown>("/v1/gifts/author/categories", { method: "POST", body: payload })).data
    );
  }

  async createDefinition(payload: DefinitionDraft): Promise<GiftDefinition> {
    return DefinitionSchema.parse((await this.#request<unknown>("/v1/gifts/author/definitions", {
      method: "POST",
      body: payload
    })).data);
  }

  async createVersion(definitionId: string): Promise<ApiResponse<GiftVersion>> {
    const response = await this.#request<unknown>(
      `/v1/gifts/author/definitions/${encodeURIComponent(definitionId)}/versions`,
      {
      method: "POST",
        body: {}
      }
    );
    const data = parseVersion(response.data);
    return response.etag ? { data, etag: response.etag } : { data };
  }

  async patchManifest(versionId: string, manifest: RuntimeManifest, etag?: string): Promise<ApiResponse<GiftVersion>> {
    const response = await this.#request<unknown>(`/v1/gifts/author/versions/${encodeURIComponent(versionId)}/manifest`, {
      method: "PATCH",
      body: { manifest },
      ...(etag ? { etag } : {})
    });
    const data = parseVersion(response.data);
    return response.etag ? { data, etag: response.etag } : { data };
  }

  async requestUpload(
    versionId: string,
    payload: {
      content_type: string;
      byte_size: number;
      sha256: string;
      platform: string;
      quality_tier: string;
      filename_extension: string;
    }
  ): Promise<UploadGrant> {
    return UploadGrantSchema.parse((await this.#request<unknown>(
      `/v1/gifts/author/versions/${encodeURIComponent(versionId)}/assets/upload`,
      { method: "POST", body: payload }
    )).data);
  }

  async putUpload(grant: UploadGrant, file: File, signal?: AbortSignal): Promise<void> {
    const response = await this.#fetcher(grant.upload_url, {
      method: "PUT",
      headers: grant.required_headers,
      body: file,
      credentials: "omit",
      redirect: "error",
      signal: signal ?? null
    });
    if (!response.ok) throw new Error(`Signed asset upload failed with HTTP ${response.status}`);
  }

  async completeUpload(assetId: string): Promise<GiftAsset> {
    return AssetSchema.parse((await this.#request<unknown>(
      `/v1/gifts/author/assets/${encodeURIComponent(assetId)}/complete`,
      { method: "POST" }
    )).data);
  }

  async assetDownload(assetId: string): Promise<{ download_url: string; expires_in_seconds: number }> {
    return SignedDownloadSchema.parse((await this.#request<unknown>(
      `/v1/gifts/assets/${encodeURIComponent(assetId)}/download`
    )).data);
  }

  async catalogRuntime(slug: string): Promise<CatalogRuntimePayload> {
    const parsed = CatalogRuntimeResponseSchema.parse((await this.#request<unknown>(
      `/v1/gifts/catalog/${encodeURIComponent(slug)}/runtime`
    )).data);
    const manifest = parseRuntimeManifest(parsed.manifest);
    const expected = referencedAssetIds(manifest);
    const actual = new Set(parsed.assets.map((asset) => asset.id));
    if (
      actual.size !== parsed.assets.length ||
      expected.size !== actual.size ||
      [...expected].some((assetId) => !actual.has(assetId))
    ) {
      throw new Error("Catalog runtime assets do not exactly match manifest references");
    }
    return {
      ...parsed,
      manifest
    };
  }

  async submit(versionId: string): Promise<GiftVersion> {
    return parseVersion((await this.#request<unknown>(
      `/v1/gifts/author/versions/${encodeURIComponent(versionId)}/submit`,
      { method: "POST" }
    )).data);
  }

  async validate(versionId: string): Promise<ValidationResult> {
    return ValidationSchema.parse((await this.#request<unknown>(
      `/v1/gifts/review/versions/${encodeURIComponent(versionId)}/validate`,
      { method: "POST" }
    )).data);
  }

  async publish(versionId: string): Promise<GiftVersion> {
    return parseVersion((await this.#request<unknown>(
      `/v1/gifts/review/versions/${encodeURIComponent(versionId)}/publish`,
      { method: "POST" }
    )).data);
  }

  async retire(versionId: string): Promise<GiftVersion> {
    return parseVersion((await this.#request<unknown>(
      `/v1/gifts/review/versions/${encodeURIComponent(versionId)}/retire`,
      { method: "POST" }
    )).data);
  }

  async emergencyRetire(versionId: string): Promise<GiftVersion> {
    return parseVersion((await this.#request<unknown>(
      `/v1/gifts/moderation/versions/${encodeURIComponent(versionId)}/emergency-retire`,
      { method: "POST" }
    )).data);
  }

  async #request<T>(
    path: string,
    options: { method?: string; body?: unknown; etag?: string } = {}
  ): Promise<ApiResponse<T>> {
    const token = this.#token.get();
    if (!token) throw new ApiProblem({
      title: "Authentication required",
      status: 401,
      detail: "The in-memory session token is unavailable.",
      code: "session_unavailable"
    });
    const response = await this.#fetcher(`${this.#base}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.etag ? { "If-Match": options.etag } : {})
      },
      credentials: "omit",
      cache: "no-store",
      body: options.body === undefined ? null : JSON.stringify(options.body)
    });
    if (!response.ok) throw new ApiProblem(await this.#problem(response));
    const data = await response.json() as T;
    const etag = optionalHeader(response.headers.get("ETag"));
    return etag ? { data, etag } : { data };
  }

  async #problem(response: Response): Promise<ProblemDetails> {
    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/problem+json") || contentType.includes("application/json")) {
      try {
        const body = await response.json() as Partial<ProblemDetails>;
        return {
          ...body,
          title: body.title ?? "API request failed",
          status: body.status ?? response.status,
          detail: body.detail ?? `The API returned HTTP ${response.status}.`
        };
      } catch {
        // Fall through to a safe generic problem.
      }
    }
    return {
      title: "API request failed",
      status: response.status,
      detail: `The API returned HTTP ${response.status}.`,
      code: "unexpected_api_response"
    };
  }
}
