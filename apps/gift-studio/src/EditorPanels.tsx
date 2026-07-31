import { useEffect, useMemo, useState } from "react";
import {
  parseRuntimeManifest,
  validateManifestSemantics,
  type RuntimeManifest
} from "@sylora/gift-runtime";
import type { GiftApiClient } from "./api";
import { prepareAsset, type PreparedAsset } from "./upload";
import type { GiftAsset } from "./types";

export const PANEL_ITEMS = [
  ["manifest", "Manifest"],
  ["layers", "Layers & material"],
  ["timeline", "Timeline"],
  ["particles", "Particles"],
  ["shaders", "Shaders"],
  ["lighting", "Lighting"],
  ["audio", "Audio"],
  ["hooks", "Interactions"],
  ["combinations", "Combinations"],
  ["procedural", "Procedural"],
  ["quality", "Quality & fallbacks"],
  ["assets", "Assets"]
] as const;

interface EditorPanelsProps {
  selected: string;
  onSelect: (panel: string) => void;
  manifest: RuntimeManifest | undefined;
  onManifest: (manifest: RuntimeManifest) => void;
  assets: GiftAsset[];
  onAsset: (asset: GiftAsset) => void;
  versionId: string | undefined;
  api: GiftApiClient;
}

function ManifestTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (depth > 3) return <span className="tree-value">…</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="manifest-tree">
        {value.map((item, index) => <li key={index}><span className="tree-key">[{index}]</span> <ManifestTree value={item} depth={depth + 1} /></li>)}
      </ul>
    );
  }
  if (value && typeof value === "object") {
    return (
      <ul className="manifest-tree">
        {Object.entries(value).map(([key, child]) => (
          <li key={key}><span className="tree-key">{key}</span><ManifestTree value={child} depth={depth + 1} /></li>
        ))}
      </ul>
    );
  }
  return <span className="tree-value">{String(value)}</span>;
}

function JsonSectionEditor({
  title,
  description,
  value,
  apply
}: {
  title: string;
  description: string;
  value: unknown;
  apply: (value: unknown) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string>();
  useEffect(() => setText(JSON.stringify(value, null, 2)), [value]);
  return (
    <div className="section-editor">
      <h3>{title}</h3>
      <p>{description}</p>
      <textarea
        aria-label={`${title} JSON`}
        className="code-field"
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="button" onClick={() => {
        try {
          apply(JSON.parse(text));
          setError(undefined);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Invalid JSON");
        }
      }}>Apply validated section</button>
    </div>
  );
}

function ManifestImport({ onManifest }: { onManifest: (manifest: RuntimeManifest) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const apply = () => {
    try {
      onManifest(parseRuntimeManifest(JSON.parse(text)));
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Manifest is invalid");
    }
  };
  return (
    <div className="manifest-import">
      <h3>Strict RuntimeManifest v1.0</h3>
      <p>Import authored JSON. Unknown fields, invalid budgets, and unresolved effect timelines are rejected before any API call.</p>
      <label className="file-drop">
        <span>Import manifest JSON</span>
        <input type="file" accept=".json,application/json" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void file.text().then(setText).catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : "Unable to read manifest");
          });
        }} />
      </label>
      <textarea
        aria-label="RuntimeManifest JSON"
        className="code-field tall"
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        placeholder="Paste an authored RuntimeManifest v1.0"
      />
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary" type="button" disabled={!text.trim()} onClick={apply}>Validate and import</button>
    </div>
  );
}

