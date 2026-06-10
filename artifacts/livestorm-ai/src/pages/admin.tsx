import { useState } from "react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  DollarSign,
  BarChart2,
  FileText,
  Download,
  Shield,
  RefreshCw,
  Search,
  KeyRound,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const resp = await fetch(`${BASE}/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error ?? `API error ${resp.status}`);
  }
  return resp.json();
}

type AdminTab = "overview" | "users" | "subscriptions" | "logs" | "reports";

export function Admin() {
  const { data: profile } = useGetMyProfile();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { toast } = useToast();

  // Only render if admin
  if (!profile) return null;
  const isOwner = profile.role === "owner";
  if (profile.role !== "admin" && !isOwner) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center flex-col gap-4">
        <Shield className="h-16 w-16 text-red-500/50" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">This area requires admin privileges.</p>
        <Button asChild variant="outline"><Link to="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-red-400" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        {isOwner ? (
          <Badge className="gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 font-bold">
            <KeyRound className="h-3 w-3" />
            Owner
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-400 border-red-400/40">Admin</Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/50 pb-0">
        {(["overview", "users", "subscriptions", "logs", "reports"] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "users" && (
        <UsersTab
          search={debouncedSearch}
          searchInput={search}
          onSearch={(v) => {
            setSearch(v);
            clearTimeout((window as any)._adminSearchTimeout);
            (window as any)._adminSearchTimeout = setTimeout(() => setDebouncedSearch(v), 400);
          }}
        />
      )}
      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "logs" && <LogsTab />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-primary" }: { title: string; value: string | number; icon: any; color?: string }) {
  return (
    <Card className="bg-card border border-white/10">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-white/5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch("/admin/stats"),
    retry: false,
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading stats...</div>;
  if (!data) return <div className="text-muted-foreground text-sm">Failed to load stats.</div>;

  const chartData = (data.signupsByDay ?? []).map((d: any) => ({
    day: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    signups: Number(d.count),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={data.totalUsers ?? 0} icon={Users} color="text-blue-400" />
        <StatCard title="Total Sessions" value={data.totalSessions ?? 0} icon={BarChart2} color="text-green-400" />
        <StatCard title="Active Subscriptions" value={data.activeSubscriptions ?? 0} icon={Shield} color="text-purple-400" />
        <StatCard title="MRR" value={`$${(data.mrr ?? 0).toFixed(2)}`} icon={DollarSign} color="text-amber-400" />
      </div>

      <Card className="bg-card border border-white/10">
        <CardHeader>
          <CardTitle className="text-sm">New Signups (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No signup data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1c1c2e", border: "1px solid #2d2d44" }} />
                <Area type="monotone" dataKey="signups" stroke="#8b5cf6" fill="url(#signupGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab({ search, searchInput, onSearch }: { search: string; searchInput: string; onSearch: (v: string) => void }) {
  const { toast } = useToast();
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => apiFetch(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    retry: false,
  });

  const handleBan = async (userId: number, ban: boolean) => {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ banned: ban }),
      });
      toast({ title: ban ? "User banned" : "User unbanned" });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handlePlanChange = async (userId: number, plan: string) => {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ plan }),
      });
      toast({ title: "Plan updated" });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="pl-9 bg-card border-white/10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left p-3 text-muted-foreground font-medium">ID</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Email</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Role</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Plan</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No users found</td></tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="p-3 text-muted-foreground">{u.id}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.displayName ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={u.role === "admin" ? "border-red-400/40 text-red-400" : u.role === "banned" ? "border-gray-400/40 text-gray-400 line-through" : "border-white/20"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.plan}
                        onChange={(e) => handlePlanChange(u.id, e.target.value)}
                        className="bg-card border border-white/10 rounded px-2 py-1 text-xs"
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="premium">premium</option>
                      </select>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={u.role === "banned" ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300"}
                        onClick={() => handleBan(u.id, u.role !== "banned")}
                      >
                        {u.role === "banned" ? "Unban" : "Ban"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsTab() {
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => apiFetch("/admin/subscriptions"),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left p-3 text-muted-foreground font-medium">Subscription ID</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Customer Email</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Period End</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
              ) : subs.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No subscriptions yet</td></tr>
              ) : (
                subs.map((s: any) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="p-3 font-mono text-xs">{s.id}</td>
                    <td className="p-3">{s.customer_email ?? s.customer}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={
                        s.status === "active" ? "border-green-400/40 text-green-400" :
                        s.status === "trialing" ? "border-blue-400/40 text-blue-400" :
                        "border-red-400/40 text-red-400"
                      }>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {s.current_period_end
                        ? new Date(Number(s.current_period_end) * 1000).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LogsTab() {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: () => apiFetch("/admin/logs"),
    retry: false,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      <ScrollArea className="h-[500px] rounded-lg border border-white/10">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm p-4">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm p-4">No platform events logged yet</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-2 rounded bg-white/3 border border-white/5 text-xs">
                <span className="text-muted-foreground shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px] border-blue-400/30 text-blue-400">
                  {log.eventType}
                </Badge>
                <span className="text-foreground/80 break-all">{log.description}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ReportsTab() {
  const { toast } = useToast();

  const download = (url: string, filename: string) => {
    fetch(`${BASE}/api${url}`, { credentials: "include" })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      })
      .catch(() => toast({ title: "Download failed", variant: "destructive" }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium">User Data Export</p>
                <p className="text-xs text-muted-foreground">All users with plan & role info</p>
              </div>
            </div>
            <Button size="sm" onClick={() => download("/admin/reports/users.csv", "users.csv")}>
              <Download className="h-4 w-4 mr-2" /> Download CSV
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-card border border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-5 w-5 text-amber-400" />
              <div>
                <p className="font-medium">Revenue Report</p>
                <p className="text-xs text-muted-foreground">All subscription revenue data</p>
              </div>
            </div>
            <Button size="sm" onClick={() => download("/admin/reports/revenue.csv", "revenue.csv")}>
              <Download className="h-4 w-4 mr-2" /> Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
