import { RuntimeManifestSchema, type RuntimeManifest } from "./schema";

export type QualityTier = "low" | "medium" | "high";

export interface ClientCapabilities {
  webgl2: boolean;
  lottie: boolean;
  audio: boolean;
  reducedMotion: boolean;
  qualityTier: QualityTier;
  maxTextureSize?: number;
  aiProvider: boolean;
  assetKinds?: Readonly<Record<string, "lottie" | "model" | "image">>;
}

export interface CapabilitySelection {
  mode: "threejs" | "threejs-fallback" | "lottie";
  assetId?: string;
  audioEnabled: boolean;
  qualityTier: QualityTier;
  unavailableProceduralParameters: string[];
  reason: string;
}

export class ManifestValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`RuntimeManifest is invalid: ${issues.join("; ")}`);
    this.name = "ManifestValidationError";
    this.issues = issues;
  }
}

export function parseRuntimeManifest(input: unknown): RuntimeManifest {
  const parsed = RuntimeManifestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ManifestValidationError(
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`)
    );
  }
  const semanticIssues = validateManifestSemantics(parsed.data);
  if (semanticIssues.length > 0) throw new ManifestValidationError(semanticIssues);
  return parsed.data;
}

export function validateManifestSemantics(manifest: RuntimeManifest, publication = false): string[] {
  const issues: string[] = [];
  const totalParticles = manifest.particle_systems.reduce((sum, item) => sum + item.max_particles, 0);
  const totalInstructions = manifest.shaders.reduce((sum, item) => sum + item.instruction_count, 0);
  if (totalParticles > manifest.quality_budgets.max_particles) {
    issues.push("particle systems exceed max_particles budget");
  }
  if (totalInstructions > manifest.quality_budgets.max_shader_instructions) {
    issues.push("shaders exceed max_shader_instructions budget");
  }
  if (manifest.audio.some((track) => track.peak_dbfs > manifest.quality_budgets.max_audio_peak_dbfs)) {
    issues.push("audio peak exceeds max_audio_peak_dbfs budget");
  }
  const timelineNames = new Set(manifest.timelines.map((timeline) => timeline.name));
  for (const effect of manifest.effects) {
    if (!timelineNames.has(effect.timeline_name)) {
      issues.push(`effect "${effect.name}" references missing timeline "${effect.timeline_name}"`);
    }
  }
  for (const timeline of manifest.timelines) {
    for (const track of timeline.tracks) {
      for (let index = 1; index < track.keyframes.length; index += 1) {
        if (track.keyframes[index]!.time_ms < track.keyframes[index - 1]!.time_ms) {
          issues.push(`timeline "${timeline.name}" track "${track.target}.${track.property}" keyframes are not ordered`);
          break;
        }
      }
    }
  }
  if (publication) {
    const entries = Object.entries(manifest.fallbacks);
    for (const [name, assetId] of entries) {
      if (!assetId) issues.push(`${name} is required for publication`);
    }
  }
  return issues;
}

export function referencedAssetIds(manifest: RuntimeManifest): ReadonlySet<string> {
  const identifiers = new Set(manifest.assets.map((asset) => asset.asset_id));
  if (manifest.source_metadata) identifiers.add(manifest.source_metadata.source_asset_id);
  for (const layer of manifest.layers) {
    if ("asset_id" in layer) identifiers.add(layer.asset_id);
  }
  for (const particles of manifest.particle_systems) {
    if (particles.texture_asset_id) identifiers.add(particles.texture_asset_id);
  }
  for (const shader of manifest.shaders) {
    identifiers.add(shader.shader_asset_id);
    shader.texture_asset_ids.forEach((assetId) => identifiers.add(assetId));
  }
  manifest.audio.forEach((track) => identifiers.add(track.asset_id));
  Object.values(manifest.fallbacks).forEach((assetId) => {
    if (assetId) identifiers.add(assetId);
  });
  return identifiers;
}

export function negotiateCapabilities(
  manifest: RuntimeManifest,
  capabilities: ClientCapabilities
): CapabilitySelection {
  const unavailableAi = manifest.procedural_parameters
    .filter((parameter) => parameter.source === "client_ai" && !capabilities.aiProvider)
    .map((parameter) => parameter.name);
  const fallbackRequirement = capabilities.reducedMotion
    ? "reduced_motion_asset_id"
    : capabilities.qualityTier === "low"
      ? "low_end_asset_id"
      : !capabilities.audio && manifest.audio.length > 0
        ? "no_audio_asset_id"
        : undefined;
  const fallbackId = fallbackRequirement === "reduced_motion_asset_id"
    ? manifest.fallbacks.reduced_motion_asset_id
    : fallbackRequirement === "low_end_asset_id"
      ? manifest.fallbacks.low_end_asset_id
      : fallbackRequirement === "no_audio_asset_id"
        ? manifest.fallbacks.no_audio_asset_id
        : undefined;

  if (fallbackRequirement && !fallbackId) {
    throw new ManifestValidationError([
      `${fallbackRequirement} is required for this client capability profile`
    ]);
  }

  if (fallbackId) {
    const kind = capabilities.assetKinds?.[fallbackId];
    if (kind === "model" || kind === "image") {
      if (!capabilities.webgl2 || !manifest.renderer_targets.includes("threejs")) {
        throw new ManifestValidationError([
          `the required ${kind} fallback is present but this client cannot render Three.js`
        ]);
      }
      return {
        mode: "threejs-fallback",
        assetId: fallbackId,
        audioEnabled: false,
        qualityTier: "low",
        unavailableProceduralParameters: unavailableAi,
        reason: capabilities.reducedMotion
          ? "reduced-motion fallback"
          : capabilities.qualityTier === "low"
            ? "low-end fallback"
            : "no-audio fallback"
      };
    }
    if (kind !== "lottie" && !manifest.renderer_targets.includes("lottie")) {
      throw new ManifestValidationError([
        "the required fallback asset type is unavailable; the host must provide verified MIME metadata"
      ]);
    }
    if (!capabilities.lottie) {
      throw new ManifestValidationError([
        "the required fallback is present but this client cannot render Lottie"
      ]);
    }
    return {
      mode: "lottie",
      assetId: fallbackId,
      audioEnabled: false,
      qualityTier: capabilities.qualityTier,
      unavailableProceduralParameters: unavailableAi,
      reason: capabilities.reducedMotion
        ? "reduced-motion fallback"
        : capabilities.qualityTier === "low"
          ? "low-end fallback"
          : "no-audio fallback"
    };
  }

  if (capabilities.webgl2 && manifest.renderer_targets.includes("threejs")) {
    return {
      mode: "threejs",
      audioEnabled: capabilities.audio,
      qualityTier: capabilities.qualityTier,
      unavailableProceduralParameters: unavailableAi,
      reason: "Three.js target supported"
    };
  }

  if (manifest.renderer_targets.includes("lottie") && capabilities.lottie) {
    const assetId = manifest.fallbacks.low_end_asset_id;
    if (!assetId) {
      throw new ManifestValidationError(["Lottie target declared without a fallback asset"]);
    }
    if (capabilities.assetKinds && capabilities.assetKinds[assetId] !== "lottie") {
      throw new ManifestValidationError(["Declared Lottie target has no verified Lottie fallback asset"]);
    }
    return {
      mode: "lottie",
      assetId,
      audioEnabled: false,
      qualityTier: "low",
      unavailableProceduralParameters: unavailableAi,
      reason: "WebGL unavailable; using declared Lottie target"
    };
  }

  throw new ManifestValidationError([
    "no compatible renderer or declared fallback is available for this client"
  ]);
}

export function detectClientCapabilities(overrides: Partial<ClientCapabilities> = {}): ClientCapabilities {
  const media = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = typeof document === "undefined" ? undefined : document.createElement("canvas");
  const gl = canvas?.getContext("webgl2");
  const memory = typeof navigator === "undefined"
    ? undefined
    : (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = typeof navigator === "undefined" ? 0 : navigator.hardwareConcurrency;
  const qualityTier: QualityTier = memory !== undefined && memory <= 4 || cores > 0 && cores <= 4
    ? "low"
    : "high";
  return {
    webgl2: Boolean(gl),
    lottie: typeof document !== "undefined",
    audio: typeof AudioContext !== "undefined",
    reducedMotion: media,
    qualityTier,
    aiProvider: false,
    assetKinds: {},
    ...overrides
  };
}
