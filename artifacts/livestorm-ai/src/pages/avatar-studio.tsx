import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn, ZoomOut, ArrowUp, ArrowDown, RotateCcw, Save,
  Upload, Sparkles, Loader2, Sun, Zap, Cloud, Tv2,
  MousePointer2, Check,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAvatarConfig,
  useUpdateAvatarConfig,
} from "@workspace/api-client-react";
import type { AvatarCreatorResult } from "@/components/avatar/AvatarCreatorModal";
import { AvatarCreatorModal } from "@/components/avatar/AvatarCreatorModal";
import { AvatarStage } from "@/components/avatar/AvatarStage";
import {
  BACKGROUND_PRESETS,
  getBackgroundGradient,
  PRESENTER_SLOTS,
  type PresenterSlotKey,
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
    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">
      {children}
    </p>
  );
}

function ControlBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-3 py-3 border-b border-white/[0.04] last:border-0", className)}>{children}</div>;
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
  const [creatorOpen, setCreatorOpen]   = useState(false);
  const [saved, setSaved]               = useState(false);

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
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex-shrink-0">

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">3D Editor</p>
                <p className="text-sm font-black text-white">Avatar Studio</p>
              </div>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
              )} />
            </div>

            {/* ── Avatar source ── */}
            <ControlBlock>
              <ControlLabel>Avatar Slot</ControlLabel>
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {(Object.values(PRESENTER_SLOTS) as typeof PRESENTER_SLOTS[PresenterSlotKey][]).map((slot) => (
                  <button
                    key={slot.key}
                    onClick={() => { setAvatarKey(slot.key as PresenterSlotKey); setAvatarUrl(null); }}
                    title={slot.name}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-xl border text-[9px] font-bold transition-all",
                      avatarKey === slot.key && !avatarUrl
                        ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                        : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                    )}
                  >
                    <span className="text-base leading-none">
                      {slot.gender === "Male" ? "👤" : "👩"}
                    </span>
                    <span>{slot.name}</span>
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs border-white/10 hover:border-violet-500/40 hover:text-violet-300"
                onClick={() => setCreatorOpen(true)}
              >
                <Upload className="h-3 w-3 mr-1.5" />
                Import VRM / GLB
              </Button>
              {avatarUrl && (
                <p className="text-[10px] text-emerald-400 text-center mt-1.5 font-medium">
                  ✓ Custom avatar loaded
                </p>
              )}
            </ControlBlock>

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
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">{scale.toFixed(2)}×</p>
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
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">{positionY.toFixed(2)}</p>
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
              <p className="text-[9px] text-muted-foreground/35 text-center mt-2">
                Saved settings apply to AI Assistant live sessions
              </p>
            </ControlBlock>

          </div>
        </div>

        {/* ═══════════════ RIGHT: 9:16 portrait preview ═══════════════ */}
        <div className="flex flex-col min-h-0 pt-2 gap-2 overflow-hidden">

          {/* Portrait frame — 9:16 centered, fills available height */}
          <div className="flex-1 min-h-0 flex justify-center items-start overflow-hidden">
            <motion.div
              className="h-full relative"
              style={{ aspectRatio: "9/16" }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <AvatarStage
                avatarKey={avatarKey}
                accentColor={accentColor}
                scale={scale}
                positionY={positionY}
                lightingPreset={lightingPreset}
                avatarEnabled
                avatarUrl={avatarUrl}
                animationState={animState}
                mouthOpenAmount={0}
                expressionIntensity={0.85}
                backgroundGradient={getBackgroundGradient(backgroundId)}
                isSpeaking={false}
                personaName={PRESENTER_SLOTS[avatarKey]?.name ?? "Avatar"}
                enableZoom
                showLogo
                cameraFov={38}
                cameraY={1.0}
                cameraZ={2.0}
                className="w-full h-full"
              />
            </motion.div>
          </div>

          {/* Animation test strip */}
          <div className="flex-shrink-0 space-y-1.5 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {PREVIEW_ANIMATIONS.map((anim) => (
                <button
                  key={anim}
                  onClick={() => setAnimState(anim)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-semibold whitespace-nowrap transition-all flex-shrink-0",
                    animState === anim
                      ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                      : "border-white/[0.07] text-muted-foreground/60 hover:border-white/15 hover:text-white",
                  )}
                >
                  <span>{ANIMATION_EMOJI[anim]}</span>
                  {ANIMATION_LABELS[anim]}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/30">
              <MousePointer2 className="h-3 w-3" />
              <span>Drag to rotate · Scroll to zoom</span>
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
