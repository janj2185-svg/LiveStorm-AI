import { describe, expect, it, vi } from "vitest";
import {
  CatalogRuntimeClient,
  CombinationCoordinator,
  GiftEventClient,
  ManifestValidationError,
  RuntimeManifestSchema,
  assetCacheKey,
  deterministicParticleData,
  interpolateKeyframes,
  negotiateCapabilities,
  parseRuntimeManifest,
  validateAssetUrl,
  validateManifestSemantics
} from "../src";

const assetId = "11111111-1111-4111-8111-111111111111";
const otherAssetId = "22222222-2222-4222-8222-222222222222";

function generatedManifest() {
  return {
    schema_version: "1.0",
    renderer_targets: ["threejs", "lottie"],
    duration_ms: 2_000,
    assets: [{ asset_id: assetId, role: "primary_model" }],
    layers: [{ kind: "model", name: "gift", asset_id: assetId }],
    timelines: [{
      name: "arrival",
      duration_ms: 2_000,
      tracks: [{
        target: "gift",
        property: "position",
        keyframes: [
          { time_ms: 0, value: { x: 0, y: 0, z: 0 } },
          { time_ms: 2_000, value: { x: 2, y: 4, z: 6 }, easing: "linear" }
        ]
      }]
    }],
    particle_systems: [{
      name: "spark",
      max_particles: 100,
      spawn_rate_per_second: 20,
      deterministic_seed: 42
    }],
    shaders: [],
    lighting: [],
    audio: [],
    interaction_hooks: [],
    combinations: [{
      combination_id: "spark.gold",
      compatible_combination_ids: ["spark.blue"],
      window_seconds: 5
    }],
    procedural_parameters: [],
    effects: [{ name: "arrival", scope: "viewer", timeline_name: "arrival" }],
    fallbacks: {
      low_end_asset_id: assetId,
      reduced_motion_asset_id: otherAssetId,
      no_audio_asset_id: assetId
    },
    quality_budgets: {
      max_download_bytes: 1_000_000,
      max_duration_ms: 2_000,
      max_particles: 100,
      max_shader_instructions: 0,
      max_audio_peak_dbfs: -6
    }
  };
}

describe("RuntimeManifest v1.0", () => {
  it("rejects unknown fields at every strict schema boundary", () => {
    const value = { ...generatedManifest(), executable_url: "https://example.com/code.js" };
    expect(RuntimeManifestSchema.safeParse(value).success).toBe(false);
    const nested = generatedManifest();
    nested.layers[0] = { ...nested.layers[0]!, script: "alert(1)" } as typeof nested.layers[number];
    expect(RuntimeManifestSchema.safeParse(nested).success).toBe(false);
  });

  it("enforces semantic quality budgets", () => {
    const value = generatedManifest();
    value.particle_systems[0]!.max_particles = 101;
    expect(() => parseRuntimeManifest(value)).toThrow(ManifestValidationError);
    const parsed = RuntimeManifestSchema.parse(value);
    expect(validateManifestSemantics(parsed)).toContain("particle systems exceed max_particles budget");
  });

  it("requires all publication fallbacks", () => {
    const value = generatedManifest();
    value.fallbacks.no_audio_asset_id = null as unknown as string;
    const parsed = RuntimeManifestSchema.parse(value);
    expect(validateManifestSemantics(parsed, true)).toContain("no_audio_asset_id is required for publication");
  });
});

