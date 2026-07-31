import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AnimationItem } from "lottie-web";
import { AssetLoader } from "./asset-loader";
import { GiftAudio } from "./audio";
import { ParticleEmitter } from "./particles";
import type { EffectScope, RuntimeManifest, RuntimeLayer, TimelineKeyframe } from "./schema";
import { TimelineEngine, type TimelineValue } from "./timeline";
import {
  detectClientCapabilities,
  ManifestValidationError,
  negotiateCapabilities,
  parseRuntimeManifest,
  type CapabilitySelection,
  type ClientCapabilities,
  type QualityTier
} from "./validation";

export interface RuntimePerformance {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  particles: number;
  downloadedBytes: number;
}

export interface GiftRendererOptions {
  container: HTMLElement;
  manifest: unknown;
  assetLoader: AssetLoader;
  capabilities?: Partial<ClientCapabilities>;
  pixelRatio?: number;
  scopeTargets?: Partial<Record<EffectScope, HTMLElement>>;
  localize?: (key: string) => string;
  onHook?: (action: string) => void;
  onPerformance?: (performance: RuntimePerformance) => void;
  onError?: (error: Error) => void;
}

type RuntimeObject = THREE.Object3D & { material?: THREE.Material | THREE.Material[] };

const DEFAULT_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function transformObject(object: THREE.Object3D, layer: RuntimeLayer): void {
  const transform = layer.transform;
  object.position.set(transform.position.x, transform.position.y, transform.position.z);
  object.rotation.set(
    THREE.MathUtils.degToRad(transform.rotation_degrees.x),
    THREE.MathUtils.degToRad(transform.rotation_degrees.y),
    THREE.MathUtils.degToRad(transform.rotation_degrees.z)
  );
  object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  object.name = layer.name;
}

function parseVerifiedShader(source: string): { vertexShader: string; fragmentShader: string } {
  if (source.length > 65_536) throw new Error("Verified shader asset exceeds 64 KiB");
  const marker = /^\s*\/\/\s*@sylora\s+fragment\s*$/m;
  const match = marker.exec(source);
  const vertex = match ? source.slice(0, match.index).replace(/^\s*\/\/\s*@sylora\s+vertex\s*$/m, "") : DEFAULT_VERTEX;
  const fragment = match ? source.slice(match.index + match[0].length) : source;
  const forbidden = /#\s*(?:include|extension)|\b(?:while|do)\s*(?:\(|\{)|samplerExternalOES|gl_FragDepth/;
  if (forbidden.test(vertex) || forbidden.test(fragment)) {
    throw new Error("Shader asset uses a forbidden directive or operation");
  }
  if (!/\bvoid\s+main\s*\(/.test(vertex) || !/\bvoid\s+main\s*\(/.test(fragment)) {
    throw new Error("Shader asset must provide vertex and fragment main functions");
  }
  return { vertexShader: vertex, fragmentShader: fragment };
}

function assertNoExternalUris(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoExternalUris);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "uri" && typeof child === "string" && !child.startsWith("data:")) {
      throw new Error("GLTF assets with external URIs are forbidden; use GLB or embedded data");
    }
    assertNoExternalUris(child);
  }
}

function validateGltfResources(bytes: ArrayBuffer, mimeType: string): void {
  const view = new DataView(bytes);
  let jsonText: string | undefined;
  if (mimeType === "model/gltf-binary") {
    if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) {
      throw new Error("GLB asset header is invalid");
    }
    let offset = 12;
    while (offset + 8 <= bytes.byteLength) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      if (offset + 8 + length > bytes.byteLength) throw new Error("GLB chunk exceeds asset bounds");
      if (type === 0x4e4f534a) {
        jsonText = new TextDecoder().decode(bytes.slice(offset + 8, offset + 8 + length)).replace(/\0+$/g, "").trim();
        break;
      }
      offset += 8 + length;
    }
    if (!jsonText) throw new Error("GLB asset has no JSON chunk");
  } else if (mimeType === "model/gltf+json" || mimeType === "application/json") {
    jsonText = new TextDecoder().decode(bytes);
  }
  if (jsonText) assertNoExternalUris(JSON.parse(jsonText));
}

function assertLottieIsSelfContained(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertLottieIsSelfContained);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string" &&
      ((key === "u" && child.length > 0) || ((key === "p" || key === "fPath") && !child.startsWith("data:")))
    ) {
      throw new Error("Lottie fallback contains an external asset path; all resources must be embedded");
    }
    assertLottieIsSelfContained(child);
  }
}

