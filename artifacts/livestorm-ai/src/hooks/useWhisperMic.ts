/**
 * useWhisperMic — Server-side speech recognition via OpenAI Whisper
 *
 * Uses MediaRecorder + AnalyserNode VAD (Voice Activity Detection) instead
 * of browser SpeechRecognition.  Sends audio to /api/mic/transcribe when
 * silence is detected after speech.  Returns the same UseStreamerMicReturn
 * interface as useStreamerMic so CoHostPanel can swap them transparently.
 *
 * Advantages over browser SR:
 *  • Works reliably on Android Chrome (no no-speech loop)
 *  • Much higher accuracy for Ukrainian / multilingual speech
 *  • No Google SR quota limits or language model gaps
 *  • Same pipeline from desktop to mobile
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  UseStreamerMicReturn,
  MicMode,
  MicStatus,
  MicPermission,
  TranscriptEntry,
} from "./useStreamerMic";

// ── API base (matches useLiveSession pattern) ─────────────────────────────────
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE_URL}/api`;

// ── Platform detection ────────────────────────────────────────────────────────
const IS_ANDROID       = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
const IS_ANDROID_WEBVIEW = IS_ANDROID && /\bwv\b/i.test(navigator.userAgent);
const IS_IOS           = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── VAD thresholds ────────────────────────────────────────────────────────────
const SPEECH_THRESHOLD  = 5;    // % RMS level that counts as "speaking"
const SILENCE_THRESHOLD = 3;    // % below which counts as silence
const SILENCE_DURATION  = 900;  // ms of silence to end a phrase (mobile-safe)
const MIN_SPEECH_MS     = 300;  // discard phrases shorter than this

// ── Supported MIME types (priority order) ────────────────────────────────────
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function getSupportedMimeType(): string {
  for (const mt of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return "";
}

// ── Hook options ─────────────────────────────────────────────────────────────
export interface UseWhisperMicOptions {
  sendStreamerSpeech: ((text: string, lang: string) => void) | undefined;
  sessionId: number | undefined;
  isSessionActive: boolean;
  defaultLang?: string;
  getToken?: () => Promise<string | null>;
}

// ── Hook implementation ───────────────────────────────────────────────────────
export function useWhisperMic({
  sendStreamerSpeech,
  sessionId,
  isSessionActive,
  defaultLang = "uk-UA",
  getToken,
}: UseWhisperMicOptions): UseStreamerMicReturn {

  // ── UI State ───────────────────────────────────────────────────────────────
  const [status,             setStatus]           = useState<MicStatus>("idle");
  const [mode,               setModeState]        = useState<MicMode>("continuous");
  const [lang,               setLangState]        = useState(defaultLang);
  const [isEnabled,          setIsEnabled]        = useState(false);
  const [isCoHostEnabled,    setIsCoHostEnabled]  = useState(true);
  const [audioLevel,         setAudioLevel]       = useState(0);
  const [audioMeterReady,    setAudioMeterReady]  = useState(false);
  const [micPermission,      setMicPermission]    = useState<MicPermission>("unknown");
  const [interimTranscript,  setInterimTranscript]  = useState("");
  const [lastFinalTranscript,setLastFinalTranscript] = useState("");
  const [lastSentText,       setLastSentText]     = useState("");
  const [lastSentAt,         setLastSentAt]       = useState<number | null>(null);
  const [transcripts,        setTranscripts]      = useState<TranscriptEntry[]>([]);
  const [error,              setError]            = useState<string | null>(null);
  const [speechRecogActive,  setSpeechRecogActive] = useState(false);
  const [noSpeechCount,      setNoSpeechCount]    = useState(0); // unused in Whisper but kept for interface parity
  const [srRestartCount,     setSrRestartCount]   = useState(0); // phrase count

  // ── Audio infrastructure refs ──────────────────────────────────────────────
  const streamRef       = useRef<MediaStream | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const mediaRecRef     = useRef<MediaRecorder | null>(null);
  const vadIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Recording state refs ───────────────────────────────────────────────────
  const audioChunksRef     = useRef<Blob[]>([]);
  const recStateRef        = useRef<"idle" | "recording" | "sending">("idle");
  const silenceStartRef    = useRef<number | null>(null);
  const speechStartRef     = useRef<number | null>(null);

  // ── Stable closure refs ────────────────────────────────────────────────────
  const enabledRef  = useRef(false);
  const sendRef     = useRef(sendStreamerSpeech);
  const sessionRef  = useRef(sessionId);
  const langRef     = useRef(lang);
  const modeRef     = useRef(mode);
  const pttActiveRef = useRef(false);
  const getTokenRef = useRef(getToken);

  useEffect(() => { sendRef.current     = sendStreamerSpeech; }, [sendStreamerSpeech]);
  useEffect(() => { sessionRef.current  = sessionId;          }, [sessionId]);
  useEffect(() => { langRef.current     = lang;               }, [lang]);
  useEffect(() => { modeRef.current     = mode;               }, [mode]);
  useEffect(() => { getTokenRef.current = getToken;           }, [getToken]);

  // ── Audio level (0-100) ───────────────────────────────────────────────────
  const getAudioLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    return Math.round((avg / 255) * 100);
  }, []);

  // ── Transcribe blob via Whisper ───────────────────────────────────────────
  const transcribeAudio = useCallback(async (blob: Blob): Promise<string> => {
    const langCode = langRef.current.split("-")[0];
    const activeSessionId = sessionRef.current;
    if (!activeSessionId) throw new Error("No active session for transcription");
    let token: string | null = null;
    try { token = (await getTokenRef.current?.()) ?? null; } catch {}

    const headers: Record<string, string> = { "Content-Type": blob.type || "audio/webm" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const params = new URLSearchParams({ lang: langCode, sessionId: String(activeSessionId) });
    const res = await fetch(`${API_BASE}/mic/transcribe?${params.toString()}`, {
      method: "POST",
      headers,
      body: blob,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error((body.detail as string) ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { text: string; duration_ms: number };
    console.log(`[Whisper:client] ✓ ${data.duration_ms}ms | "${data.text.slice(0, 80)}"`);
    return data.text.trim();
  }, []);

  // ── Stop recording → send to Whisper → emit ───────────────────────────────
  const stopAndTranscribe = useCallback(() => {
    const mr = mediaRecRef.current;
    if (!mr || mr.state === "inactive") return;

    const speechMs = speechStartRef.current ? Date.now() - speechStartRef.current : 0;
    if (speechMs < MIN_SPEECH_MS) {
      console.log(`[Whisper:VAD] phrase too short (${speechMs}ms) — discarding`);
      try { mr.stop(); } catch {}
      audioChunksRef.current = [];
      speechStartRef.current = null;
      silenceStartRef.current = null;
      recStateRef.current = "idle";
      setSpeechRecogActive(false);
      if (enabledRef.current) setStatus("listening");
      return;
    }

    recStateRef.current = "sending";
    setStatus("processing");
    setSpeechRecogActive(false);
    try { mr.stop(); } catch {}
  }, []);

  // ── VAD polling loop ──────────────────────────────────────────────────────
  const startVAD = useCallback(() => {
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);

    vadIntervalRef.current = setInterval(() => {
      if (!enabledRef.current) return;
      const level = getAudioLevel();
      setAudioLevel(level);

      if (modeRef.current === "push_to_talk") return; // PTT handles recording

      const state = recStateRef.current;

      if (state === "idle") {
        if (level >= SPEECH_THRESHOLD) {
          const mr = mediaRecRef.current;
          if (mr && mr.state === "inactive") {
            console.log(`[Whisper:VAD] speech start level=${level}% → MediaRecorder.start()`);
            audioChunksRef.current = [];
            speechStartRef.current = Date.now();
            silenceStartRef.current = null;
            mr.start();
            recStateRef.current = "recording";
            setSpeechRecogActive(true);
            setStatus("speech_detected");
          }
        }
      } else if (state === "recording") {
        if (level < SILENCE_THRESHOLD) {
          if (!silenceStartRef.current) silenceStartRef.current = Date.now();
          const silenceMs = Date.now() - silenceStartRef.current;
          if (silenceMs >= SILENCE_DURATION) {
            console.log(`[Whisper:VAD] silence ${silenceMs}ms → stopAndTranscribe`);
            silenceStartRef.current = null;
            stopAndTranscribe();
          }
        } else {
          silenceStartRef.current = null;
        }
      }
      // state === "sending" → wait for onstop to finish
    }, 50);
  }, [getAudioLevel, stopAndTranscribe]);

  const stopVAD = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
  }, []);

  // ── Setup audio infrastructure ────────────────────────────────────────────
  const setupAudio = useCallback(async (): Promise<boolean> => {
    try {
      setMicPermission("unknown");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setMicPermission("granted");

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        if (recStateRef.current !== "sending") return;
        const chunks = audioChunksRef.current.splice(0);
        speechStartRef.current = null;

        if (chunks.length === 0) {
          recStateRef.current = "idle";
          if (enabledRef.current) setStatus("listening");
          return;
        }

        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        try {
          const text = await transcribeAudio(blob);
          if (text && text.length >= 2) {
            setLastFinalTranscript(text);
            setInterimTranscript("");
            const currentLang = langRef.current.split("-")[0];
            if (sendRef.current && sessionRef.current) {
              console.log(`[Whisper:emit] → sendStreamerSpeech | "${text.slice(0, 60)}"`);
              setLastSentText(text);
              setLastSentAt(Date.now());
              sendRef.current(text, currentLang);
              setSrRestartCount(c => c + 1);
              setTranscripts(prev => [
                ...prev.slice(-49),
                { id: `w-${Date.now()}`, side: "streamer", text, ts: Date.now(), lang: currentLang },
              ]);
            } else {
              console.warn(`[Whisper:emit] ✗ BLOCKED sendRef=${!!sendRef.current} sessionRef=${sessionRef.current}`);
            }
          } else {
            console.log(`[Whisper:emit] text empty/too short ("${text}") — discarding`);
          }
        } catch (err) {
          console.error("[Whisper:transcribe] ✗", err);
          setError(`Transcription error: ${(err as Error).message}`);
        }

        recStateRef.current = "idle";
        if (enabledRef.current) setStatus("listening");
      };
      mediaRecRef.current = mr;

      setAudioMeterReady(true);
      return true;
    } catch (err) {
      const msg = (err as Error).message ?? "unknown";
      console.error("[Whisper:setupAudio] ✗", msg);
      if (/denied|Permission/i.test(msg)) {
        setMicPermission("denied");
        setError("Microphone access denied. Allow mic in browser settings, then reload.");
      } else if (/MediaRecorder/i.test(msg)) {
        setError("MediaRecorder not supported in this browser. Use Chrome or Firefox.");
      } else {
        setError(`Mic setup failed: ${msg}`);
      }
      return false;
    }
  }, [transcribeAudio]);

  // ── Teardown ──────────────────────────────────────────────────────────────
  const teardownAudio = useCallback(() => {
    stopVAD();
    const mr = mediaRecRef.current;
    if (mr && mr.state !== "inactive") { try { mr.stop(); } catch {} }
    mediaRecRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
    recStateRef.current = "idle";
    speechStartRef.current = null;
    silenceStartRef.current = null;
    setAudioMeterReady(false);
    setAudioLevel(0);
    setSpeechRecogActive(false);
  }, [stopVAD]);

  // ── enable() ─────────────────────────────────────────────────────────────
  const enable = useCallback(async () => {
    console.log(`[Whisper:enable] sessionId=${sessionRef.current} isSessionActive=${isSessionActive}`);
    if (!isSessionActive || !sessionRef.current) {
      setError("Start a live session first to enable voice.");
      return;
    }
    setError(null);
    const ok = await setupAudio();
    if (!ok) return;
    enabledRef.current = true;
    setIsEnabled(true);
    setStatus("listening");
    setNoSpeechCount(0);
    setSrRestartCount(0);
    startVAD();
  }, [isSessionActive, setupAudio, startVAD]);

  // ── disable() ─────────────────────────────────────────────────────────────
  const disable = useCallback(() => {
    console.log("[Whisper:disable]");
    enabledRef.current = false;
    teardownAudio();
    setIsEnabled(false);
    setStatus("idle");
    setInterimTranscript("");
    setNoSpeechCount(0);
    setSrRestartCount(0);
    pttActiveRef.current = false;
  }, [teardownAudio]);

  // ── Push-to-talk ──────────────────────────────────────────────────────────
  const pushToTalkStart = useCallback(() => {
    if (!enabledRef.current) return;
    pttActiveRef.current = true;
    const mr = mediaRecRef.current;
    if (mr && mr.state === "inactive") {
      audioChunksRef.current = [];
      speechStartRef.current = Date.now();
      mr.start();
      recStateRef.current = "recording";
      setSpeechRecogActive(true);
      setStatus("speech_detected");
    }
  }, []);

  const pushToTalkEnd = useCallback(() => {
    pttActiveRef.current = false;
    if (recStateRef.current === "recording") stopAndTranscribe();
  }, [stopAndTranscribe]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const setMode = useCallback((m: MicMode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const setLang = useCallback((l: string) => {
    langRef.current = l;
    setLangState(l);
  }, []);

  const addStormReply = useCallback((text: string) => {
    setTranscripts(prev => [
      ...prev.slice(-49),
      { id: `storm-${Date.now()}`, side: "storm", text, ts: Date.now() },
    ]);
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  // ── Lifecycle guards ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSessionActive && enabledRef.current) disable();
  }, [isSessionActive, disable]);

  useEffect(() => () => {
    enabledRef.current = false;
    teardownAudio();
  }, [teardownAudio]);

  // ── Return (same interface as useStreamerMic) ──────────────────────────────
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
    browserSupported:  !!(typeof MediaRecorder !== "undefined"),
    isAndroidChrome:   IS_ANDROID && !IS_ANDROID_WEBVIEW,
    isIos:             IS_IOS,
    isWebView:         IS_ANDROID_WEBVIEW,
    audioLevel,
    audioMeterReady,
    micPermission,
    speechRecogActive,
    noSpeechCount,
    srRestartCount,
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
