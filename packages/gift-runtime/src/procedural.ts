import type { RuntimeManifest } from "./schema";
import { seededRandom } from "./particles";

export type ProceduralValue = number | boolean | string;
type Parameter = RuntimeManifest["procedural_parameters"][number];

export interface ClientAiProvider {
  resolve(parameter: Parameter, context: Readonly<Record<string, unknown>>): Promise<ProceduralValue>;
}

export class ProceduralCapabilityError extends Error {
  constructor(readonly parameter: string) {
    super(`Procedural parameter "${parameter}" requires a host-provided client_ai provider`);
    this.name = "ProceduralCapabilityError";
  }
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function deterministicValue(parameter: Parameter, seed: string): ProceduralValue {
  const random = seededRandom(hashSeed(`${seed}:${parameter.name}`));
  const minimum = parameter.minimum ?? 0;
  const maximum = parameter.maximum ?? (parameter.value_type === "seed" ? 2_147_483_647 : 1);
  switch (parameter.value_type) {
    case "integer":
    case "seed":
      return Math.floor(minimum + random() * (maximum - minimum + 1));
    case "number":
      return minimum + random() * (maximum - minimum);
    case "boolean":
      return random() >= 0.5;
    case "color": {
      const color = Math.floor(random() * 0x1000000);
      return `#${color.toString(16).padStart(6, "0")}`;
    }
    case "enum":
      if (parameter.allowed_values.length === 0) {
        throw new Error(`Enum procedural parameter "${parameter.name}" has no allowed values`);
      }
      return parameter.allowed_values[Math.floor(random() * parameter.allowed_values.length)]!;
  }
}

export async function resolveProceduralParameters(
  parameters: RuntimeManifest["procedural_parameters"],
  deterministicSeed: string,
  context: Readonly<Record<string, unknown>> = {},
  aiProvider?: ClientAiProvider
): Promise<Readonly<Record<string, ProceduralValue>>> {
  const entries: Array<readonly [string, ProceduralValue]> = [];
  for (const parameter of parameters) {
    if (parameter.source === "client_ai") {
      if (!aiProvider) throw new ProceduralCapabilityError(parameter.name);
      entries.push([parameter.name, await aiProvider.resolve(parameter, context)]);
    } else {
      entries.push([parameter.name, deterministicValue(parameter, deterministicSeed)]);
    }
  }
  return Object.fromEntries(entries);
}
