import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Settings2, Bot, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarCanvas, checkWebGL } from "./AvatarCanvas";
import type { AnimationState } from "./avatarAnimationMachine";
import { ANIMATION_EMOJI, ANIMATION_LABELS } from "./avatarAnimationMachine";
import { PRESENTER_SLOTS } from "./avatarAssets";
import type { PresenterSlotKey } from "./avatarAssets";

export interface AvatarStageProps {
  avatarKey: string;
  accentColor: string;
  scale: number;
  positionY: number;
  lightingPreset: string;
  avatarEnabled: boolean;
  avatarUrl?: string | null;
  animationState?: AnimationState;
  mouthOpenAmount?: number;
  expressionIntensity?: number;
  backgroundGradient?: string;
  isSpeaking?: boolean;
  personaName?: string;
  onOpenSettings?: () => void;
  onStats?: (stats: import("./AvatarCanvas").RendererStats) => void;
  showDebug?: boolean;
  className?: string;
  enableZoom?: boolean;
  enableRotate?: boolean;
  showLogo?: boolean;
  cameraFov?: number;
  cameraY?: number;
  cameraZ?: number;
  externalBlink?: { left: number; right: number } | null;
}

const BAR_BASES = [0.40, 0.70, 1.00, 0.85, 0.60, 0.90, 0.50];

function VoiceActivityBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 20 }}>
      {BAR_BASES.map((base, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ backgroundColor: active ? "#a78bfa" : "rgba(255,255,255,0.18)" }}
          animate={
            active
              ? {
                  height: [base * 9, base * 20, base * 7, base * 18, base * 11],
                  opacity: [0.7, 1, 0.6, 1, 0.8],
                }
              : { height: 3, opacity: 0.2 }
          }
          transition={
            active
              ? {
                  duration: 0.45 + i * 0.06,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                  delay: i * 0.045,
                }
              : { duration: 0.35 }
          }
        />
      ))}
    </div>
  );
}

// ── Renderer type label ────────────────────────────────────────────────────────
function detectRendererLabel(avatarUrl?: string | null): string {
  if (!avatarUrl) return "built-in VRM";
  if (avatarUrl.startsWith("https://models.readyplayer.me") || avatarUrl.startsWith("https://api.readyplayer.me")) return "Ready Player Me";
  if (avatarUrl.includes("avaturn.me") || avatarUrl.includes("avaturn.dev")) return "Avaturn";
  if (avatarUrl.startsWith("data:model/gltf") || avatarUrl.startsWith("data:application/octet-stream")) return "GLB (data URI)";
  if (avatarUrl.endsWith(".glb")) return "GLB file";
  if (avatarUrl.endsWith(".vrm")) return "VRM (custom)";
  if (avatarUrl.startsWith("blob:")) return "VRM/GLB (blob)";
  return "unknown";
}

// ── Debug panel ───────────────────────────────────────────────────────────────
interface DebugPanelProps {
  avatarUrl?: string | null;
  isSpeaking: boolean;
  animationState: AnimationState;
  mouthOpenAmount: number;
  lastError: string | null;
}

