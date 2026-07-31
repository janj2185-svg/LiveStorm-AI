export interface AssetDescriptor {
  assetId: string;
  url: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  verified: boolean;
  access: "signed" | "backend";
  expiresAt?: string;
}

export interface AssetLoaderOptions {
  assets: Iterable<AssetDescriptor>;
  backendOrigins?: Iterable<string>;
  concurrency?: number;
  cache?: boolean;
  cacheName?: string;
  fetcher?: typeof fetch;
}

export class AssetLoadError extends Error {
  constructor(
    readonly code:
      | "unknown_asset"
      | "unverified_asset"
      | "url_rejected"
      | "metadata_mismatch"
      | "integrity_mismatch"
      | "request_failed",
    message: string
  ) {
    super(message);
    this.name = "AssetLoadError";
  }
}

export function assetCacheKey(asset: Pick<AssetDescriptor, "assetId" | "sha256">, version = "1.0"): string {
  return `sylora-gift:${version}:${asset.assetId}:${asset.sha256.toLowerCase()}`;
}

export function validateAssetUrl(raw: string, backendOrigins: ReadonlySet<string>): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AssetLoadError("url_rejected", "Asset URL is not valid");
  }
  if (url.username || url.password || url.hash) {
    throw new AssetLoadError("url_rejected", "Asset URL credentials and fragments are forbidden");
  }
  if (url.protocol !== "https:" && !backendOrigins.has(url.origin)) {
    throw new AssetLoadError("url_rejected", "Asset URL must use HTTPS or an explicitly trusted backend origin");
  }
  return url;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new AssetLoadError("integrity_mismatch", "Web Crypto is unavailable; SHA-256 cannot be verified");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizedMime(value: string | null): string {
  return (value ?? "").split(";", 1)[0]!.trim().toLowerCase();
}

export class AssetLoader {
  readonly #assets: ReadonlyMap<string, AssetDescriptor>;
  readonly #backendOrigins: ReadonlySet<string>;
  readonly #concurrency: number;
  readonly #cacheEnabled: boolean;
  readonly #cacheName: string;
  readonly #fetcher: typeof fetch;
  readonly #memory = new Map<string, ArrayBuffer>();
  readonly #controllers = new Set<AbortController>();
  #active = 0;
  #waiters: Array<() => void> = [];
  #disposed = false;

  constructor(options: AssetLoaderOptions) {
    this.#assets = new Map([...options.assets].map((asset) => [asset.assetId, asset]));
    this.#backendOrigins = new Set(options.backendOrigins ?? []);
    this.#concurrency = Math.max(1, Math.min(12, options.concurrency ?? 4));
    this.#cacheEnabled = options.cache ?? false;
    this.#cacheName = options.cacheName ?? "sylora-gift-runtime-v1";
    this.#fetcher = options.fetcher ?? fetch;
  }

