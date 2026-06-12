/**
 * CoHostPanel — redesigned voice interaction panel
 *
 * Main view:   single status pill  +  audio meter  +  clean conversation log
 *              SR mode badge  •  start/stop  •  enable voice
 * Dev mode:    all diagnostics, latency grid, TTS health  (collapsed by default)
 *
 * SR backend:  Whisper (default)  →  browser SpeechRecognition fallback
 */

import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Bot, X, AlertTriangle, CheckCircle2,
  Volume2, Zap, Brain, Radio, ChevronDown, ChevronUp,
  Play, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreamerMic } from "@/hooks/useStreamerMic";
import { useWhisperMic }  from "@/hooks/useWhisperMic";
import type { AiAnnouncementEvent } from "@/hooks/useLiveSession";

// ── Props ─────────────────────────────────────────────────────────────────────
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
  replayTts?: (text: string) => void;
  openaiTtsOk?: boolean | null;
  lastMicEmit?: { text: string; lang: string; ts: number } | null;
  lastMicBackendAck?: { ok: boolean; ts: number } | null;
  coHostLatency?: { stt: number; ai: number; tts: number; total: number } | null;
  getToken?: () => Promise<string | null>;
}

// ── Language options ──────────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { code: "uk-UA", flag: "🇺🇦", label: "Ukrainian" },
  { code: "pl-PL", flag: "🇵🇱", label: "Polish"    },
  { code: "en-US", flag: "🇺🇸", label: "English"   },
  { code: "ru-RU", flag: "🇷🇺", label: "Russian"   },
  { code: "de-DE", flag: "🇩🇪", label: "German"    },
];

// ── Status pill ───────────────────────────────────────────────────────────────
type StormStatus = "idle" | "listening" | "thinking" | "speaking";

const STATUS_CFG: Record<StormStatus, {
  label: string; dotCls: string; textCls: string; bgCls: string; pulse: boolean;
}> = {
  idle:      { label: "Idle",      dotCls: "bg-white/25",   textCls: "text-muted-foreground/50", bgCls: "bg-white/[0.04] border-white/10",         pulse: false },
  listening: { label: "Listening", dotCls: "bg-cyan-400",   textCls: "text-cyan-300",             bgCls: "bg-cyan-500/10 border-cyan-500/30",        pulse: true  },
  thinking:  { label: "Thinking",  dotCls: "bg-violet-400", textCls: "text-violet-300",           bgCls: "bg-violet-500/10 border-violet-500/30",    pulse: true  },
  speaking:  { label: "Speaking",  dotCls: "bg-blue-400",   textCls: "text-blue-300",             bgCls: "bg-blue-500/10 border-blue-500/30",        pulse: true  },
};

function StatusPill({ status }: { status: StormStatus }) {
  const c = STATUS_CFG[status];
  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-400",
      c.bgCls,
    )}>
      <span className={cn("h-2.5 w-2.5 rounded-full transition-colors", c.dotCls, c.pulse && "animate-pulse")} />
      <span className={cn("text-sm font-semibold tracking-wide", c.textCls)}>{c.label}</span>
    </div>
  );
}

// ── Dedupe tracker ────────────────────────────────────────────────────────────
const seenAnnouncementIds = new Set<number>();

