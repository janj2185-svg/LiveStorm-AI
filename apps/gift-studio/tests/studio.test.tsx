import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { ApiProblem, GiftApiClient, MemoryToken } from "../src/api";
import { editorReducer, initialEditorState, workflowAvailable } from "../src/editor-state";
import { ProjectBrowser } from "../src/ProjectBrowser";
import { prepareAsset } from "../src/upload";
import type { GiftAsset, GiftDefinition, GiftVersion } from "../src/types";

const definitionId = "11111111-1111-4111-8111-111111111111";
const versionId = "22222222-2222-4222-8222-222222222222";
const assetId = "33333333-3333-4333-8333-333333333333";

function definitionFixture(): GiftDefinition {
  return {
    id: definitionId,
    author_user_id: "44444444-4444-4444-8444-444444444444",
    category_id: "55555555-5555-4555-8555-555555555555",
    slug: "real-gift",
    name: "Real authored gift",
    description: "Authored content",
    price_minor: 100,
    creator_revenue_share_bps: 1000,
    tier: "rare",
    state: "draft",
    available_from: null,
    available_until: null,
    supply_cap: null,
    sold_count: 0,
    per_user_limit: null,
    required_subscription_tier: null,
    minimum_level: null,
    required_achievement: null,
    required_event: null,
    search_tags: [],
    locale_metadata: {}
  };
}

function manifestFixture() {
  return {
    schema_version: "1.0" as const,
    renderer_targets: ["threejs" as const],
    source_metadata: null,
    duration_ms: 1_000,
    assets: [{ asset_id: assetId, role: "primary_model" }],
    layers: [],
    timelines: [],
    particle_systems: [],
    shaders: [],
    lighting: [],
    audio: [],
    interaction_hooks: [],
    combinations: [],
    procedural_parameters: [],
    effects: [],
    fallbacks: {
      low_end_asset_id: assetId,
      reduced_motion_asset_id: assetId,
      no_audio_asset_id: assetId
    },
    quality_budgets: {
      max_download_bytes: 1_000,
      max_duration_ms: 1_000,
      max_particles: 0,
      max_shader_instructions: 0,
      max_audio_peak_dbfs: -1
    }
  };
}

function versionFixture(manifest: unknown = {}): Record<string, unknown> {
  return {
    id: versionId,
    gift_definition_id: definitionId,
    version_number: 1,
    state: "draft",
    runtime_manifest: manifest,
    created_by_id: "44444444-4444-4444-8444-444444444444",
    submitted_by_id: null,
    reviewed_by_id: null,
    created_at: "2026-07-31T17:00:00Z",
    submitted_at: null,
    published_at: null,
    retired_at: null
  };
}

function assetFixture(state: "pending" | "verified" = "verified"): GiftAsset {
  return {
    id: assetId,
    gift_version_id: versionId,
    content_type: "image/png",
    byte_size: 11,
    sha256: "a".repeat(64),
    platform: "web",
    quality_tier: "high",
    state,
    verified_at: state === "verified" ? "2026-07-31T17:01:00Z" : null,
    rejection_code: null
  };
}

function fileWithBuffer(name: string, bytes: Uint8Array, type = ""): File {
  // Always materialize a contiguous copy so Vitest/jsdom File + Node SubtleCrypto agree.
  const copy = bytes.slice();
  const file = new File([copy], name, { type });
  Object.defineProperty(file, "arrayBuffer", {
    configurable: true,
    value: async () => copy.slice().buffer
  });
  return file;
}

