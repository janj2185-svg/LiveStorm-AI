import { z } from "zod";
import { type AssetDescriptor } from "./asset-loader";
import { RuntimeManifestSchema, type RuntimeManifest } from "./schema";
import { parseRuntimeManifest, referencedAssetIds } from "./validation";

export const CatalogRuntimeAssetSchema = z.strictObject({
  id: z.uuid(),
  content_type: z.string().min(3).max(128).regex(/^(application|audio|image|model|video)\/[A-Za-z0-9.+-]+$/),
  byte_size: z.number().int().positive().max(104_857_600),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  platform: z.enum(["universal", "web", "flutter", "unity", "unreal", "source"]),
  quality_tier: z.enum(["low", "medium", "high", "source"])
});

export const CatalogRuntimeResponseSchema = z.strictObject({
  gift_definition_id: z.uuid(),
  gift_version_id: z.uuid(),
  version_number: z.number().int().positive(),
  manifest: RuntimeManifestSchema,
  assets: z.array(CatalogRuntimeAssetSchema)
});

const SignedDownloadSchema = z.strictObject({
  download_url: z.url(),
  expires_in_seconds: z.number().int().positive().max(86_400)
});

export type CatalogRuntimeAsset = z.infer<typeof CatalogRuntimeAssetSchema>;

export interface CatalogRuntime {
  giftDefinitionId: string;
  giftVersionId: string;
  versionNumber: number;
  manifest: RuntimeManifest;
  assets: readonly CatalogRuntimeAsset[];
}

export interface CatalogRuntimeBundle extends CatalogRuntime {
  assetDescriptors: ReadonlyMap<string, AssetDescriptor>;
}

export interface CatalogRuntimeClientOptions {
  apiBase: string;
  token: () => string | undefined | Promise<string | undefined>;
  fetcher?: typeof fetch;
}

export class CatalogRuntimeClient {
  readonly #base: URL;
  readonly #token: CatalogRuntimeClientOptions["token"];
  readonly #fetcher: typeof fetch;

  constructor(options: CatalogRuntimeClientOptions) {
    this.#base = new URL(options.apiBase);
    this.#token = options.token;
    this.#fetcher = options.fetcher ?? fetch;
  }

  async load(slug: string, signal?: AbortSignal): Promise<CatalogRuntime> {
    if (!slug.trim()) throw new Error("Catalog gift slug is required");
    const response = await this.#authorized(
      `/v1/gifts/catalog/${encodeURIComponent(slug)}/runtime`,
      { signal: signal ?? null }
    );
    const parsed = CatalogRuntimeResponseSchema.parse(await response.json());
    const manifest = parseRuntimeManifest(parsed.manifest);
    const required = referencedAssetIds(manifest);
    const provided = new Set(parsed.assets.map((asset) => asset.id));
    if (
      provided.size !== parsed.assets.length ||
      required.size !== provided.size ||
      [...required].some((assetId) => !provided.has(assetId))
    ) {
      throw new Error("Catalog runtime asset metadata does not exactly match manifest asset references");
    }
    return {
      giftDefinitionId: parsed.gift_definition_id,
      giftVersionId: parsed.gift_version_id,
      versionNumber: parsed.version_number,
      manifest,
      assets: parsed.assets
    };
  }

  async resolveAssetDescriptors(
    runtime: CatalogRuntime,
    signal?: AbortSignal
  ): Promise<ReadonlyMap<string, AssetDescriptor>> {
    const entries = await Promise.all(runtime.assets.map(async (asset) => {
      const issuedAtMs = Date.now();
      const response = await this.#authorized(
        `/v1/gifts/assets/${encodeURIComponent(asset.id)}/download`,
        { signal: signal ?? null }
      );
      const signed = SignedDownloadSchema.parse(await response.json());
      const descriptor: AssetDescriptor = {
        assetId: asset.id,
        url: signed.download_url,
        mimeType: asset.content_type,
        byteSize: asset.byte_size,
        sha256: asset.sha256,
        verified: true,
        access: "signed",
        expiresAt: new Date(issuedAtMs + signed.expires_in_seconds * 1000).toISOString()
      };
      return [asset.id, descriptor] as const;
    }));
    return new Map(entries);
  }

  async loadBundle(slug: string, signal?: AbortSignal): Promise<CatalogRuntimeBundle> {
    const runtime = await this.load(slug, signal);
    return {
      ...runtime,
      assetDescriptors: await this.resolveAssetDescriptors(runtime, signal)
    };
  }

  async #authorized(path: string, init: RequestInit): Promise<Response> {
    const token = await this.#token();
    if (!token) throw new Error("Authentication token is unavailable");
    const response = await this.#fetcher(new URL(path, this.#base), {
      ...init,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      credentials: "omit",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Catalog runtime request failed with HTTP ${response.status}`);
    return response;
  }
}
