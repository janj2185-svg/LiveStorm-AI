/**
 * useStreamerMic — Streamer microphone → Storm AI co-host
 *
 * Uses the Web Speech API (SpeechRecognition) to capture the streamer's voice,
 * accumulates spoken text with silence detection, then emits `streamer:speech`
 * via the existing socket connection to the backend orchestrator (P3 priority).
 *
 * Modes:
 *   continuous   — auto-restarts after every result; listens until disabled
 *   push_to_talk — only records while pushToTalkStart() is held
 *
 * Status flow:
 *   idle → listening → speech_detected → waiting (1.5s silence) → processing
 *   processing resets to listening after Storm replies
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type MicMode   = "continuous" | "push_to_talk";
export type MicStatus =
  | "not_supported"   // SpeechRecognition not available in this browser
  | "idle"            // mic off or session inactive
  | "listening"       // microphone open, waiting for speech
  | "speech_detected" // interim results flowing in
  | "waiting"         // final result received, silence timer running (1.5s)
  | "processing"      // sent to backend, waiting for Storm's reply
  | "error";          // SpeechRecognition error

export interface TranscriptEntry {
  id: string;
  side: "streamer" | "storm";
  text: string;
  ts: number;
  lang?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface UseStreamerMicOptions {
  sendStreamerSpeech: ((text: string, lang: string) => void) | undefined;
  sessionId: number | undefined;
  isSessionActive: boolean;
  defaultLang?: string;
}

export interface UseStreamerMicReturn {
  status: MicStatus;
  mode: MicMode;
  isEnabled: boolean;
  isCoHostEnabled: boolean;
  interimTranscript: string;
  lastFinalTranscript: string;
  lastSentText: string;
  transcripts: TranscriptEntry[];
  error: string | null;
  browserSupported: boolean;
  lang: string;
  setMode: (mode: MicMode) => void;
  setLang: (lang: string) => void;
  setCoHostEnabled: (enabled: boolean) => void;
  enable: () => void;
  disable: () => void;
  pushToTalkStart: () => void;
  pushToTalkEnd: () => void;
  addStormReply: (text: string) => void;
  clearTranscripts: () => void;
}

const SILENCE_MS = 1500;
const MIN_CHARS  = 3;

export function useStreamerMic({
  sendStreamerSpeech,
  sessionId,
  isSessionActive,
  defaultLang = "uk-UA",
}: UseStreamerMicOptions): UseStreamerMicReturn {
  const [status,              setStatus]              = useState<MicStatus>("idle");
  const [mode,                setModeState]           = useState<MicMode>("continuous");
  const [isEnabled,           setIsEnabled]           = useState(false);
  const [isCoHostEnabled,     setIsCoHostEnabled]     = useState(true);
  const [interimTranscript,   setInterimTranscript]   = useState("");
  const [lastFinalTranscript, setLastFinalTranscript] = useState("");
  const [lastSentText,        setLastSentText]        = useState("");
  const [transcripts,         setTranscripts]         = useState<TranscriptEntry[]>([]);
  const [error,               setError]               = useState<string | null>(null);
  const [lang,                setLangState]           = useState(defaultLang);

  const recognitionRef   = useRef<SpeechRecognition | null>(null);
  const accumulatorRef   = useRef<string>("");
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef       = useRef(false);
  const modeRef          = useRef<MicMode>("continuous");
  const pttActiveRef     = useRef(false);
  const langRef          = useRef(defaultLang);

  // Keep stable refs to latest prop values (avoids stale closures in callbacks)
  const sendRef     = useRef(sendStreamerSpeech);
  const sessionRef  = useRef(sessionId);
  useEffect(() => { sendRef.current    = sendStreamerSpeech; }, [sendStreamerSpeech]);
  useEffect(() => { sessionRef.current = sessionId;          }, [sessionId]);
  useEffect(() => { langRef.current    = lang;               }, [lang]);

  const browserSupported = typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── Detect language from transcript text ───────────────────────────────────
  const detectLang = useCallback((text: string): string => {
    if (/[іїєІЇЄґҐ]/.test(text))       return "uk";
    if (/[ąęóśźżćłńĄĘÓŚŹŻĆŁŃ]/.test(text)) return "pl";
    if (/[а-яА-Я]/.test(text))           return langRef.current.split("-")[0];
    return langRef.current.split("-")[0];
  }, []);

  // ── Send accumulated text to backend ──────────────────────────────────────
  const flushAccumulated = useCallback(() => {
    const text = accumulatorRef.current.trim();
    if (text.length < MIN_CHARS) { accumulatorRef.current = ""; return; }
    if (!sendRef.current || !sessionRef.current) {
      console.warn("[CoHostMic] Cannot send — no socket or session");
      return;
    }
    const shortLang = detectLang(text);
    console.log(`[CoHostMic] 🎙️ flush | "${text.slice(0, 70)}" | lang=${shortLang}`);
    sendRef.current(text, shortLang);
    setLastSentText(text);
    setTranscripts(prev => [...prev, {
      id: `${Date.now()}-s`,
      side: "streamer",
      text,
      ts: Date.now(),
      lang: shortLang,
    }].slice(-20));
    accumulatorRef.current = "";
    setLastFinalTranscript("");
    setInterimTranscript("");
    setStatus("processing");
  }, [detectLang]);

  // ── Build a fresh SpeechRecognition instance ───────────────────────────────
  const buildAndStart = useCallback(() => {
    if (!browserSupported) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = langRef.current;
    recognitionRef.current = rec;

    rec.onstart = () => {
      console.log(`[CoHostMic] ▶ listening | lang=${langRef.current}`);
      setStatus("listening");
      setError(null);
    };

    rec.onresult = (event) => {
      let interim = "";
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) newFinal += r[0].transcript;
        else            interim  += r[0].transcript;
      }

      if (newFinal) {
        accumulatorRef.current += (accumulatorRef.current ? " " : "") + newFinal.trim();
        setLastFinalTranscript(accumulatorRef.current);
        setInterimTranscript("");
        setStatus("speech_detected");
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          setStatus("waiting");
          flushAccumulated();
        }, SILENCE_MS);
      } else if (interim) {
        setInterimTranscript(interim);
        setStatus("speech_detected");
      }
    };

    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.warn(`[CoHostMic] ✗ error: ${event.error}`);
      setError(`Microphone error: ${event.error}`);
      setStatus("error");
    };

    rec.onend = () => {
      console.log(`[CoHostMic] ◼ ended | enabled=${enabledRef.current} | mode=${modeRef.current} | ptt=${pttActiveRef.current}`);
      if (enabledRef.current && modeRef.current === "continuous") {
        // Continuous mode: auto-restart
        setTimeout(() => {
          if (!enabledRef.current) return;
          try { recognitionRef.current?.start(); }
          catch {
            // Instance was replaced or already started — rebuild
            buildAndStart();
          }
        }, 200);
      } else if (!pttActiveRef.current) {
        setStatus("idle");
      }
    };

    try {
      rec.start();
    } catch (e) {
      console.warn("[CoHostMic] start() failed:", e);
      setStatus("error");
      setError("Failed to start microphone. Check browser permissions.");
    }
  }, [browserSupported, flushAccumulated]);

  // ── Stop and optionally flush ──────────────────────────────────────────────
  const stopRecognition = useCallback((flush: boolean) => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (flush && accumulatorRef.current.trim().length >= MIN_CHARS) {
      flushAccumulated();
    } else {
      accumulatorRef.current = "";
      setInterimTranscript("");
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, [flushAccumulated]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const enable = useCallback(() => {
    if (!isSessionActive || !sessionRef.current) {
      console.warn("[CoHostMic] Cannot enable — no active session");
      return;
    }
    enabledRef.current = true;
    setIsEnabled(true);
    setError(null);
    if (modeRef.current === "continuous") {
      buildAndStart();
    } else {
      setStatus("listening"); // PTT: ready, not yet recording
    }
  }, [isSessionActive, buildAndStart]);

  const disable = useCallback(() => {
    enabledRef.current = false;
    pttActiveRef.current = false;
    setIsEnabled(false);
    stopRecognition(true);
    setStatus("idle");
    setInterimTranscript("");
  }, [stopRecognition]);

  const setMode = useCallback((m: MicMode) => {
    modeRef.current = m;
    setModeState(m);
    if (!enabledRef.current) return;
    stopRecognition(true);
    if (m === "continuous") buildAndStart();
    else setStatus("listening");
  }, [stopRecognition, buildAndStart]);

  const setLang = useCallback((l: string) => {
    setLangState(l);
    langRef.current = l;
    if (!enabledRef.current) return;
    stopRecognition(true);
    if (modeRef.current === "continuous") buildAndStart();
  }, [stopRecognition, buildAndStart]);

  const pushToTalkStart = useCallback(() => {
    if (!enabledRef.current || modeRef.current !== "push_to_talk") return;
    pttActiveRef.current = true;
    buildAndStart();
  }, [buildAndStart]);

  const pushToTalkEnd = useCallback(() => {
    if (!enabledRef.current || modeRef.current !== "push_to_talk") return;
    pttActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (accumulatorRef.current.trim().length >= MIN_CHARS) {
      flushAccumulated();
    }
    setStatus("listening");
  }, [flushAccumulated]);

  const addStormReply = useCallback((text: string) => {
    setTranscripts(prev => [...prev, {
      id: `${Date.now()}-r`,
      side: "storm",
      text,
      ts: Date.now(),
    }].slice(-20));
    // After Storm replies, go back to listening
    if (enabledRef.current) {
      setStatus(modeRef.current === "push_to_talk" ? "listening" : "listening");
      if (modeRef.current === "continuous" && !recognitionRef.current) {
        setTimeout(buildAndStart, 300);
      }
    }
  }, [buildAndStart]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    accumulatorRef.current = "";
    setInterimTranscript("");
    setLastFinalTranscript("");
    setLastSentText("");
  }, []);

  // Auto-disable when session ends
  useEffect(() => {
    if (!isSessionActive && enabledRef.current) { disable(); }
  }, [isSessionActive, disable]);

  // Cleanup on unmount
  useEffect(() => () => {
    enabledRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* ignore */ } }
  }, []);

  return {
    status,
    mode,
    isEnabled,
    isCoHostEnabled,
    interimTranscript,
    lastFinalTranscript,
    lastSentText,
    transcripts,
    error,
    browserSupported,
    lang,
    setMode,
    setLang,
    setCoHostEnabled: setIsCoHostEnabled,
    enable,
    disable,
    pushToTalkStart,
    pushToTalkEnd,
    addStormReply,
    clearTranscripts,
  };
}
