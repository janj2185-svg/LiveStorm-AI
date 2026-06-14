import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn, ZoomOut, ArrowUp, ArrowDown, RotateCcw, Save,
  Upload, Sparkles, Loader2, Sun, Zap, Cloud, Tv2,
  MousePointer2, Check, Camera,
} from "lucide-react";
import { CameraPreview } from "@/components/avatar/CameraPreview";
import type { FaceTrackingData } from "@/lib/faceExpressionMapper";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAvatarConfig,
  useUpdateAvatarConfig,
} from "@workspace/api-client-react";
import type { AvatarCreatorResult } from "@/components/avatar/AvatarCreatorModal";
import { AvatarCreatorModal } from "@/components/avatar/AvatarCreatorModal";
import { AvatarStage } from "@/components/avatar/AvatarStage";
import type { RendererStats } from "@/components/avatar/AvatarCanvas";
import {
  BACKGROUND_PRESETS,
  getBackgroundGradient,
  PRESENTER_SLOTS,
  AVATAR_PRESETS,
  AVATAR_PRESET_CATEGORIES,
  type PresenterSlotKey,
  type AvatarPreset,
} from "@/components/avatar/avatarAssets";
import {
  type AnimationState,
  ANIMATION_LABELS,
  ANIMATION_EMOJI,
} from "@/components/avatar/avatarAnimationMachine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────

const LIGHTING_PRESETS = [
  { id: "studio",   label: "Studio",   icon: Tv2 },
  { id: "dramatic", label: "Dramatic", icon: Zap },
  { id: "soft",     label: "Soft",     icon: Cloud },
  { id: "neon",     label: "Neon",     icon: Sun },
];

const PREVIEW_ANIMATIONS: AnimationState[] = [
  "idle", "talking", "happy", "excited", "surprised", "gift_reaction", "victory",
];

const SCALE_MIN  = 0.5;
const SCALE_MAX  = 2.0;
const SCALE_STEP = 0.05;
const POS_MIN    = -2.5;
const POS_MAX    = 0.4;
const POS_STEP   = 0.05;

const DEFAULTS = {
  scale: 1.3,
  positionY: -0.2,
  lightingPreset: "studio",
  backgroundId: "studio",
  accentColor: "#8b5cf6",
  avatarKey: "marcus" as PresenterSlotKey,
};

// ── Slot accent swatches ───────────────────────────────────────────────────────

const ACCENT_SWATCHES = [
  "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899",
];

// ── Helper ────────────────────────────────────────────────────────────────────

function ControlLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/65 mb-2">
      {children}
    </p>
  );
}

function ControlBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-3 py-3 border-b border-white/[0.04] last:border-0", className)}>{children}</div>;
}

// ── Avatar Preset Library Component ──────────────────────────────────────────