describe("deterministic runtime behavior", () => {
  it("interpolates numeric and vector timeline keyframes", () => {
    expect(interpolateKeyframes([
      { time_ms: 0, value: 0, easing: "linear" },
      { time_ms: 100, value: 10, easing: "linear" }
    ], 25)).toBe(2.5);
    expect(interpolateKeyframes([
      { time_ms: 0, value: { x: 0, y: 0, z: 0 }, easing: "linear" },
      { time_ms: 100, value: { x: 2, y: 4, z: 6 }, easing: "linear" }
    ], 50)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("generates identical particle buffers for an identical seed", () => {
    const first = deterministicParticleData(8, 91);
    const second = deterministicParticleData(8, 91);
    expect([...first.positions]).toEqual([...second.positions]);
    expect([...first.velocities]).toEqual([...second.velocities]);
    expect([...deterministicParticleData(8, 92).positions]).not.toEqual([...first.positions]);
  });

  it("selects declared fallbacks and reports unsupported capability honestly", () => {
    const manifest = parseRuntimeManifest(generatedManifest());
    expect(negotiateCapabilities(manifest, {
      webgl2: true,
      lottie: true,
      audio: true,
      reducedMotion: true,
      qualityTier: "high",
      aiProvider: false
    })).toMatchObject({ mode: "lottie", assetId: otherAssetId, reason: "reduced-motion fallback" });
    expect(() => negotiateCapabilities(manifest, {
      webgl2: false,
      lottie: false,
      audio: false,
      reducedMotion: true,
      qualityTier: "low",
      aiProvider: false
    })).toThrow(/cannot render Lottie/);
  });

  it("coordinates compatible events deterministically without mutating inputs", () => {
    const rules = parseRuntimeManifest(generatedManifest()).combinations;
    const coordinator = new CombinationCoordinator(rules);
    const first = {
      eventId: "event-b",
      occurredAtMs: 1_000,
      combinationIds: ["spark.blue"] as const
    };
    expect(coordinator.accept(first)).toBeUndefined();
    expect(coordinator.accept({
      eventId: "event-c",
      occurredAtMs: 3_000,
      combinationIds: ["spark.gold"]
    })).toEqual({
      combinationKey: "spark.gold+spark.blue",
      eventIds: ["event-b", "event-c"],
      occurredAtMs: 3_000
    });
    expect(first.combinationIds).toEqual(["spark.blue"]);
  });
});

describe("asset security", () => {
  it("keys cache entries by schema version, asset and hash", () => {
    expect(assetCacheKey({ assetId, sha256: "a".repeat(64) })).toBe(
      `sylora-gift:1.0:${assetId}:${"a".repeat(64)}`
    );
  });

  it("rejects arbitrary and credential-bearing asset URLs", () => {
    expect(() => validateAssetUrl("http://evil.example/model.glb", new Set())).toThrow(/HTTPS/);
    expect(() => validateAssetUrl("javascript:alert(1)", new Set())).toThrow(/HTTPS/);
    expect(() => validateAssetUrl("https://user:pass@example.com/model.glb", new Set())).toThrow(/credentials/);
    expect(validateAssetUrl("http://localhost:8000/signed", new Set(["http://localhost:8000"])).origin)
      .toBe("http://localhost:8000");
  });
});

describe("backend runtime clients", () => {
  it("loads and validates catalog runtime then maps signed asset downloads", async () => {
    const requests: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      requests.push(url.pathname);
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer catalog-token");
      if (url.pathname.endsWith("/runtime")) {
        return Response.json({
          gift_definition_id: "33333333-3333-4333-8333-333333333333",
          gift_version_id: "44444444-4444-4444-8444-444444444444",
          version_number: 7,
          manifest: generatedManifest(),
          assets: [
            {
              id: assetId,
              content_type: "model/gltf-binary",
              byte_size: 128,
              sha256: "a".repeat(64),
              platform: "web",
              quality_tier: "high"
            },
            {
              id: otherAssetId,
              content_type: "application/json",
              byte_size: 64,
              sha256: "b".repeat(64),
              platform: "web",
              quality_tier: "low"
            }
          ]
        });
      }
      return Response.json({
        download_url: `https://assets.example${url.pathname}?signature=real`,
        expires_in_seconds: 60
      });
    });
    const client = new CatalogRuntimeClient({
      apiBase: "https://api.example",
      token: () => "catalog-token",
      fetcher: fetcher as typeof fetch
    });
    const bundle = await client.loadBundle("real-gift");
    expect(bundle.manifest.schema_version).toBe("1.0");
    expect(bundle.assetDescriptors.get(assetId)).toMatchObject({
      mimeType: "model/gltf-binary",
      verified: true,
      access: "signed"
    });
    expect(requests).toEqual([
      "/v1/gifts/catalog/real-gift/runtime",
      `/v1/gifts/assets/${assetId}/download`,
      `/v1/gifts/assets/${otherAssetId}/download`
    ]);
  });

  it("requests a one-time ticket and connects with ticket and replay cursor", async () => {
    let socketUrl = "";
    class FakeWebSocket {
      constructor(url: string | URL) {
        socketUrl = url.toString();
      }
      addEventListener(): void {}
    }
    const original = globalThis.WebSocket;
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(new URL(input.toString()).pathname).toBe("/v1/gifts/events/ticket");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer event-token");
      return Response.json({ ticket: "single-use-ticket", expires_in_seconds: 60 });
    });
    try {
      const client = new GiftEventClient({
        apiBase: "https://api.example",
        token: () => "event-token",
        fetcher: fetcher as typeof fetch
      });
      await client.connect(() => undefined, "signed-cursor");
      const connected = new URL(socketUrl);
      expect(connected.protocol).toBe("wss:");
      expect(connected.pathname).toBe("/v1/ws/gifts");
      expect(connected.searchParams.get("ticket")).toBe("single-use-ticket");
      expect(connected.searchParams.get("since")).toBe("signed-cursor");
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.stubGlobal("WebSocket", original);
    }
  });
});