  get loadedBytes(): number {
    return [...this.#memory.values()].reduce((total, bytes) => total + bytes.byteLength, 0);
  }

  get loadedAssetCount(): number {
    return this.#memory.size;
  }

  descriptor(assetId: string): AssetDescriptor {
    const descriptor = this.#assets.get(assetId);
    if (!descriptor) throw new AssetLoadError("unknown_asset", `No host-provided mapping exists for asset ${assetId}`);
    if (!descriptor.verified) throw new AssetLoadError("unverified_asset", `Asset ${assetId} is not verified`);
    if (!/^[0-9a-f]{64}$/i.test(descriptor.sha256) || descriptor.byteSize <= 0) {
      throw new AssetLoadError("metadata_mismatch", `Asset ${assetId} has invalid integrity metadata`);
    }
    const url = validateAssetUrl(descriptor.url, this.#backendOrigins);
    if (descriptor.access === "backend" && !this.#backendOrigins.has(url.origin)) {
      throw new AssetLoadError("url_rejected", `Asset ${assetId} is not on an explicitly trusted backend origin`);
    }
    if (descriptor.access === "signed") {
      const expiresAt = descriptor.expiresAt ? Date.parse(descriptor.expiresAt) : Number.NaN;
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new AssetLoadError("url_rejected", `Signed URL for asset ${assetId} is missing a future expiry`);
      }
    }
    return descriptor;
  }

  async load(assetId: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    if (this.#disposed) throw new DOMException("AssetLoader has been disposed", "AbortError");
    const descriptor = this.descriptor(assetId);
    const key = assetCacheKey(descriptor);
    const memory = this.#memory.get(key);
    if (memory) return memory.slice(0);

    await this.#acquire(signal);
    const controller = new AbortController();
    this.#controllers.add(controller);
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const cached = await this.#cacheMatch(key);
      if (cached) {
        const verified = await this.#verify(cached, descriptor);
        this.#memory.set(key, verified);
        return verified.slice(0);
      }
      const response = await this.#fetcher(descriptor.url, {
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: { Accept: descriptor.mimeType }
      });
      if (!response.ok) {
        throw new AssetLoadError("request_failed", `Asset request failed with HTTP ${response.status}`);
      }
      const verified = await this.#verify(response, descriptor);
      this.#memory.set(key, verified);
      await this.#cachePut(key, descriptor, verified);
      return verified.slice(0);
    } catch (error) {
      if (error instanceof AssetLoadError || error instanceof DOMException) throw error;
      throw new AssetLoadError("request_failed", error instanceof Error ? error.message : "Asset request failed");
    } finally {
      signal?.removeEventListener("abort", abort);
      this.#controllers.delete(controller);
      this.#release();
    }
  }

  async loadBlob(assetId: string, signal?: AbortSignal): Promise<Blob> {
    const descriptor = this.descriptor(assetId);
    return new Blob([await this.load(assetId, signal)], { type: descriptor.mimeType });
  }

  async loadText(assetId: string, signal?: AbortSignal): Promise<string> {
    return new TextDecoder("utf-8", { fatal: true }).decode(await this.load(assetId, signal));
  }

  async loadJson<T = unknown>(assetId: string, signal?: AbortSignal): Promise<T> {
    const descriptor = this.descriptor(assetId);
    if (normalizedMime(descriptor.mimeType) !== "application/json") {
      throw new AssetLoadError("metadata_mismatch", `Asset ${assetId} is not application/json`);
    }
    return JSON.parse(await this.loadText(assetId, signal)) as T;
  }

  abortAll(reason = "Asset loading aborted"): void {
    for (const controller of this.#controllers) controller.abort(reason);
  }

  dispose(): void {
    this.#disposed = true;
    this.abortAll("AssetLoader disposed");
    this.#memory.clear();
    for (const wake of this.#waiters.splice(0)) wake();
  }

  async #verify(response: Response, descriptor: AssetDescriptor): Promise<ArrayBuffer> {
    const actualMime = normalizedMime(response.headers.get("Content-Type"));
    const expectedMime = normalizedMime(descriptor.mimeType);
    if (actualMime && actualMime !== expectedMime) {
      throw new AssetLoadError(
        "metadata_mismatch",
        `Asset ${descriptor.assetId} MIME mismatch: expected ${expectedMime}, received ${actualMime}`
      );
    }
    const declaredLength = Number(response.headers.get("Content-Length"));
    if (Number.isFinite(declaredLength) && declaredLength > 0 && declaredLength !== descriptor.byteSize) {
      throw new AssetLoadError("metadata_mismatch", `Asset ${descriptor.assetId} byte size does not match`);
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== descriptor.byteSize) {
      throw new AssetLoadError("metadata_mismatch", `Asset ${descriptor.assetId} byte size does not match`);
    }
    const digest = await sha256Hex(bytes);
    if (digest !== descriptor.sha256.toLowerCase()) {
      throw new AssetLoadError("integrity_mismatch", `Asset ${descriptor.assetId} SHA-256 does not match`);
    }
    return bytes;
  }

  async #acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new DOMException("Asset loading aborted", "AbortError");
    if (this.#active < this.#concurrency) {
      this.#active += 1;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const resume = () => {
        signal?.removeEventListener("abort", cancel);
        if (this.#disposed || signal?.aborted) {
          reject(new DOMException("Asset loading aborted", "AbortError"));
        } else {
          this.#active += 1;
          resolve();
        }
      };
      const cancel = () => {
        this.#waiters = this.#waiters.filter((waiter) => waiter !== resume);
        reject(new DOMException("Asset loading aborted", "AbortError"));
      };
      signal?.addEventListener("abort", cancel, { once: true });
      this.#waiters.push(resume);
    });
  }

  #release(): void {
    this.#active -= 1;
    this.#waiters.shift()?.();
  }

  async #cacheMatch(key: string): Promise<Response | undefined> {
    if (!this.#cacheEnabled || typeof caches === "undefined") return undefined;
    return (await caches.open(this.#cacheName)).match(new Request(`https://cache.sylora.invalid/${encodeURIComponent(key)}`));
  }

  async #cachePut(key: string, descriptor: AssetDescriptor, bytes: ArrayBuffer): Promise<void> {
    if (!this.#cacheEnabled || typeof caches === "undefined") return;
    const cache = await caches.open(this.#cacheName);
    await cache.put(
      new Request(`https://cache.sylora.invalid/${encodeURIComponent(key)}`),
      new Response(bytes.slice(0), {
        headers: {
          "Content-Type": descriptor.mimeType,
          "Content-Length": String(descriptor.byteSize),
          "X-Sylora-SHA256": descriptor.sha256
        }
      })
    );
  }
}
