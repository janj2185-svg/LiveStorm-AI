export interface LauncherSession {
  apiBase: string;
  token: string;
  definitionId?: string;
  versionId?: string;
}

interface LauncherMessage {
  type: "sylora:gift-studio:session";
  apiBase: string;
  token: string;
  definitionId?: string;
  versionId?: string;
}

export function configuredLauncherOrigins(): string[] {
  const configured = import.meta.env.VITE_TRUSTED_LAUNCHER_ORIGINS as string | undefined;
  if (!configured) return [];
  return [...new Set(configured.split(",").map((origin) => origin.trim()).filter(Boolean).map((origin) => {
    const parsed = new URL(origin);
    if (parsed.origin !== origin) throw new Error(`Trusted launcher entry must be an origin: ${origin}`);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      throw new Error(`Trusted launcher origin must use HTTPS: ${origin}`);
    }
    return parsed.origin;
  }))];
}

function isLauncherMessage(value: unknown): value is LauncherMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<LauncherMessage>;
  return message.type === "sylora:gift-studio:session" &&
    typeof message.apiBase === "string" &&
    typeof message.token === "string" &&
    message.token.length > 0 &&
    (message.definitionId === undefined || typeof message.definitionId === "string") &&
    (message.versionId === undefined || typeof message.versionId === "string");
}

export function listenForLauncherSession(
  allowedOrigins: readonly string[],
  accept: (session: LauncherSession) => void
): () => void {
  const origins = new Set(allowedOrigins);
  const handler = (event: MessageEvent<unknown>) => {
    if (!origins.has(event.origin) || !isLauncherMessage(event.data)) return;
    const expectedSource = window.opener ?? (window.parent !== window ? window.parent : null);
    if (!expectedSource || event.source !== expectedSource) return;
    const session: LauncherSession = {
      apiBase: event.data.apiBase,
      token: event.data.token,
      ...(event.data.definitionId ? { definitionId: event.data.definitionId } : {}),
      ...(event.data.versionId ? { versionId: event.data.versionId } : {})
    };
    accept(session);
    (event.source as WindowProxy).postMessage({ type: "sylora:gift-studio:accepted" }, event.origin);
  };
  window.addEventListener("message", handler);
  const launcher = window.opener ?? (window.parent !== window ? window.parent : null);
  for (const origin of origins) {
    launcher?.postMessage({ type: "sylora:gift-studio:ready" }, origin);
  }
  return () => window.removeEventListener("message", handler);
}
