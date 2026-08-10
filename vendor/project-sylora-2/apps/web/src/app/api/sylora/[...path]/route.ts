import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://api:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "dev-internal-secret-change-me";

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const { path } = await ctx.params;
  const suffix = path.join("/");
  const url = new URL(req.url);
  const target = `${API_BASE}/v1/${suffix}${url.search}`;

  const headers = new Headers();
  headers.set("X-Sylora-User-Id", session.user.id);
  headers.set("X-Sylora-Internal-Secret", INTERNAL_SECRET);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(target, init);
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
