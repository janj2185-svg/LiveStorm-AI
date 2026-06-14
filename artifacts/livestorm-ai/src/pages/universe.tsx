import { useState } from "react";
import {
  useGetUniverseRankings,
  useGetUniverseAlliances,
  useGetKingdoms,
  useGetMyStreamer,
  useCreateAlliance,
  useUpdateAlliance,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Globe, Crown, Trophy, Shield, Users, Swords, Star, Castle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/premium";

export function Universe() {
  const { toast } = useToast();
  const { data: streamer } = useGetMyStreamer();
  const { data: rankings, isLoading: loadingRankings } = useGetUniverseRankings();
  const { data: alliances, isLoading: loadingAlliances, refetch: refetchAlliances } = useGetUniverseAlliances();
  const { data: kingdoms } = useGetKingdoms();

  const createMutation = useCreateAlliance();
  const updateMutation = useUpdateAlliance();
  const [allyInput, setAllyInput] = useState("");
  const [activeTab, setActiveTab] = useState<"followers" | "friends" | "teams" | "chat">("followers");

  async function handleAllianceRequest() {
    const targetId = Number(allyInput.trim());
    if (!targetId || isNaN(targetId)) {
      toast({ title: "Enter a valid Streamer ID", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({ data: { targetStreamerId: targetId } });
      toast({ title: "Alliance requested!", description: `Request sent to streamer #${targetId}.` });
      setAllyInput("");
      refetchAlliances();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast({ title: "Failed", description: msg ?? "Could not request alliance.", variant: "destructive" });
    }
  }

  async function handleAllianceResponse(id: number, status: "accepted" | "rejected") {
    try {
      await updateMutation.mutateAsync({ id, data: { status } });
      toast({ title: status === "accepted" ? "Alliance accepted!" : "Alliance rejected" });
      refetchAlliances();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  const myRank = streamer
    ? ((rankings ?? []).findIndex(r => r.streamerId === streamer.id) + 1) || null
    : null;

  const totalKingdoms = kingdoms?.length ?? 0;
  const worldProgress = Math.min(100, (totalKingdoms / 10) * 100);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "url('/community-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400/50 mb-0.5">Social Hub</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Community</h1>
          <p className="text-sm text-white/68 mt-0.5">
            {(rankings ?? []).length} streamers · {(alliances ?? []).filter(a => a.status === "accepted").length} alliances active
          </p>
        </div>
        {myRank && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-[10px] text-white/70">Your Rank</p>
              <p className="text-xl font-black text-yellow-400">#{myRank}</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom pill tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] w-fit overflow-x-auto scrollbar-none">
        {([
          { id: "followers" as const, label: "Підписники", icon: <Trophy className="h-3.5 w-3.5" />  },
          { id: "friends"   as const, label: "Друзі",      icon: <Shield className="h-3.5 w-3.5" /> },
          { id: "teams"     as const, label: "Команди",    icon: <Crown className="h-3.5 w-3.5" />  },
          { id: "chat"      as const, label: "Бесіди",     icon: <Swords className="h-3.5 w-3.5" /> },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                : "text-white/58 hover:text-white/78 hover:bg-white/[0.04]",
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ПІДПИСНИКИ TAB */}
      {activeTab === "followers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: top followers list */}
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-yellow-500/12">
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="ls-section">Топ підписників</p>
                <p className="text-[10px] text-white/70">Ranked by stream activity</p>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {loadingRankings
                ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl bg-white/5" />)
                : (rankings ?? []).length === 0
                ? (
                  <div className="py-10 text-center">
                    <Trophy className="w-10 h-10 mx-auto mb-3 text-white/10" />
                    <p className="text-sm text-white/70">No rankings yet</p>
                  </div>
                )
                : (rankings ?? []).slice(0, 10).map((r, i) => {
                    const isMe = streamer && r.streamerId === streamer.id;
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <motion.div
                        key={r.kingdomId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-xl border transition-all",
                          isMe
                            ? "border-violet-500/30 bg-violet-500/[0.07]"
                            : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="text-sm font-black w-6 text-center shrink-0">
                          {medals[i] ?? <span className="text-white/45 text-xs">#{i + 1}</span>}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-sm shrink-0">🏰</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{r.kingdomName}</p>
                          <p className="text-[10px] text-white/55 truncate">{r.streamerName}</p>
                        </div>
                        <p className="text-xs font-black text-yellow-400 shrink-0">🪙 {r.gold.toLocaleString()}</p>
                      </motion.div>
                    );
                  })
              }
            </div>
          </div>

          {/* Center: World stats */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-500/12 p-5" style={{ background: "rgba(14,165,233,0.04)" }}>
              <div className="flex items-center gap-2.5 mb-3">
                <Globe className="h-4 w-4 text-cyan-400" />
                <p className="ls-section">🌌 World Progress</p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/72">Kingdoms active</p>
                <span className="text-cyan-400 font-black tabular-nums">{totalKingdoms}/10</span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden bg-white/[0.06] mb-1">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700"
                  style={{ width: `${worldProgress}%`, boxShadow: "0 0 8px rgba(14,165,233,0.5)" }}
                />
              </div>
              <p className="text-[10px] text-white/68">{totalKingdoms} / 10 needed for next Universe tier</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Users className="w-4 h-4" />,  label: "Streamers", value: (rankings ?? []).length,  iconBg: "bg-blue-500/12",   color: "text-blue-400"   },
                { icon: <Shield className="w-4 h-4" />, label: "Alliances", value: (alliances ?? []).filter(a => a.status === "accepted").length, iconBg: "bg-green-500/12", color: "text-green-400" },
                { icon: <Crown className="w-4 h-4" />,  label: "Kingdoms",  value: totalKingdoms,            iconBg: "bg-yellow-500/12", color: "text-yellow-400" },
                { icon: <Trophy className="w-4 h-4" />, label: "Top Gold",  value: rankings?.[0]?.gold ?? 0, iconBg: "bg-amber-500/12",  color: "text-amber-400"  },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.06] p-3.5" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className={cn("p-1.5 rounded-lg w-fit mb-2", s.iconBg)}>
                    <span className={s.color}>{s.icon}</span>
                  </div>
                  <p className="text-lg font-black text-white tabular-nums"><AnimatedCounter target={s.value} /></p>
                  <p className="text-[10px] text-white/70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Online now */}
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <p className="ls-section">Онлайн зараз</p>
              <span className="ml-auto text-[10px] text-emerald-400 font-bold tabular-nums">
                {(rankings ?? []).length} active
              </span>
            </div>
            <div className="p-3 space-y-1">
              {(rankings ?? []).length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-white/10" />
                  <p className="text-xs text-white/55">Nobody online yet</p>
                </div>
              ) : (rankings ?? []).slice(0, 8).map((r, i) => (
                <motion.div
                  key={r.streamerId}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all"
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-300">
                      {r.streamerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0a14]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">{r.streamerName}</p>
                    <p className="text-[10px] text-white/52 truncate">Lv.{r.level} · 🪙{r.gold.toLocaleString()}</p>
                  </div>
                  <Star className="h-3 w-3 text-yellow-400/40 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ДРУЗІ TAB */}
      {activeTab === "friends" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.06] to-transparent overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-500/15">
              <p className="ls-section">Запросити союз</p>
              <p className="text-xs text-muted-foreground mt-0.5">Введи ID стрімера для пакту.</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-xs text-muted-foreground">Your Streamer ID</p>
                <p className="font-mono font-black text-violet-400 text-lg">{streamer?.id ?? "—"}</p>
              </div>
              <Input
                placeholder="Target Streamer ID"
                value={allyInput}
                onChange={e => setAllyInput(e.target.value)}
                className="bg-white/[0.04] border-white/10 focus:border-violet-500/40"
                type="number"
              />
              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 font-bold shadow-lg shadow-violet-500/20"
                onClick={handleAllianceRequest}
                disabled={createMutation.isPending || !streamer}
              >
                {createMutation.isPending ? "Sending…" : "⚔️ Request Alliance"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Share your ID with allies so they can find you.</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Твої союзи</p>
            {loadingAlliances
              ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)
              : (alliances ?? []).length === 0
              ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-15 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Ще немає союзів.</p>
                </div>
              )
              : (alliances ?? []).map((a) => {
                  const statusStyles: Record<string, string> = {
                    accepted: "bg-green-500/10 text-green-400 border-green-500/20",
                    pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
                  };
                  const isRequester = "isRequester" in a && (a as any).isRequester;
                  const partnerName = ("partnerName" in a && (a as any).partnerName) || `Streamer #${isRequester ? a.targetId : a.requesterId}`;
                  return (
                    <div key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/15 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{partnerName}</p>
                        <p className="text-xs text-muted-foreground">{isRequester ? "You requested this" : "They requested this"}</p>
                      </div>
                      <Badge className={cn("shrink-0 border text-xs", statusStyles[a.status] ?? "bg-muted")}>{a.status}</Badge>
                      {a.status === "pending" && !isRequester && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="bg-green-600 hover:bg-green-500 h-7 text-xs font-bold" onClick={() => handleAllianceResponse(a.id, "accepted")}>Accept</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => handleAllianceResponse(a.id, "rejected")}>Reject</Button>
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* КОМАНДИ TAB */}
      {activeTab === "teams" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(kingdoms ?? []).map((k, i) => (
            <motion.div
              key={k.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-violet-500/25 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/15 flex items-center justify-center shrink-0">
                  <Castle className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{k.name}</p>
                  <p className="text-xs text-muted-foreground">Level {k.level} Kingdom</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-yellow-500/[0.07] border border-yellow-500/15">
                  <p className="text-yellow-400 font-bold text-sm">{k.gold.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">🪙 Gold</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/[0.07] border border-green-500/15">
                  <p className="text-green-400 font-bold text-sm">{k.wood.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">🌲 Wood</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-500/[0.07] border border-slate-500/15">
                  <p className="text-slate-300 font-bold text-sm">{k.stone.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">🪨 Stone</p>
                </div>
              </div>
            </motion.div>
          ))}
          {(!kingdoms || kingdoms.length === 0) && (
            <div className="col-span-3 text-center py-14">
              <Globe className="w-12 h-12 mx-auto mb-3 text-white/10" />
              <p className="text-sm text-white/55">No kingdoms discovered yet.</p>
            </div>
          )}
        </div>
      )}

      {/* БЕСІДИ TAB */}
      {activeTab === "chat" && (
        <div className="rounded-2xl border border-white/[0.07] p-16 text-center" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 w-fit mx-auto mb-4">
            <Swords className="h-10 w-10 text-violet-400/60" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Бесіди — Coming Soon</p>
          <p className="text-sm text-white/62 max-w-sm mx-auto">
            Community chat and direct messaging between streamers will be available in a future update.
          </p>
        </div>
      )}
    </div>
    </div>
  );
}
