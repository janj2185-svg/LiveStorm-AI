import { useEffect, useRef, useState } from "react";

export interface LipSyncState {
  mouthOpen: number;
  isSpeaking: boolean;
}

export function useLipSync({
  sensitivity,
  enabled,
}: {
  sensitivity: number;
  enabled: boolean;
}): LipSyncState {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }

  function startAnalyserPoll(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const poll = () => {
      if (!isSpeakingRef.current) return;
      analyser.getByteFrequencyData(data);
      // Speech frequency range: ~200–3 000 Hz (bins 4–28 for fftSize=256 @44.1 kHz)
      let sum = 0;
      const lo = 4;
      const hi = Math.min(28, data.length);
      for (let i = lo; i < hi; i++) sum += data[i];
      const avg = sum / (hi - lo);
      const open = Math.min(1, (avg / 80) * sensitivityRef.current * 1.6);
      setMouthOpen(open);
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);
  }

  function startSimulatedLipSync() {
    if (isSpeakingRef.current) return;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    let phase = 0;
    const animate = () => {
      if (!isSpeakingRef.current) return;
      phase += 0.2;
      const val =
        Math.abs(
          Math.sin(phase * 3.4) * 0.45 +
            Math.sin(phase * 7.2) * 0.28 +
            0.12,
        ) * sensitivityRef.current;
      setMouthOpen(Math.min(1, val));
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }

  function stopLipSync() {
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setMouthOpen(0);
    cancelAnimationFrame(rafRef.current);
  }

  useEffect(() => {
    if (!enabled) {
      stopLipSync();
      return;
    }

    const handleTtsAudio = (e: Event) => {
      const audio = (e as CustomEvent<HTMLAudioElement>).detail;
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.55;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        cancelAnimationFrame(rafRef.current);
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        startAnalyserPoll(analyser);

        const onStop = () => stopLipSync();
        audio.addEventListener("ended", onStop, { once: true });
        audio.addEventListener("error", onStop, { once: true });
        audio.addEventListener("pause", onStop, { once: true });
      } catch {
        // createMediaElementSource fails if element already captured — fall back
        startSimulatedLipSync();
      }
    };

    const handleTtsStart = () => startSimulatedLipSync();
    const handleTtsEnd = () => stopLipSync();

    window.addEventListener("tts:audio", handleTtsAudio as EventListener);
    window.addEventListener("tts:start", handleTtsStart);
    window.addEventListener("tts:end", handleTtsEnd);

    return () => {
      window.removeEventListener("tts:audio", handleTtsAudio as EventListener);
      window.removeEventListener("tts:start", handleTtsStart);
      window.removeEventListener("tts:end", handleTtsEnd);
      cancelAnimationFrame(rafRef.current);
      isSpeakingRef.current = false;
    };
  }, [enabled]);

  return { mouthOpen, isSpeaking };
}
