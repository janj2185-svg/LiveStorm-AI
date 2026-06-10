import { motion, AnimatePresence } from "framer-motion";
import { Mic, Settings2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarCanvas } from "./AvatarCanvas";
import type { AnimationState } from "./avatarAnimationMachine";
import { ANIMATION_EMOJI, ANIMATION_LABELS } from "./avatarAnimationMachine";

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
  className?: string;
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
  className,
}: AvatarStageProps) {
  const isReacting =
    animationState !== "idle" &&
    animationState !== "talking" &&
    animationState !== "listening" &&
    animationState !== "thinking";

  const hasAvatar = !!avatarUrl;

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
        className="w-full h-full rounded-2xl"
      />

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
            {personaName ?? "AI Co-Host"}
          </span>
        </div>

        <VoiceActivityBars active={isSpeaking} />

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white/70"
            title="Avatar settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Speaking badge (top-left) */}
      <AnimatePresence>
        {isSpeaking && (
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
    </div>
  );
}
