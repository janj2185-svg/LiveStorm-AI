/**
 * CoHostPanel — Real-time voice conversation between streamer and Storm AI
 *
 * Renders:
 *   - Co-host mode ON/OFF toggle
 *   - Status indicator (idle / listening / speech_detected / waiting / processing)
 *   - Continuous vs Push-to-Talk mode selector
 *   - PTT hold button (push_to_talk mode)
 *   - Language selector
 *   - Live transcript (streamer ↔ Storm conversation thread)
 *   - Debug panel (collapsible)
 */

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Radio, Bot, ChevronDown, ChevronUp, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreamerMic, type TranscriptEntry } from "@/hooks/useStreamerMic";
import type { AiAnnouncementEvent } from "@/hooks/useLiveSession";

interface CoHostPanelProps {
  sendStreamerSpeech: ((text: string, lang: string) => void) | undefined;
  sessionId: number | undefined;
  isSessionActive: boolean;
  aiAnnouncements: AiAnnouncementEvent[];
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
  not_supported: { color: "text-red-400",    bg: "bg-red-500/10",    label: "Not supported",     pulse: false },
  idle:          { color: "text-slate-400",   bg: "bg-slate-500/10",  label: "Idle",               pulse: false },
  listening:     { color: "text-emerald-400", bg: "bg-emerald-500/10",label: "Listening…",         pulse: true  },
  speech_detected:{ color: "text-cyan-400",  bg: "bg-cyan-500/10",   label: "Hearing you…",       pulse: true  },
  waiting:       { color: "text-amber-400",   bg: "bg-amber-500/10",  label: "Sending…",           pulse: true  },
  processing:    { color: "text-violet-400",  bg: "bg-violet-500/10", label: "Storm is thinking…", pulse: true  },
  error:         { color: "text-red-400",     bg: "bg-red-500/10",    label: "Error",              pulse: false },
} as const;

// Track which announcement IDs we've already added as storm replies
const seenAnnouncementIds = new Set<number>();

export function CoHostPanel({
  sendStreamerSpeech,
  sessionId,
  isSessionActive,
  aiAnnouncements,
  defaultLang = "uk-UA",
}: CoHostPanelProps) {
  const [debugOpen, setDebugOpen] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const mic = useStreamerMic({
    sendStreamerSpeech,
    sessionId,
    isSessionActive,
    defaultLang,
  });

  // Watch aiAnnouncements for Storm's replies to streamer speech
  const prevAnnouncementsLength = useRef(0);
  useEffect(() => {
    if (aiAnnouncements.length <= prevAnnouncementsLength.current) {
      prevAnnouncementsLength.current = aiAnnouncements.length;
      return;
    }
    prevAnnouncementsLength.current = aiAnnouncements.length;

    // New announcements are prepended, so check the first item
    const newest = aiAnnouncements[0];
    if (!newest) return;
    // Only pick up streamer_speech type replies
    const id = newest.timestamp;
    if ((newest.type as string) === "streamer_speech" && !seenAnnouncementIds.has(id)) {
      seenAnnouncementIds.add(id);
      mic.addStormReply(newest.text);
      console.log(`[CoHostMic] ← Storm replied | "${newest.text.slice(0, 60)}"`);
    }
  }, [aiAnnouncements, mic]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mic.transcripts.length]);

  const statusCfg = STATUS_CONFIG[mic.status];

  return (
    <div className={cn(
      "rounded-2xl bg-white/[0.04] backdrop-blur-sm border overflow-hidden transition-all duration-300",
      mic.isEnabled && mic.isCoHostEnabled
        ? "border-violet-500/30 shadow-lg shadow-violet-500/8"
        : "border-white/8",
    )}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/20">
            <Mic className="h-3.5 w-3.5 text-violet-400" />
          </div>
          Co-Host Mic
        </span>

        {/* Co-Host Mode toggle */}
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

          {/* ── Status pill ──────────────────────────────────────────── */}
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

          {/* ── Not supported notice ─────────────────────────────────── */}
          {!mic.browserSupported && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-xs text-red-300">
                Speech recognition is not supported in this browser. Try Chrome or Edge.
              </p>
            </div>
          )}

          {mic.browserSupported && (
            <>
              {/* ── Mode selector ────────────────────────────────────── */}
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

              {/* ── Language selector ─────────────────────────────────── */}
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

              {/* ── Main mic button ───────────────────────────────────── */}
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
                /* PTT: two-button layout */
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

              {/* ── Error notice ──────────────────────────────────────── */}
              {mic.error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <span className="text-xs text-red-300 flex-1">{mic.error}</span>
                  <button onClick={() => mic.disable()} className="text-red-400 hover:text-red-300">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* ── Live interim transcript ───────────────────────────── */}
              {mic.interimTranscript && (
                <div className="px-3 py-2 rounded-xl bg-cyan-500/8 border border-cyan-500/15">
                  <p className="text-xs text-cyan-300 italic opacity-80">{mic.interimTranscript}</p>
                </div>
              )}

              {/* ── Conversation thread ───────────────────────────────── */}
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

                  <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                    {mic.transcripts.map((entry: TranscriptEntry) => (
                      <TranscriptBubble key={entry.id} entry={entry} />
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>
              )}

              {/* ── Debug panel ──────────────────────────────────────── */}
              <button
                onClick={() => setDebugOpen(d => !d)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
              >
                <Info className="h-3 w-3" />
                Debug
                {debugOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {debugOpen && (
                <DebugPanel mic={mic} sessionId={sessionId} isSessionActive={isSessionActive} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
          isStreamer
            ? "bg-violet-500/20 text-violet-400"
            : "bg-cyan-500/20 text-cyan-400",
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

function DebugPanel({
  mic,
  sessionId,
  isSessionActive,
}: {
  mic: ReturnType<typeof useStreamerMic>;
  sessionId: number | undefined;
  isSessionActive: boolean;
}) {
  const rows = [
    { label: "Browser support",    value: mic.browserSupported ? "✅ yes" : "❌ no" },
    { label: "Session ID",         value: sessionId ? `#${sessionId}` : "none" },
    { label: "Session active",     value: isSessionActive ? "✅ yes" : "❌ no" },
    { label: "Mic enabled",        value: mic.isEnabled ? "✅ on" : "off" },
    { label: "Mode",               value: mic.mode },
    { label: "Status",             value: mic.status },
    { label: "Language",           value: mic.lang },
    { label: "Interim transcript", value: mic.interimTranscript || "—" },
    { label: "Final transcript",   value: mic.lastFinalTranscript || "—" },
    { label: "Last sent",          value: mic.lastSentText ? `"${mic.lastSentText.slice(0, 40)}"` : "—" },
    { label: "Transcript entries", value: String(mic.transcripts.length) },
  ];

  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-3 space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">
        Debug
      </p>
      {rows.map(r => (
        <div key={r.label} className="flex items-start justify-between gap-2">
          <span className="text-[10px] text-muted-foreground/50 flex-none">{r.label}</span>
          <span className="text-[10px] text-muted-foreground font-mono text-right break-all">{r.value}</span>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground/30 mt-2 leading-relaxed">
        Pipeline: Mic → SpeechRecognition → silence 1.5s → streamer:speech (socket) → Orchestrator P3 → hostAgent CO-HOST → ai:announcement[type=streamer_speech] → Storm TTS
      </p>
    </div>
  );
}
