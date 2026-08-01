import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Sparkles, AlertTriangle, Radio, Coins, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLiveSessionContext } from "@/contexts/LiveSessionContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, token?: string | null) {
  const resp = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

type CatalogGift = {
  id: string;
  name: string;
  coins: number;
  tier: string;
  emoji: string;
  category: string;
  animation: string;
};

type ReceivedGift = {
  username: string;
  giftName: string;
  coins: number;
  count: number;
  timestamp: number;
  platform: string;
};

const TIER_STYLE: Record<string, string> = {
  micro: "border-white/10 bg-white/[0.03]",
  standard: "border-cyan-500/25 bg-cyan-500/5",
  big: "border-amber-500/30 bg-amber-500/8",
  whale: "border-violet-500/35 bg-violet-500/10",
  legendary: "border-fuchsia-500/40 bg-fuchsia-500/10",
};

function GiftPreviewCard({ gift, active }: { gift: CatalogGift; active?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-transform duration-300",
        TIER_STYLE[gift.tier] ?? TIER_STYLE.micro,
        active && "scale-[1.02] shadow-[0_0_28px_rgba(245,158,11,0.18)]",
      )}
    >
      <div
        className={cn(
          "text-4xl mb-3 select-none",
          gift.animation === "css-float" && "animate-[gift-float_2.4s_ease-in-out_infinite]",
          gift.animation === "css-pulse" && "animate-pulse",
          gift.animation === "css-bounce" && "animate-bounce",
          gift.animation === "css-burst" && "animate-[gift-burst_1.6s_ease-in-out_infinite]",
          gift.animation === "css-sparkle" && "animate-[gift-sparkle_2s_ease-in-out_infinite]",
          gift.animation === "css-rain" && "animate-[gift-rain_1.8s_linear_infinite]",
          gift.animation === "css-epic" && "animate-[gift-epic_2.2s_ease-in-out_infinite]",
        )}
      >
        {gift.emoji}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{gift.name}</p>
          <p className="text-[11px] text-white/45 capitalize">{gift.category} · {gift.tier}</p>
        </div>
        <Badge variant="outline" className="border-white/15 text-amber-200/90 text-[10px]">
          <Coins className="h-3 w-3 mr-1" />
          {gift.coins}
        </Badge>
      </div>
      <p className="mt-3 text-[10px] text-white/35 uppercase tracking-wider">{gift.animation}</p>
    </div>
  );
}

