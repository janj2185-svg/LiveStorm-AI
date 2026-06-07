import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetMyProfile, useUpdateMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { User, Shield, CreditCard, Crown, Zap, Sparkles } from "lucide-react";
import { Link } from "wouter";

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

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(30),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const PLAN_META: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  free: { label: "Free", icon: Zap, color: "text-slate-400", desc: "Basic streaming and gamification features." },
  pro: { label: "Pro", icon: Sparkles, color: "text-purple-400", desc: "AI Co-host, 10 automations, analytics." },
  premium: { label: "Premium", icon: Crown, color: "text-amber-400", desc: "Unlimited automations and all features." },
};

type SettingsTab = "profile" | "billing";

export function Settings() {
  const { data: user, isLoading } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [billingLoading, setBillingLoading] = useState<string | null>(null);

  // Handle redirect from pricing page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "billing") setTab("billing");
    if (params.get("success") === "1") {
      toast({ title: "Subscription activated!", description: "Your plan has been upgraded." });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    }
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "" },
  });

  useEffect(() => {
    if (user) form.reset({ displayName: user.displayName || "" });
  }, [user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Profile Updated", description: "Your settings have been saved." });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" }),
      },
    );
  };

  const handleManageBilling = async () => {
    setBillingLoading("portal");
    try {
      const { url } = await apiFetch("/billing/portal", { method: "POST" });
      if (url) window.location.href = url;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBillingLoading(null);
    }
  };

  const planMeta = PLAN_META[(user?.plan as string) ?? "free"] ?? PLAN_META.free;
  const PlanIcon = planMeta.icon;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-muted-foreground">Manage your account and platform preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/50">
        {(["profile", "billing"] as SettingsTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "billing" ? <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Billing</span> : t}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <Card className="bg-card border-white/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>Update how you appear to others on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter display name" {...field} className="bg-background border-border max-w-md" disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2 max-w-md">
                  <FormLabel>Email Address</FormLabel>
                  <Input value={user?.email || ""} disabled className="bg-background/50 border-border opacity-50" />
                  <p className="text-xs text-muted-foreground">Managed via Clerk</p>
                </div>
                <Button type="submit" className="mt-4 bg-primary hover:bg-primary/90" disabled={updateProfile.isPending || isLoading}>
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Billing Tab */}
      {tab === "billing" && (
        <div className="space-y-4">
          {/* Current Plan */}
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-background border border-border flex items-center gap-4">
                <div className={`p-2.5 rounded-lg bg-white/5 ${planMeta.color}`}>
                  <PlanIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white capitalize">{planMeta.label} Plan</p>
                    <Badge variant="outline" className="text-xs border-white/20">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{planMeta.desc}</p>
                </div>
                {(user?.plan === "free" || !user?.plan) && (
                  <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                    <Link to="/pricing">Upgrade</Link>
                  </Button>
                )}
              </div>

              {user?.plan !== "free" && user?.plan && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={billingLoading === "portal"}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {billingLoading === "portal" ? "Loading..." : "Manage Billing"}
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/pricing">Compare Plans</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground font-medium">What's included in your plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {(user?.plan === "free" || !user?.plan) && (
                  <>
                    <p className="text-green-400">✓ Basic live dashboard</p>
                    <p className="text-green-400">✓ 1 automation trigger</p>
                    <p className="text-green-400">✓ Viewer leaderboard</p>
                    <p className="text-muted-foreground line-through">✕ AI Co-host & quests (Pro+)</p>
                    <p className="text-muted-foreground line-through">✕ Unlimited automations (Premium)</p>
                  </>
                )}
                {user?.plan === "pro" && (
                  <>
                    <p className="text-green-400">✓ Everything in Free</p>
                    <p className="text-green-400">✓ AI Co-host & quests</p>
                    <p className="text-green-400">✓ 10 automation triggers</p>
                    <p className="text-green-400">✓ OBS Browser Sources</p>
                    <p className="text-muted-foreground line-through">✕ Unlimited automations (Premium)</p>
                  </>
                )}
                {user?.plan === "premium" && (
                  <>
                    <p className="text-green-400">✓ Everything in Pro</p>
                    <p className="text-green-400">✓ Unlimited automations</p>
                    <p className="text-green-400">✓ Priority support</p>
                    <p className="text-green-400">✓ Early access to new features</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security card — always shown */}
      {tab === "profile" && (
        <Card className="bg-card border-white/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Password and authentication managed via Clerk.{" "}
              <a href="/sign-in" className="text-primary hover:underline">Manage security settings →</a>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