export class GiftRenderer {
  readonly manifest: RuntimeManifest;
  readonly selection: CapabilitySelection;
  readonly #options: GiftRendererOptions;
  readonly #loader: AssetLoader;
  readonly #capabilities: ClientCapabilities;
  readonly #abort = new AbortController();
  readonly #objects = new Map<string, THREE.Object3D>();
  readonly #particles: ParticleEmitter[] = [];
  readonly #disposables = new Set<THREE.Material | THREE.Texture | THREE.BufferGeometry>();
  #scene?: THREE.Scene;
  #camera?: THREE.PerspectiveCamera;
  #renderer?: THREE.WebGLRenderer;
  #timeline?: TimelineEngine;
  #audio?: GiftAudio;
  #lottie?: AnimationItem;
  #resize?: ResizeObserver;
  #frame = 0;
  #startedAt = 0;
  #lastFrameAt = 0;
  #metricsAt = 0;
  #framesSinceMetrics = 0;
  #paused = true;
  #disposed = false;
  #contextLost = false;
  #shaderFailed = false;

  constructor(options: GiftRendererOptions) {
    this.#options = options;
    this.#loader = options.assetLoader;
    this.manifest = parseRuntimeManifest(options.manifest);
    const assetKinds: Record<string, "lottie" | "model" | "image"> = {};
    for (const assetId of Object.values(this.manifest.fallbacks)) {
      if (!assetId) continue;
      try {
        const mime = this.#loader.descriptor(assetId).mimeType;
        if (mime === "application/json") assetKinds[assetId] = "lottie";
        else if (mime.startsWith("model/")) assetKinds[assetId] = "model";
        else if (mime.startsWith("image/")) assetKinds[assetId] = "image";
      } catch {
        // Negotiation reports an unavailable type only when this fallback is required.
      }
    }
    this.#capabilities = detectClientCapabilities({ assetKinds, ...options.capabilities });
    this.selection = negotiateCapabilities(this.manifest, this.#capabilities);
    this.#assertDownloadBudget();
  }

  async load(): Promise<void> {
    if (this.#disposed) throw new Error("Renderer has been disposed");
    if (this.selection.mode === "lottie") {
      await this.#loadLottie();
    } else {
      await this.#loadThree();
    }
  }

  play(): void {
    if (this.#disposed) return;
    this.#paused = false;
    this.#lottie?.play();
    void this.#audio?.resume().catch(() => undefined);
    this.#timeline?.resume();
    if (this.#renderer && !this.#frame) this.#frame = requestAnimationFrame(this.#renderFrame);
  }

  pause(): void {
    this.#paused = true;
    this.#lottie?.pause();
    void this.#audio?.pause();
    this.#timeline?.pause();
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  setMuted(muted: boolean): void {
    this.#audio?.setMuted(muted);
  }

  async unlockAudioFromUserGesture(): Promise<void> {
    await this.#audio?.unlockFromUserGesture();
  }

  seek(timeMs: number): void {
    this.#timeline?.seek(timeMs);
    if (this.#lottie) {
      const frame = (Math.max(0, timeMs) / this.manifest.duration_ms) * this.#lottie.totalFrames;
      this.#lottie.goToAndStop(frame, true);
    }
  }

  triggerHook(hook: RuntimeManifest["interaction_hooks"][number]["hook"]): void {
    for (const entry of this.manifest.interaction_hooks.filter((item) => item.hook === hook)) {
      this.#options.onHook?.(entry.action);
    }
  }

  setEffectScope(effectName: string): void {
    const effect = this.manifest.effects.find((item) => item.name === effectName);
    if (!effect) throw new Error(`Effect "${effectName}" is not declared`);
    const target = effect.scope === "viewer"
      ? this.#options.container
      : this.#options.scopeTargets?.[effect.scope];
    if (!target) throw new Error(`Host did not provide a target for ${effect.scope} effect scope`);
    const element = this.#renderer?.domElement ??
      (this.#lottie ? this.#options.container.firstElementChild as HTMLElement | null : null);
    if (element) {
      target.append(element);
      element.setAttribute("data-gift-effect-scope", effect.scope);
    }
  }

  resize(width?: number, height?: number): void {
    const actualWidth = Math.max(1, width ?? this.#options.container.clientWidth);
    const actualHeight = Math.max(1, height ?? this.#options.container.clientHeight);
    if (this.#camera && this.#renderer) {
      this.#camera.aspect = actualWidth / actualHeight;
      this.#camera.updateProjectionMatrix();
      this.#renderer.setSize(actualWidth, actualHeight, false);
    }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.pause();
    this.#abort.abort("GiftRenderer disposed");
    this.#resize?.disconnect();
    this.#timeline?.stop();
    this.#lottie?.destroy();
    await this.#audio?.dispose();
    for (const emitter of this.#particles) emitter.dispose();
    this.#particles.length = 0;
    this.#scene?.traverse((object) => {
      const runtimeObject = object as RuntimeObject;
      const materials = Array.isArray(runtimeObject.material)
        ? runtimeObject.material
        : runtimeObject.material ? [runtimeObject.material] : [];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
      const geometry = (object as THREE.Mesh).geometry;
      geometry?.dispose();
    });
    for (const item of this.#disposables) item.dispose();
    this.#disposables.clear();
    this.#renderer?.dispose();
    this.#renderer?.domElement.remove();
    this.#loader.abortAll("GiftRenderer disposed");
  }

  async #loadLottie(): Promise<void> {
    if (!this.selection.assetId) throw new Error("Capability selection did not provide a fallback asset");
    const animationData = await this.#loader.loadJson(this.selection.assetId, this.#abort.signal);
    assertLottieIsSelfContained(animationData);
    const lottie = (await import("lottie-web/build/player/lottie_light.js")).default;
    this.#lottie = lottie.loadAnimation({
      container: this.#options.container,
      renderer: "svg",
      loop: true,
      autoplay: false,
      animationData
    });
    this.#options.container.firstElementChild?.setAttribute("aria-hidden", "true");
  }

  async #loadThree(): Promise<void> {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f0e8);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1_000);
    camera.position.set(0, 0.6, 4);
    const renderer = new THREE.WebGLRenderer({ antialias: this.#capabilities.qualityTier !== "low", alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(this.#pixelRatio(this.#capabilities.qualityTier));
    renderer.domElement.setAttribute("aria-label", "Gift runtime preview");
    renderer.domElement.setAttribute("role", "img");
    this.#options.container.replaceChildren(renderer.domElement);
    this.#scene = scene;
    this.#camera = camera;
    this.#renderer = renderer;
    this.#bindContextLifecycle(renderer.domElement);
    this.#addLights();
    const fallbackLayer = this.selection.mode === "threejs-fallback"
      ? this.#fallbackLayer()
      : undefined;
    for (const layer of fallbackLayer ? [fallbackLayer] : this.manifest.layers) {
      await this.#addLayer(layer);
    }
    if (!fallbackLayer) {
      await this.#addParticles();
      await this.#applyShaders();
    }
    this.#timeline = new TimelineEngine(fallbackLayer ? [] : this.manifest.timelines, this.#applyTimeline);
    this.#timeline.start();
    if (!fallbackLayer && this.selection.audioEnabled && this.manifest.audio.length > 0) {
      this.#audio = new GiftAudio(
        this.#loader,
        this.manifest.quality_budgets.max_audio_peak_dbfs
      );
      await Promise.all(this.manifest.audio.map((track) => this.#audio!.prepare(track)));
    }
    this.#resize = new ResizeObserver(() => this.resize());
    this.#resize.observe(this.#options.container);
    this.resize();
    this.#startedAt = performance.now();
    this.#lastFrameAt = this.#startedAt;
    this.#metricsAt = this.#startedAt;
    this.play();
  }

  #fallbackLayer(): RuntimeLayer {
    const assetId = this.selection.assetId;
    if (!assetId) throw new Error("Capability selection did not provide a fallback asset");
    const mime = this.#loader.descriptor(assetId).mimeType;
    const transform = {
      position: { x: 0, y: 0, z: 0 },
      rotation_degrees: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    };
    if (mime.startsWith("model/")) {
      return { kind: "model", name: "runtime_fallback", asset_id: assetId, transform };
    }
    if (mime.startsWith("image/")) {
      return { kind: "sprite", name: "runtime_fallback", asset_id: assetId, transform, billboard: true };
    }
    throw new Error(`Fallback asset ${assetId} has unsupported MIME ${mime}`);
  }

  #addLights(): void {
    for (const light of this.manifest.lighting) {
      const color = new THREE.Color(light.color_hex);
      let object: THREE.Light;
      switch (light.kind) {
        case "ambient": object = new THREE.AmbientLight(color, light.intensity); break;
        case "directional": object = new THREE.DirectionalLight(color, light.intensity); break;
        case "point": object = new THREE.PointLight(color, light.intensity); break;
        case "spot": object = new THREE.SpotLight(color, light.intensity); break;
      }
      if (light.position) object.position.set(light.position.x, light.position.y, light.position.z);
      this.#scene!.add(object);
    }
  }

  async #addLayer(layer: RuntimeLayer): Promise<void> {
    let object: THREE.Object3D;
    if (layer.kind === "model") {
      const bytes = await this.#loader.load(layer.asset_id, this.#abort.signal);
      const descriptor = this.#loader.descriptor(layer.asset_id);
      validateGltfResources(bytes, descriptor.mimeType);
      const gltf = await new GLTFLoader().parseAsync(bytes, "");
      object = gltf.scene;
    } else if (layer.kind === "sprite") {
      const blob = await this.#loader.loadBlob(layer.asset_id, this.#abort.signal);
      const url = URL.createObjectURL(blob);
      try {
        const texture = await new THREE.TextureLoader().loadAsync(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.#disposables.add(texture);
        object = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      } finally {
        URL.revokeObjectURL(url);
      }
    } else {
      object = this.#createText(this.#options.localize?.(layer.localization_key) ?? layer.localization_key);
    }
    transformObject(object, layer);
    this.#objects.set(layer.name, object);
    this.#scene!.add(object);
  }

  #createText(text: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable for text rendering");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#16231f";
    context.font = "600 72px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2, 960);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.#disposables.add(texture);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
  }

  async #addParticles(): Promise<void> {
    for (const spec of this.manifest.particle_systems) {
      let texture: THREE.Texture | undefined;
      if (spec.texture_asset_id) {
        const blob = await this.#loader.loadBlob(spec.texture_asset_id, this.#abort.signal);
        const url = URL.createObjectURL(blob);
        try {
          texture = await new THREE.TextureLoader().loadAsync(url);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      const emitter = new ParticleEmitter(
        spec,
        this.#capabilities.qualityTier,
        this.#capabilities.webgl2,
        texture
      );
      this.#particles.push(emitter);
      this.#objects.set(spec.name, emitter.points);
      this.#scene!.add(emitter.points);
    }
  }

  async #applyShaders(): Promise<void> {
    for (const shader of this.manifest.shaders) {
      const target = this.#objects.get(shader.name);
      if (!target) continue;
      try {
        const source = await this.#loader.loadText(shader.shader_asset_id, this.#abort.signal);
        const definition = parseVerifiedShader(source);
        const uniforms: Record<string, THREE.IUniform<THREE.Texture>> = {};
        for (const [index, textureAssetId] of shader.texture_asset_ids.entries()) {
          const blob = await this.#loader.loadBlob(textureAssetId, this.#abort.signal);
          const url = URL.createObjectURL(blob);
          try {
            const texture = await new THREE.TextureLoader().loadAsync(url);
            this.#disposables.add(texture);
            uniforms[`uTexture${index}`] = { value: texture };
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        const material = new THREE.ShaderMaterial({
          vertexShader: definition.vertexShader,
          fragmentShader: definition.fragmentShader,
          uniforms,
          transparent: true
        });
        target.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = material;
        });
        this.#disposables.add(material);
      } catch (error) {
        this.#replaceShaderMaterials(target);
        this.#options.onError?.(error instanceof Error ? error : new Error("Shader asset failed"));
      }
    }
    const debug = this.#renderer!.debug;
    debug.onShaderError = (_gl, program, vertexShader, fragmentShader) => {
      if (this.#shaderFailed) return;
      this.#shaderFailed = true;
      const gl = this.#renderer!.getContext();
      const detail = [
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertexShader),
        gl.getShaderInfoLog(fragmentShader)
      ].filter(Boolean).join("\n");
      for (const object of this.#objects.values()) this.#replaceShaderMaterials(object);
      this.#options.onError?.(new Error(`Verified shader failed to compile${detail ? `: ${detail}` : ""}`));
    };
    this.#renderer!.compile(this.#scene!, this.#camera!);
  }

  #replaceShaderMaterials(target: THREE.Object3D): void {
    target.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!materials.some((material) => material instanceof THREE.ShaderMaterial)) return;
      for (const material of materials) material.dispose();
      mesh.material = new THREE.MeshStandardMaterial({ color: 0xb58a50, roughness: 0.72 });
    });
  }

  readonly #applyTimeline = (targetName: string, property: string, value: TimelineValue): void => {
    const target = this.#objects.get(targetName);
    if (!target) return;
    if (typeof value === "object") {
      const vector = value;
      if (property === "position") target.position.set(vector.x, vector.y, vector.z);
      if (property === "rotation_degrees") {
        target.rotation.set(
          THREE.MathUtils.degToRad(vector.x),
          THREE.MathUtils.degToRad(vector.y),
          THREE.MathUtils.degToRad(vector.z)
        );
      }
      if (property === "scale") target.scale.set(vector.x, vector.y, vector.z);
    } else if (property === "visible" && typeof value === "boolean") {
      target.visible = value;
    } else if (property === "intensity" && typeof value === "number" && target instanceof THREE.Light) {
      target.intensity = value;
    } else if (property === "opacity" && typeof value === "number") {
      target.traverse((child) => {
        const runtimeObject = child as RuntimeObject;
        const materials = Array.isArray(runtimeObject.material)
          ? runtimeObject.material
          : runtimeObject.material ? [runtimeObject.material] : [];
        for (const material of materials) {
          material.transparent = value < 1;
          material.opacity = Math.max(0, Math.min(1, value));
        }
      });
    }
  };