export function Gifts() {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const live = useLiveSessionContext();

  useEffect(() => {
    getToken().then((t) => setToken(t)).catch(() => setToken(null));
  }, [getToken]);

  const catalogQ = useQuery({
    queryKey: ["gifts-catalog"],
    queryFn: () => apiFetch("/gifts/catalog", token),
    enabled: true,
    staleTime: 60_000,
  });

  const receivedQ = useQuery({
    queryKey: ["gifts-received"],
    queryFn: () => apiFetch("/gifts/received", token),
    refetchInterval: 4_000,
  });

  const statusQ = useQuery({
    queryKey: ["gifts-status"],
    queryFn: () => apiFetch("/gifts/status", token),
    staleTime: 60_000,
  });

  const liveGifts = useMemo(() => {
    const fromApi = (receivedQ.data?.gifts as ReceivedGift[] | undefined) ?? [];
    const fromSocket = (live?.events ?? [])
      .filter((e: any) => e.type === "gift" && e.data?.repeatEnd !== false)
      .map((e: any) => ({
        username: e.username ?? "Viewer",
        giftName: e.data?.giftName ?? "Gift",
        coins: e.data?.coins ?? 0,
        count: e.data?.count ?? 1,
        timestamp: e.timestamp ?? Date.now(),
        platform: e.platform ?? "tiktok",
      })) as ReceivedGift[];
    const merged = [...fromSocket, ...fromApi];
    const seen = new Set<string>();
    return merged.filter((g) => {
      const key = `${g.username}|${g.giftName}|${g.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 40);
  }, [receivedQ.data, live?.events]);

  const catalog = (catalogQ.data?.catalog as CatalogGift[] | undefined) ?? [];
  const categories = Array.from(new Set(catalog.map((g) => g.category)));

  return (
    <div className="space-y-8 pb-10">
      <style>{`
        @keyframes gift-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes gift-burst { 0%,100%{transform:scale(1)} 40%{transform:scale(1.18)} 70%{transform:scale(0.96)} }
        @keyframes gift-sparkle { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.35) drop-shadow(0 0 8px rgba(250,204,21,.55))} }
        @keyframes gift-rain { 0%{transform:translateY(-6px) rotate(-6deg)} 100%{transform:translateY(6px) rotate(6deg)} }
        @keyframes gift-epic { 0%,100%{transform:scale(1) rotate(0)} 50%{transform:scale(1.12) rotate(-3deg)} }
      `}</style>

      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#1a1428] via-[#12182b] to-[#0c1220] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.16),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.14),transparent_40%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-300/90 text-xs font-semibold uppercase tracking-[0.2em] mb-3">
              <Gift className="h-4 w-4" /> Gift System
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Live Gift Gallery</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Real gifts received from TikTok / YouTube Super Chats, plus CSS preview tiers.
              Purchasable wallet store and AAA 3D animations are not shipped — see the pipeline plan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/25 border">
              Ingest + OBS alerts: live
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/25 border">
              AAA store: pending approval
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">Lifetime coins received</p>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">
            {receivedQ.data?.totalGiftsReceived?.toLocaleString?.() ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">Session gift coins</p>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">
            {receivedQ.data?.sessionGiftCoins?.toLocaleString?.() ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">Session</p>
          <p className="mt-2 text-sm font-semibold text-white flex items-center gap-2">
            <Radio className={cn("h-4 w-4", receivedQ.data?.sessionActive ? "text-emerald-400" : "text-white/35")} />
            {receivedQ.data?.sessionActive ? `Live #${receivedQ.data.sessionId}` : "No active session"}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" /> Received feed
          </h2>
          <Button asChild variant="outline" size="sm" className="border-white/15">
            <Link href="/live-studio">Open Live Studio</Link>
          </Button>
        </div>
        {liveGifts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-white/45 text-sm">
            No gifts yet. Start a demo or real TikTok session — gifts will appear here and on OBS alerts.
          </div>
        ) : (
          <div className="space-y-2">
            {liveGifts.map((g, i) => (
              <div
                key={`${g.username}-${g.timestamp}-${i}`}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white font-medium">
                    {g.username}{" "}
                    <span className="text-white/45 font-normal">sent {g.giftName}</span>
                  </p>
                  <p className="text-[11px] text-white/35">
                    {g.platform} · {new Date(g.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/25 border">
                  ×{g.coins} coins
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-300" />
          <h2 className="text-lg font-semibold text-white">Reference catalog (CSS previews)</h2>
        </div>
        <p className="text-sm text-white/50">
          These are recognition/preview tiers — not a buyable store. Click a card to preview motion.
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Badge key={c} variant="outline" className="border-white/12 text-white/55 capitalize">{c}</Badge>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalog.map((gift) => (
            <button key={gift.id} type="button" className="text-left" onClick={() => setPreviewId(gift.id)}>
              <GiftPreviewCard gift={gift} active={previewId === gift.id} />
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-100">AAA Animated Gift Store — requires your approval</h3>
            <p className="mt-1 text-sm text-amber-100/70">
              Missing: wallet ledger, purchase APIs, 3D/GLB assets, shaders, particles, and sound packs.
              Implementation plan: <code className="text-amber-200">docs/GIFT_AAA_PIPELINE.md</code>.
            </p>
            {statusQ.data?.approvalRequired && (
              <ul className="mt-3 list-disc pl-5 text-xs text-amber-100/60 space-y-1">
                {(statusQ.data.approvalRequired as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
