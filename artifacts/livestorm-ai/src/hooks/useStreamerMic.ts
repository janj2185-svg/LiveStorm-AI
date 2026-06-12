/**
 * useStreamerMic — Streamer microphone → Storm AI co-host
 *
 * Numbered diagnostic logs at every step of the pipeline:
 *   [Mic:1]  Mic permission query
 *   [Mic:2]  SpeechRecognition API check
 *   [Mic:3]  enable() called
 *   [Mic:4]  buildAndStart()
 *   [Mic:5]  SR onstart fired
 *   [Mic:6]  SR onresult — interim/final text
 *   [Mic:7]  silence timer → flushAccumulated
 *   [Mic:8]  sendRef.current(text, lang) called
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type MicMode   = "continuous" | "push_to_talk";
export type MicStatus =
  | "not_supported"
  | "idle"
  | "listening"
  | "speech_detected"
  | "waiting"
  | "processing"
  | "error";

export type MicPermission = "unknown" | "granted" | "denied";

export interface TranscriptEntry {
  id: string;
  side: "streamer" | "storm";
  text: string;
  ts: number;
  lang?: string;
}

interface SrAlternative { readonly transcript: string; readonly confidence: number; }
interface SrResult     { readonly isFinal: boolean; readonly length: number; [i: number]: SrAlternative; }
interface SrResultList { readonly length: number; [i: number]: SrResult; }
interface SrResultEvent extends Event { readonly resultIndex: number; readonly results: SrResultList; }
interface SrErrorEvent  extends Event { readonly error: string; readonly message: string; }

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SrResultEvent) => void) | null;
  onerror: ((ev: SrErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

// Android Chrome ignores continuous=true and stops after each utterance.
// We detect it at module level so we can adjust behaviour at runtime.
const IS_ANDROID = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

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
  lastSentAt: number | null;
  transcripts: TranscriptEntry[];
  error: string | null;
  browserSupported: boolean;
  isAndroidChrome: boolean;
  audioLevel: number;
  audioMeterReady: boolean;
  micPermission: MicPermission;
  speechRecogActive: boolean;
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
  // Start as "not_supported" immediately if the browser can't handle SR.
  const [status,              setStatus]              = useState<MicStatus>(() => {
    if (typeof window === "undefined") return "idle";
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition) ? "idle" : "not_supported";
  });
  const [mode,                setModeState]           = useState<MicMode>("continuous");
  const [isEnabled,           setIsEnabled]           = useState(false);
  const [isCoHostEnabled,     setIsCoHostEnabled]     = useState(true);
  const [interimTranscript,   setInterimTranscript]   = useState("");
  const [lastFinalTranscript, setLastFinalTranscript] = useState("");
  const [lastSentText,        setLastSentText]        = useState("");
  const [lastSentAt,          setLastSentAt]          = useState<number | null>(null);
  const [transcripts,         setTranscripts]         = useState<TranscriptEntry[]>([]);
  const [error,               setError]               = useState<string | null>(null);
  const [lang,                setLangState]           = useState(defaultLang);
  const [audioLevel,          setAudioLevel]          = useState(0);
  const [audioMeterReady,     setAudioMeterReady]     = useState(false);
  const [micPermission,       setMicPermission]       = useState<MicPermission>("unknown");
  const [speechRecogActive,   setSpeechRecogActive]   = useState(false);

  const recognitionRef   = useRef<SpeechRecognitionLike | null>(null);
  const accumulatorRef   = useRef<string>("");
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef       = useRef(false);
  const modeRef          = useRef<MicMode>("continuous");
  const pttActiveRef     = useRef(false);
  const langRef          = useRef(defaultLang);

  const audioContextRef  = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const audioStreamRef   = useRef<MediaStream | null>(null);
  const levelTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendRef     = useRef(sendStreamerSpeech);
  const sessionRef  = useRef(sessionId);
  useEffect(() => { sendRef.current    = sendStreamerSpeech; }, [sendStreamerSpeech]);
  useEffect(() => { sessionRef.current = sessionId;          }, [sessionId]);
  useEffect(() => { langRef.current    = lang;               }, [lang]);

  const browserSupported = typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── [Mic:1] Check microphone permission ────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    navigator.permissions?.query?.({ name: "microphone" as PermissionName })
      .then(result => {
        const p = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "unknown";
        setMicPermission(p);
        console.log(`[Mic:1] Permission query result: ${result.state} → ${p}`);
        result.onchange = () => {
          const p2 = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "unknown";
          setMicPermission(p2);
          console.log(`[Mic:1] Permission changed: ${result.state} → ${p2}`);
        };
      })
      .catch(() => {
        console.warn("[Mic:1] navigator.permissions.query not supported — permission unknown");
      });
  }, []);

  // ── Audio level meter via getUserMedia + AnalyserNode ─────────────────────
  const startAudioMeter = useCallback(async () => {
    if (audioContextRef.current) return;
    try {
      console.log("[Mic:2b] getUserMedia requesting mic permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicPermission("granted");
      console.log("[Mic:2b] ✅ getUserMedia granted — AudioContext starting");
      audioStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setAudioMeterReady(true);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      levelTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        const sum = buf.reduce((a, b) => a + b, 0);
        const avg = sum / buf.length;
        setAudioLevel(Math.min(100, Math.round(avg * 100 / 64)));
      }, 80);
    } catch (e) {
      setMicPermission("denied");
      console.warn("[Mic:2b] ❌ getUserMedia DENIED or error:", (e as Error)?.message);
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (levelTimerRef.current) { clearInterval(levelTimerRef.current); levelTimerRef.current = null; }
    try { audioContextRef.current?.close(); } catch { /* ignore */ }
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current = null;
    analyserRef.current = null;
    audioStreamRef.current = null;
    setAudioLevel(0);
    setAudioMeterReady(false);
  }, []);

  // ── Detect language from transcript text ───────────────────────────────────
  const detectLang = useCallback((text: string): string => {
    if (/[іїєІЇЄґҐ]/.test(text))           return "uk";
    if (/[ąęóśźżćłńĄĘÓŚŹŻĆŁŃ]/.test(text)) return "pl";
    if (/[а-яА-Я]/.test(text))              return langRef.current.split("-")[0];
    return langRef.current.split("-")[0];
  }, []);

  // ── Send accumulated text to backend ──────────────────────────────────────
  const flushAccumulated = useCallback(() => {
    const text = accumulatorRef.current.trim();
    console.log(`[Mic:7] flushAccumulated | text="${text.slice(0, 70)}" | len=${text.length} | minChars=${MIN_CHARS}`);
    if (text.length < MIN_CHARS) {
      console.warn(`[Mic:7] ✗ text too short (${text.length} < ${MIN_CHARS}) — not sending`);
      accumulatorRef.current = "";
      return;
    }
    if (!sendRef.current || !sessionRef.current) {
      console.warn(`[Mic:8] ✗ BLOCKED — sendRef=${sendRef.current ? "ok" : "NULL"} | sessionRef=${sessionRef.current ?? "NULL"}`);
      return;
    }
    const shortLang = detectLang(text);
    console.log(`[Mic:8] ✅ calling sendStreamerSpeech | lang=${shortLang} | "${text.slice(0, 70)}"`);
    sendRef.current(text, shortLang);
    const now = Date.now();
    setLastSentText(text);
    setLastSentAt(now);
    setTranscripts(prev => [...prev, {
      id: `${now}-s`,
      side: "streamer" as const,
      text,
      ts: now,
      lang: shortLang,
    }].slice(-20));
    accumulatorRef.current = "";
    setLastFinalTranscript("");
    setInterimTranscript("");
    setStatus("processing");
  }, [detectLang]);

  // ── Build a fresh SpeechRecognition instance ───────────────────────────────
  const buildAndStart = useCallback(() => {
    console.log(`[Mic:4] buildAndStart() | browserSupported=${browserSupported} | lang=${langRef.current}`);
    if (!browserSupported) {
      console.warn("[Mic:4] ✗ SpeechRecognition not supported in this browser");
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    // Android Chrome ignores continuous=true — use false and restart manually via onend.
    rec.continuous      = !IS_ANDROID;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = langRef.current;
    recognitionRef.current = rec;
    console.log(`[Mic:4] ✅ SR created | lang=${rec.lang} | continuous=${rec.continuous} | android=${IS_ANDROID} | interimResults=true`);

    rec.onstart = () => {
      console.log(`[Mic:5] ✅ SR onstart fired — NOW LISTENING | lang=${langRef.current}`);
      setSpeechRecogActive(true);
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
      if (newFinal || interim) {
        console.log(`[Mic:6] onresult | isFinal=${!!newFinal} | interim="${interim.slice(0,60)}" | final="${newFinal.slice(0,60)}"`);
      }

      if (newFinal) {
        accumulatorRef.current += (accumulatorRef.current ? " " : "") + newFinal.trim();
        console.log(`[SpeechRecognized] ✅ final segment="${newFinal.trim().slice(0, 60)}" | accumulated="${accumulatorRef.current.slice(0, 80)}" | totalLen=${accumulatorRef.current.length}`);
        setLastFinalTranscript(accumulatorRef.current);
        setInterimTranscript("");
        setStatus("speech_detected");
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          console.log(`[Mic:7] silence timer fired (${SILENCE_MS}ms) — flushing`);
          setStatus("waiting");
          flushAccumulated();
        }, SILENCE_MS);
      } else if (interim) {
        setInterimTranscript(interim);
        setStatus("speech_detected");
      }
    };

    rec.onerror = (event) => {
      // Ignore expected non-errors
      if (event.error === "no-speech" || event.error === "aborted") return;
      // Network errors: SR will fire onend and restart automatically — no UI alert needed
      if (event.error === "network") {
        console.warn("[Mic:5] SR network error — will restart via onend");
        return;
      }
      // Permission denied — stop mic, show actionable message
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setMicPermission("denied");
        setError("Microphone access denied. Allow mic in browser settings, then reload the page.");
        setStatus("error");
        enabledRef.current = false;
        setIsEnabled(false);
        return;
      }
      console.warn(`[Mic:5] ✗ SR onerror: ${event.error} — ${event.message ?? ""}`);
      setError(`Microphone error: ${event.error}`);
      setStatus("error");
    };

    rec.onend = () => {
      setSpeechRecogActive(false);
      // Always null before restart so we never call .start() on a dead instance.
      recognitionRef.current = null;
      console.log(`[Mic:5] SR onend | enabled=${enabledRef.current} | mode=${modeRef.current} | ptt=${pttActiveRef.current} | android=${IS_ANDROID}`);
      if (enabledRef.current && modeRef.current === "continuous") {
        // Android needs a longer pause + always creates a fresh instance (continuous=false there).
        const delay = IS_ANDROID ? 600 : 200;
        setTimeout(() => {
          if (!enabledRef.current) return;
          buildAndStart();
        }, delay);
      } else if (!pttActiveRef.current) {
        setStatus("idle");
      }
    };

    try {
      console.log("[Mic:4] → calling rec.start()...");
      rec.start();
    } catch (e) {
      console.warn("[Mic:4] ✗ rec.start() threw:", e);
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
    setSpeechRecogActive(false);
  }, [flushAccumulated]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const enable = useCallback(() => {
    console.log(`[Mic:3] enable() called | isSessionActive=${isSessionActive} | sessionId=${sessionRef.current} | browserSupported=${browserSupported} | android=${IS_ANDROID}`);
    if (!browserSupported) {
      const msg = IS_ANDROID
        ? "Voice recognition is not supported in this browser on Android. Please use Chrome for Android."
        : "Voice recognition is not supported in this browser. Please use Chrome or Edge.";
      setStatus("not_supported");
      setError(msg);
      console.warn(`[Mic:3] ✗ BLOCKED — browserSupported=false`);
      return;
    }
    if (!isSessionActive || !sessionRef.current) {
      console.warn(`[Mic:3] ✗ BLOCKED — isSessionActive=${isSessionActive} | sessionId=${sessionRef.current ?? "NULL"}`);
      return;
    }
    console.log("[Mic:3] ✅ starting mic — calling startAudioMeter + buildAndStart");
    enabledRef.current = true;
    setIsEnabled(true);
    setError(null);
    void startAudioMeter();
    if (modeRef.current === "continuous") {
      buildAndStart();
    } else {
      setStatus("listening");
    }
  }, [isSessionActive, buildAndStart, startAudioMeter, browserSupported]);

  const disable = useCallback(() => {
    console.log("[Mic] disable() called");
    enabledRef.current = false;
    pttActiveRef.current = false;
    setIsEnabled(false);
    stopRecognition(true);
    stopAudioMeter();
    setStatus("idle");
    setInterimTranscript("");
  }, [stopRecognition, stopAudioMeter]);

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
      side: "storm" as const,
      text,
      ts: Date.now(),
    }].slice(-20));
    if (enabledRef.current) {
      setStatus("listening");
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
    setLastSentAt(null);
  }, []);

  useEffect(() => {
    if (!isSessionActive && enabledRef.current) { disable(); }
  }, [isSessionActive, disable]);

  useEffect(() => () => {
    enabledRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* ignore */ } }
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    try { audioContextRef.current?.close(); } catch { /* ignore */ }
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return {
    status,
    mode,
    isEnabled,
    isCoHostEnabled,
    interimTranscript,
    lastFinalTranscript,
    lastSentText,
    lastSentAt,
    transcripts,
    error,
    browserSupported,
    isAndroidChrome: IS_ANDROID,
    audioLevel,
    audioMeterReady,
    micPermission,
    speechRecogActive,
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