function AvatarDebugPanel({
  avatarUrl, isSpeaking, animationState, mouthOpenAmount, lastError,
}: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const webGL = checkWebGL();
  const renderer = detectRendererLabel(avatarUrl);
  const shortUrl = avatarUrl
    ? (avatarUrl.length > 55 ? avatarUrl.slice(0, 52) + "…" : avatarUrl)
    : "none";

  return (
    <div className="absolute top-2 left-2 right-2 z-40 pointer-events-auto">
      <div className="bg-black/85 border border-cyan-500/40 rounded-lg overflow-hidden backdrop-blur-md text-[10px] font-mono shadow-xl">
        {/* Header */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          <span className="font-bold tracking-wider uppercase">Avatar Debug</span>
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>

        {!collapsed && (
          <div className="px-2.5 pb-2 space-y-[3px] border-t border-cyan-500/20">
            <Row label="WebGL" value={webGL ? "✅ SUPPORTED" : "❌ NOT AVAILABLE"} valueClass={webGL ? "text-green-400" : "text-red-400"} />
            <Row label="Renderer" value={renderer} valueClass="text-violet-300" />
            <Row label="Avatar URL" value={shortUrl} valueClass={avatarUrl ? "text-cyan-300" : "text-muted-foreground"} />
            <Row label="Anim State" value={`${ANIMATION_EMOJI[animationState] ?? "?"} ${animationState}`} valueClass="text-yellow-300" />
            <Row label="Mouth Open" value={mouthOpenAmount.toFixed(3)} valueClass="text-orange-300" />
            <Row label="Voice Active" value={isSpeaking ? "🎙 YES" : "no"} valueClass={isSpeaking ? "text-green-400" : "text-muted-foreground"} />
            <Row
              label="Last Error"
              value={lastError ?? "—"}
              valueClass={lastError ? "text-red-400" : "text-muted-foreground/40"}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex items-start gap-1.5 leading-relaxed">
      <span className="text-muted-foreground/60 flex-shrink-0 w-[72px]">{label}:</span>
      <span className={cn("break-all", valueClass)}>{value}</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AvatarStage({
  avatarKey,
  accentColor,
  scale,
  positionY,
  lightingPreset,
  avatarEnabled,
  avatarUrl,
  animationState = "idle",
  mouthOpenAmount = 0,
  expressionIntensity = 0.8,
  backgroundGradient,
  isSpeaking = false,
  personaName,
  onOpenSettings,
  onStats,
  showDebug = false,
  className,
  enableZoom,
  enableRotate,
  showLogo = false,
  cameraFov,
  cameraY,
  cameraZ,
  externalBlink,
}: AvatarStageProps) {
  const [lastError, setLastError] = useState<string | null>(null);

  const isReacting =
    animationState !== "idle" &&
    animationState !== "talking" &&
    animationState !== "listening" &&
    animationState !== "thinking";

  const hasAvatar = !!avatarUrl;
  const slot = PRESENTER_SLOTS[avatarKey as PresenterSlotKey] ?? null;

  return (
    <div className={cn("relative rounded-2xl overflow-hidden flex-shrink-0", className)}>

      {/* Animated border glow ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none z-10"
        animate={{
          boxShadow: isSpeaking
            ? [
                "inset 0 0 0 1.5px rgba(167,139,250,0.55), 0 0 28px 4px rgba(124,58,237,0.35), 0 0 64px 12px rgba(124,58,237,0.12)",
                "inset 0 0 0 1.5px rgba(34,211,238,0.55), 0 0 36px 6px rgba(6,182,212,0.35), 0 0 80px 16px rgba(6,182,212,0.12)",
                "inset 0 0 0 1.5px rgba(167,139,250,0.55), 0 0 28px 4px rgba(124,58,237,0.35), 0 0 64px 12px rgba(124,58,237,0.12)",
              ]
            : "inset 0 0 0 1px rgba(124,58,237,0.22), 0 0 16px 2px rgba(124,58,237,0.08)",
        }}
        transition={
          isSpeaking
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.6 }
        }
      />

      {/* 3D Canvas */}
      <AvatarCanvas
        avatarKey={avatarKey}
        accentColor={accentColor}
        scale={scale}
        positionY={positionY}
        lightingPreset={lightingPreset}
        avatarEnabled={avatarEnabled}
        avatarUrl={avatarUrl}
        animationState={animationState}
        mouthOpenAmount={mouthOpenAmount}
        expressionIntensity={expressionIntensity}
        backgroundGradient={backgroundGradient}
        showFps={false}
        onStats={onStats}
        onError={(msg) => setLastError(msg)}
        className="w-full h-full rounded-2xl"
        enableZoom={enableZoom}
        enableRotate={enableRotate}
        cameraFov={cameraFov}
        cameraY={cameraY}
        cameraZ={cameraZ}
        externalBlink={externalBlink}
      />

      {/* Logo overlay — top center (only when explicitly requested AND avatar is loaded) */}
      {showLogo && hasAvatar && (
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-5 z-20 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="LiveStorm AI"
              className="h-5 w-5 flex-shrink-0"
              style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.8))" }}
            />
            <span
              className="text-[13px] font-black tracking-tight text-white/90"
              style={{ textShadow: "0 0 20px rgba(139,92,246,0.6)" }}
            >
              LiveStorm AI
            </span>
          </div>
        </div>
      )}

      {/* No-avatar overlay — persona portrait shown when no VRM/GLB URL is supplied */}
      {!hasAvatar && slot && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Portrait image */}
          <img
            src={`${import.meta.env.BASE_URL}${slot.portraitUrl.replace(/^\//, "")}`}
            alt={slot.name}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          {/* Accent color radial glow behind image */}
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${slot.accentColor}18 0%, transparent 65%)` }}
          />
          {/* Bottom dark scrim for text legibility */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 45%, rgba(4,5,18,0.92) 100%)" }}
          />
          {/* 2D mode badge — top right */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 border border-amber-500/30 backdrop-blur-sm">
            <Upload className="h-2.5 w-2.5 text-amber-400/80" />
            <span className="text-[9px] text-amber-300/90 font-semibold">2D Preview</span>
          </div>
          {/* Bottom name + tagline */}
          <div className="absolute bottom-11 left-3 right-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: slot.accentColor }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="text-xs font-black text-white/90 tracking-wide">{slot.name}</span>
            </div>
            <p className="text-[9px] text-white/35 leading-snug pl-3">{slot.tagline}</p>
          </div>
        </div>
      )}
      {/* Fallback when no slot info */}
      {!hasAvatar && !slot && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-dashed border-violet-500/25 flex items-center justify-center">
              <Upload className="h-6 w-6 text-violet-400/35" />
            </div>
            <p className="text-sm font-bold text-white/40">No 3D Avatar</p>
            <p className="text-[11px] text-white/20 leading-snug max-w-[130px]">Import a VRM or GLB file</p>
          </div>
        </div>
      )}

      {/* Bottom gradient scrim */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-10"
        style={{ background: "linear-gradient(to top, rgba(4,5,18,0.90) 0%, transparent 100%)" }}
      />

      {/* Bottom bar: name + bars + settings */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-1 flex items-center justify-between z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <motion.div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
            animate={isSpeaking ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-xs font-bold text-white/85 tracking-wide truncate">
            {personaName ?? "AI Assistant"}
          </span>
        </div>

        <VoiceActivityBars active={isSpeaking} />

        {hasAvatar && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white/70"
            title="Avatar settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Speaking badge (top-left) — only when debug is off, else debug takes that space */}
      <AnimatePresence>
        {isSpeaking && !showDebug && (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.9 }}
            transition={{ duration: 0.22 }}
            className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-600/75 border border-violet-400/40 backdrop-blur-sm z-20"
          >
            <Mic className="h-2.5 w-2.5 text-violet-100" />
            <span className="text-[9px] font-bold text-violet-100 uppercase tracking-wider">Speaking</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction badge (top-right) */}
      <AnimatePresence>
        {isReacting && (
          <motion.div
            key={animationState}
            initial={{ opacity: 0, y: -6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.8 }}
            transition={{ duration: 0.22 }}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm z-20"
          >
            <span className="text-sm leading-none">{ANIMATION_EMOJI[animationState]}</span>
            <span className="text-[10px] text-white/75 font-medium">{ANIMATION_LABELS[animationState]}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No-avatar setup CTA (shows over the 3D empty-placeholder) */}
      {!hasAvatar && onOpenSettings && (
        <div className="absolute inset-x-0 bottom-14 flex justify-center z-20 pointer-events-none">
          <button
            onClick={onOpenSettings}
            className="pointer-events-auto text-[11px] text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-500/50 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/18 transition-all flex items-center gap-1.5 backdrop-blur-sm"
          >
            <Bot className="h-3 w-3" />
            Set up your AI avatar
          </button>
        </div>
      )}

      {/* Debug panel (toggled via ?avatarDebug=1 URL param) */}
      {showDebug && (
        <AvatarDebugPanel
          avatarUrl={avatarUrl}
          isSpeaking={isSpeaking}
          animationState={animationState}
          mouthOpenAmount={mouthOpenAmount}
          lastError={lastError}
        />
      )}
    </div>
  );
}