function ManifestBootstrap({
  assets,
  onManifest
}: {
  assets: GiftAsset[];
  onManifest: (manifest: RuntimeManifest) => void;
}) {
  const verified = assets.filter((asset) => asset.state === "verified" && asset.quality_tier !== "source");
  const [assetId, setAssetId] = useState("");
  const [role, setRole] = useState("");
  const [target, setTarget] = useState<"threejs" | "lottie">("threejs");
  const [duration, setDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [maxDownload, setMaxDownload] = useState("");
  const [maxAudioPeak, setMaxAudioPeak] = useState("-1");
  const [error, setError] = useState("");
  const selected = verified.find((asset) => asset.id === assetId);

  return (
    <div className="manifest-bootstrap">
      <h3>Build first strict manifest</h3>
      <p>Start from a verified backend asset ID. All values below are authored inputs; Studio does not invent catalog content.</p>
      <label>Verified primary asset
        <select value={assetId} onChange={(event) => {
          setAssetId(event.target.value);
          const asset = verified.find((item) => item.id === event.target.value);
          if (asset) setMaxDownload(String(asset.byte_size));
        }}>
          <option value="">Select an uploaded asset</option>
          {verified.map((asset) => <option value={asset.id} key={asset.id}>{asset.id} · {asset.content_type}</option>)}
        </select>
      </label>
      <label>Asset role
        <input placeholder="primary_model" pattern="[a-z][a-z0-9_]*" value={role} onChange={(event) => setRole(event.target.value)} />
      </label>
      <label>Renderer target
        <select value={target} onChange={(event) => setTarget(event.target.value as typeof target)}>
          <option value="threejs">Three.js</option>
          <option value="lottie">Lottie</option>
        </select>
      </label>
      <label>Duration (ms)<input type="number" min="1" max="120000" value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
      <label>Maximum duration (ms)<input type="number" min="1" max="120000" value={maxDuration} onChange={(event) => setMaxDuration(event.target.value)} /></label>
      <label>Maximum download bytes<input type="number" min={selected?.byte_size ?? 1} value={maxDownload} onChange={(event) => setMaxDownload(event.target.value)} /></label>
      <label>Maximum audio peak dBFS<input type="number" min="-60" max="-1" value={maxAudioPeak} onChange={(event) => setMaxAudioPeak(event.target.value)} /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary" type="button" disabled={!assetId || !role || !duration || !maxDuration || !maxDownload} onClick={() => {
        try {
          onManifest(parseRuntimeManifest({
            schema_version: "1.0",
            renderer_targets: [target],
            source_metadata: null,
            duration_ms: Number(duration),
            assets: [{ asset_id: assetId, role }],
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
              low_end_asset_id: null,
              reduced_motion_asset_id: null,
              no_audio_asset_id: null
            },
            quality_budgets: {
              max_download_bytes: Number(maxDownload),
              max_duration_ms: Number(maxDuration),
              max_particles: 0,
              max_shader_instructions: 0,
              max_audio_peak_dbfs: Number(maxAudioPeak)
            }
          }));
          setError("");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Manifest values are invalid");
        }
      }}>Create strict draft manifest</button>
    </div>
  );
}

