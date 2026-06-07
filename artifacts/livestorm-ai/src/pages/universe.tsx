import { useState } from "react";
import {
  useGetUniverseRankings,
  useGetUniverseAlliances,
  useGetKingdoms,
  useGetMyStreamer,
  useCreateAlliance,
  useUpdateAlliance,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Globe, Crown, Trophy, Shield, Users, Swords, Star, Castle } from "lucide-react";

const RESOURCE_EMOJI = { gold: "🪙", wood: "🌲", stone: "🪨" };

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

  const statusColors: Record<string, string> = {
    accepted: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Globe className="w-8 h-8 text-accent" />
          Global Universe
        </h2>
        <p className="text-muted-foreground">Alliance with other streamers and compete for universal dominance.</p>
      </div>

      <Tabs defaultValue="rankings">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="rankings"><Trophy className="w-3 h-3 mr-1" />Rankings</TabsTrigger>
          <TabsTrigger value="alliances"><Shield className="w-3 h-3 mr-1" />Alliances</TabsTrigger>
          <TabsTrigger value="kingdoms"><Crown className="w-3 h-3 mr-1" />All Kingdoms</TabsTrigger>
        </TabsList>

        {/* Rankings */}
        <TabsContent value="rankings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-yellow-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Kingdom Power Rankings
                </CardTitle>
                <CardDescription>Ranked by total gold accumulated from gifts</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRankings ? (
                  [...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
                ) : (rankings ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No kingdoms ranked yet. Go live to start earning gold!</p>
                ) : (
                  <div className="space-y-2">
                    {(rankings ?? []).map((r, i) => (
                      <div
                        key={r.kingdomId}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          i === 0 ? "bg-yellow-500/10 border-yellow-500/30" :
                          i === 1 ? "bg-slate-400/10 border-slate-400/20" :
                          i === 2 ? "bg-amber-600/10 border-amber-600/20" :
                          "bg-background border-border"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          i === 0 ? "bg-yellow-400 text-yellow-900" :
                          i === 1 ? "bg-slate-400 text-slate-900" :
                          i === 2 ? "bg-amber-600 text-amber-100" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{r.kingdomName}</p>
                          <p className="text-xs text-muted-foreground">by {r.streamerName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-yellow-400">🪙 {r.gold.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Lv. {r.level}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Universe Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Active Kingdoms", value: kingdoms?.length ?? 0, icon: Crown, color: "text-yellow-400" },
                    { label: "Top Kingdom Gold", value: (rankings?.[0]?.gold ?? 0).toLocaleString(), icon: Trophy, color: "text-yellow-500", suffix: "🪙" },
                    { label: "Total Streamers", value: (rankings ?? []).length, icon: Users, color: "text-blue-400" },
                    { label: "Your Rank", value: streamer ? `#${(rankings ?? []).findIndex(r => r.streamerId === streamer.id) + 1 || "—"}` : "—", icon: Swords, color: "text-primary" },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background border border-border">
                      <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                      <p className="text-xl font-black text-white">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4">
                  <p className="text-sm font-semibold text-white mb-1">🌌 World Progression</p>
                  <p className="text-xs text-muted-foreground">
                    The Universe evolves as kingdoms grow and alliances form. More kingdoms = stronger world power.
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, ((kingdoms?.length ?? 0) / 10) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{kingdoms?.length ?? 0} / 10 kingdoms needed for next Universe tier</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alliances */}
        <TabsContent value="alliances">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Request Alliance</CardTitle>
                <CardDescription>Enter a streamer ID to send an alliance request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Your streamer ID: <span className="font-mono text-primary font-bold">{streamer?.id ?? "—"}</span></p>
                <Input
                  placeholder="Target Streamer ID"
                  value={allyInput}
                  onChange={e => setAllyInput(e.target.value)}
                  className="bg-background"
                  type="number"
                />
                <Button
                  className="w-full"
                  onClick={handleAllianceRequest}
                  disabled={createMutation.isPending || !streamer}
                >
                  {createMutation.isPending ? "Sending..." : "⚔️ Request Alliance"}
                </Button>
                <p className="text-xs text-muted-foreground">Share your streamer ID with allies so they can find you.</p>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Alliances</h3>
              {loadingAlliances ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (alliances ?? []).length === 0 ? (
                <Card className="bg-card border-white/5">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No alliances yet.</p>
                    <p className="text-sm mt-1">Form your first alliance to appear in the Universe together.</p>
                  </CardContent>
                </Card>
              ) : (
                (alliances ?? []).map((a) => (
                  <Card key={a.id} className="bg-card border-white/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">
                          {("partnerName" in a && (a as { partnerName?: string }).partnerName) || `Streamer #${a.isRequester ? a.targetId : a.requesterId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {("isRequester" in a && (a as { isRequester?: boolean }).isRequester) ? "You requested this" : "They requested this"}
                        </p>
                      </div>
                      <Badge className={`shrink-0 border ${statusColors[a.status] ?? "bg-muted"}`}>
                        {a.status}
                      </Badge>
                      {a.status === "pending" && !("isRequester" in a && (a as { isRequester?: boolean }).isRequester) && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleAllianceResponse(a.id, "accepted")}>Accept</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30" onClick={() => handleAllianceResponse(a.id, "rejected")}>Reject</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* All Kingdoms */}
        <TabsContent value="kingdoms">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(kingdoms ?? []).map((k) => (
              <Card key={k.id} className="bg-card border-white/5 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Castle className="w-4 h-4 text-primary" />
                    {k.name}
                  </CardTitle>
                  <CardDescription>Level {k.level} Kingdom</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-2 rounded bg-yellow-500/5 border border-yellow-500/20">
                      <p className="text-yellow-400 font-bold">{k.gold.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">🪙 Gold</p>
                    </div>
                    <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-emerald-400 font-bold">{k.wood.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">🌲 Wood</p>
                    </div>
                    <div className="p-2 rounded bg-slate-500/5 border border-slate-500/20">
                      <p className="text-slate-300 font-bold">{k.stone.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">🪨 Stone</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!kingdoms || kingdoms.length === 0) && (
              <div className="col-span-3 text-center text-muted-foreground py-12">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No kingdoms discovered yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
