import type { AudioTrackSpecSchema } from "./schema";
import type { z } from "zod";
import { AssetLoader } from "./asset-loader";

type AudioTrack = z.infer<typeof AudioTrackSpecSchema>;

interface PlayingTrack {
  source: AudioBufferSourceNode;
  gain: GainNode;
  level: number;
  panner?: PannerNode;
}

export class GiftAudio {
  readonly #context: AudioContext;
  readonly #loader: AssetLoader;
  readonly #loudnessCapDbfs: number;
  readonly #playing = new Set<PlayingTrack>();
  readonly #pending: Array<() => Promise<void>> = [];
  #muted = false;
  #disposed = false;

  constructor(loader: AssetLoader, loudnessCapDbfs: number, context?: AudioContext) {
    this.#loader = loader;
    this.#loudnessCapDbfs = Math.min(-1, loudnessCapDbfs);
    this.#context = context ?? new AudioContext();
  }

  get needsUserGesture(): boolean {
    return this.#context.state !== "running";
  }

  async prepare(track: AudioTrack, autoplay = track.autoplay): Promise<() => Promise<void>> {
    const bytes = await this.#loader.load(track.asset_id);
    const buffer = await this.#context.decodeAudioData(bytes.slice(0));
    const play = async () => {
      if (this.#disposed) return;
      if (this.#context.state !== "running") {
        this.#pending.push(play);
        return;
      }
      const source = this.#context.createBufferSource();
      source.buffer = buffer;
      const gain = this.#context.createGain();
      const effectivePeak = Math.min(track.peak_dbfs, this.#loudnessCapDbfs);
      const level = 10 ** (effectivePeak / 20);
      gain.gain.value = this.#muted ? 0 : level;
      const playing: PlayingTrack = { source, gain, level };
      if (track.spatial) {
        const panner = this.#context.createPanner();
        panner.panningModel = "HRTF";
        panner.distanceModel = "inverse";
        panner.refDistance = 1;
        panner.maxDistance = 30;
        panner.rolloffFactor = 1;
        source.connect(panner).connect(gain).connect(this.#context.destination);
        playing.panner = panner;
      } else {
        source.connect(gain).connect(this.#context.destination);
      }
      this.#playing.add(playing);
      source.addEventListener("ended", () => {
        source.disconnect();
        playing.panner?.disconnect();
        gain.disconnect();
        this.#playing.delete(playing);
      }, { once: true });
      source.start();
    };
    if (autoplay) await play();
    return play;
  }

  async unlockFromUserGesture(): Promise<void> {
    await this.#context.resume();
    for (const play of this.#pending.splice(0)) await play();
  }

  setMuted(muted: boolean): void {
    this.#muted = muted;
    for (const playing of this.#playing) {
      playing.gain.gain.setTargetAtTime(muted ? 0 : playing.level, this.#context.currentTime, 0.015);
    }
  }

  setPosition(x: number, y: number, z: number): void {
    for (const playing of this.#playing) {
      if (!playing.panner) continue;
      playing.panner.positionX.value = x;
      playing.panner.positionY.value = y;
      playing.panner.positionZ.value = z;
    }
  }

  async pause(): Promise<void> {
    if (this.#context.state === "running") await this.#context.suspend();
  }

  async resume(): Promise<void> {
    await this.#context.resume();
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    this.#pending.length = 0;
    for (const playing of this.#playing) {
      try {
        playing.source.stop();
      } catch {
        // Already stopped.
      }
      playing.source.disconnect();
      playing.panner?.disconnect();
      playing.gain.disconnect();
    }
    this.#playing.clear();
    await this.#context.close();
  }
}
