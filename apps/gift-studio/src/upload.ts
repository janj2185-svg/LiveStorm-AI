import type { AssetPlatform, AssetQuality } from "./types";

const MAX_BYTES = 104_857_600;

export interface PreparedAsset {
  file: File;
  extension: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  platform: AssetPlatform;
  qualityTier: AssetQuality;
  kind: "model" | "image" | "lottie" | "audio" | "shader" | "blender_source";
  sourceOnly: boolean;
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function starts(bytes: Uint8Array, values: readonly number[]): boolean {
  return values.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return new TextDecoder().decode(bytes.slice(start, start + length));
}

async function digest(bytes: Uint8Array): Promise<string> {
  if (!crypto.subtle) throw new Error("Web Crypto SHA-256 is required for asset import");
  // Allocate a fresh Uint8Array so Node/vitest and browsers always pass a
  // concrete TypedArray into SubtleCrypto (File polyfills can yield exotic buffers).
  const material = Uint8Array.from(bytes);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", material))]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function validateJson(text: string, lottie: boolean): void {
  const value = JSON.parse(text) as {
    asset?: { version?: string };
    buffers?: Array<{ uri?: string }>;
    images?: Array<{ uri?: string }>;
    v?: unknown;
    layers?: unknown;
  };
  if (lottie) {
    if (typeof value.v !== "string" || !Array.isArray(value.layers)) {
      throw new Error("Lottie JSON must contain a version and layers array");
    }
    const assertEmbedded = (entry: unknown): void => {
      if (Array.isArray(entry)) {
        entry.forEach(assertEmbedded);
        return;
      }
      if (!entry || typeof entry !== "object") return;
      for (const [key, child] of Object.entries(entry)) {
        if (
          typeof child === "string" &&
          ((key === "u" && child.length > 0) || ((key === "p" || key === "fPath") && !child.startsWith("data:")))
        ) {
          throw new Error("Lottie external assets are not supported; embed all images and fonts");
        }
        assertEmbedded(child);
      }
    };
    assertEmbedded(value);
    return;
  }
  if (value.asset?.version !== "2.0") throw new Error("GLTF JSON must declare asset.version 2.0");
  const references = [...(value.buffers ?? []), ...(value.images ?? [])]
    .map((entry) => entry.uri)
    .filter((uri): uri is string => Boolean(uri));
  if (references.some((uri) => !uri.startsWith("data:"))) {
    throw new Error("GLTF external file references are not supported; import GLB or embed data URIs");
  }
}

export async function prepareAsset(
  file: File,
  qualityTier: Exclude<AssetQuality, "source"> = "high"
): Promise<PreparedAsset> {
  if (file.size <= 0) throw new Error("Asset file is empty");
  if (file.size > MAX_BYTES) throw new Error("Asset exceeds the backend 100 MiB limit");
  const extension = extensionOf(file.name);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const text = () => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  let contentType: string;
  let kind: PreparedAsset["kind"];
  let sourceOnly = false;

  switch (extension) {
    case "glb":
      if (ascii(bytes, 0, 4) !== "glTF") throw new Error("GLB signature is invalid");
      contentType = "model/gltf-binary";
      kind = "model";
      break;
    case "gltf":
      validateJson(text(), false);
      contentType = "model/gltf+json";
      kind = "model";
      break;
    case "png":
      if (!starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        throw new Error("PNG signature is invalid");
      }
      contentType = "image/png";
      kind = "image";
      break;
    case "jpg":
    case "jpeg":
      if (!starts(bytes, [0xff, 0xd8, 0xff])) throw new Error("JPEG signature is invalid");
      contentType = "image/jpeg";
      kind = "image";
      break;
    case "webp":
      if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
        throw new Error("WebP signature is invalid");
      }
      contentType = "image/webp";
      kind = "image";
      break;
    case "json":
      validateJson(text(), true);
      contentType = "application/json";
      kind = "lottie";
      break;
    case "wav":
      if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WAVE") {
        throw new Error("WAV signature is invalid");
      }
      contentType = "audio/wav";
      kind = "audio";
      break;
    case "ogg":
      if (ascii(bytes, 0, 4) !== "OggS") throw new Error("Ogg signature is invalid");
      contentType = "audio/ogg";
      kind = "audio";
      break;
    case "mp3":
      if (ascii(bytes, 0, 3) !== "ID3" && !(bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0)) {
        throw new Error("MP3 signature is invalid");
      }
      contentType = "audio/mpeg";
      kind = "audio";
      break;
    case "m4a":
    case "mp4":
      if (ascii(bytes, 4, 4) !== "ftyp") throw new Error("MPEG-4 audio signature is invalid");
      contentType = "audio/mp4";
      kind = "audio";
      break;
    case "glsl":
    case "vert":
    case "frag": {
      const shader = text();
      if (shader.length > 65_536 || !/\bvoid\s+main\s*\(/.test(shader)) {
        throw new Error("Shader text must be at most 64 KiB and contain a main function");
      }
      contentType = "application/x-glsl";
      kind = "shader";
      break;
    }
    case "blend":
      if (ascii(bytes, 0, 7) !== "BLENDER") throw new Error("Blender source signature is invalid");
      contentType = "application/x-blender";
      kind = "blender_source";
      sourceOnly = true;
      break;
    default:
      throw new Error("Unsupported file type. Select GLB/GLTF, PNG/JPEG/WebP, Lottie JSON, audio, GLSL, or BLEND.");
  }

  return {
    file,
    extension,
    contentType,
    byteSize: file.size,
    sha256: await digest(bytes),
    platform: sourceOnly ? "source" : "web",
    qualityTier: sourceOnly ? "source" : qualityTier,
    kind,
    sourceOnly
  };
}
