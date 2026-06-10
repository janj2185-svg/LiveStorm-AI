/**
 * mediaStream — Architecture Contracts for Future Native Streaming
 *
 * ARCHITECTURE PLAN
 * ─────────────────────────────────────────────────────────────────────────────
 * This module defines interfaces and stubs for the future "Use Myself as 3D
 * Presenter" feature and native streaming from LiveStorm AI.
 *
 * GUIDING PRINCIPLES
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. SINGLE MEDIA CONTEXT (do not call getUserMedia() in components)
 *    All camera/mic acquisition must flow through a single MediaStreamContext,
 *    similar to how LiveSessionContext owns the socket connection.
 *    This prevents permission re-prompts and duplicate track acquisition.
 *
 * 2. EXTEND THE EXISTING EVENT PIPELINE (do not create a second pipeline)
 *    Audio analysis (VAD, volume, speech-to-text) emits into the same
 *    ingestLiveEvent() pipeline in socketServer.ts, using new event types:
 *    "audio:vad" | "audio:speech" | "video:gesture"
 *    This keeps a single event bus for all live data.
 *
 * 3. AVATAR COMPOSITING USES EXISTING AvatarCanvas (do not duplicate)
 *    For camera-to-avatar streaming:
 *    - Capture camera → OffscreenCanvas/VideoFrame
 *    - Run MediaPipe face landmarks → drive existing blendshapes in AvatarCanvas
 *    - Composite AvatarCanvas output → output stream
 *    AvatarCanvas already supports lip-sync via useLipSync — extend it, don't replace it.
 *
 * 4. RTMP OUTPUT: WebRTC → SFU → RTMP (browser cannot RTMP natively)
 *    Browser path: MediaStream → RTCPeerConnection → mediasoup SFU (api-server)
 *    Server path: mediasoup producer → FFmpeg/GStreamer → RTMP → TikTok/YouTube
 *    This keeps the architecture browser-first and server-composited.
 *    Alternative for desktop: Electron + node-rtmp (future v2).
 *
 * 5. SESSION TABLE EXTENSION (no new tables needed for Phase 1)
 *    Add to sessions table:
 *    - stream_type: "tiktok_listener" | "webrtc_presenter" | "rtmp_out"
 *    - media_config: JSONB { bitrate, resolution, codec, rtmpUrl, streamKey }
 *    - presenter_mode: "avatar" | "camera" | "camera_with_avatar"
 *
 * IMPLEMENTATION ROADMAP
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1 — Camera/Mic permissions UI (no streaming)
 *   - Add MediaStreamProvider to App.tsx (sibling of LiveSessionProvider)
 *   - checkMediaCapabilities() to show device status in Settings
 *   - Permission request flow in Dashboard before going live
 *
 * Phase 2 — Avatar face-tracking (camera → avatar blendshapes)
 *   - MediaPipe FaceLandmarker → existing AvatarCanvas blendshapes
 *   - useLipSync hook already handles volume-based mouth; extend with landmark-based
 *
 * Phase 3 — WebRTC peer connection + SFU
 *   - Add mediasoup (or Livekit) to api-server
 *   - WebRTCSignalClient.connect() → RTCPeerConnection
 *   - Server ingests tracks, composites with avatar, re-streams
 *
 * Phase 4 — RTMP output
 *   - Server-side: mediasoup producer → FFmpeg RTMP push
 *   - RtmpOutputConfig persisted in sessions.media_config
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Supported output stream targets */
export type StreamTarget = "webrtc" | "rtmp" | "recording" | "avatar_composite";

/** Supported input sources */
export type MediaSource = "camera" | "screen_capture" | "avatar_canvas";

/** Presenter mode — how the streamer appears to viewers */
export type PresenterMode = "avatar_only" | "camera_only" | "camera_with_avatar_overlay";

/** Stream type — what the session is doing */
export type StreamType = "tiktok_listener" | "webrtc_presenter" | "rtmp_out";

/** Desired media constraints for getUserMedia */
export interface StreamConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

/** A single acquired and tracked media stream */
export interface TrackedStream {
  id: string;
  source: MediaSource;
  stream: MediaStream;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  acquiredAt: number;
}

/** Browser device capabilities */
export interface MediaCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraPermission: PermissionState | "unknown";
  micPermission: PermissionState | "unknown";
  devices: MediaDeviceInfo[];
}

/** WebRTC signalling interface (Phase 3) */
export interface WebRTCSignalClient {
  connect(sessionId: number, tracks: MediaStreamTrack[]): Promise<RTCPeerConnection>;
  disconnect(): void;
}

/** RTMP output configuration (Phase 4) */
export interface RtmpOutputConfig {
  platform: "tiktok" | "youtube" | "twitch" | "custom";
  rtmpUrl: string;
  streamKey: string;
  resolution: "720p" | "1080p" | "1440p";
  videoBitrate: number;
  audioBitrate: number;
}

/**
 * Check what media devices are available and what permissions have been granted.
 * Call this in the Settings page and before starting a presenter session.
 * Do NOT call getUserMedia here — only enumerate and check permissions.
 */
export async function checkMediaCapabilities(): Promise<MediaCapabilities> {
  try {
    const [camPerm, micPerm] = await Promise.all([
      navigator.permissions.query({ name: "camera" as PermissionName }),
      navigator.permissions.query({ name: "microphone" as PermissionName }),
    ]);
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      hasCamera:        devices.some((d) => d.kind === "videoinput"),
      hasMicrophone:    devices.some((d) => d.kind === "audioinput"),
      cameraPermission: camPerm.state,
      micPermission:    micPerm.state,
      devices,
    };
  } catch {
    return {
      hasCamera:        false,
      hasMicrophone:    false,
      cameraPermission: "unknown",
      micPermission:    "unknown",
      devices:          [],
    };
  }
}

/**
 * Acquire a camera/mic stream.
 * FUTURE: called only by MediaStreamContext, never directly from components.
 * The context ref-counts tracks so they are acquired once and shared.
 */
export async function acquireStream(constraints: StreamConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(constraints);
}
