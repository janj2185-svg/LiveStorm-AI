import * as THREE from "three";
import type { ParticleSystemSpec } from "./schema";
import type { QualityTier } from "./validation";

export interface ParticleSeedData {
  positions: Float32Array;
  velocities: Float32Array;
  lifetimes: Float32Array;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

export function deterministicParticleData(count: number, seed: number): ParticleSeedData {
  const safeCount = Math.max(0, Math.floor(count));
  const random = seededRandom(seed);
  const positions = new Float32Array(safeCount * 3);
  const velocities = new Float32Array(safeCount * 3);
  const lifetimes = new Float32Array(safeCount);
  for (let index = 0; index < safeCount; index += 1) {
    const offset = index * 3;
    positions[offset] = (random() - 0.5) * 0.4;
    positions[offset + 1] = random() * 0.3;
    positions[offset + 2] = (random() - 0.5) * 0.4;
    velocities[offset] = (random() - 0.5) * 0.7;
    velocities[offset + 1] = 0.4 + random() * 1.4;
    velocities[offset + 2] = (random() - 0.5) * 0.7;
    lifetimes[index] = 0.7 + random() * 2.8;
  }
  return { positions, velocities, lifetimes };
}

export function particleCountForTier(maxParticles: number, tier: QualityTier, gpuCapable: boolean): number {
  const tierLimit = tier === "low" ? 2_500 : tier === "medium" ? 12_000 : 50_000;
  const rendererLimit = gpuCapable ? tierLimit : Math.min(tierLimit, 2_000);
  return Math.min(maxParticles, rendererLimit);
}

export class ParticleEmitter {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  readonly count: number;
  readonly mode: "gpu-budget" | "cpu-fallback";
  readonly #initial: Float32Array;
  readonly #velocities: Float32Array;
  readonly #lifetimes: Float32Array;
  readonly #spawnRate: number;

  constructor(spec: ParticleSystemSpec, tier: QualityTier, gpuCapable: boolean, texture?: THREE.Texture) {
    this.count = particleCountForTier(spec.max_particles, tier, gpuCapable);
    this.mode = gpuCapable ? "gpu-budget" : "cpu-fallback";
    this.#spawnRate = spec.spawn_rate_per_second;
    const seedData = deterministicParticleData(this.count, spec.deterministic_seed);
    this.#initial = seedData.positions;
    this.#velocities = seedData.velocities;
    this.#lifetimes = seedData.lifetimes;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(seedData.positions.slice(), 3));
    const material = new THREE.PointsMaterial({
      color: 0xd8b579,
      size: tier === "low" ? 0.035 : 0.025,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      map: texture ?? null,
      alphaTest: texture ? 0.02 : 0
    });
    this.points = new THREE.Points(geometry, material);
    this.points.name = spec.name;
  }

  update(elapsedSeconds: number): void {
    const attribute = this.points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const values = attribute.array as Float32Array;
    const spawned = this.#spawnRate === 0
      ? this.count
      : Math.min(this.count, Math.floor(elapsedSeconds * this.#spawnRate));
    for (let index = 0; index < this.count; index += 1) {
      const offset = index * 3;
      if (index >= spawned) {
        values[offset + 1] = -100_000;
        continue;
      }
      const age = elapsedSeconds % this.#lifetimes[index]!;
      values[offset] = this.#initial[offset]! + this.#velocities[offset]! * age;
      values[offset + 1] = this.#initial[offset + 1]! + this.#velocities[offset + 1]! * age - 0.35 * age * age;
      values[offset + 2] = this.#initial[offset + 2]! + this.#velocities[offset + 2]! * age;
    }
    attribute.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.map?.dispose();
    this.points.material.dispose();
  }
}