describe("editor state and workflow", () => {
  it("marks an imported manifest dirty only when a backend version is attached", () => {
    const manifest = { schema_version: "1.0" } as never;
    const blank = editorReducer(initialEditorState, { type: "manifest_imported", manifest });
    expect(blank.saveState).toBe("clean");
    const attached = editorReducer(
      editorReducer(initialEditorState, { type: "attach_ids", versionId: "version-1" }),
      { type: "manifest_imported", manifest }
    );
    expect(attached.saveState).toBe("dirty");
    expect(attached.revision).toBe(1);
  });

  it("does not report saved until a backend response action arrives", () => {
    const dirty = { ...initialEditorState, saveState: "dirty" as const, revision: 2 };
    const saving = editorReducer(dirty, { type: "save_started", revision: 2 });
    expect(saving.saveState).toBe("saving");
    const failed = editorReducer(saving, { type: "save_failed", conflict: true, message: "conflict" });
    expect(failed.saveState).toBe("conflict");
    expect(failed.lastSavedAt).toBeUndefined();
  });

  it("enforces lifecycle workflow transitions", () => {
    expect(workflowAvailable("draft", "submit")).toBe(true);
    expect(workflowAvailable("draft", "publish")).toBe(false);
    expect(workflowAvailable("review", "validate")).toBe(true);
    expect(workflowAvailable("published", "retire")).toBe(true);
  });

  it("selects only fetched definitions, versions, and assets", () => {
    const definition = definitionFixture();
    const version = {
      ...versionFixture(),
      runtime_manifest: null
    } as unknown as GiftVersion;
    const selected = editorReducer(initialEditorState, { type: "definition_selected", definition });
    const loaded = editorReducer(selected, {
      type: "version_received",
      version,
      assets: [assetFixture()]
    });
    expect(loaded.definitionId).toBe(definitionId);
    expect(loaded.versionId).toBe(versionId);
    expect(loaded.manifest).toBeUndefined();
    expect(loaded.assets.map((asset) => asset.id)).toEqual([assetId]);
  });
});

describe("API errors and credentials", () => {
  it("parses RFC7807 and sends an in-memory bearer token", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer one-time-token");
      return new Response(JSON.stringify({
        type: "https://api.example/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Missing gifts:author permission.",
        code: "permission_denied"
      }), {
        status: 403,
        headers: { "Content-Type": "application/problem+json" }
      });
    });
    const token = new MemoryToken();
    token.set("one-time-token");
    const api = new GiftApiClient("https://api.example", token, fetcher as typeof fetch);
    await expect(api.categories()).rejects.toMatchObject({
      problem: expect.objectContaining({ status: 403, code: "permission_denied" })
    });
  });

  it("never persists a token and fails after memory is cleared", async () => {
    const token = new MemoryToken();
    token.set("ephemeral");
    token.clear();
    const api = new GiftApiClient("https://api.example", token, vi.fn() as typeof fetch);
    await expect(api.categories()).rejects.toThrow("in-memory session token is unavailable");
  });

  it("loads real author definitions, versions, and selected-version assets", async () => {
    const paths: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      paths.push(`${url.pathname}${url.search}`);
      if (url.pathname.endsWith("/definitions")) return Response.json([definitionFixture()]);
      if (url.pathname.endsWith("/versions")) return Response.json([versionFixture()]);
      if (url.pathname.endsWith("/assets")) return Response.json([assetFixture()]);
      throw new Error(`Unexpected request ${url}`);
    });
    const token = new MemoryToken();
    token.set("author-token");
    const api = new GiftApiClient("https://api.example", token, fetcher as typeof fetch);
    expect((await api.definitions("draft", 25))[0]?.id).toBe(definitionId);
    expect((await api.versions(definitionId))[0]?.runtime_manifest).toBeNull();
    expect((await api.assets(versionId))[0]?.id).toBe(assetId);
    expect(paths).toEqual([
      "/v1/gifts/author/definitions?limit=25&state=draft",
      `/v1/gifts/author/definitions/${definitionId}/versions`,
      `/v1/gifts/author/versions/${versionId}/assets`
    ]);
  });

  it("follows empty-version, verified-upload, then strict-manifest patch order", async () => {
    const calls: Array<{ path: string; method: string; body: string | null }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      const method = init?.method ?? "GET";
      calls.push({
        path: `${url.origin}${url.pathname}`,
        method,
        body: typeof init?.body === "string" ? init.body : null
      });
      if (url.origin === "https://upload.example") return new Response(null, { status: 200 });
      if (url.pathname.endsWith("/versions") && method === "POST") {
        return Response.json(versionFixture());
      }
      if (url.pathname.endsWith("/assets/upload")) {
        return Response.json({
          asset: assetFixture("pending"),
          upload_url: "https://upload.example/object",
          required_headers: { "Content-Type": "image/png" },
          expires_in_seconds: 60
        });
      }
      if (url.pathname.endsWith(`/assets/${assetId}/complete`)) {
        return Response.json(assetFixture("verified"));
      }
      if (url.pathname.endsWith("/manifest")) {
        return Response.json(versionFixture(manifestFixture()));
      }
      throw new Error(`Unexpected request ${method} ${url}`);
    });
    const token = new MemoryToken();
    token.set("author-token");
    const api = new GiftApiClient("https://api.example", token, fetcher as typeof fetch);
    const version = await api.createVersion(definitionId);
    expect(version.data.runtime_manifest).toBeNull();
    const grant = await api.requestUpload(versionId, {
      content_type: "image/png",
      byte_size: 11,
      sha256: "a".repeat(64),
      platform: "web",
      quality_tier: "high",
      filename_extension: "png"
    });
    await api.putUpload(grant, fileWithBuffer(
      "asset.png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    ));
    await api.completeUpload(assetId);
    const patched = await api.patchManifest(versionId, manifestFixture());
    expect(patched.data.runtime_manifest?.assets[0]?.asset_id).toBe(assetId);
    expect(calls.map(({ path, method }) => `${method} ${path}`)).toEqual([
      `POST https://api.example/v1/gifts/author/definitions/${definitionId}/versions`,
      `POST https://api.example/v1/gifts/author/versions/${versionId}/assets/upload`,
      "PUT https://upload.example/object",
      `POST https://api.example/v1/gifts/author/assets/${assetId}/complete`,
      `PATCH https://api.example/v1/gifts/author/versions/${versionId}/manifest`
    ]);
    expect(calls[0]?.body).toBe("{}");
  });

  it("strictly validates the catalog runtime response", async () => {
    const token = new MemoryToken();
    token.set("catalog-token");
    const fetcher = vi.fn(async () => Response.json({
      gift_definition_id: definitionId,
      gift_version_id: versionId,
      version_number: 1,
      manifest: manifestFixture(),
      assets: [{
        id: assetId,
        content_type: "image/png",
        byte_size: 11,
        sha256: "a".repeat(64),
        platform: "web",
        quality_tier: "high"
      }]
    }));
    const api = new GiftApiClient("https://api.example", token, fetcher as typeof fetch);
    const runtime = await api.catalogRuntime("real-gift");
    expect(runtime.manifest.schema_version).toBe("1.0");
    expect(runtime.assets[0]?.id).toBe(assetId);
  });
});