function AssetPanel({
  versionId,
  api,
  assets,
  onAsset,
  manifest,
  onManifest
}: {
  versionId: string | undefined;
  api: GiftApiClient;
  assets: GiftAsset[];
  onAsset: (asset: GiftAsset) => void;
  manifest: RuntimeManifest | undefined;
  onManifest: (manifest: RuntimeManifest) => void;
}) {
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const [prepared, setPrepared] = useState<PreparedAsset>();
  const [status, setStatus] = useState("No file selected.");
  const [busy, setBusy] = useState(false);
  const [referenceAssetId, setReferenceAssetId] = useState("");
  const [referenceRole, setReferenceRole] = useState("");

  const upload = async () => {
    if (!prepared || !versionId) return;
    setBusy(true);
    try {
      setStatus("Requesting signed upload…");
      const grant = await api.requestUpload(versionId, {
        content_type: prepared.contentType,
        byte_size: prepared.byteSize,
        sha256: prepared.sha256,
        platform: prepared.platform,
        quality_tier: prepared.qualityTier,
        filename_extension: prepared.extension
      });
      setStatus("Uploading directly to verified object storage…");
      await api.putUpload(grant, prepared.file);
      setStatus("Completing server-side metadata verification…");
      const asset = await api.completeUpload(grant.asset.id);
      onAsset(asset);
      setPrepared(undefined);
      setStatus(`Verified asset ${asset.id}`);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Asset upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="asset-panel">
      <h3>Verified assets</h3>
      <p>Files are checked locally, SHA-256 hashed with Web Crypto, uploaded through the backend’s signed PUT, then completed only after backend verification.</p>
      {!versionId && <p className="notice">A real version ID is required before the backend can issue an upload grant.</p>}
      <div className="asset-controls">
        <label>Render quality
          <select value={quality} onChange={(event) => setQuality(event.target.value as typeof quality)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="file-drop">
          <span>Select authored/licensed asset</span>
          <input
            type="file"
            accept=".glb,.gltf,.png,.jpg,.jpeg,.webp,.json,.wav,.ogg,.mp3,.m4a,.mp4,.glsl,.vert,.frag,.blend"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setStatus("Validating file and computing SHA-256…");
              void prepareAsset(file, quality).then((value) => {
                setPrepared(value);
                setStatus(value.sourceOnly
                  ? "Validated Blender source metadata asset. It will not render in-browser."
                  : `Validated ${value.kind} asset.`);
              }).catch((cause: unknown) => {
                setPrepared(undefined);
                setStatus(cause instanceof Error ? cause.message : "Asset validation failed");
              }).finally(() => setBusy(false));
            }}
          />
        </label>
      </div>
      {prepared && (
        <dl className="asset-metadata">
          <div><dt>File</dt><dd>{prepared.file.name}</dd></div>
          <div><dt>MIME</dt><dd>{prepared.contentType}</dd></div>
          <div><dt>Bytes</dt><dd>{prepared.byteSize.toLocaleString()}</dd></div>
          <div><dt>SHA-256</dt><dd className="hash">{prepared.sha256}</dd></div>
          <div><dt>Use</dt><dd>{prepared.sourceOnly ? "Blender source metadata only" : prepared.kind}</dd></div>
        </dl>
      )}
      <button className="primary" type="button" disabled={!prepared || !versionId || busy} onClick={() => void upload()}>
        Upload and verify
      </button>
      <p className="preview-status" role="status">{status}</p>
      <div className="asset-list">
        {assets.map((asset) => (
          <article key={asset.id}>
            <div><span className={`state-dot ${asset.state}`} /> <strong>{asset.content_type}</strong></div>
            <small>{asset.id}</small>
            <span>{asset.quality_tier} · {asset.byte_size.toLocaleString()} bytes</span>
            <code>{asset.sha256}</code>
          </article>
        ))}
        {!assets.length && <div className="empty-list">The selected version has no asset records.</div>}
      </div>
      {manifest ? (
        <div className="manifest-reference-builder">
          <h3>Add verified manifest reference</h3>
          <label>Asset
            <select value={referenceAssetId} onChange={(event) => setReferenceAssetId(event.target.value)}>
              <option value="">Select verified asset ID</option>
              {assets.filter((asset) => asset.state === "verified").map((asset) => (
                <option value={asset.id} key={asset.id}>{asset.id} · {asset.content_type}</option>
              ))}
            </select>
          </label>
          <label>Role
            <input pattern="[a-z][a-z0-9_]*" value={referenceRole} onChange={(event) => setReferenceRole(event.target.value)} />
          </label>
          <button type="button" disabled={!referenceAssetId || !referenceRole} onClick={() => {
            onManifest(parseRuntimeManifest({
              ...manifest,
              assets: [
                ...manifest.assets.filter((reference) => reference.asset_id !== referenceAssetId),
                { asset_id: referenceAssetId, role: referenceRole }
              ]
            }));
            setReferenceAssetId("");
            setReferenceRole("");
          }}>Add real asset reference</button>
        </div>
      ) : (
        <ManifestBootstrap assets={assets} onManifest={onManifest} />
      )}
    </div>
  );
}

