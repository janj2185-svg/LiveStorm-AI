/**
 * CoHostPanel — Real-time voice conversation between streamer and Storm AI
 *
 * Renders:
 *   - Co-host mode ON/OFF toggle
 *   - Status indicator
 *   - Continuous vs Push-to-Talk mode selector
 *   - Language selector
 *   - Always-visible Voice Debug panel (7 live diagnostics)
 *   - Live transcript thread
 */

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Bot, X, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreamerMic, type TranscriptEntry } from "@/hooks/useStreamerMic";
import type { AiAnnouncementEvent } from "@/hooks/useLiveSession";

interface CoHostPanelProps {
  sendStreamerSpeech: ((text: string, lang: string) => void) | undefined;
  sessionId: number | undefined;
  isSessionActive: boolean;
  aiAnnouncements: AiAnnouncementEvent[];
  ttsModeLive?: string;
  defaultLang?: string;
}

const LANG_OPTIONS = [
  { code: "uk-UA", label: "🇺🇦 Ukrainian" },
  { code: "pl-PL", label: "🇵🇱 Polish" },
  { code: "en-US", label: "🇺🇸 English" },
  { code: "ru-RU", label: "🇷🇺 Russian" },
  { code: "de-DE", label: "🇩🇪 German" },
];

const STATUS_CONFIG = {
  not_supported:  { color: "text-red-400",    bg: "bg-red-500/10",     label: "Not supported",     pulse: false },
  idle:           { color: "text-slate-400",  bg: "bg-slate-500/10",   label: "Idle",              pulse: false },
  listening:      { color: "text-emerald-400",bg: "bg-emerald-500/10", label: "Listening…",        pulse: true  },
  speech_detected:{ color: "text-cyan-400",   bg: "bg-cyan-500/10",    label: "Hearing you…",      pulse: true  },
  waiting:        { color: "text-amber-400",  bg: "bg-amber-500/10",   label: "Sending…",          pulse: true  },
  processing:     { color: "text-violet-400", bg: "bg-violet-500/10",  label: "Storm thinking…",   pulse: true  },
  error:          { color: "text-red-400",    bg: "bg-red-500/10",     label: "Error",             pulse: false },
} as const;

const seenAnnouncementIds = new Set<number>();

