/**
 * SYLORA Gift Runtime — procedural cinematic player (Three.js)
 * Plays original gift manifests with unique seed-based scenes.
 * Falls back to procedural geometry when GLB is still generating.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type GiftManifest = {
  id: number;
  slug: string;
  name: string;
  rarity: "rare" | "epic" | "legendary" | "mythic" | "divine";
  priceCoins: number;
  durationSec: number;
  entry: {
    glb: string;
    proceduralSeed: number;
    vfx: {
      primaryElement: string;
      secondaryElement: string;
      post: { bloom: number; motionBlur?: boolean; dof?: boolean; lensFlare?: boolean };
    };
    camera: Array<{ t: number; shot: string; fov: number; shake: number }>;
    lod: { particles: number; targetFps: number };
  };
  interactions: {
    ai: { priority: number; tone: string; promptHint: string };
    avatar: { animation: string; emotion: string };
    chain: { comboTags: string[]; globalEvent: boolean };
  };
};

export type GiftPlayStats = {
  fps: number;
  frameMs: number;
  particles: number;
  usedGlb: boolean;
  durationMs: number;
  memoryMB?: number;
};

type PlayOptions = {
  baseUrl?: string; // e.g. /gift-library
  quality?: "mobile" | "desktop";
  onComplete?: (stats: GiftPlayStats) => void;
  onBeat?: (beat: string) => void;
};

const RARITY_COLOR: Record<string, number> = {
  rare: 0x38bdf8,
  epic: 0xa78bfa,
  legendary: 0xfbbf24,
  mythic: 0xf472b6,
  divine: 0xfef3c7,
};

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(h: number, s: number, l: number) {
  return new THREE.Color().setHSL(h, s, l);
}

export class SyloraGiftPlayer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private particles: THREE.Points | null = null;
  private root = new THREE.Group();
  private bloomProxy = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(3.5, 2.2, 4.5);
    this.scene.add(this.root);
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || 640;
    const h = this.canvas.clientHeight || 640;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.scene.clear();
  }

  async play(manifest: GiftManifest, opts: PlayOptions = {}): Promise<GiftPlayStats> {
    this.disposed = false;
    cancelAnimationFrame(this.raf);
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.scene.children.filter((c) => c !== this.root).forEach((c) => this.scene.remove(c));

    const seed = manifest.entry.proceduralSeed;
    const rand = mulberry32(seed);
    const rarityColor = RARITY_COLOR[manifest.rarity] ?? 0xffffff;
    const baseHue = (seed % 1000) / 1000;
    const quality = opts.quality ?? "desktop";
    const particleBudget =
      quality === "mobile"
        ? Math.min(600, Math.floor(manifest.entry.lod.particles * 0.35))
        : manifest.entry.lod.particles;

    // Lights
    const hemi = new THREE.HemisphereLight(0xbfdfff, 0x0a0a12, 0.55);
    const key = new THREE.PointLight(rarityColor, 40, 20);
    key.position.set(2, 3, 2);
    const rim = new THREE.PointLight(0x88aaff, 18, 20);
    rim.position.set(-3, 1, -2);
    this.scene.add(hemi, key, rim);

    // Floor glow
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 64),
      new THREE.MeshStandardMaterial({
        color: rarityColor,
        emissive: rarityColor,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.35,
        metalness: 0.2,
        roughness: 0.8,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -1.15;
    this.root.add(disc);

    let usedGlb = false;
    const baseUrl = opts.baseUrl ?? "/gift-library";
    try {
      const glbUrl = `${baseUrl}/${manifest.entry.glb}`.replace(/\/+/g, "/").replace(":/", "://");
      // entry.glb already includes "glb/..."
      const url = `${baseUrl}/${manifest.entry.glb}`;
      const loader = new GLTFLoader();
      const gltf = await new Promise<Awaited<ReturnType<GLTFLoader["loadAsync"]>>>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      const model = gltf.scene;
      model.scale.setScalar(1);
      this.root.add(model);
      usedGlb = true;
      if (gltf.animations?.length) {
        const mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        (this as any)._mixer = mixer;
      }
    } catch {
      // Procedural unique core
      const family = seed % 6;
      const mat = new THREE.MeshStandardMaterial({
        color: hsl(baseHue, 0.65, 0.55),
        metalness: 0.55,
        roughness: 0.28,
        emissive: hsl(baseHue, 0.7, 0.25),
        emissiveIntensity: 0.8 + manifest.entry.vfx.post.bloom,
      });
      let geom: THREE.BufferGeometry;
      if (family === 0) geom = new THREE.IcosahedronGeometry(1, 2);
      else if (family === 1) geom = new THREE.TorusKnotGeometry(0.7, 0.22, 128, 16);
      else if (family === 2) geom = new THREE.OctahedronGeometry(1.1, 0);
      else if (family === 3) geom = new THREE.SphereGeometry(1, 48, 32);
      else if (family === 4) geom = new THREE.DodecahedronGeometry(1, 0);
      else geom = new THREE.CapsuleGeometry(0.55, 0.9, 8, 16);
      const core = new THREE.Mesh(geom, mat);
      this.root.add(core);
      (this as any)._core = core;

      const orbMat = new THREE.MeshStandardMaterial({
        color: hsl((baseHue + 0.2) % 1, 0.7, 0.5),
        emissive: hsl((baseHue + 0.2) % 1, 0.8, 0.35),
        emissiveIntensity: 1.2,
        metalness: 0.7,
        roughness: 0.2,
      });
      const count = { rare: 3, epic: 5, legendary: 7, mythic: 9, divine: 12 }[manifest.rarity];
      for (let i = 0; i < count; i++) {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1 + (i % 3) * 0.02, 12, 12), orbMat);
        orb.userData.phase = (i / count) * Math.PI * 2;
        orb.userData.radius = 1.7 + (i % 3) * 0.15;
        this.root.add(orb);
      }
    }

    // Particles
    const positions = new Float32Array(particleBudget * 3);
    const velocities = new Float32Array(particleBudget * 3);
    for (let i = 0; i < particleBudget; i++) {
      positions[i * 3] = (rand() - 0.5) * 4;
      positions[i * 3 + 1] = rand() * 3;
      positions[i * 3 + 2] = (rand() - 0.5) * 4;
      velocities[i * 3] = (rand() - 0.5) * 0.01;
      velocities[i * 3 + 1] = 0.005 + rand() * 0.02;
      velocities[i * 3 + 2] = (rand() - 0.5) * 0.01;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      size: quality === "mobile" ? 0.04 : 0.06,
      color: rarityColor,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particles);

    // WebAudio synth (spatial-ish stereo bed)
    let audioCtx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    try {
      audioCtx = new AudioContext();
      const master = audioCtx.createGain();
      master.gain.value = 0.04;
      const panner = audioCtx.createStereoPanner();
      osc = audioCtx.createOscillator();
      osc.type = manifest.rarity === "divine" ? "sawtooth" : "sine";
      osc.frequency.value = 110 + (seed % 200);
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.15;
      lfoGain.gain.value = 40;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(panner);
      panner.connect(master);
      master.connect(audioCtx.destination);
      osc.start();
      lfo.start();
      (this as any)._audio = { audioCtx, osc, lfo, master, panner };
    } catch {
      /* autoplay may block */
    }

    const durationMs = manifest.durationSec * 1000;
    const start = performance.now();
    let frames = 0;
    let last = start;
    let fpsSmooth = 60;
    opts.onBeat?.("establish");

    return await new Promise<GiftPlayStats>((resolve) => {
      const tick = () => {
        if (this.disposed) return;
        const now = performance.now();
        const t = (now - start) / durationMs;
        const dt = (now - last) / 1000;
        last = now;
        frames++;
        const instFps = dt > 0 ? 1 / dt : 60;
        fpsSmooth = fpsSmooth * 0.9 + instFps * 0.1;

        // Camera cinematic path
        const shakeAmp = t > 0.4 && t < 0.7 ? 0.08 + manifest.entry.vfx.post.bloom * 0.05 : 0.02;
        const ang = t * Math.PI * 1.6;
        const radius = 4.8 - t * 1.2;
        this.camera.position.set(
          Math.cos(ang) * radius + (Math.random() - 0.5) * shakeAmp,
          1.6 + Math.sin(t * Math.PI) * 1.2 + (Math.random() - 0.5) * shakeAmp,
          Math.sin(ang) * radius + (Math.random() - 0.5) * shakeAmp,
        );
        this.camera.lookAt(0, 0.2, 0);
        this.camera.fov = 45 - t * 8;
        this.camera.updateProjectionMatrix();

        // Animate procedural orbiters / core
        const core = (this as any)._core as THREE.Mesh | undefined;
        if (core) {
          core.rotation.y += dt * 1.2;
          const s = 0.85 + Math.sin(t * Math.PI * 2) * 0.15;
          core.scale.setScalar(s);
        }
        this.root.children.forEach((child) => {
          if (child.userData?.phase != null) {
            const phase = child.userData.phase + t * Math.PI * 2;
            const r = child.userData.radius as number;
            child.position.set(Math.cos(phase) * r, Math.sin(phase * 2) * 0.35, Math.sin(phase) * r);
          }
        });

        // Particles rise
        if (this.particles) {
          const arr = this.particles.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < particleBudget; i++) {
            arr[i * 3] += velocities[i * 3];
            arr[i * 3 + 1] += velocities[i * 3 + 1];
            arr[i * 3 + 2] += velocities[i * 3 + 2];
            if (arr[i * 3 + 1] > 3.5) arr[i * 3 + 1] = 0;
          }
          this.particles.geometry.attributes.position.needsUpdate = true;
          this.particles.rotation.y += dt * 0.15;
        }

        const mixer = (this as any)._mixer as THREE.AnimationMixer | undefined;
        mixer?.update(dt);

        // Audio pan sweep
        const audio = (this as any)._audio;
        if (audio?.panner) audio.panner.pan.value = Math.sin(t * Math.PI * 2) * 0.7;

        if (t > 0.2 && t < 0.25) opts.onBeat?.("assemble");
        if (t > 0.45 && t < 0.5) opts.onBeat?.("spectacle");
        if (t > 0.75 && t < 0.8) opts.onBeat?.("interaction");

        this.renderer.render(this.scene, this.camera);
        this.bloomProxy = manifest.entry.vfx.post.bloom;

        if (now - start >= durationMs) {
          const stats: GiftPlayStats = {
            fps: Math.round(fpsSmooth),
            frameMs: Math.round(1000 / Math.max(1, fpsSmooth)),
            particles: particleBudget,
            usedGlb,
            durationMs,
            memoryMB: (performance as any).memory
              ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
              : undefined,
          };
          try {
            audio?.osc?.stop();
            audio?.lfo?.stop();
            audio?.audioCtx?.close();
          } catch { /* */ }
          opts.onBeat?.("resolve");
          opts.onComplete?.(stats);
          resolve(stats);
          return;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.resize();
      this.raf = requestAnimationFrame(tick);
    });
  }
}

export async function loadGiftCatalog(baseUrl = "/gift-library") {
  const res = await fetch(`${baseUrl}/catalog/sylora-gifts-100.json`);
  if (!res.ok) throw new Error("Gift catalog missing");
  return res.json();
}

export async function loadGiftManifest(slug: string, baseUrl = "/gift-library") {
  const res = await fetch(`${baseUrl}/manifests/${slug}.manifest.json`);
  if (!res.ok) throw new Error(`Manifest missing: ${slug}`);
  return res.json() as Promise<GiftManifest>;
}