// ── Main component ────────────────────────────────────────────────────────────
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
  replayTts,
  openaiTtsOk,
  lastMicEmit,
  lastMicBackendAck,
  coHostLatency,
  getToken,
}: CoHostPanelProps) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [lastStormReply, setLastStormReply] = useState<{ text: string; ts: number } | null>(null);
  const [pendingReply,   setPendingReply]   = useState<string | null>(null);
  const [justUnlocked,   setJustUnlocked]   = useState(false);
  const [devOpen,        setDevOpen]        = useState(false);
  const [emitCount,      setEmitCount]      = useState(0);
  const [useWhisper,     setUseWhisper]     = useState(true); // Whisper = default

  const replayTtsRef = useRef(replayTts);
  useEffect(() => { replayTtsRef.current = replayTts; }, [replayTts]);

  // ── Both hooks always called (React rules) — select active one via mic ──────
  const browserMic = useStreamerMic({ sendStreamerSpeech, sessionId, isSessionActive, defaultLang });
  const whisperMic  = useWhisperMic({  sendStreamerSpeech, sessionId, isSessionActive, defaultLang, getToken });
  const mic = useWhisper ? whisperMic : browserMic;

  // ── Emit count ────────────────────────────────────────────────────────────
  const prevEmitTs = useRef<number | null>(null);
  useEffect(() => {
    if (lastMicEmit && lastMicEmit.ts !== prevEmitTs.current) {
      prevEmitTs.current = lastMicEmit.ts;
      setEmitCount(c => c + 1);
    }
  }, [lastMicEmit]);

  // ── Track Storm replies for streamer_speech events ────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiAnnouncements]);

  // ── TTS blocked / unlocked events ────────────────────────────────────────
  useEffect(() => {
    const handleBlocked = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text;
      if (text) setPendingReply(text);
    };
    const handleUnlocked = () => {
      setJustUnlocked(true);
      setTimeout(() => setJustUnlocked(false), 3500);
      setPendingReply(prev => {
        if (prev) setTimeout(() => replayTtsRef.current?.(prev), 150);
        return null;
      });
    };
    window.addEventListener("tts:blocked",        handleBlocked);
    window.addEventListener("tts:audio:unlocked",  handleUnlocked);
    return () => {
      window.removeEventListener("tts:blocked",        handleBlocked);
      window.removeEventListener("tts:audio:unlocked",  handleUnlocked);
    };
  }, []);

  // ── When switching SR mode, disable the previous hook first ──────────────
  const handleSrSwitch = (wantWhisper: boolean) => {
    if (wantWhisper === useWhisper) return;
    // Disable the currently active hook before switching
    if (mic.isEnabled) mic.disable();
    setUseWhisper(wantWhisper);
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const isMicConnected = mic.browserSupported && mic.isEnabled && mic.audioMeterReady;
  const isListening    = mic.status === "listening" || mic.status === "speech_detected";
  const isThinking     = mic.status === "processing" || mic.status === "waiting";
  const isSpeaking     = !!activeVoiceName;
  const activeSession  = isSessionActive && !!sessionId;

  const stormStatus: StormStatus =
    !mic.isEnabled        ? "idle"      :
    isSpeaking            ? "speaking"  :
    isThinking            ? "thinking"  :
    isListening           ? "listening" :
    "idle";

  const lastYouText  = mic.interimTranscript || mic.lastFinalTranscript || mic.lastSentText || null;
  const lastYouLabel = mic.interimTranscript ? "Hearing…" : mic.lastSentText ? "You said" : "You";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "rounded-2xl bg-white/[0.04] backdrop-blur-sm border overflow-hidden transition-all duration-300",
      mic.isEnabled
        ? "border-violet-500/30 shadow-lg shadow-violet-500/8"
        : "border-white/8",
    )}>

      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2.5">

        {/* Mic icon */}
        <div className={cn(
          "p-1.5 rounded-lg border transition-colors shrink-0",
          mic.isEnabled ? "bg-violet-500/20 border-violet-500/30" : "bg-white/5 border-white/10",
        )}>
          <Mic className={cn("h-3.5 w-3.5", mic.isEnabled ? "text-violet-400" : "text-muted-foreground")} />
        </div>
        <span className="text-sm font-semibold text-white">Storm Voice</span>

        {/* SR mode badge */}
        <span className={cn(
          "text-[9px] font-mono px-1.5 py-0.5 rounded border hidden sm:inline",
          useWhisper
            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
            : "bg-white/5 border-white/10 text-muted-foreground/50",
        )}>
          {useWhisper ? "Whisper" : "Browser SR"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5">
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

          {/* Language */}
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
      </div>

      <div className="p-4 space-y-3">

        {/* ─── STATUS PILL ─────────────────────────────────────────────────── */}
        <div className="flex justify-center py-0.5">
          <StatusPill status={stormStatus} />
        </div>

        {/* ─── AUDIO METER + CONTROLS ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <AudioLevelBar level={mic.audioLevel} active={mic.isEnabled} />
          </div>

          {/* WebView warning replaces button */}
          {mic.isWebView ? (
            <span className="text-[10px] text-amber-300 shrink-0">Open in Chrome</span>
          ) : !mic.browserSupported && !useWhisper ? (
            <span className="text-[10px] text-red-300 shrink-0">Not supported</span>
          ) : mic.mode === "continuous" ? (
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
                : <><Mic    className="h-3.5 w-3.5" />Start</>}
            </button>
          ) : (
            <button
              onMouseDown={mic.isEnabled ? mic.pushToTalkStart : undefined}
              onMouseUp={mic.isEnabled ? mic.pushToTalkEnd   : undefined}
              onMouseLeave={mic.isEnabled ? mic.pushToTalkEnd : undefined}
              onTouchStart={(e) => { e.preventDefault(); if (mic.isEnabled) mic.pushToTalkStart(); }}
              onTouchEnd={(e)   => { e.preventDefault(); if (mic.isEnabled) mic.pushToTalkEnd(); }}
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
          )}

          {/* Enable Voice button */}
          {ttsModeLive === "openai" && !isAudioUnlocked && unlockAudio && (
            <button
              onClick={unlockAudio}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 text-[11px] font-bold transition-all active:scale-[0.97] shrink-0"
            >
              🔊 Voice
            </button>
          )}
        </div>

        {/* Voice enabled indicator */}
        {ttsModeLive === "openai" && isAudioUnlocked && (
          <div className={cn(
            "flex items-center gap-1.5 text-[10px]",
            justUnlocked ? "text-emerald-300 font-semibold" : "text-emerald-400/60",
          )}>
            <CheckCircle2 className="h-3 w-3" />
            {justUnlocked ? "Voice Ready!" : "Voice enabled"}
          </div>
        )}

        {/* ─── CONVERSATION LOG ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className={cn(
            "rounded-xl px-3 py-2 border min-h-[44px] flex flex-col justify-center gap-0.5 transition-all",
            lastYouText ? "bg-violet-500/8 border-violet-500/20" : "bg-white/[0.02] border-white/6",
          )}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-violet-400/60">
              {lastYouLabel}
            </span>
            {lastYouText ? (
              <p className="text-xs text-violet-100 leading-snug line-clamp-2">{lastYouText}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground/40 italic">
                {mic.isEnabled ? "Listening for speech…" : "Start listening to talk"}
              </p>
            )}
          </div>

          <div className={cn(
            "rounded-xl px-3 py-2 border min-h-[44px] flex flex-col justify-center gap-0.5 transition-all",
            lastStormReply ? "bg-cyan-500/8 border-cyan-500/20" : "bg-white/[0.02] border-white/6",
          )}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-cyan-400/60 flex items-center gap-1">
              <Bot className="h-2.5 w-2.5" />Storm
            </span>
            {lastStormReply ? (
              <p className="text-xs text-cyan-100 leading-snug line-clamp-2">{lastStormReply.text}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground/40 italic">
                {isThinking ? "Generating reply…" : "Waiting for reply…"}
              </p>
            )}
          </div>
        </div>

        {/* ─── INLINE WARNINGS ──────────────────────────────────────────────── */}

        {/* Mic active but audio not unlocked */}
        {ttsModeLive === "openai" && !isAudioUnlocked && mic.isEnabled && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-200/80 leading-tight">
              Storm will hear you but <strong className="text-amber-100">won't speak back</strong> — tap{" "}
              <strong className="text-amber-100">🔊 Voice</strong> above.
            </p>
          </div>
        )}

        {/* Pending (blocked) reply */}
        {pendingReply && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/8 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80 flex-1">
                Storm replied — audio was blocked
              </span>
              <button
                onClick={() => {
                  unlockAudio?.();
                  replayTtsRef.current?.(pendingReply);
                  setPendingReply(null);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-bold hover:bg-amber-500/35 active:scale-[0.97] transition-all"
              >
                <Play className="h-3 w-3 fill-current" />Play Reply
              </button>
            </div>
            <p className="text-xs text-amber-100 leading-snug">{pendingReply}</p>
          </div>
        )}

        {/* Mic error */}
        {mic.error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
            <span className="text-xs text-red-300 flex-1 leading-tight">{mic.error}</span>
            <button onClick={mic.disable} className="text-red-400 hover:text-red-300 shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Not supported (Whisper always works, so only for browser SR mode) */}
        {!useWhisper && mic.isWebView && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300 leading-tight">Open in Chrome for Android</p>
              <p className="text-[10px] text-amber-400/70 leading-snug mt-0.5">
                The in-app browser blocks speech recognition. Copy the URL and open it in Chrome.
              </p>
            </div>
          </div>
        )}

        {/* No active session */}
        {!activeSession && (
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/8 px-3 py-2">
            <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground/70">
              Start a session from the Dashboard to enable co-host voice.
            </span>
          </div>
        )}

        {/* ─── DEVELOPER MODE ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-black/20 overflow-hidden">
          <button
            onClick={() => setDevOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
              <Settings className="h-3 w-3" />Developer Mode
            </span>
            {devOpen
              ? <ChevronUp   className="h-3 w-3 text-muted-foreground/40" />
              : <ChevronDown className="h-3 w-3 text-muted-foreground/40" />}
          </button>

          {devOpen && (
            <div className="px-3 pb-3 space-y-3">

              {/* SR mode switcher */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-widest shrink-0">
                  SR Backend:
                </span>
                <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5">
                  {([true, false] as const).map((w) => (
                    <button
                      key={String(w)}
                      onClick={() => handleSrSwitch(w)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                        useWhisper === w
                          ? w ? "bg-blue-600/70 text-white" : "bg-white/20 text-white"
                          : "text-muted-foreground hover:text-white",
                      )}
                    >
                      {w ? "Whisper (server)" : "Browser SR"}
                    </button>
                  ))}
                </div>
              </div>

              {/* TTS health */}
              <div className="flex items-center gap-2 flex-wrap border-t border-white/5 pt-2">
                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold">TTS:</span>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  ttsModeLive === "openai"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                    : "bg-white/5 text-muted-foreground border-white/10",
                )}>
                  {ttsModeLive === "openai" ? "OpenAI" : ttsModeLive === "off" ? "Off" : "Browser"}
                </span>
                {ttsModeLive === "openai" && (
                  openaiTtsOk === true  ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="h-3 w-3" />Working</span>
                : openaiTtsOk === false ? <span className="flex items-center gap-1 text-[10px] text-red-400"><AlertTriangle className="h-3 w-3" />Error</span>
                : <span className="text-[10px] text-muted-foreground/50 italic">Not tested</span>
                )}
                {activeVoiceName && (
                  <span className="text-[10px] text-muted-foreground/50">voice: {activeVoiceName}</span>
                )}
              </div>

              {/* Latency grid */}
              {coHostLatency && (
                <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">⚡ Last Reply Latency</span>
                    <span className={cn(
                      "text-[10px] font-bold tabular-nums",
                      coHostLatency.total < 4000  ? "text-emerald-400"
                      : coHostLatency.total < 6000 ? "text-amber-400"
                      : "text-red-400",
                    )}>
                      {(coHostLatency.total / 1000).toFixed(1)}s total
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "STT", ms: coHostLatency.stt,  goal: 1000, hint: "speech-to-text" },
                      { label: "AI",  ms: coHostLatency.ai,   goal: 2000, hint: "LLM + hostAgent" },
                      { label: "TTS", ms: coHostLatency.tts,  goal: 2000, hint: "OpenAI synthesis" },
                    ].map(({ label, ms, goal, hint }) => (
                      <div key={label} title={hint} className="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.04] border border-white/8 px-2 py-1.5">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">{label}</span>
                        <span className={cn(
                          "text-sm font-bold tabular-nums leading-none",
                          ms === 0        ? "text-muted-foreground/30"
                          : ms <= goal * 0.6 ? "text-emerald-400"
                          : ms <= goal       ? "text-amber-400"
                          : "text-red-400",
                        )}>
                          {ms === 0 ? "—" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostic rows */}
              <div className="space-y-1 border-t border-white/5 pt-2">
                <DiagRow n={1}  label="Mic permission"
                  ok={mic.micPermission === "granted"} warn={mic.micPermission === "unknown"}
                  value={mic.micPermission === "granted" ? "granted ✓" : mic.micPermission === "denied" ? "DENIED — check browser settings" : "unknown (will ask on Start)"}
                />
                <DiagRow n={2}  label="Mic / AudioContext"
                  ok={mic.audioMeterReady}
                  value={mic.audioMeterReady ? "YES — audio stream active" : mic.isEnabled ? "requesting…" : "NO"}
                />
                <DiagRow n={3}  label={useWhisper ? "MediaRecorder + Whisper" : "SpeechRecognition API"}
                  ok={useWhisper ? !!(typeof MediaRecorder !== "undefined") : mic.browserSupported && !mic.isWebView}
                  warn={!useWhisper && mic.isWebView}
                  value={(() => {
                    if (useWhisper) return typeof MediaRecorder !== "undefined" ? "MediaRecorder ✓ — Whisper via server" : "MediaRecorder not available";
                    const ua = navigator.userAgent.slice(0, 80);
                    if (mic.isWebView) return `⚠️ Android WebView — SR blocked. UA: ${ua}`;
                    if (!mic.browserSupported) return `NOT SUPPORTED. UA: ${ua}`;
                    if (mic.isIos) return `iOS Safari ✓ single-shot | UA: ${ua}`;
                    if (mic.isAndroidChrome) return `Android Chrome ✓ single-shot | UA: ${ua}`;
                    return `Desktop ✓ continuous | UA: ${ua}`;
                  })()}
                />
                <DiagRow n={4}  label="Session active"
                  ok={activeSession}
                  value={activeSession ? `YES (id=${sessionId})` : `isSessionActive=${isSessionActive} | id=${sessionId ?? "undef"}`}
                />
                <DiagRow n={5}  label="Enabled (Start clicked)"
                  ok={mic.isEnabled}
                  value={mic.isEnabled ? "YES" : "NO — click Start"}
                />
                <DiagRow n={6}  label={useWhisper ? "Recording / VAD active" : "SR started (onstart fired)"}
                  ok={mic.speechRecogActive}
                  value={mic.speechRecogActive ? `YES | lang=${mic.lang}` : `NO | status=${mic.status}`}
                />
                <DiagRow n={6.5}  label={useWhisper ? "Whisper phrase count / errors" : "SR restarts / no-speech count"}
                  ok={mic.srRestartCount === 0 && mic.noSpeechCount === 0}
                  warn={mic.noSpeechCount >= 1}
                  neutral={!mic.isEnabled}
                  value={!mic.isEnabled ? "—"
                    : useWhisper ? `phrases sent=${mic.srRestartCount} | errors: ${mic.error ?? "none"}`
                    : mic.noSpeechCount >= 3 ? `🔴 ${mic.noSpeechCount}× no-speech loop! Switch to Whisper mode.`
                    : mic.noSpeechCount > 0  ? `⚠️ ${mic.noSpeechCount}× no-speech | restarts=${mic.srRestartCount}`
                    : `restarts=${mic.srRestartCount} no-speech=0 ✓`}
                />
                <DiagRow n={7}  label="Audio level > 5%"
                  ok={mic.audioMeterReady && mic.audioLevel > 5}
                  neutral={!mic.isEnabled || !mic.audioMeterReady}
                  value={mic.audioMeterReady
                    ? `Level=${mic.audioLevel}% ${mic.audioLevel > 5 ? "— audio detected ✓" : "— silent / too quiet"}`
                    : "AudioContext not started"}
                />
                <DiagRow n={8}  label="Transcript received"
                  ok={!!mic.interimTranscript || !!mic.lastFinalTranscript}
                  neutral={!mic.isEnabled}
                  value={mic.interimTranscript
                    ? `interim: "${mic.interimTranscript.slice(0, 60)}"`
                    : mic.lastFinalTranscript
                      ? `final: "${mic.lastFinalTranscript.slice(0, 60)}"`
                      : "—"}
                />
                <DiagRow n={9}  label="Sent to AI (streamer:speech)"
                  ok={emitCount > 0}
                  neutral={!mic.isEnabled}
                  value={emitCount > 0
                    ? `YES — ${emitCount}× | "${(lastMicEmit?.text ?? "").slice(0, 40)}"`
                    : "NO — speak something"}
                />
                <DiagRow n={10} label="Backend ACK"
                  ok={lastMicBackendAck?.ok === true}
                  warn={lastMicBackendAck?.ok === false}
                  neutral={!lastMicBackendAck}
                  value={lastMicBackendAck
                    ? lastMicBackendAck.ok ? `✅ OK at ${new Date(lastMicBackendAck.ts).toLocaleTimeString()}` : "❌ REJECTED"
                    : "—"}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DiagRowProps {
  n: number; label: string; ok: boolean; warn?: boolean; neutral?: boolean; value: string;
}
function DiagRow({ n, label, ok, warn, neutral, value }: DiagRowProps) {
  const dot = neutral || (!ok && !warn) ? "bg-white/20" : ok ? "bg-emerald-400" : warn ? "bg-amber-400" : "bg-red-400";
  const txt = neutral || (!ok && !warn) ? "text-muted-foreground/50" : ok ? "text-emerald-300" : warn ? "text-amber-300" : "text-red-300";
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="text-[9px] font-mono text-muted-foreground/30 w-4 shrink-0 text-right pt-0.5">{n}</span>
      <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-muted-foreground/60">{label}: </span>
        <span className={cn("text-[10px] font-mono break-all", txt)}>{value}</span>
      </div>
    </div>
  );
}

function AudioLevelBar({ level, active }: { level: number; active: boolean }) {
  const BARS   = 24;
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
