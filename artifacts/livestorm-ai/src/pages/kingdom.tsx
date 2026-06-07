import { useGetMyKingdom, useGetKingdoms } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Castle, Pickaxe, Hammer, Coins, Map as MapIcon, Globe } from "lucide-react";

export function Kingdom() {
  const { data: kingdom, isLoading } = useGetMyKingdom();
  const { data: allKingdoms } = useGetKingdoms();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Your Kingdom</h2>
          <p className="text-muted-foreground">Manage your resources and build your empire.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-white/5 shadow-sm">
          <Castle className="w-5 h-5 text-primary" />
          <span className="font-bold text-white text-lg">Lv. {kingdom?.level || 1}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Resources */}
        <Card className="bg-card border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              Gold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? <Skeleton className="h-9 w-20" /> : kingdom?.gold || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Pickaxe className="w-4 h-4 text-emerald-500" />
              Wood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? <Skeleton className="h-9 w-20" /> : kingdom?.wood || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-slate-400/20 shadow-[0_0_15px_rgba(148,163,184,0.05)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Hammer className="w-4 h-4 text-slate-400" />
              Stone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? <Skeleton className="h-9 w-20" /> : kingdom?.stone || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <Card className="lg:col-span-2 bg-card border-white/5 overflow-hidden">
          <CardHeader className="border-b border-border bg-black/20">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="w-5 h-5 text-accent" />
              Kingdom Map
            </CardTitle>
            <CardDescription>Visual representation coming in future update.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full aspect-[16/9] bg-[url('https://images.unsplash.com/photo-1542840410-3092f99611a3?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center relative">
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <Castle className="w-16 h-16 text-primary mb-4 opacity-50" />
                <p className="text-xl font-bold text-white mb-2">{kingdom?.name || "Uncharted Territory"}</p>
                <p className="text-muted-foreground">Viewers can drop gifts to construct buildings here.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Buildings List */}
          <Card className="bg-card border-white/5 flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Constructed Buildings</CardTitle>
              <CardDescription>Total: {kingdom?.totalBuildings || 0}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground">
              {kingdom?.totalBuildings && kingdom.totalBuildings > 0 ? (
                <p>Buildings exist but list view is coming soon.</p>
              ) : (
                <div className="space-y-3">
                  <Hammer className="w-10 h-10 mx-auto opacity-20" />
                  <p>No buildings constructed yet.</p>
                  <p className="text-sm">Go live and receive gifts to start building.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Global Kingdoms */}
          <Card className="bg-card border-white/5 flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-accent" />
                Global Realms
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {(allKingdoms || []).slice(0, 3).map((k) => (
                <div key={k.id} className="flex items-center justify-between p-2 rounded bg-background border border-border">
                  <div className="flex items-center gap-2">
                    <Castle className="w-4 h-4 text-primary" />
                    <span className="text-sm text-white">{k.name}</span>
                  </div>
                  <span className="text-xs font-medium text-accent">Lv. {k.level}</span>
                </div>
              ))}
              {(!allKingdoms || allKingdoms.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">No other realms discovered.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
