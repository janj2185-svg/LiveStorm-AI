/**
 * CoHostPanel — compact always-visible voice interaction panel
 *
 * Lives at the TOP of the right column in Live Studio, directly above chat.
 * Shows 4 clear state badges (Mic Connected / Listening / Thinking / Speaking)
 * plus audio meter, last transcript, last Storm reply, TTS health, and controls.
 */

import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Bot, X, AlertTriangle, CheckCircle2,
  Volume2, VolumeX, Zap, Brain, Radio, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreamerMic } from "@/hooks/useStreamerMic";
import type { AiAnnouncementEvent } from "@/hooks/useLiveSession";

export interface CoHostPanelProps {
  sendStreamerSpeech: ((text: string, lang: string) => void) | undefined;
  sessionId: number | undefined;
  isSessionActive: boolean;
  aiAnnouncements: AiAnnouncementEvent[];
  ttsModeLive?: string;
  defaultLang?: string;
  activeVoiceName?: string | null;
  isAudioUnlocked?: boolean;
  unlockAudio?: () => void;
  openaiTtsOk?: boolean | null;
}

const LANG_OPTIONS = [
  { code: "uk-UA", flag: "🇺🇦", label: "Ukrainian" },
  { code: "pl-PL", flag: "🇵🇱", label: "Polish" },
  { code: "en-US", flag: "🇺🇸", label: "English" },
  { code: "ru-RU", flag: "🇷🇺", label: "Russian" },
  { code: "de-DE", flag: "🇩🇪", label: "German" },
];

const seenAnnouncementIds = new Set<number>();

