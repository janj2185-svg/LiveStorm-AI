import { z } from "zod";

const strict = <T extends z.ZodRawShape>(shape: T) => z.strictObject(shape);
const uuid = z.uuid();

export const Vector3Schema = strict({
  x: z.number().min(-100_000).max(100_000),
  y: z.number().min(-100_000).max(100_000),
  z: z.number().min(-100_000).max(100_000)
});

export const TransformSchema = strict({
  position: Vector3Schema.default({ x: 0, y: 0, z: 0 }),
  rotation_degrees: Vector3Schema.default({ x: 0, y: 0, z: 0 }),
  scale: Vector3Schema.default({ x: 1, y: 1, z: 1 })
});

export const AssetReferenceSchema = strict({
  asset_id: uuid,
  role: z.string().min(2).max(64).regex(/^[a-z][a-z0-9_]*$/)
});

export const BlenderSourceMetadataSchema = strict({
  application: z.literal("blender"),
  version: z.string().min(3).max(32),
  source_asset_id: uuid,
  license_reference: z.string().min(3).max(255)
});

const ModelLayerSchema = strict({
  kind: z.literal("model"),
  name: z.string().min(1).max(64),
  asset_id: uuid,
  transform: TransformSchema.default({
    position: { x: 0, y: 0, z: 0 },
    rotation_degrees: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  })
});

const SpriteLayerSchema = strict({
  kind: z.literal("sprite"),
  name: z.string().min(1).max(64),
  asset_id: uuid,
  transform: TransformSchema.default({
    position: { x: 0, y: 0, z: 0 },
    rotation_degrees: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  }),
  billboard: z.boolean().default(true)
});

const TextLayerSchema = strict({
  kind: z.literal("text"),
  name: z.string().min(1).max(64),
  localization_key: z.string().min(1).max(96),
  transform: TransformSchema.default({
    position: { x: 0, y: 0, z: 0 },
    rotation_degrees: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  })
});

export const RuntimeLayerSchema = z.discriminatedUnion("kind", [
  ModelLayerSchema,
  SpriteLayerSchema,
  TextLayerSchema
]);

export const TimelineKeyframeSchema = strict({
  time_ms: z.number().int().min(0).max(120_000),
  value: z.union([z.number(), Vector3Schema, z.boolean(), z.string()]),
  easing: z.enum(["linear", "ease_in", "ease_out", "ease_in_out", "step"]).default("linear")
});

export const TimelineTrackSchema = strict({
  target: z.string().min(1).max(96),
  property: z.string().min(1).max(64),
  keyframes: z.array(TimelineKeyframeSchema).min(1).max(500)
});

export const TimelineSchema = strict({
  name: z.string().min(1).max(64),
  duration_ms: z.number().int().positive().max(120_000),
  loop: z.boolean().default(false),
  tracks: z.array(TimelineTrackSchema).max(100).default([])
});

export const ParticleSystemSpecSchema = strict({
  name: z.string().min(1).max(64),
  max_particles: z.number().int().positive().max(100_000),
  spawn_rate_per_second: z.number().int().min(0).max(20_000),
  texture_asset_id: uuid.nullable().default(null),
  deterministic_seed: z.number().int().min(0).max(2_147_483_647)
});

export const ShaderSpecSchema = strict({
  name: z.string().min(1).max(64),
  shader_asset_id: uuid,
  instruction_count: z.number().int().positive().max(4096),
  texture_asset_ids: z.array(uuid).max(16).default([])
});

export const LightSpecSchema = strict({
  kind: z.enum(["ambient", "directional", "point", "spot"]),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  intensity: z.number().min(0).max(100),
  position: Vector3Schema.nullable().default(null)
});

export const AudioTrackSpecSchema = strict({
  asset_id: uuid,
  spatial: z.boolean().default(false),
  peak_dbfs: z.number().min(-60).max(-1),
  autoplay: z.boolean().default(true)
});

export const InteractionHookSchema = strict({
  hook: z.enum(["tap", "hold", "swipe", "gaze", "arrival", "completion"]),
  action: z.string().min(1).max(96).regex(/^[a-z][a-z0-9_.:-]*$/)
});

export const CombinationRuleSchema = strict({
  combination_id: z.string().min(3).max(96).regex(/^[a-z][a-z0-9_.:-]*$/),
  compatible_combination_ids: z.array(z.string()).min(1).max(20),
  window_seconds: z.number().int().positive().max(300)
});

