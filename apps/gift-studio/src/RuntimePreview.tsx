import { useEffect, useRef, useState } from "react";
import {
  AssetLoader,
  GiftRenderer,
  type AssetDescriptor,
  type RuntimeManifest,
  type RuntimePerformance
} from "@sylora/gift-runtime";
import type { GiftApiClient } from "./api";
import type { GiftAsset } from "./types";

interface RuntimePreviewProps {
  manifest: RuntimeManifest | undefined;
  assets: GiftAsset[];
  api: GiftApiClient;
}

function collectAssetIds(value: unknown, key = ""): Set<string> {
  const ids = new Set<string>();
  if (
    typeof value === "string" &&
    (key.endsWith("asset_id") || key.endsWith("asset_ids") || key === "source_asset_id")
  ) ids.add(value);
  if (Array.isArray(value)) {
    for (const child of value) {
      for (const id of collectAssetIds(child, key)) ids.add(id);
    }
  } else if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) {
      for (const id of collectAssetIds(child, childKey)) ids.add(id);
    }
  }
  return ids;
}

function metric(value: number | undefined, digits = 0): string {
  return value === undefined ? "—" : value.toFixed(digits);
}

export function RuntimePreview({ manifest, assets, api }: RuntimePreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<GiftRenderer | undefined>(undefined);
  const loader = useRef<AssetLoader | undefined>(undefined);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [audio, setAudio] = useState(true);
  const [muted, setMuted] = useState(false);
  const [pixelRatio, setPixelRatio] = useState(1);
  const [status, setStatus] = useState("Preview idle");
  const [stats, setStats] = useState<RuntimePerformance>();

  useEffect(() => () => {
    void runtime.current?.dispose();
    loader.current?.dispose();
  }, []);

  const launch = async () => {
    if (!manifest || !host.current) {
      setStatus("Import a valid manifest before previewing.");
      return;
    }
    setStatus("Resolving verified asset URLs…");
    await runtime.current?.dispose();
    loader.current?.dispose();
    runtime.current = undefined;
    loader.current = undefined;
    setStats(undefined);
    try {
      const byId = new Map(assets.map((asset) => [asset.id, asset]));
      const descriptors: AssetDescriptor[] = [];
      for (const id of collectAssetIds(manifest)) {
        const asset = byId.get(id);
        if (!asset || asset.state !== "verified") {
          throw new Error(
            `Asset ${id} is not verified for the selected authoring version. Refresh the version assets before previewing.`
          );
        }
        const download = await api.assetDownload(id);
        descriptors.push({
          assetId: id,
          url: download.download_url,
          mimeType: asset.content_type,
          byteSize: asset.byte_size,
          sha256: asset.sha256,
          verified: true,
          access: "signed",
          expiresAt: new Date(Date.now() + download.expires_in_seconds * 1000).toISOString()
        });
      }
      const assetLoader = new AssetLoader({
        assets: descriptors,
        backendOrigins: [api.base],
        concurrency: 4,
        cache: true
      });
      const renderer = new GiftRenderer({
        container: host.current,
        manifest,
        assetLoader,
        capabilities: {
          qualityTier: quality,
          reducedMotion,
          audio
        },
        pixelRatio,
        scopeTargets: {
          full_screen: host.current,
          avatar: host.current,
          streamer: host.current
        },
        onPerformance: setStats,
        onError: (error) => setStatus(error.message),
        onHook: (action) => setStatus(`Local preview action: ${action}`)
      });
      loader.current = assetLoader;
      runtime.current = renderer;
      await renderer.load();
      renderer.setMuted(muted);
      setStatus(`Running · ${renderer.selection.reason}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Preview failed");
    }
  };

  const warnings = manifest && stats ? [
    stats.downloadedBytes > manifest.quality_budgets.max_download_bytes
      ? "Downloaded bytes exceed manifest budget."
      : undefined,
    stats.particles > manifest.quality_budgets.max_particles
      ? "Rendered particles exceed manifest budget."
      : undefined
  ].filter((warning): warning is string => Boolean(warning)) : [];

  return (
    <section className="viewport-pane" aria-labelledby="preview-heading">
      <div className="pane-heading">
        <div>
          <span className="eyebrow">Runtime viewport</span>
          <h2 id="preview-heading">Preview</h2>
        </div>
        <button className="primary compact" type="button" onClick={() => void launch()}>
          Run preview
        </button>
      </div>
      <div className="preview-toolbar" aria-label="Preview controls">
        <label>Quality
          <select value={quality} onChange={(event) => setQuality(event.target.value as typeof quality)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>DPR
          <input
            type="number"
            min="0.5"
            max="2"
            step="0.25"
            value={pixelRatio}
            onChange={(event) => setPixelRatio(Number(event.target.value))}
          />
        </label>
        <label className="check"><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label>
        <label className="check"><input type="checkbox" checked={audio} onChange={(event) => setAudio(event.target.checked)} /> Audio capable</label>
        <button type="button" onClick={() => {
          const next = !muted;
          setMuted(next);
          runtime.current?.setMuted(next);
        }}>{muted ? "Unmute" : "Mute"}</button>
        <button type="button" onClick={() => void runtime.current?.unlockAudioFromUserGesture()}>
          Enable audio
        </button>
      </div>
      <div className="viewport-stage" ref={host}>
        {!manifest && <div className="empty-stage"><span>◇</span><p>Blank editor</p><small>Import a RuntimeManifest to begin.</small></div>}
      </div>
      <div className="preview-status" role="status">{status}</div>
      <div className="local-events">
        <span>Local preview event</span>
        {manifest?.interaction_hooks.map((hook, index) => (
          <button key={`${hook.hook}-${index}`} type="button" onClick={() => runtime.current?.triggerHook(hook.hook)}>
            {hook.hook}
          </button>
        ))}
        {!manifest?.interaction_hooks.length && <small>No interaction hooks declared.</small>}
      </div>
      <div className="performance-grid" aria-label="Actual performance inspector">
        <span><b>{metric(stats?.fps, 1)}</b> FPS</span>
        <span><b>{metric(stats?.frameTimeMs, 1)}</b> ms</span>
        <span><b>{metric(stats?.drawCalls)}</b> draws</span>
        <span><b>{metric(stats?.triangles)}</b> triangles</span>
        <span><b>{metric(stats?.textures)}</b> textures</span>
        <span><b>{metric(stats?.particles)}</b> particles</span>
        <span><b>{metric(stats?.downloadedBytes)}</b> bytes loaded</span>
      </div>
      {warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
    </section>
  );
}
