import { useState } from "react";
import { Link } from "wouter";
import { Check, Zap, Sparkles, Crown, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      "Basic AI Assistant",
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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400/90 mb-1">SUBSCRIPTION</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Choose Your Plan</h1>
          <p className="text-white/88 text-sm mt-1">Unlock powerful features to grow your TikTok LIVE stream.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2">
            <span className={yearly ? "text-white/62 text-sm" : "text-white text-sm font-medium"}>Monthly</span>
            <Switch id="yearly-toggle" checked={yearly} onCheckedChange={setYearly} />
            <span className={yearly ? "text-white text-sm font-medium" : "text-white/78 text-sm"}>Yearly</span>
            {yearly && <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">−20%</Badge>}
          </div>
          {currentPlan !== "free" && (
            <Button variant="outline" size="sm" className="border-white/10 hover:border-primary/30 text-xs" onClick={handleManageBilling} disabled={loading === "portal"}>
              {loading === "portal" ? "Loading..." : "Manage Billing"}
            </Button>
          )}
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const currentLevel = PLAN_LEVELS[currentPlan] ?? 0;
          const planLevel = PLAN_LEVELS[plan.id] ?? 0;
          const isUpgrade = planLevel > currentLevel;
          const isDowngrade = planLevel < currentLevel && plan.id !== "free";
          const displayPrice = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isPopular = plan.badge === "Most Popular";

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border flex flex-col transition-all duration-300 ${
                isCurrent
                  ? "bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(124,58,237,0.15)]"
                  : isPopular
                    ? "bg-white/[0.06] border-violet-500/40 shadow-[0_0_20px_rgba(124,58,237,0.08)]"
                    : "bg-white/[0.04] border-white/[0.07] hover:border-white/15"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-white px-3 py-1 text-xs font-bold rounded-full ${
                    plan.badge === "Most Popular" ? "bg-violet-600" :
                    plan.badge === "Best Value"   ? "bg-amber-600"  : "bg-pink-600"
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col">
                {/* Plan header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className={`p-2 rounded-xl bg-white/[0.06]`}>
                    <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-bold text-primary bg-primary/15 border border-primary/30 rounded-full px-2 py-0.5">
                      Current
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-white/82 mt-0.5 mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-5">
                  {displayPrice === 0 ? (
                    <span className="text-3xl font-black text-white">Free</span>
                  ) : (
                    <div>
                      <span className="text-3xl font-black text-white">€{displayPrice}</span>
                      <span className="text-sm text-white/88">/mo</span>
                      {yearly && <p className="text-xs text-white/88 mt-0.5">Billed annually</p>}
                    </div>
                  )}
                  {plan.trialDays > 0 && !isCurrent && (
                    <p className="text-xs text-green-400 mt-1 font-semibold">{plan.trialDays}-day free trial</p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-1.5 flex-1">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                      <span className="text-white/88">{feat}</span>
                    </div>
                  ))}
                  {plan.unavailable.map((feat) => (
                    <div key={feat} className="flex items-start gap-2 text-sm text-white/72">
                      <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="line-through">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  className={`w-full mt-5 font-bold ${
                    isCurrent
                      ? "bg-white/[0.06] text-white/72 cursor-default border border-white/[0.07]"
                      : isUpgrade
                        ? "bg-primary hover:bg-primary/90 text-white"
                        : "bg-white/[0.06] text-white/65 hover:bg-white/10 border border-white/[0.07]"
                  }`}
                  disabled={isCurrent || plan.id === "free" || loading !== null}
                  onClick={() => handleUpgrade(plan)}
                >
                  {loading === plan.id
                    ? "Redirecting..."
                    : isCurrent   ? "Current Plan"
                    : plan.id === "free" ? "Free Forever"
                    : isUpgrade
                      ? plan.trialDays > 0 ? `Start ${plan.trialDays}-Day Trial` : `Upgrade to ${plan.name}`
                      : `Switch to ${plan.name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
        <p className="text-sm text-white/90">Payments securely processed by Stripe · Cancel anytime</p>
        <p className="text-xs text-white/82 mt-1">All prices in EUR · VAT may apply · Yearly plans save ~20%</p>
      </div>
    </div>
  );
}
