import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type SearchState = "idle" | "loading" | "not_found" | "error";

function logEvent(event: string, data?: Record<string, string>) {
  fetch(`${BASE_URL}/api/stormpass/log`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ eventType: event, ...data }),
  }).catch(() => {});
}

export function PassEntry() {
  const [, navigate] = useLocation();

  // Support both /pass/:slug and /pass with ?s= query param
  const params     = useParams<{ slug?: string }>();
  const paramSlug  = params.slug ?? "";
  const querySlug  = new URLSearchParams(window.location.search).get("s") ?? "";
  const presetSlug = paramSlug || querySlug;

  const [streamer, setStreamer] = useState(presetSlug);
  const [viewer,   setViewer]   = useState("");
  const [state,    setState]    = useState<SearchState>("idle");

  useEffect(() => {
    document.title = presetSlug
      ? `@${presetSlug} · Storm Pass`
      : "Storm Pass — LiveStorm AI";
    logEvent("page_opened", { streamerSlug: presetSlug });
  }, [presetSlug]);

  // Keep form streamer in sync if slug param changes (e.g. navigation)
  useEffect(() => {
    if (presetSlug) setStreamer(presetSlug);
  }, [presetSlug]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const slug = streamer.trim().replace(/^@/, "");
    const nick = viewer.trim();
    if (!slug || !nick) return;

    setState("loading");
    logEvent("search_attempted", { streamerSlug: slug, viewerName: nick });

    try {
      const r = await fetch(
        `${BASE_URL}/api/storm-pass/search?streamer=${encodeURIComponent(slug)}&viewer=${encodeURIComponent(nick)}`
      );
      if (r.status === 404) {
        setState("not_found");
        logEvent("pass_not_found", { streamerSlug: slug, viewerName: nick });
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const data = await r.json();
      logEvent("pass_found", { streamerSlug: slug, viewerName: nick });
      // Navigate to slug-based URL — no numeric IDs in public URLs
      navigate(`/pass/${encodeURIComponent(slug)}/${encodeURIComponent(data.viewerName ?? nick)}`);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center px-4 py-12">

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">⚡</div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Storm Pass</h1>
        {presetSlug ? (
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            Стрімер <span className="text-white font-semibold">@{presetSlug}</span> ·{" "}
            введи свій TikTok нік щоб відкрити профіль
          </p>
        ) : (
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            Знайди свій профіль глядача — побачиш рівень, досягнення та що Storm про тебе пам'ятає
          </p>
        )}
      </div>

      {/* Search card */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-sm bg-[#0d1120] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
      >
        {/* Streamer field */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Стрімер (TikTok username)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">@</span>
            <input
              type="text"
              value={streamer}
              onChange={e => setStreamer(e.target.value)}
              placeholder="jan85oks"
              required
              className="w-full bg-[#141929] border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
          </div>
        </div>

        {/* Viewer field */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Твій TikTok нік
          </label>
          <input
            type="text"
            value={viewer}
            onChange={e => setViewer(e.target.value)}
            placeholder="Jan_Kyiv"
            required
            autoFocus={!!presetSlug}
            className="w-full bg-[#141929] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
          />
        </div>

        {/* Error states */}
        {state === "not_found" && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-950/40 border border-amber-700/40 rounded-xl">
            <span className="text-base flex-shrink-0">😶‍🌫️</span>
            <div>
              <p className="text-amber-400 text-xs font-semibold">Storm тебе ще не бачив</p>
              <p className="text-amber-500/70 text-xs mt-0.5">
                Напиши будь-що в чат стрімера під час стріму — Storm запам'ятає тебе!
              </p>
            </div>
          </div>
        )}
        {state === "error" && (
          <div className="px-3 py-2 bg-red-950/40 border border-red-700/40 rounded-xl">
            <p className="text-red-400 text-xs">Щось пішло не так. Спробуй ще раз.</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={state === "loading" || !streamer.trim() || !viewer.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(168,85,247,0.3)",
          }}
        >
          {state === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin text-base">⚡</span>
              Шукаю…
            </span>
          ) : (
            "Знайти мій Storm Pass →"
          )}
        </button>
      </form>

      {/* Hint */}
      <div className="mt-8 text-center space-y-1">
        <p className="text-slate-600 text-xs">Або відскануй QR-код з екрану стрімера</p>
        <p className="text-slate-700 text-xs">LiveStorm AI · Storm Pass</p>
      </div>

    </div>
  );
}