export function CoHostPanel({
  sendStreamerSpeech,
  sessionId,
  isSessionActive,
  aiAnnouncements,
  ttsModeLive,
  defaultLang = "uk-UA",
}: CoHostPanelProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Track last Storm reply for debug panel
  const [lastStormReply, setLastStormReply] = useState<{ text: string; ts: number } | null>(null);
  // Track last TTS spoken text from window event
  const [lastTtsSpoken, setLastTtsSpoken] = useState<string | null>(null);

  const mic = useStreamerMic({
    sendStreamerSpeech,
    sessionId,
    isSessionActive,
    defaultLang,
  });

  // Listen for TTS spoken events (fired after audio plays)
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      if (text) setLastTtsSpoken(text);
    };
    window.addEventListener("tts:spoken", handler);
    return () => window.removeEventListener("tts:spoken", handler);
  }, []);

  // Watch aiAnnouncements for Storm's replies to streamer speech
  const prevAnnouncementsLength = useRef(0);
  useEffect(() => {
    if (aiAnnouncements.length <= prevAnnouncementsLength.current) {
      prevAnnouncementsLength.current = aiAnnouncements.length;
      return;
    }
    prevAnnouncementsLength.current = aiAnnouncements.length;

    const newest = aiAnnouncements[0];
    if (!newest) return;
    const id = newest.timestamp;
    if ((newest.type as string) === "streamer_speech" && !seenAnnouncementIds.has(id)) {
      seenAnnouncementIds.add(id);
      mic.addStormReply(newest.text);
      setLastStormReply({ text: newest.text, ts: newest.timestamp });
      console.log(`[CoHostMic] ← Storm replied | "${newest.text.slice(0, 60)}"`);
    }
  }, [aiAnnouncements, mic]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mic.transcripts.length]);

  const statusCfg = STATUS_CONFIG[mic.status];
  const isListening = mic.status === "listening" || mic.status === "speech_detected";
  const ttsOk = ttsModeLive === "openai";

  return (
    <div className={cn(
      "rounded-2xl bg-white/[0.04] backdrop-blur-sm border overflow-hidden transition-all duration-300",
      mic.isEnabled && mic.isCoHostEnabled
        ? "border-violet-500/30 shadow-lg shadow-violet-500/8"
        : "border-white/8",
    )}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/20">
            <Mic className="h-3.5 w-3.5 text-violet-400" />
          </div>
          Co-Host Mic
        </span>

        <button
          onClick={() => mic.setCoHostEnabled(!mic.isCoHostEnabled)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
            "transition-colors duration-200 focus:outline-none",
            mic.isCoHostEnabled ? "bg-violet-600" : "bg-white/10",
          )}
          title={mic.isCoHostEnabled ? "Co-host mode on" : "Co-host mode off"}
        >
          <span className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg",
            "transform transition duration-200",
            mic.isCoHostEnabled ? "translate-x-4" : "translate-x-0",
          )} />
        </button>
      </div>

      {mic.isCoHostEnabled && (
        <div className="p-4 space-y-3">

          {/* ── Status pill ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <span className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
              statusCfg.bg, statusCfg.color,
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                mic.isEnabled ? statusCfg.color.replace("text-", "bg-") : "bg-slate-500",
                statusCfg.pulse && mic.isEnabled ? "animate-pulse" : "",
              )} />
              {mic.isEnabled ? statusCfg.label : "Off"}
            </span>

            {!mic.browserSupported && (
              <span className="text-[10px] text-red-400/70">Browser not supported</span>
            )}
          </div>

          {/* ── Not supported notice ──────────────────────────────── */}
          {!mic.browserSupported && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-xs text-red-300">
                Speech recognition is not supported in this browser. Use Chrome or Edge.
              </p>
            </div>
          )}

          {mic.browserSupported && (
            <>
              {/* ── Mode selector ──────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/5">
                {(["continuous", "push_to_talk"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => mic.setMode(m)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-xs font-medium transition-all",
                      mic.mode === m
                        ? "bg-violet-600/80 text-white shadow-sm"
                        : "text-muted-foreground hover:text-white hover:bg-white/5",
                    )}
                  >
                    {m === "continuous" ? "Continuous" : "Push to Talk"}
                  </button>
                ))}
              </div>

              {/* ── Language selector ───────────────────────────────── */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex-none">Lang:</span>
                <select
                  value={mic.lang}
                  onChange={(e) => mic.setLang(e.target.value)}
                  className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-violet-500/40"
                >
                  {LANG_OPTIONS.map(o => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* ── Main mic button ─────────────────────────────────── */}
              {mic.mode === "continuous" ? (
                <button
                  onClick={() => mic.isEnabled ? mic.disable() : mic.enable()}
                  disabled={!isSessionActive}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl",
                    "text-sm font-semibold transition-all duration-200",
                    !isSessionActive
                      ? "opacity-40 cursor-not-allowed bg-white/5 text-muted-foreground"
                      : mic.isEnabled
                        ? "bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25"
                        : "bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25",
                  )}
                >
                  {mic.isEnabled
                    ? <><MicOff className="h-4 w-4" /> Stop Listening</>
                    : <><Mic className="h-4 w-4" /> Start Listening</>
                  }
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => mic.isEnabled ? mic.disable() : mic.enable()}
                    disabled={!isSessionActive}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2 rounded-xl",
                      "text-xs font-medium transition-all",
                      !isSessionActive
                        ? "opacity-40 cursor-not-allowed bg-white/5 text-muted-foreground"
                        : mic.isEnabled
                          ? "bg-violet-500/15 border border-violet-500/25 text-violet-300"
                          : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white",
                    )}
                  >
                    {mic.isEnabled ? "Ready (hold below to talk)" : "Enable Push-to-Talk"}
                  </button>

                  {mic.isEnabled && (
                    <button
                      onMouseDown={mic.pushToTalkStart}
                      onMouseUp={mic.pushToTalkEnd}
                      onMouseLeave={mic.pushToTalkEnd}
                      onTouchStart={(e) => { e.preventDefault(); mic.pushToTalkStart(); }}
                      onTouchEnd={(e) => { e.preventDefault(); mic.pushToTalkEnd(); }}
                      className={cn(
                        "w-full py-3 rounded-xl font-semibold text-sm transition-all select-none",
                        "border flex items-center justify-center gap-2",
                        mic.status === "speech_detected"
                          ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300 scale-[0.98]"
                          : "bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30 active:scale-[0.97]",
                      )}
                    >
                      <Mic className="h-4 w-4" />
                      {mic.status === "speech_detected" ? "Speaking…" : "Hold to Talk"}
                    </button>
                  )}
                </div>
              )}

              {/* ── Error notice ─────────────────────────────────────── */}
              {mic.error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <span className="text-xs text-red-300 flex-1">{mic.error}</span>
                  <button onClick={() => mic.disable()} className="text-red-400 hover:text-red-300">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* ── Live interim transcript ──────────────────────────── */}
              {mic.interimTranscript && (
                <div className="px-3 py-2 rounded-xl bg-cyan-500/8 border border-cyan-500/15">
                  <p className="text-xs text-cyan-300 italic opacity-80">{mic.interimTranscript}</p>
                </div>
              )}

              {/* ── Conversation thread ──────────────────────────────── */}
              {mic.transcripts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Conversation</span>
                    <button
                      onClick={mic.clearTranscripts}
                      className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                    {mic.transcripts.map((entry: TranscriptEntry) => (
                      <TranscriptBubble key={entry.id} entry={entry} />
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  VOICE DEBUG PANEL — always visible
              ──────────────────────────────────────────────────────── */}
              <VoiceDebugPanel
                mic={mic}
                sessionId={sessionId}
                isSessionActive={isSessionActive}
                isListening={isListening}
                ttsModeLive={ttsModeLive}
                ttsOk={ttsOk}
                lastStormReply={lastStormReply}
                lastTtsSpoken={lastTtsSpoken}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isStreamer = entry.side === "streamer";
  return (
    <div className={cn("flex", isStreamer ? "justify-end" : "justify-start")}>
      <div className={cn(
        "flex items-start gap-1.5 max-w-[90%]",
        isStreamer ? "flex-row-reverse" : "flex-row",
      )}>
        <div className={cn(
          "flex-none w-5 h-5 rounded-full flex items-center justify-center text-[9px] mt-0.5",
          isStreamer ? "bg-violet-500/20 text-violet-400" : "bg-cyan-500/20 text-cyan-400",
        )}>
          {isStreamer ? "Y" : <Bot className="h-3 w-3" />}
        </div>
        <div className={cn(
          "rounded-xl px-2.5 py-1.5 text-xs leading-snug",
          isStreamer
            ? "bg-violet-500/15 text-violet-100 rounded-tr-sm"
            : "bg-white/[0.06] text-slate-200 rounded-tl-sm",
        )}>
          {entry.text}
          {entry.lang && (
            <span className="ml-1.5 text-[9px] opacity-40">{entry.lang}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Always-visible Voice Debug Panel ───────────────────────────────────────

interface DebugProps {
  mic: ReturnType<typeof useStreamerMic>;
  sessionId: number | undefined;
  isSessionActive: boolean;
  isListening: boolean;
  ttsModeLive: string | undefined;
  ttsOk: boolean;
  lastStormReply: { text: string; ts: number } | null;
  lastTtsSpoken: string | null;
}

function DebugRow({
  label,
  value,
  ok,
  warn,
}: {
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="text-[10px] text-muted-foreground/60 flex-none w-28 shrink-0">{label}</span>
      <span className={cn(
        "text-[10px] font-mono text-right break-all leading-snug",
        ok   ? "text-emerald-400"         :
        warn ? "text-amber-400"           :
               "text-muted-foreground/80",
      )}>{value}</span>
    </div>
  );
}

function AudioLevelBar({ level, active }: { level: number; active: boolean }) {
  const BARS = 20;
  const filled = Math.round((level / 100) * BARS);
  return (
    <div className="flex items-center gap-0.5 h-3">
      {Array.from({ length: BARS }, (_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-sm transition-all duration-75",
            i < filled
              ? level > 70 ? "bg-red-400 h-3"
              : level > 40 ? "bg-amber-400 h-2.5"
              : "bg-emerald-400 h-2"
              : active ? "bg-white/10 h-1.5" : "bg-white/5 h-1",
          )}
        />
      ))}
      <span className="ml-1 text-[9px] text-muted-foreground/40 font-mono">{level}</span>
    </div>
  );
}

function VoiceDebugPanel({
  mic,
  sessionId,
  isSessionActive,
  isListening,
  ttsModeLive,
  ttsOk,
  lastStormReply,
  lastTtsSpoken,
}: DebugProps) {
  const fmtTs = (ts: number | null) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const lastSentDisplay = mic.lastSentText
    ? `"${mic.lastSentText.slice(0, 45)}${mic.lastSentText.length > 45 ? "…" : ""}"  ${fmtTs(mic.lastSentAt)}`
    : "—";

  const lastReplyDisplay = lastStormReply
    ? `"${lastStormReply.text.slice(0, 45)}${lastStormReply.text.length > 45 ? "…" : ""}"  ${fmtTs(lastStormReply.ts)}`
    : "—";

  const lastTtsDisplay = lastTtsSpoken
    ? `"${lastTtsSpoken.slice(0, 45)}${lastTtsSpoken.length > 45 ? "…" : ""}"`
    : "—";

  const ttsWarning = !ttsOk;

  return (
    <div className="rounded-xl border border-white/8 bg-black/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        <Radio className="h-3 w-3 text-violet-400/70" />
        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Voice Pipeline Debug
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-0.5">

        {/* 1. Microphone detected */}
        <DebugRow
          label="1. Mic detected"
          value={mic.browserSupported ? "✅ YES" : "❌ NO — use Chrome/Edge"}
          ok={mic.browserSupported}
          warn={!mic.browserSupported}
        />

        {/* 2. Listening */}
        <DebugRow
          label="2. Listening"
          value={
            isListening        ? "✅ YES — hearing you" :
            mic.status === "speech_detected" ? "✅ YES — speech detected" :
            mic.status === "processing"      ? "⏳ processing…" :
            mic.isEnabled      ? `⚠ ${mic.status}` :
                                 "❌ NO — press Start"
          }
          ok={isListening}
          warn={!isListening && mic.isEnabled}
        />

        {/* 3. Audio level meter */}
        <div className="flex items-center justify-between gap-3 py-0.5">
          <span className="text-[10px] text-muted-foreground/60 flex-none w-28">3. Audio level</span>
          <div className="flex-1 flex justify-end">
            {mic.isEnabled ? (
              <div className="flex items-center gap-1.5">
                {!mic.audioMeterReady && (
                  <span className="text-[9px] text-amber-400/70">perm?</span>
                )}
                <AudioLevelBar level={mic.audioLevel} active={mic.isEnabled} />
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/40 font-mono">start mic first</span>
            )}
          </div>
        </div>

        {/* 4. Last transcript */}
        <DebugRow
          label="4. Last transcript"
          value={
            mic.interimTranscript
              ? `"${mic.interimTranscript.slice(0, 50)}…" (interim)`
              : mic.lastFinalTranscript
              ? `"${mic.lastFinalTranscript.slice(0, 50)}"`
              : "—"
          }
          ok={!!(mic.interimTranscript || mic.lastFinalTranscript)}
        />

        {/* 5. Last streamer:speech sent */}
        <DebugRow
          label="5. Last sent ⬆"
          value={lastSentDisplay}
          ok={!!mic.lastSentText}
        />

        {/* 6. Last Storm reply */}
        <DebugRow
          label="6. Storm replied ⬇"
          value={lastReplyDisplay}
          ok={!!lastStormReply}
        />

        {/* 7. Last TTS spoken */}
        <DebugRow
          label="7. TTS spoken 🔊"
          value={lastTtsDisplay}
          ok={!!lastTtsSpoken}
        />

        {/* Session status */}
        <div className="border-t border-white/5 mt-2 pt-2">
          <DebugRow
            label="Session"
            value={isSessionActive && sessionId ? `✅ active #${sessionId}` : "❌ no active session"}
            ok={isSessionActive && !!sessionId}
            warn={!isSessionActive}
          />
        </div>

        {/* TTS mode warning */}
        {ttsWarning && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 px-2.5 py-2">
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-300/90 leading-snug">
              <strong>Storm cannot speak back.</strong>{" "}
              TTS mode is <code className="font-mono">{ttsModeLive ?? "off"}</code> — switch to{" "}
              <strong>OpenAI TTS</strong> in <em>AI Settings → Voice</em>.
              Storm hears you but replies will be silent.
            </p>
          </div>
        )}

        {ttsOk && (
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400/70">
            <CheckCircle2 className="h-3 w-3" />
            OpenAI TTS active — Storm will speak back
          </div>
        )}
      </div>
    </div>
  );
}