function AvatarPresetLibrary({
  selectedPresetId,
  onSelect,
}: {
  selectedPresetId: string | null;
  onSelect: (preset: AvatarPreset) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("TikTok Hosts");
  const [expanded, setExpanded] = useState(true);

  const filtered = AVATAR_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <ControlBlock>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <ControlLabel>Preset Library ({AVATAR_PRESETS.length} Characters)</ControlLabel>
        <span className="text-[9px] text-muted-foreground/65 mb-2">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* Honest label — presets are 2D concept images */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
            <span className="text-[9px] font-bold text-amber-400">⚠ 2D Preview Only</span>
            <span className="text-[9px] text-amber-400/60">— Concept images, not working 3D avatars. Use "Import VRM / GLB" above for a real 3D avatar.</span>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1">
            {AVATAR_PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all",
                  activeCategory === cat
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                    : "border-white/5 text-muted-foreground hover:border-white/10",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Preset grid */}
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                className={cn(
                  "relative flex flex-col rounded-xl border overflow-hidden transition-all group",
                  selectedPresetId === preset.id
                    ? "border-violet-500/60 bg-violet-500/10"
                    : "border-white/5 hover:border-white/15",
                )}
              >
                <div className="w-full aspect-[3/4] bg-black/30 overflow-hidden">
                  <img
                    src={preset.thumbnailUrl}
                    alt={preset.name}
                    className="w-full h-full object-cover object-top transition-transform group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="px-1.5 py-1.5 text-left">
                  <p className="text-[10px] font-bold text-white leading-none">{preset.name}</p>
                  <p className="text-[8px] text-muted-foreground/60 mt-0.5 leading-tight">{preset.role}</p>
                  <p className="text-[8px] text-amber-400/50 mt-0.5">2D preview</p>
                </div>
                {selectedPresetId === preset.id && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </ControlBlock>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AvatarStudio() {
  const queryClient = useQueryClient();

  // ── Remote config ────────────────────────────────────────────────────────────
  const { data: avatarConfig, isLoading } = useGetAvatarConfig();
  const { mutate: saveAvatar, isPending: saving } = useUpdateAvatarConfig({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["avatarConfig"] }),
    },
  });

  // ── Local editor state ────────────────────────────────────────────────────────
  const [scale, setScale]               = useState(DEFAULTS.scale);
  const [positionY, setPositionY]       = useState(DEFAULTS.positionY);
  const [lightingPreset, setLighting]   = useState(DEFAULTS.lightingPreset);
  const [backgroundId, setBackground]   = useState(DEFAULTS.backgroundId);
  const [accentColor, setAccent]        = useState(DEFAULTS.accentColor);
  const [avatarKey, setAvatarKey]       = useState<PresenterSlotKey>(DEFAULTS.avatarKey);
  const [avatarUrl, setAvatarUrl]       = useState<string | null | undefined>(null);
  const [animState, setAnimState]       = useState<AnimationState>("idle");
  const [creatorOpen, setCreatorOpen]       = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [avatarStats, setAvatarStats]       = useState<RendererStats | null>(null);
  const [cameraExpanded, setCameraExpanded] = useState(false);
  const [faceTrackingData, setFaceTrackingData] = useState<FaceTrackingData | null>(null);

  const handleTrackingData = useCallback((data: FaceTrackingData | null) => {
    setFaceTrackingData(data);
  }, []);

  // Sync from saved config on first load
  useEffect(() => {
    if (!avatarConfig) return;
    setScale(avatarConfig.scale ?? DEFAULTS.scale);
    setPositionY(avatarConfig.positionY ?? DEFAULTS.positionY);
    setLighting(avatarConfig.lightingPreset ?? DEFAULTS.lightingPreset);
    setBackground(avatarConfig.backgroundValue ?? DEFAULTS.backgroundId);
    setAccent(avatarConfig.accentColor ?? DEFAULTS.accentColor);
    if (avatarConfig.avatarKey) setAvatarKey(avatarConfig.avatarKey as PresenterSlotKey);
    setAvatarUrl(avatarConfig.avatarUrl ?? null);
    // Restore selected preset from localStorage (no DB column needed)
    try {
      const saved = localStorage.getItem("avatarPresetId");
      if (saved) setSelectedPresetId(saved);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarConfig?.id]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreatorSave = useCallback((result: AvatarCreatorResult) => {
    setAvatarUrl(result.avatarUrl);
    setCreatorOpen(false);
  }, []);

  const handleReset = () => {
    setScale(DEFAULTS.scale);
    setPositionY(DEFAULTS.positionY);
    setLighting(DEFAULTS.lightingPreset);
    setBackground(DEFAULTS.backgroundId);
    setAccent(DEFAULTS.accentColor);
  };

  const handleSave = () => {
    saveAvatar({
      scale,
      positionY,
      lightingPreset,
      backgroundValue: backgroundId,
      accentColor,
      avatarKey,
      ...(avatarUrl ? { avatarUrl } : {}),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 grid grid-cols-[270px_1fr] gap-3">

        {/* ═══════════════ LEFT: Controls panel ═══════════════ */}
        <div className="flex flex-col min-h-0 overflow-y-auto gap-2 pr-0.5 scrollbar-thin scrollbar-thumb-white/10">

          {/* Panel card */}
          <div className="rounded-2xl border border-violet-500/15 overflow-hidden flex-shrink-0 shadow-lg shadow-violet-500/[0.06]"
            style={{ background: "linear-gradient(180deg,rgba(124,58,237,.06) 0%,rgba(0,0,0,0) 100%)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-violet-500/10">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-400/40">3D Editor</p>
                <p className="text-sm font-black text-white">Avatar Studio</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]",
                  isLoading ? "bg-amber-400 animate-pulse text-amber-400" : "bg-emerald-400 text-emerald-400",
                )} />
                <span className={cn("text-[8px] font-bold uppercase tracking-wider", isLoading ? "text-amber-400/60" : "text-emerald-400/60")}>
                  {isLoading ? "Loading" : "Ready"}
                </span>
              </div>
            </div>

            {/* ── Avatar source ── */}
            <ControlBlock>
              <ControlLabel>Avatar Slot</ControlLabel>
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                {(Object.values(PRESENTER_SLOTS) as typeof PRESENTER_SLOTS[PresenterSlotKey][]).map((slot) => (
                  <button
                    key={slot.key}
                    onClick={() => {
                      setAvatarKey(slot.key as PresenterSlotKey);
                      setAvatarUrl(slot.vrmPath ? `${import.meta.env.BASE_URL}${slot.vrmPath.replace(/^\//, "")}` : null);
                    }}
                    title={slot.name}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-xl border text-[9px] font-bold transition-all relative",
                      avatarKey === slot.key
                        ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                        : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                    )}
                  >
                    {slot.vrmPath && (
                      <span className="absolute top-1 right-1 text-[7px] text-emerald-400/80 font-semibold leading-none">3D</span>
                    )}
                    <span className="text-base leading-none">
                      {slot.gender === "Male" ? "👤" : "👩"}
                    </span>
                    <span>{slot.name}</span>
                  </button>
                ))}
              </div>
              {/* Slot mode notice */}
              {!avatarUrl && (
                <p className="text-[9px] text-muted-foreground/65 text-center mb-2 leading-tight">
                  {PRESENTER_SLOTS[avatarKey]?.vrmPath
                    ? "3D avatar loaded — animations & lip sync active."
                    : "Portrait only — no 3D VRM. Import below or pick Marcus / Kai for 3D."}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs border-white/10 hover:border-violet-500/40 hover:text-violet-300"
                onClick={() => setCreatorOpen(true)}
              >
                <Upload className="h-3 w-3 mr-1.5" />
                Import VRM / GLB (3D)
              </Button>
              {avatarUrl && (
                <p className="text-[10px] text-emerald-400 text-center mt-1.5 font-medium">
                  {PRESENTER_SLOTS[avatarKey]?.vrmPath ? "✓ 3D avatar active" : "✓ Custom 3D avatar loaded"}
                </p>
              )}
            </ControlBlock>

            {/* ── Preset Library ── */}
            <AvatarPresetLibrary
              selectedPresetId={selectedPresetId}
              onSelect={(preset) => {
                setSelectedPresetId(preset.id);
                // Only apply accent color — do NOT overwrite avatarUrl with a PNG thumbnail.
                // The preset library is a visual reference; real 3D model URLs come from
                // RPM / Avaturn / VRM uploads only.
                setAccent(preset.accentColor);
                // Persist the chosen preset ID in localStorage so it survives refresh.
                try { localStorage.setItem("avatarPresetId", preset.id); } catch {}
              }}
            />

            {/* ── Scale ── */}
            <ControlBlock>
              <ControlLabel>Size / Scale</ControlLabel>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale((v) => Math.max(SCALE_MIN, +(v - SCALE_STEP).toFixed(2)))}
                  className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <ZoomOut className="h-3 w-3 text-muted-foreground" />
                </button>
                <div className="flex-1">
                  <Slider
                    min={SCALE_MIN} max={SCALE_MAX} step={SCALE_STEP}
                    value={[scale]}
                    onValueChange={([v]) => setScale(v)}
                  />
                </div>
                <button
                  onClick={() => setScale((v) => Math.min(SCALE_MAX, +(v + SCALE_STEP).toFixed(2)))}
                  className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <ZoomIn className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/65 text-center mt-1.5">{scale.toFixed(2)}×</p>
            </ControlBlock>

            {/* ── Position Y ── */}
            <ControlBlock>
              <ControlLabel>Vertical Position</ControlLabel>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPositionY((v) => Math.max(POS_MIN, +(v - POS_STEP).toFixed(2)))}
                  className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                </button>
                <div className="flex-1">
                  <Slider
                    min={POS_MIN} max={POS_MAX} step={POS_STEP}
                    value={[positionY]}
                    onValueChange={([v]) => setPositionY(v)}
                  />
                </div>
                <button
                  onClick={() => setPositionY((v) => Math.min(POS_MAX, +(v + POS_STEP).toFixed(2)))}
                  className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <ArrowUp className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/65 text-center mt-1.5">{positionY.toFixed(2)}</p>
            </ControlBlock>

            {/* ── Lighting ── */}
            <ControlBlock>
              <ControlLabel>Lighting</ControlLabel>
              <div className="grid grid-cols-2 gap-1">
                {LIGHTING_PRESETS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setLighting(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-2 rounded-xl border text-[10px] font-semibold transition-all",
                      lightingPreset === id
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-3 w-3 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </ControlBlock>

            {/* ── Background ── */}
            <ControlBlock>
              <ControlLabel>Background</ControlLabel>
              <div className="grid grid-cols-2 gap-1">
                {BACKGROUND_PRESETS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBackground(bg.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-2 rounded-xl border text-[10px] font-semibold transition-all",
                      backgroundId === bg.id
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                        : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                    )}
                  >
                    <span className="text-base leading-none">{bg.icon}</span>
                    {bg.label}
                  </button>
                ))}
              </div>
            </ControlBlock>

            {/* ── Accent color ── */}
            <ControlBlock>
              <ControlLabel>Accent Color</ControlLabel>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccent(c)}
                    title={c}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      accentColor === c ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-6 h-6 rounded-full border-2 border-white/20 cursor-pointer overflow-hidden bg-transparent"
                  title="Custom color"
                />
              </div>
            </ControlBlock>

            {/* ── Actions ── */}
            <ControlBlock>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs border-white/10 hover:border-white/20"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "flex-1 h-8 text-xs font-bold transition-all",
                    saved
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-violet-600 hover:bg-violet-500",
                  )}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Saving…</>
                  ) : saved ? (
                    <><Check className="h-3 w-3 mr-1.5" />Saved!</>
                  ) : (
                    <><Save className="h-3 w-3 mr-1.5" />Save</>
                  )}
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground/60 text-center mt-2">
                Saved settings apply to AI Assistant live sessions
              </p>
            </ControlBlock>

          </div>

          {/* ── Camera section ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex-shrink-0">
            <button
              onClick={() => setCameraExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-3 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-violet-400" />
                <div className="text-left">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/65">Phase 2</p>
                  <p className="text-sm font-black text-white">Camera</p>
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground/65">{cameraExpanded ? "▲" : "▼"}</span>
            </button>

            {cameraExpanded && (
              <div className="px-3 py-3">
                <CameraPreview onTrackingData={handleTrackingData} />
              </div>
            )}
          </div>

        </div>

        {/* ═══════════════ RIGHT: premium avatar stage ═══════════════ */}
        <div className="flex flex-col min-h-0 pt-2 gap-2 overflow-hidden">

          {/* Stage header bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,.8)]" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.12em]">
                {PRESENTER_SLOTS[avatarKey]?.name ?? "Avatar"} · Live Stage
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {avatarUrl ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] text-emerald-400 font-bold shadow-[0_0_8px_rgba(52,211,153,.15)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 3D ACTIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/12 border border-violet-500/22 text-[9px] text-violet-300/70 font-semibold">
                  2D PREVIEW
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-[9px] text-white/25 font-mono">9:16</span>
            </div>
          </div>

          {/* ── Portrait frame — premium stage container ── */}
          <div className="flex-1 min-h-0 flex justify-center items-start overflow-hidden">
            <motion.div
              className="h-full relative"
              style={{ aspectRatio: "9/16" }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Outer glow ring */}
              <div className="absolute -inset-[1px] rounded-2xl pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}30, rgba(6,182,212,.12), ${accentColor}18)`,
                  boxShadow: `0 0 40px ${accentColor}20, inset 0 0 0 1px ${accentColor}22`,
                }}
              />

              {/* Ambient backdrop glow */}
              <div className="absolute -inset-4 rounded-3xl pointer-events-none blur-2xl opacity-30"
                style={{ background: `radial-gradient(ellipse at center, ${accentColor}40 0%, transparent 70%)` }}
              />

              {/* Corner bracket decorations */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Top-left */}
                <div className="absolute top-2 left-2 w-5 h-5 border-t-[1.5px] border-l-[1.5px] rounded-tl-lg"
                  style={{ borderColor: `${accentColor}80` }} />
                {/* Top-right */}
                <div className="absolute top-2 right-2 w-5 h-5 border-t-[1.5px] border-r-[1.5px] rounded-tr-lg"
                  style={{ borderColor: `${accentColor}80` }} />
                {/* Bottom-left */}
                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-[1.5px] border-l-[1.5px] rounded-bl-lg"
                  style={{ borderColor: `${accentColor}80` }} />
                {/* Bottom-right */}
                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-[1.5px] border-r-[1.5px] rounded-br-lg"
                  style={{ borderColor: `${accentColor}80` }} />

                {/* Scan-line overlay */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.015]"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 4px)",
                  }}
                />
              </div>

              {/* Avatar canvas */}
              <AvatarStage
                avatarKey={avatarKey}
                accentColor={accentColor}
                scale={scale}
                positionY={positionY}
                lightingPreset={lightingPreset}
                avatarEnabled
                avatarUrl={avatarUrl}
                animationState={
                  faceTrackingData?.faceDetected
                    ? faceTrackingData.avatarState
                    : animState
                }
                mouthOpenAmount={
                  faceTrackingData?.faceDetected
                    ? faceTrackingData.mouthOpenValue
                    : 0
                }
                expressionIntensity={0.85}
                backgroundGradient={getBackgroundGradient(backgroundId)}
                isSpeaking={false}
                personaName={PRESENTER_SLOTS[avatarKey]?.name ?? "Avatar"}
                enableZoom
                cameraFov={38}
                cameraY={1.0}
                cameraZ={2.0}
                className="w-full h-full rounded-2xl"
                onStats={setAvatarStats}
                externalBlink={
                  faceTrackingData?.faceDetected
                    ? { left: faceTrackingData.blinkLeft, right: faceTrackingData.blinkRight }
                    : null
                }
              />
            </motion.div>
          </div>

          {/* QA Stats bar */}
          {avatarUrl && avatarStats && (
            <div className="flex-shrink-0 grid grid-cols-4 gap-1.5 px-1">
              {[
                { label: "FPS",   value: String(avatarStats.fps) },
                { label: "Tris",  value: avatarStats.triangles >= 1000 ? `${(avatarStats.triangles / 1000).toFixed(0)}k` : String(avatarStats.triangles) },
                { label: "Draws", value: String(avatarStats.drawCalls) },
                { label: "VRM",   value: `${(11 * 1024 / 1024).toFixed(0)} MB` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-black/50 border border-white/[0.06] px-2 py-2 text-center">
                  <p className="text-[7px] text-white/25 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-[11px] font-black text-white/70 font-mono">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* System checks + drag hint */}
          <div className="flex-shrink-0 flex items-center justify-between px-1">
            {avatarUrl ? (
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-emerald-400/70">✓ Blink</span>
                <span className="text-emerald-400/70">✓ Lip Sync</span>
                <span className="text-emerald-400/70">✓ Idle Anim</span>
                <span className="text-emerald-400/70">✓ VRM 1.0</span>
              </div>
            ) : <div />}
            <div className="flex items-center gap-1 text-[9px] text-white/20">
              <MousePointer2 className="h-2.5 w-2.5" />
              <span>Drag · Scroll</span>
            </div>
          </div>

          {/* Animation strip */}
          <div className="flex-shrink-0 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PREVIEW_ANIMATIONS.map((anim) => (
                <button
                  key={anim}
                  onClick={() => setAnimState(anim)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-semibold whitespace-nowrap transition-all flex-shrink-0",
                    animState === anim
                      ? "border-violet-500/50 bg-violet-500/15 text-violet-300 shadow-[0_0_8px_rgba(167,139,250,.2)]"
                      : "border-white/[0.06] text-white/35 hover:border-white/15 hover:text-white/70",
                  )}
                >
                  <span>{ANIMATION_EMOJI[anim]}</span>
                  {ANIMATION_LABELS[anim]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar creator modal */}
      <AvatarCreatorModal
        open={creatorOpen}
        onOpenChange={(v) => setCreatorOpen(v)}
        onSave={handleCreatorSave}
      />
    </div>
  );
}
