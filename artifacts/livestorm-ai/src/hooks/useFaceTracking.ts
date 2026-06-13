import { useState, useEffect, useRef, useCallback } from "react";
import type { FaceTrackingData } from "@/lib/faceExpressionMapper";
import { mapBlendshapesToExpression } from "@/lib/faceExpressionMapper";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const FRAME_MS = 1000 / 15;
const LERP     = 0.30;

export interface UseFaceTrackingResult {
  trackingData: FaceTrackingData | null;
  isReady: boolean;
  isTracking: boolean;
  error: string | null;
}

export function useFaceTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): UseFaceTrackingResult {
  const [isReady,      setIsReady]      = useState(false);
  const [isTracking,   setIsTracking]   = useState(false);
  const [trackingData, setTrackingData] = useState<FaceTrackingData | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const landmarkerRef = useRef<any>(null);
  const rafRef        = useRef(0);
  const lastFrameRef  = useRef(0);
  const smoothRef     = useRef<Record<string, number>>({});
  const initedRef     = useRef(false);

  const initLandmarker = useCallback(async () => {
    if (initedRef.current) return;
    initedRef.current = true;
    try {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      let lm: any;
      try {
        lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });
      } catch {
        lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });
      }

      landmarkerRef.current = lm;
      setIsReady(true);
    } catch (e) {
      initedRef.current = false;
      setError(`MediaPipe init: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    initLandmarker();
  }, [enabled, initLandmarker]);

  useEffect(() => {
    if (!enabled || !isReady) {
      cancelAnimationFrame(rafRef.current);
      setIsTracking(false);
      setTrackingData(null);
      return;
    }

    const lm = landmarkerRef.current;
    if (!lm) return;

    let running = true;
    setIsTracking(true);

    function loop(ts: number) {
      if (!running) return;
      rafRef.current = requestAnimationFrame(loop);

      const video = videoRef.current;
      if (
        !video ||
        video.readyState < 2 ||
        video.paused ||
        video.videoWidth === 0
      )
        return;

      if (ts - lastFrameRef.current < FRAME_MS) return;
      lastFrameRef.current = ts;

      try {
        const result = lm.detectForVideo(video, performance.now());

        if (!result.faceBlendshapes?.length) {
          setTrackingData({
            faceDetected: false,
            confidence: 0,
            expression: "neutral",
            mouthOpenValue: 0,
            blinkLeft: 0,
            blinkRight: 0,
            avatarState: "idle",
          });
          return;
        }

        const raw: Record<string, number> = {};
        for (const cat of result.faceBlendshapes[0].categories) {
          raw[cat.categoryName] = cat.score as number;
        }

        const s = smoothRef.current;
        for (const k in raw) {
          s[k] = s[k] !== undefined ? s[k] + LERP * (raw[k] - s[k]) : raw[k];
        }

        const data = mapBlendshapesToExpression(s);
        data.confidence =
          result.faceLandmarks?.length ? 0.95 : 0.60;
        data.faceDetected = true;

        setTrackingData(data);
      } catch {
        // skip bad frame
      }
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      setIsTracking(false);
      smoothRef.current = {};
    };
  }, [enabled, isReady]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch { /* ignore */ }
        landmarkerRef.current = null;
        initedRef.current = false;
      }
    };
  }, []);

  return { trackingData, isReady, isTracking, error };
}