export const ProceduralParameterSchema = strict({
  name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/),
  source: z.enum(["deterministic", "client_ai"]),
  value_type: z.enum(["integer", "number", "boolean", "color", "seed", "enum"]),
  minimum: z.number().nullable().default(null),
  maximum: z.number().nullable().default(null),
  allowed_values: z.array(z.string()).max(50).default([])
}).superRefine((parameter, context) => {
  if (
    parameter.minimum !== null &&
    parameter.maximum !== null &&
    parameter.minimum > parameter.maximum
  ) {
    context.addIssue({ code: "custom", message: "procedural parameter minimum exceeds maximum" });
  }
});

export const EffectSpecSchema = strict({
  name: z.string().min(1).max(64),
  scope: z.enum(["full_screen", "viewer", "avatar", "streamer"]),
  timeline_name: z.string().min(1).max(64)
});

export const ManifestFallbacksSchema = strict({
  low_end_asset_id: uuid.nullable().default(null),
  reduced_motion_asset_id: uuid.nullable().default(null),
  no_audio_asset_id: uuid.nullable().default(null)
});

export const QualityBudgetsSchema = strict({
  max_download_bytes: z.number().int().positive().max(104_857_600),
  max_duration_ms: z.number().int().positive().max(120_000),
  max_particles: z.number().int().min(0).max(100_000),
  max_shader_instructions: z.number().int().min(0).max(4096),
  max_audio_peak_dbfs: z.number().min(-60).max(-1)
});

export const RuntimeManifestSchema = strict({
  schema_version: z.literal("1.0"),
  renderer_targets: z.array(z.enum(["threejs", "flutter", "lottie", "unity", "unreal"])).min(1).max(5),
  source_metadata: BlenderSourceMetadataSchema.nullable().default(null),
  duration_ms: z.number().int().positive().max(120_000),
  assets: z.array(AssetReferenceSchema).min(1).max(200),
  layers: z.array(RuntimeLayerSchema).max(200).default([]),
  timelines: z.array(TimelineSchema).max(20).default([]),
  particle_systems: z.array(ParticleSystemSpecSchema).max(50).default([]),
  shaders: z.array(ShaderSpecSchema).max(50).default([]),
  lighting: z.array(LightSpecSchema).max(50).default([]),
  audio: z.array(AudioTrackSpecSchema).max(20).default([]),
  interaction_hooks: z.array(InteractionHookSchema).max(50).default([]),
  combinations: z.array(CombinationRuleSchema).max(20).default([]),
  procedural_parameters: z.array(ProceduralParameterSchema).max(50).default([]),
  effects: z.array(EffectSpecSchema).max(50).default([]),
  fallbacks: ManifestFallbacksSchema,
  quality_budgets: QualityBudgetsSchema
}).superRefine((manifest, context) => {
  if (new Set(manifest.renderer_targets).size !== manifest.renderer_targets.length) {
    context.addIssue({ code: "custom", path: ["renderer_targets"], message: "renderer targets must be unique" });
  }
  if (manifest.duration_ms > manifest.quality_budgets.max_duration_ms) {
    context.addIssue({ code: "custom", path: ["duration_ms"], message: "manifest duration exceeds its quality budget" });
  }
  manifest.timelines.forEach((timeline, timelineIndex) => {
    if (timeline.duration_ms > manifest.duration_ms) {
      context.addIssue({
        code: "custom",
        path: ["timelines", timelineIndex, "duration_ms"],
        message: "timeline duration exceeds manifest duration"
      });
    }
    timeline.tracks.forEach((track, trackIndex) => {
      track.keyframes.forEach((frame, frameIndex) => {
        if (frame.time_ms > timeline.duration_ms) {
          context.addIssue({
            code: "custom",
            path: ["timelines", timelineIndex, "tracks", trackIndex, "keyframes", frameIndex],
            message: "timeline keyframe exceeds timeline duration"
          });
        }
      });
    });
  });
});

export type Vector3Value = z.infer<typeof Vector3Schema>;
export type Transform = z.infer<typeof TransformSchema>;
export type RuntimeLayer = z.infer<typeof RuntimeLayerSchema>;
export type TimelineKeyframe = z.infer<typeof TimelineKeyframeSchema>;
export type TimelineTrack = z.infer<typeof TimelineTrackSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type ParticleSystemSpec = z.infer<typeof ParticleSystemSpecSchema>;
export type RuntimeManifest = z.infer<typeof RuntimeManifestSchema>;
export type EffectScope = RuntimeManifest["effects"][number]["scope"];