  readonly #renderFrame = (now: number): void => {
    this.#frame = 0;
    if (this.#paused || this.#disposed || this.#contextLost || !this.#renderer) return;
    const elapsed = (now - this.#startedAt) / 1000;
    this.#timeline?.update(now);
    for (const emitter of this.#particles) emitter.update(elapsed);
    this.#renderer.render(this.#scene!, this.#camera!);
    this.#framesSinceMetrics += 1;
    const metricsSpan = now - this.#metricsAt;
    if (metricsSpan >= 500) {
      const info = this.#renderer.info;
      this.#options.onPerformance?.({
        fps: (this.#framesSinceMetrics * 1000) / metricsSpan,
        frameTimeMs: (now - this.#lastFrameAt),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        textures: info.memory.textures,
        particles: this.#particles.reduce((total, emitter) => total + emitter.count, 0),
        downloadedBytes: this.#loader.loadedBytes
      });
      this.#metricsAt = now;
      this.#framesSinceMetrics = 0;
    }
    this.#lastFrameAt = now;
    this.#frame = requestAnimationFrame(this.#renderFrame);
  };

  #pixelRatio(tier: QualityTier): number {
    const requested = this.#options.pixelRatio ?? window.devicePixelRatio;
    const maximum = tier === "low" ? 1 : tier === "medium" ? 1.5 : 2;
    return Math.max(0.5, Math.min(maximum, requested));
  }

  #assertDownloadBudget(): void {
    const ids = new Set<string>();
    if (this.selection.mode !== "threejs") {
      if (this.selection.assetId) ids.add(this.selection.assetId);
    } else {
      for (const layer of this.manifest.layers) {
        if ("asset_id" in layer) ids.add(layer.asset_id);
      }
      for (const particles of this.manifest.particle_systems) {
        if (particles.texture_asset_id) ids.add(particles.texture_asset_id);
      }
      for (const shader of this.manifest.shaders) {
        ids.add(shader.shader_asset_id);
        shader.texture_asset_ids.forEach((id) => ids.add(id));
      }
      if (this.selection.audioEnabled) this.manifest.audio.forEach((track) => ids.add(track.asset_id));
    }
    const total = [...ids].reduce((bytes, id) => bytes + this.#loader.descriptor(id).byteSize, 0);
    if (total > this.manifest.quality_budgets.max_download_bytes) {
      throw new ManifestValidationError([
        `selected runtime assets require ${total} bytes, exceeding max_download_bytes ${this.manifest.quality_budgets.max_download_bytes}`
      ]);
    }
  }

  #bindContextLifecycle(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.#contextLost = true;
      this.pause();
      this.#options.onError?.(new Error("WebGL context lost; rendering paused until recovery"));
    });
    canvas.addEventListener("webglcontextrestored", () => {
      if (this.#disposed) return;
      this.#contextLost = false;
      this.#renderer?.resetState();
      this.#renderer?.compile(this.#scene!, this.#camera!);
      this.play();
    });
  }
}

export type { TimelineKeyframe };
