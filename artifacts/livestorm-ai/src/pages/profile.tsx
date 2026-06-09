import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyProfile, useGetSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Settings, ExternalLink, Trophy, Zap, Users, Gift,
  Video, Crown, CalendarDays, PlugZap,
} from "lucide-react";
import { format } from "date-fns";

const PLAN_META: Record<string, { label: string; color: string; icon: any }> = {
  free:       { label: "Free",       color: "border-slate-500/30 bg-slate-500/10 text-slate-300",  icon: null },
  starter:    { label: "Starter",    color: "border-blue-500/30 bg-blue-500/10 text-blue-300",    icon: null },
  pro:        { label: "Pro",        color: "border-primary/30 bg-primary/10 text-primary",        icon: Crown },
  enterprise: { label: "Enterprise", color: "border-amber-500/30 bg-amber-500/10 text-amber-300", icon: Crown },
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 border border-white/5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function Profile() {
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const { data: sessionsData } = useGetSessions();

  const sessions = (sessionsData ?? []) as any[];
  const totalSessions = sessions.length;
  const totalGifts = sessions.reduce((sum: number, s: any) => sum + (s.totalGifts ?? 0), 0);
  const totalLikes = sessions.reduce((sum: number, s: any) => sum + (s.totalLikes ?? 0), 0);
  const totalFollowers = sessions.reduce((sum: number, s: any) => sum + (s.totalFollowers ?? 0), 0);
  const peakViewers = Math.max(...sessions.map((s: any) => s.peakViewers ?? 0), 0);

  const plan = profile?.plan ?? "free";
  const planMeta = PLAN_META[plan] ?? PLAN_META.free;
  const PlanIcon = planMeta.icon;

  if (profileLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Creator Profile</h2>
        <p className="text-muted-foreground mt-1">Your public creator identity and stats across all sessions.</p>
      </div>

      {/* Identity card */}
      <Card className="bg-card border-white/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-primary/30 ring-4 ring-primary/10">
              <AvatarImage src={profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                {(profile?.displayName ?? profile?.email ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-white truncate">
                  {profile?.displayName ?? profile?.email ?? "Creator"}
                </h3>
                <Badge variant="outline" className={`text-xs font-semibold ${planMeta.color}`}>
                  {PlanIcon && <PlanIcon className="h-3 w-3 mr-1" />}
                  {planMeta.label}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{profile?.email}</p>

              {profile?.tiktokUsername ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.tiktok.com/@${profile.tiktokUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <span>@{profile.tiktokUsername}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-xs text-muted-foreground">on TikTok</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-amber-400">No TikTok account connected</span>
                  <Button variant="link" size="sm" className="text-primary px-0 h-auto text-sm" asChild>
                    <Link href="/settings">Connect →</Link>
                  </Button>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" className="border-white/10 shrink-0" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-1.5" />
                Edit Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          All-time Stats
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Video}  label="Total Sessions" value={totalSessions} color="bg-blue-500/15 text-blue-400" />
          <StatCard icon={Gift}   label="Total Gifts"    value={totalGifts.toLocaleString()} color="bg-amber-500/15 text-amber-400" />
          <StatCard icon={Users}  label="Peak Viewers"   value={peakViewers.toLocaleString()} color="bg-green-500/15 text-green-400" />
          <StatCard icon={Zap}    label="Total Likes"    value={totalLikes.toLocaleString()} color="bg-pink-500/15 text-pink-400" />
          <StatCard icon={Trophy} label="New Followers"  value={totalFollowers.toLocaleString()} color="bg-purple-500/15 text-purple-400" />
          <StatCard
            icon={CalendarDays}
            label="Member since"
            value={profile?.createdAt ? format(new Date(profile.createdAt as string), "MMM yyyy") : "—"}
            color="bg-slate-500/15 text-slate-400"
          />
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Sessions
          </h3>
          <Card className="bg-card border-white/5">
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {sessions.slice(0, 5).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${session.endedAt ? "bg-slate-500" : "bg-green-500 animate-pulse"}`} />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {session.endedAt ? "Ended session" : "Active session"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.startedAt
                            ? format(new Date(session.startedAt), "MMM d, yyyy · h:mm a")
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3 text-amber-400" />
                        {(session.totalGifts ?? 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-green-400" />
                        {session.peakViewers ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {sessions.length === 0 && (
        <Card className="bg-card border-white/5">
          <CardContent className="p-8 text-center">
            <Video className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-white">No sessions yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Go live to start building your creator stats.
            </p>
            <Button asChild>
              <Link href="/live-studio">Go to Live Studio</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Platform connections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Connected Platforms
          </h3>
          <Button variant="link" size="sm" className="text-primary px-0 h-auto text-xs" asChild>
            <Link href="/platforms">Manage →</Link>
          </Button>
        </div>
        <Card className="bg-card border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.28 8.28 0 004.84 1.54V7a4.85 4.85 0 01-1.07-.31z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">TikTok LIVE</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.tiktokUsername ? `@${profile.tiktokUsername}` : "Not connected"}
                  </p>
                </div>
              </div>
              {profile?.tiktokUsername ? (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Connected</Badge>
              ) : (
                <Button size="sm" asChild>
                  <Link href="/settings">Connect</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