export function EditorPanels(props: EditorPanelsProps) {
  const { manifest, onManifest, selected, assets } = props;
  const [shaderAssetId, setShaderAssetId] = useState("");
  const [shaderName, setShaderName] = useState("");
  const [shaderInstructions, setShaderInstructions] = useState("1");
  const applyKey = <K extends keyof RuntimeManifest>(key: K, value: unknown) => {
    if (!manifest) return;
    onManifest(parseRuntimeManifest({ ...manifest, [key]: value }));
  };
  const semantic = useMemo(() => manifest ? validateManifestSemantics(manifest, true) : [], [manifest]);
  const modelAssetIds = new Set(manifest?.layers.filter((layer) => layer.kind === "model").map((layer) => layer.asset_id));
  const shaderAssets = assets.filter((asset) => asset.content_type === "application/x-glsl");

  let content: React.ReactNode;
  if (!manifest) {
    content = selected === "assets"
      ? <AssetPanel versionId={props.versionId} api={props.api} assets={assets} onAsset={props.onAsset} manifest={manifest} onManifest={onManifest} />
      : (
        <>
          {props.versionId
            ? <ManifestBootstrap assets={assets} onManifest={onManifest} />
            : <p className="notice">Create or select a draft version before authoring its manifest.</p>}
          <ManifestImport onManifest={onManifest} />
        </>
      );
  } else {
    switch (selected) {
      case "manifest":
        content = (
          <>
            <div className="contract-strip">
              <span>Schema {manifest.schema_version}</span>
              <span>{manifest.renderer_targets.join(" · ")}</span>
              <span>{manifest.duration_ms.toLocaleString()} ms</span>
            </div>
            {semantic.length > 0 && <div className="notice"><strong>Publication checks</strong>{semantic.map((issue) => <span key={issue}>{issue}</span>)}</div>}
            <ManifestTree value={manifest} />
            <ManifestImport onManifest={onManifest} />
          </>
        );
        break;
      case "layers":
        content = (
          <>
            <h3>Layer property panel</h3>
            {manifest.layers.map((layer) => (
              <article className="property-card" key={layer.name}>
                <div><span className="kind">{layer.kind}</span><strong>{layer.name}</strong></div>
                <small>{layer.kind === "text" ? layer.localization_key : layer.asset_id}</small>
                <dl>
                  <div><dt>Position</dt><dd>{Object.values(layer.transform.position).join(" / ")}</dd></div>
                  <div><dt>Rotation °</dt><dd>{Object.values(layer.transform.rotation_degrees).join(" / ")}</dd></div>
                  <div><dt>Scale</dt><dd>{Object.values(layer.transform.scale).join(" / ")}</dd></div>
                </dl>
              </article>
            ))}
            {!manifest.layers.length && <div className="empty-list">No layers declared.</div>}
            <h3>Material asset metadata</h3>
            <p>The backend v1.0 manifest has no material fields. Model materials remain embedded in verified GLB/GLTF assets; Studio reports their real asset metadata here.</p>
            {assets.filter((asset) => modelAssetIds.has(asset.id)).map((asset) => (
              <code className="metadata-code" key={asset.id}>{asset.id} · {asset.content_type} · {asset.byte_size} bytes · {asset.sha256}</code>
            ))}
            <JsonSectionEditor title="Model, sprite, and text layers" description="Edit transforms and typed layer metadata. The full manifest is revalidated on apply." value={manifest.layers} apply={(value) => applyKey("layers", value)} />
          </>
        );
        break;
      case "timeline":
        content = (
          <>
            <h3>Timeline editor</h3>
            {manifest.timelines.map((timeline) => (
              <article className="timeline-card" key={timeline.name}>
                <strong>{timeline.name}</strong><span>{timeline.duration_ms} ms · {timeline.loop ? "looping" : "once"}</span>
                <div className="timeline-line">{timeline.tracks.map((track) => <i key={`${track.target}.${track.property}`} style={{ width: `${Math.max(8, 100 / timeline.tracks.length)}%` }} title={`${track.target}.${track.property}`} />)}</div>
                <small>{timeline.tracks.reduce((total, track) => total + track.keyframes.length, 0)} keyframes</small>
              </article>
            ))}
            {!manifest.timelines.length && <div className="empty-list">No timelines declared.</div>}
            <JsonSectionEditor title="Timelines and keyframes" description="Tracks support numeric/vector interpolation, booleans/strings, easing, loops, and ordered millisecond keyframes." value={manifest.timelines} apply={(value) => applyKey("timelines", value)} />
          </>
        );
        break;
      case "particles":
        content = <JsonSectionEditor title="Deterministic particles" description="Configure seeds, spawn rate, verified textures, and maximum counts. Runtime clamps these by quality tier." value={manifest.particle_systems} apply={(value) => applyKey("particle_systems", value)} />;
        break;
      case "shaders":
        content = (
          <>
            <h3>Verified shader selection</h3>
            <p>Shader code cannot be entered or executed here. Upload a GLSL asset, then reference its verified asset ID in the manifest.</p>
            <label>Verified shader asset
              <select value={shaderAssetId} onChange={(event) => setShaderAssetId(event.target.value)}>
                <option value="">Select a verified asset</option>
                {shaderAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id}</option>)}
              </select>
            </label>
            <label>Target layer name
              <input maxLength={64} value={shaderName} onChange={(event) => setShaderName(event.target.value)} />
            </label>
            <label>Reviewed instruction count
              <input type="number" min="1" max="4096" value={shaderInstructions} onChange={(event) => setShaderInstructions(event.target.value)} />
            </label>
            <button type="button" disabled={!shaderAssetId || !shaderName.trim()} onClick={() => {
              applyKey("shaders", [
                ...manifest.shaders,
                {
                  name: shaderName.trim(),
                  shader_asset_id: shaderAssetId,
                  instruction_count: Number(shaderInstructions),
                  texture_asset_ids: []
                }
              ]);
              setShaderName("");
              setShaderAssetId("");
              setShaderInstructions("1");
            }}>Assign verified shader</button>
            {!shaderAssets.length && <div className="empty-list">No verified shader asset in this session.</div>}
            <JsonSectionEditor title="Shader assignments" description="A shader name targets a layer with the same name. Instruction and texture budgets are strict." value={manifest.shaders} apply={(value) => applyKey("shaders", value)} />
          </>
        );
        break;
      case "lighting":
        content = <JsonSectionEditor title="Light editor" description="Ambient, directional, point, and spot lights use explicit colors, intensities, and optional positions." value={manifest.lighting} apply={(value) => applyKey("lighting", value)} />;
        break;
      case "audio":
        content = <JsonSectionEditor title="Audio and spatial settings" description="Select verified audio asset IDs, PannerNode spatialization, autoplay intent, and measured peak dBFS." value={manifest.audio} apply={(value) => applyKey("audio", value)} />;
        break;
      case "hooks":
        content = <JsonSectionEditor title="Interaction hooks" description="Hooks map declared gestures/lifecycle moments to host action identifiers. Studio simulation remains local." value={manifest.interaction_hooks} apply={(value) => applyKey("interaction_hooks", value)} />;
        break;
      case "combinations":
        content = <JsonSectionEditor title="Combination rules" description="Declare compatible IDs and bounded windows. Combination coordination never modifies the ledger." value={manifest.combinations} apply={(value) => applyKey("combinations", value)} />;
        break;
      case "procedural":
        content = <JsonSectionEditor title="Procedural parameters" description="Deterministic sources are seeded. client_ai remains unavailable unless a runtime host injects a provider." value={manifest.procedural_parameters} apply={(value) => applyKey("procedural_parameters", value)} />;
        break;
      case "quality":
        content = (
          <>
            <h3>Fallback assignments</h3>
            <p>Assign verified asset IDs for low-end, reduced-motion, and no-audio paths. Publication requires all three.</p>
            {(["low_end_asset_id", "reduced_motion_asset_id", "no_audio_asset_id"] as const).map((key) => (
              <label key={key}>{key.replaceAll("_", " ")}
                <select value={manifest.fallbacks[key] ?? ""} onChange={(event) => {
                  onManifest(parseRuntimeManifest({
                    ...manifest,
                    fallbacks: { ...manifest.fallbacks, [key]: event.target.value || null }
                  }));
                }}>
                  <option value="">Unassigned</option>
                  {assets.map((asset) => <option value={asset.id} key={asset.id}>{asset.id} · {asset.quality_tier}</option>)}
                </select>
              </label>
            ))}
            <JsonSectionEditor title="Quality budgets" description="Download, duration, particles, shader instructions, and loudness are validated against backend limits." value={manifest.quality_budgets} apply={(value) => applyKey("quality_budgets", value)} />
          </>
        );
        break;
      case "assets":
        content = <AssetPanel versionId={props.versionId} api={props.api} assets={assets} onAsset={props.onAsset} manifest={manifest} onManifest={onManifest} />;
        break;
      default:
        content = <ManifestTree value={manifest} />;
    }
  }

  return (
    <aside className="editor-sidebar">
      <nav className="tool-nav" aria-label="Gift authoring panels">
        {PANEL_ITEMS.map(([id, label]) => (
          <button className={selected === id ? "active" : ""} type="button" key={id} onClick={() => props.onSelect(id)} aria-current={selected === id ? "page" : undefined}>
            <span>{label.slice(0, 1)}</span>{label}
          </button>
        ))}
      </nav>
      <section className="inspector-pane" aria-live="polite">{content}</section>
    </aside>
  );
}
