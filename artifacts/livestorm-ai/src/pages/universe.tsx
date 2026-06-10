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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Globe, Crown, Trophy, Shield, Users, Swords, Star, Castle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PageHero, GradientText, RankBadge, AnimatedCounter, ProgressRing } from "@/components/ui/premium";

export function Universe() {
  const { toast } = useToast();
  const { data: streamer } = useGetMyStreamer();
  const { data: rankings, isLoading: loadingRankings } = useGetUniverseRankings();
  const { data: alliances, isLoading: loadingAlliances, refetch: refetchAlliances } = useGetUniverseAlliances();
  const { data: kingdoms } = useGetKingdoms();

  const createMutation = useCreateAlliance();
  const updateMutation = useUpdateAlliance();
  const [allyInput, setAllyInput] = useState("");

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
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Hero */}
      <PageHero
        gradientFrom="rgba(14,165,233,0.14)"
        gradientTo="rgba(124,58,237,0.08)"
        icon={
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
            <Globe className="h-8 w-8 text-cyan-400" />
          </div>
        }
        title={
          <span>
            Global{" "}
            <GradientText from="from-cyan-400" to="to-violet-400">Universe</GradientText>
          </span>
        }
        subtitle="Alliance with other streamers and compete for universal dominance across all kingdoms."
        right={
          myRank ? (
            <div className="text-center">
              <div className="text-4xl font-black text-white">#{myRank}</div>
              <div className="text-xs text-muted-foreground">Your Rank</div>
            </div>
          ) : undefined
        }
      />

      {/* Universe stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Crown className="w-5 h-5" />,  label: "Active Kingdoms",    value: totalKingdoms,                  iconBg: "bg-yellow-500/15", iconColor: "text-yellow-400" },
          { icon: <Trophy className="w-5 h-5" />, label: "Top Kingdom Gold",   value: rankings?.[0]?.gold ?? 0,       iconBg: "bg-amber-500/15",  iconColor: "text-amber-400"  },
          { icon: <Users className="w-5 h-5" />,  label: "Total Streamers",    value: (rankings ?? []).length,        iconBg: "bg-blue-500/15",   iconColor: "text-blue-400"   },
          { icon: <Shield className="w-5 h-5" />, label: "Active Alliances",   value: (alliances ?? []).filter(a => a.status === "accepted").length, iconBg: "bg-green-500/15", iconColor: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className={cn("p-2 rounded-xl w-fit mb-3", s.iconBg)}>
              <span className={s.iconColor}>{s.icon}</span>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              <AnimatedCounter target={s.value} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* World progress */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-r from-cyan-500/[0.05] to-transparent p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-semibold text-white text-sm">🌌 World Progression</p>
            <p className="text-xs text-muted-foreground mt-0.5">The Universe evolves as kingdoms grow. More kingdoms = stronger world power.</p>
          </div>
          <span className="text-cyan-400 font-black">{totalKingdoms}/10</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden bg-white/[0.05]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700"
            style={{ width: `${worldProgress}%`, boxShadow: "0 0 10px rgba(14,165,233,0.5)" }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{totalKingdoms} / 10 kingdoms needed for next Universe tier</p>
      </div>

      <Tabs defaultValue="rankings">
        <TabsList className="bg-white/[0.03] border border-white/[0.08] p-1 h-auto gap-1">
          {[
            { value: "rankings",  icon: <Trophy className="w-3.5 h-3.5" />,  label: "Rankings"    },
            { value: "alliances", icon: <Shield className="w-3.5 h-3.5" />,  label: "Alliances"   },
            { value: "kingdoms",  icon: <Crown className="w-3.5 h-3.5" />,   label: "All Kingdoms"},
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 text-sm data-[state=active]:bg-white/[0.08] data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              {tab.icon}{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="mt-5">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-yellow-500/15">
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Kingdom Power Rankings</p>
                <p className="text-xs text-muted-foreground">Ranked by total gold from viewer gifts</p>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              {loadingRankings ? (
                [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)
              ) : (rankings ?? []).length === 0 ? (
                <div className="py-12 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground">No kingdoms ranked yet. Go live to start earning gold!</p>
                </div>
              ) : (
                (rankings ?? []).map((r, i) => {
                  const isMe = streamer && r.streamerId === streamer.id;
                  return (
                    <motion.div
                      key={r.kingdomId}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all",
                        isMe
                          ? "border-violet-500/30 bg-violet-500/[0.08] shadow-lg shadow-violet-500/5"
                          : i < 3
                          ? "border-white/[0.08] bg-white/[0.03]"
                          : "border-white/[0.05] bg-white/[0.02]",
                      )}
                    >
                      <RankBadge rank={i + 1} />
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-lg shrink-0">
                        🏰
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{r.kingdomName}</p>
                          {isMe && <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/20 text-violet-300 border-0">You</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">by {r.streamerName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-yellow-400">🪙 {r.gold.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Lv. {r.level}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* Alliances Tab */}
        <TabsContent value="alliances" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Request form */}
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.06] to-transparent overflow-hidden">
              <div className="px-5 py-4 border-b border-violet-500/15">
                <p className="font-semibold text-white text-sm">Request Alliance</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enter a streamer ID to form a pact.</p>
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

            {/* Alliance list */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Alliances</p>
              {loadingAlliances ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)
              ) : (alliances ?? []).length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-15 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No alliances yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Form your first alliance to appear in the Universe together.</p>
                </div>
              ) : (
                (alliances ?? []).map((a) => {
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
                      <Badge className={cn("shrink-0 border text-xs", statusStyles[a.status] ?? "bg-muted")}>
                        {a.status}
                      </Badge>
                      {a.status === "pending" && !isRequester && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="bg-green-600 hover:bg-green-500 h-7 text-xs font-bold" onClick={() => handleAllianceResponse(a.id, "accepted")}>Accept</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => handleAllianceResponse(a.id, "rejected")}>Reject</Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* All Kingdoms Tab */}
        <TabsContent value="kingdoms" className="mt-5">
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
              <div className="col-span-3 text-center py-14 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-15" />
                <p>No kingdoms discovered yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
