import { useState } from "react";
import { Link } from "wouter";
import { Check, Zap, Sparkles, Crown, Star, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGetMyProfile } from "@workspace/api-client-react";
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

const PLANS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Get started with the basics",
    icon: Zap,
    iconColor: "text-slate-400",
    cardClass: "border-white/10",
    badge: null,
    priceId: null,
    yearlyPriceId: null,
    trialDays: 0,
    features: [
      "Basic AI Co-Host",
      "Basic Boss Battle",
      "Limited XP & Gamification",
      "1 TikTok account",
      "Viewer leaderboard",
      "Community support",
    ],
    unavailable: [
      "AI Voice",
      "Achievements & Lucky Drops",
      "Fan Profiles",
      "AI Translator",
      "Advanced Analytics",
      "Custom Themes",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    description: "For serious streamers",
    icon: Sparkles,
    iconColor: "text-purple-400",
    cardClass: "border-purple-500/50",
    badge: "Most Popular",
    priceId: "pro_monthly",
    yearlyPriceId: "pro_yearly",
    trialDays: 7,
    features: [
      "Everything in Free",
      "AI Voice (OpenAI TTS)",
      "Full XP System",
      "Achievements & Lucky Drops",
      "Fan Profiles & Leaderboards",
      "10 automations",
      "OBS Browser Sources",
      "Email support",
    ],
    unavailable: [
      "AI Translator",
      "Multiple TikTok accounts",
      "Advanced Analytics",
      "Custom Themes",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    monthlyPrice: 19.99,
    yearlyPrice: 15.99,
    description: "For professional content creators",
    icon: Crown,
    iconColor: "text-amber-400",
    cardClass: "border-amber-500/50",
    badge: "Best Value",
    priceId: "creator_monthly",
    yearlyPriceId: "creator_yearly",
    trialDays: 7,
    features: [
      "Everything in Pro",
      "AI Translator (20 languages)",
      "Advanced Analytics",
      "Multiple TikTok accounts",
      "Advanced Moderation",
      "Custom Themes",
      "Unlimited automations",
      "Priority support",
    ],
    unavailable: [
      "3D AI Host",
      "Voice Clone",
      "Team Accounts",
      "API Access",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    monthlyPrice: 39.99,
    yearlyPrice: 31.99,
    description: "Full power for studios & agencies",
    icon: Star,
    iconColor: "text-pink-400",
    cardClass: "border-pink-500/50",
    badge: "Early Access",
    priceId: "studio_monthly",
    yearlyPriceId: "studio_yearly",
    trialDays: 14,
    features: [
      "Everything in Creator",
      "3D AI Host (Early Access)",
      "Voice Clone",
      "Team Accounts",
      "API Access",
      "Early Access Features",
      "Dedicated support",
      "Custom onboarding",
    ],
    unavailable: [],
  },
];

export function Pricing() {
  const { data: profile } = useGetMyProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);
  const currentPlan = (profile?.plan as string) ?? "free";

  const PLAN_LEVELS: Record<string, number> = { free: 0, pro: 1, creator: 2, studio: 3 };

  const handleUpgrade = async (plan: (typeof PLANS)[number]) => {
    if (!plan.priceId || plan.id === currentPlan) return;
    setLoading(plan.id);
    const basePriceId = plan.priceId as string;
    try {
      let priceId: string = yearly ? (plan.yearlyPriceId ?? basePriceId) : basePriceId;
      try {
        const products = await apiFetch("/billing/products");
        const planProduct = products.find(
          (p: any) =>
            p.name?.toLowerCase().includes(plan.name.toLowerCase()) ||
            p.metadata?.plan === plan.id,
        );
        const prices = planProduct?.prices ?? [];
        const match = yearly
          ? prices.find((p: any) => p.recurring?.interval === "year")
          : prices.find((p: any) => p.recurring?.interval === "month");
        if (match?.id) priceId = match.id;
      } catch {}

      const { url } = await apiFetch("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
      if (url) window.location.href = url;
    } catch (err: any) {
      toast({ title: "Upgrade failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading("portal");
    try {
      const { url } = await apiFetch("/billing/portal", { method: "POST" });
      if (url) window.location.href = url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
            Unlock powerful features to grow your TikTok LIVE stream and engage your viewers.
          </p>

          <div className="flex items-center justify-center gap-3 mb-2">
            <Label htmlFor="yearly-toggle" className={!yearly ? "text-foreground font-medium" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch id="yearly-toggle" checked={yearly} onCheckedChange={setYearly} />
            <Label htmlFor="yearly-toggle" className={yearly ? "text-foreground font-medium" : "text-muted-foreground"}>
              Yearly
            </Label>
            {yearly && (
              <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 text-xs">
                Save ~20%
              </Badge>
            )}
          </div>

          {currentPlan !== "free" && (
            <Button variant="outline" size="sm" className="mt-3" onClick={handleManageBilling} disabled={loading === "portal"}>
              {loading === "portal" ? "Loading..." : "Manage Billing"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            const currentLevel = PLAN_LEVELS[currentPlan] ?? 0;
            const planLevel = PLAN_LEVELS[plan.id] ?? 0;
            const isUpgrade = planLevel > currentLevel;
            const isDowngrade = planLevel < currentLevel && plan.id !== "free";
            const displayPrice = yearly ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <Card
                key={plan.id}
                className={`relative bg-card border-2 ${plan.cardClass} transition-all duration-300 flex flex-col ${
                  isCurrent ? "ring-2 ring-primary/40" : ""
                } ${plan.badge === "Most Popular" ? "md:scale-[1.02]" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`text-white px-3 py-1 text-xs font-semibold ${
                      plan.badge === "Most Popular" ? "bg-purple-600" :
                      plan.badge === "Best Value" ? "bg-amber-600" : "bg-pink-600"
                    }`}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="p-2 rounded-lg w-fit bg-white/5 mb-3">
                    <Icon className={`h-6 w-6 ${plan.iconColor}`} />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                    {plan.name}
                    {isCurrent && (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="mt-3">
                    {displayPrice === 0 ? (
                      <span className="text-3xl font-bold">Free</span>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold">€{displayPrice}</span>
                        <span className="text-base font-normal text-muted-foreground">/mo</span>
                        {yearly && <p className="text-xs text-muted-foreground mt-0.5">Billed annually</p>}
                      </div>
                    )}
                    {plan.trialDays > 0 && !isCurrent && (
                      <p className="text-xs text-green-400 mt-1 font-medium">
                        {plan.trialDays}-day free trial
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-4">
                  <div className="space-y-1.5 flex-1">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {plan.unavailable.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                        <span className="line-through">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full mt-auto ${
                      isCurrent
                        ? "bg-white/10 text-muted-foreground cursor-default"
                        : isUpgrade
                          ? "bg-primary hover:bg-primary/90 text-white"
                          : isDowngrade
                            ? "bg-white/10 text-muted-foreground hover:bg-white/15"
                            : "bg-white/10 text-muted-foreground cursor-default"
                    }`}
                    disabled={isCurrent || plan.id === "free" || loading !== null}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {loading === plan.id
                      ? "Redirecting..."
                      : isCurrent
                        ? "Current Plan"
                        : plan.id === "free"
                          ? "Free Forever"
                          : isUpgrade
                            ? plan.trialDays > 0
                              ? `Start ${plan.trialDays}-Day Trial`
                              : `Upgrade to ${plan.name}`
                            : `Switch to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Payments securely processed by Stripe. Cancel anytime.
          </p>
          <p className="text-xs text-muted-foreground">
            All prices in EUR · VAT may apply · Yearly plans save ~20%
          </p>
        </div>
      </div>
    </div>
  );
}