export function CoHostPanel({
  sendStreamerSpeech,
  sessionId,
  isSessionActive,
  aiAnnouncements,
  ttsModeLive,
  defaultLang = "uk-UA",
  activeVoiceName,
  isAudioUnlocked,
  unlockAudio,
  openaiTtsOk,
}: CoHostPanelProps) {
  const [lastStormReply, setLastStormReply] = useState<{ text: string; ts: number } | null>(null);

  const mic = useStreamerMic({
    sendStreamerSpeech,
    sessionId,
    isSessionActive,
    defaultLang,
  });

  // Watch aiAnnouncements for Storm's replies to streamer speech
  const prevLen = useRef(0);
  useEffect(() => {
    if (aiAnnouncements.length <= prevLen.current) {
      prevLen.current = aiAnnouncements.length;
      return;
    }
    prevLen.current = aiAnnouncements.length;
    const newest = aiAnnouncements[0];
    if (!newest) return;
    const id = newest.timestamp;
    if ((newest.type as string) === "streamer_speech" && !seenAnnouncementIds.has(id)) {
      seenAnnouncementIds.add(id);
      mic.addStormReply(newest.text);
      setLastStormReply({ text: newest.text, ts: newest.timestamp });
    }
  }, [aiAnnouncements, mic]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isMicConnected = mic.browserSupported && mic.isEnabled && mic.audioMeterReady;
  const isListening    = mic.status === "listening" || mic.status === "speech_detected";
  const isThinking     = mic.status === "processing" || mic.status === "waiting";
  const isSpeaking     = !!activeVoiceName;
  const ttsOk          = ttsModeLive === "openai";
  const activeSession  = isSessionActive && !!sessionId;

  const lastYouText  = mic.interimTranscript || mic.lastFinalTranscript || mic.lastSentText || null;
  const lastYouLabel = mic.interimTranscript ? "Hearing…" : mic.lastSentText ? "You said" : null;

  return (
    <div className={cn(
      "rounded-2xl bg-white/[0.04] backdrop-blur-sm border overflow-hidden transition-all duration-300",
      mic.isEnabled
        ? "border-violet-500/30 shadow-lg shadow-violet-500/8"
        : "border-white/8",
    )}>

      {/* ── Row 1: Header ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
        <div className={cn(
          "p-1.5 rounded-lg border transition-colors",
          mic.isEnabled
            ? "bg-violet-500/20 border-violet-500/30"
            : "bg-white/5 border-white/10",
        )}>
          <Mic className={cn("h-3.5 w-3.5", mic.isEnabled ? "text-violet-400" : "text-muted-foreground")} />
        </div>
        <span className="text-sm font-semibold text-white">Co-Host Voice</span>

        {/* Mode toggle */}
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 ml-auto">
          {(["continuous", "push_to_talk"] as const).map((m) => (
            <button
              key={m}
              onClick={() => mic.setMode(m)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                mic.mode === m
                  ? "bg-violet-600/70 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              {m === "continuous" ? "Auto" : "Hold"}
            </button>
          ))}
        </div>

        {/* Language selector */}
        <select
          value={mic.lang}
          onChange={(e) => mic.setLang(e.target.value)}
          className="text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-violet-500/40 max-w-[110px]"
        >
          {LANG_OPTIONS.map(o => (
            <option key={o.code} value={o.code}>{o.flag} {o.label}</option>
          ))}
        </select>
      </div>

      <div className="p-4 space-y-3">

        {/* ── Row 2: 4 State badges ────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          <StateBadge
            icon={Mic}
            label="Mic Connected"
            active={isMicConnected}
            pending={mic.isEnabled && !mic.audioMeterReady}
            color="emerald"
            inactiveHint={mic.isEnabled ? "requesting…" : "off"}
          />
          <StateBadge
            icon={Radio}
            label="Listening"
            active={isListening}
            pulse={isListening}
            color="cyan"
            inactiveHint="—"
          />
          <StateBadge
            icon={Brain}
            label="Thinking"
            active={isThinking}
            pulse={isThinking}
            color="violet"
            inactiveHint="—"
          />
          <StateBadge
            icon={Volume2}
            label="Speaking"
            active={isSpeaking}
            pulse={isSpeaking}
            color="blue"
            inactiveHint="—"
          />
        </div>

        {/* ── Row 3: Audio meter + Start/Stop button ───────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <AudioLevelBar level={mic.audioLevel} active={mic.isEnabled} />
          </div>
          {mic.browserSupported ? (
            mic.mode === "continuous" ? (
              <button
                onClick={() => mic.isEnabled ? mic.disable() : mic.enable()}
                disabled={!activeSession}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold",
                  "border transition-all duration-200 shrink-0",
                  !activeSession
                    ? "opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-muted-foreground"
                    : mic.isEnabled
                      ? "bg-red-500/15 border-red-500/25 text-red-400 hover:bg-red-500/25 hover:border-red-500/40"
                      : "bg-violet-500/15 border-violet-500/25 text-violet-300 hover:bg-violet-500/25 hover:border-violet-500/40",
                )}
              >
                {mic.isEnabled
                  ? <><MicOff className="h-3.5 w-3.5" />Stop</>
                  : <><Mic className="h-3.5 w-3.5" />Start</>}
              </button>
            ) : (
              /* Push-to-Talk */
              <button
                onMouseDown={mic.isEnabled ? mic.pushToTalkStart : undefined}
                onMouseUp={mic.isEnabled ? mic.pushToTalkEnd : undefined}
                onMouseLeave={mic.isEnabled ? mic.pushToTalkEnd : undefined}
                onTouchStart={(e) => { e.preventDefault(); if (mic.isEnabled) mic.pushToTalkStart(); }}
                onTouchEnd={(e) => { e.preventDefault(); if (mic.isEnabled) mic.pushToTalkEnd(); }}
                onClick={() => !mic.isEnabled && mic.enable()}
                disabled={!activeSession}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold",
                  "border transition-all duration-200 shrink-0 select-none",
                  !activeSession
                    ? "opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-muted-foreground"
                    : !mic.isEnabled
                      ? "bg-violet-500/15 border-violet-500/25 text-violet-300 hover:bg-violet-500/25"
                      : mic.status === "speech_detected"
                        ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300 scale-[0.97]"
                        : "bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30 active:scale-[0.97]",
                )}
              >
                <Mic className="h-3.5 w-3.5" />
                {!mic.isEnabled ? "Enable" : mic.status === "speech_detected" ? "Speaking…" : "Hold"}
              </button>
            )
          ) : (
            <span className="text-[10px] text-red-400 shrink-0">Chrome/Edge only</span>
          )}
        </div>

        {/* ── Row 4: Last transcript + Storm reply ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* You said */}
          <div className={cn(
            "rounded-xl px-3 py-2 border min-h-[44px] flex flex-col justify-center gap-0.5 transition-all",
            lastYouText
              ? "bg-violet-500/8 border-violet-500/20"
              : "bg-white/[0.02] border-white/6",
          )}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-violet-400/60">
              {lastYouLabel ?? "You"}
            </span>
            {lastYouText ? (
              <p className="text-xs text-violet-100 leading-snug line-clamp-2">
                {lastYouText}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/40 italic">
                {mic.isEnabled ? "Listening for speech…" : "Start listening to talk"}
              </p>
            )}
          </div>

          {/* Storm replied */}
          <div className={cn(
            "rounded-xl px-3 py-2 border min-h-[44px] flex flex-col justify-center gap-0.5 transition-all",
            lastStormReply
              ? "bg-cyan-500/8 border-cyan-500/20"
              : "bg-white/[0.02] border-white/6",
          )}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-cyan-400/60 flex items-center gap-1">
              <Bot className="h-2.5 w-2.5" />Storm
            </span>
            {lastStormReply ? (
              <p className="text-xs text-cyan-100 leading-snug line-clamp-2">
                {lastStormReply.text}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/40 italic">
                {isThinking ? "Generating reply…" : "Waiting for reply…"}
              </p>
            )}
          </div>
        </div>

        {/* ── Row 5: TTS health bar ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* TTS engine badge */}
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            ttsModeLive === "openai"
              ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
              : "bg-white/5 text-muted-foreground border-white/10",
          )}>
            {ttsModeLive === "openai" ? "OpenAI TTS" : ttsModeLive === "off" ? "TTS Off" : "TTS: Browser"}
          </span>

          {/* OpenAI health */}
          {ttsModeLive === "openai" && (
            openaiTtsOk === true  ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />✓ Working
              </span>
            ) : openaiTtsOk === false ? (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertTriangle className="h-3 w-3" />Error
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 italic">Not tested</span>
            )
          )}

          {/* Autoplay unlock */}
          {ttsModeLive === "openai" && !isAudioUnlocked && unlockAudio && (
            <button
              onClick={unlockAudio}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25 text-[10px] font-semibold transition-all"
            >
              🔊 Enable Voice
            </button>
          )}
          {ttsModeLive === "openai" && isAudioUnlocked && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400/70">
              <CheckCircle2 className="h-2.5 w-2.5" />Voice enabled
            </span>
          )}

          {/* TTS off warning */}
          {!ttsOk && mic.isEnabled && (
            <span className="text-[10px] text-amber-400/80 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Storm can hear you but won't speak back
            </span>
          )}
        </div>

        {/* ── Mic error ─────────────────────────────────────────────────────── */}
        {mic.error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
            <span className="text-xs text-red-300 flex-1">{mic.error}</span>
            <button onClick={mic.disable} className="text-red-400 hover:text-red-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── No active session warning ─────────────────────────────────────── */}
        {!activeSession && (
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/8 px-3 py-2">
            <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground/70">Start a session from the Dashboard to enable co-host voice.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface StateBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  pending?: boolean;
  pulse?: boolean;
  color: "emerald" | "cyan" | "violet" | "blue";
  inactiveHint?: string;
}

const COLOR_MAP: Record<StateBadgeProps["color"], { bg: string; border: string; text: string; dot: string }> = {
  emerald: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  cyan:    { bg: "bg-cyan-500/15",    border: "border-cyan-500/30",    text: "text-cyan-400",    dot: "bg-cyan-400"    },
  violet:  { bg: "bg-violet-500/15",  border: "border-violet-500/30",  text: "text-violet-400",  dot: "bg-violet-400"  },
  blue:    { bg: "bg-blue-500/15",    border: "border-blue-500/30",    text: "text-blue-400",    dot: "bg-blue-400"    },
};

function StateBadge({ icon: Icon, label, active, pending, pulse, color }: StateBadgeProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn(
      "flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border transition-all duration-300",
      active
        ? cn(c.bg, c.border)
        : "bg-white/[0.02] border-white/8",
    )}>
      {/* Icon + dot indicator */}
      <div className="relative">
        <Icon className={cn("h-4 w-4 transition-colors", active ? c.text : "text-white/20")} />
        {(active || pending) && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
            pending ? "bg-amber-400" : c.dot,
            (pulse || pending) && "animate-pulse",
          )} />
        )}
      </div>
      {/* Label — always visible */}
      <span className={cn(
        "text-[9px] font-semibold text-center leading-tight",
        active ? c.text : "text-white/30",
      )}>
        {label}
      </span>
    </div>
  );
}

function AudioLevelBar({ level, active }: { level: number; active: boolean }) {
  const BARS = 24;
  const filled = Math.round((level / 100) * BARS);
  return (
    <div className="flex items-center gap-0.5 h-4">
      {Array.from({ length: BARS }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm transition-all duration-75",
            i < filled
              ? level > 70 ? "bg-red-400 h-4"
              : level > 40 ? "bg-amber-400 h-3"
              : "bg-emerald-400 h-2.5"
              : active ? "bg-white/10 h-1.5" : "bg-white/5 h-1",
          )}
        />
      ))}
      <span className="ml-1.5 text-[9px] text-muted-foreground/40 font-mono w-5 text-right flex-none">
        {active ? level : "—"}
      </span>
    </div>
  );
}
