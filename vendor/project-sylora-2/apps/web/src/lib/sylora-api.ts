import { auth } from "@/auth";
import { headers } from "next/headers";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://api:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "dev-internal-secret-change-me";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function syloraFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 });
  }
  const hdrs = new Headers(init.headers);
  hdrs.set("X-Sylora-User-Id", userId);
  hdrs.set("X-Sylora-Internal-Secret", INTERNAL_SECRET);
  if (init.body && !hdrs.has("Content-Type")) {
    hdrs.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers: hdrs, cache: "no-store" });
}

export async function requireUserIdFromRequest(): Promise<string | null> {
  // Prefer session; fall back unused for now
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  const h = await headers();
  return h.get("x-sylora-user-id");
}