describe("asset import validation", () => {
  it("computes the actual SHA-256 for a valid PNG signature", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const prepared = await prepareAsset(fileWithBuffer("art.png", bytes), "low");
    expect(prepared).toMatchObject({
      extension: "png",
      contentType: "image/png",
      byteSize: bytes.byteLength,
      qualityTier: "low",
      sourceOnly: false
    });
    expect(prepared.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects GLTF that could fetch an arbitrary external resource", async () => {
    const gltf = new TextEncoder().encode(JSON.stringify({
      asset: { version: "2.0" },
      buffers: [{ uri: "https://evil.example/mesh.bin" }]
    }));
    await expect(prepareAsset(fileWithBuffer("gift.gltf", gltf))).rejects.toThrow("external file references");
  });
});

describe("component smoke", () => {
  it("renders secure auth and keeps manual token input password-protected", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Gift Studio", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connect to authoring" })).toBeInTheDocument();
    const token = screen.getByLabelText("One-time bearer token");
    expect(token).toHaveAttribute("type", "password");
    fireEvent.change(token, { target: { value: "memory-only" } });
    expect(token).toHaveValue("memory-only");
    expect(localStorage.length).toBe(0);
  });

  it("selects a real project and version from fetched options", () => {
    const definition = definitionFixture();
    const version = {
      ...versionFixture(),
      runtime_manifest: null
    } as unknown as GiftVersion;
    const onDefinition = vi.fn(async () => undefined);
    const onVersion = vi.fn(async () => undefined);
    render(
      <ProjectBrowser
        definitions={[definition]}
        versions={[version]}
        definitionId={undefined}
        versionId={undefined}
        busy={false}
        onRefresh={async () => undefined}
        onDefinition={onDefinition}
        onVersion={onVersion}
      />
    );
    fireEvent.change(screen.getByLabelText("Definition"), { target: { value: definitionId } });
    expect(onDefinition).toHaveBeenCalledWith(definitionId);
  });
});
