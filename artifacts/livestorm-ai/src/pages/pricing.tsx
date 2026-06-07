import { useState } from "react";
import { Link } from "wouter";
import { Check, Zap, Crown, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    price: 0,
    description: "Perfect for getting started",
    icon: Zap,
    iconColor: "text-slate-400",
    borderColor: "border-white/10",
    badge: null,
    features: [
      "Basic live dashboard",
      "1 automation trigger",
      "Viewer leaderboard",
      "Kingdom (basic)",
      "5 boss battles/month",
      "Community support",
    ],
    unavailable: [
      "AI Co-host & quests",
      "Unlimited automations",
      "Advanced analytics",
      "Priority support",
    ],
    priceId: null,
    cta: "Current Plan",
  },
  {
    id: "pro",
    name: "Pro",
    price: 9.99,
    description: "For serious streamers",
    icon: Sparkles,
    iconColor: "text-purple-400",
    borderColor: "border-purple-500/50",
    badge: "Most Popular",
    features: [
      "Everything in Free",
      "10 automation triggers",
      "AI Co-host & quests",
      "Boss battle analytics",
      "Mini-games (Spin Wheel, Lucky Draw)",
      "OBS Browser Sources",
      "Email support",
    ],
    unavailable: [
      "Unlimited automations",
      "Priority support",
    ],
    priceId: "pro_monthly",
    cta: "Upgrade to Pro",
  },
  {
    id: "premium",
    name: "Premium",
    price: 24.99,
    description: "Unlimited power for top creators",
    icon: Crown,
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/50",
    badge: "Best Value",
    features: [
      "Everything in Pro",
      "Unlimited automations",
      "Advanced AI persona customization",
      "Full Kingdom upgrades",
      "Alliance & universe features",
      "Custom overlays",
      "Priority support",
      "Early access to new features",
    ],
    unavailable: [],
    priceId: "premium_monthly",
    cta: "Upgrade to Premium",
  },
];

export function Pricing() {
  const { data: profile } = useGetMyProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const currentPlan = (profile?.plan as string) ?? "free";

  const handleUpgrade = async (plan: typeof PLANS[0]) => {
    if (!plan.priceId || plan.id === currentPlan) return;
    setLoading(plan.id);
    try {
      // First try to get actual price IDs from Stripe
      let priceId = plan.priceId;
      try {
        const products = await apiFetch("/billing/products");
        const planProduct = products.find(
          (p: any) =>
            p.name?.toLowerCase().includes(plan.name.toLowerCase()) ||
            p.metadata?.plan === plan.id,
        );
        if (planProduct?.prices?.[0]?.id) {
          priceId = planProduct.prices[0].id;
        }
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
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Unlock powerful features to grow your TikTok LIVE stream and engage your viewers.
          </p>
          {currentPlan !== "free" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleManageBilling}
              disabled={loading === "portal"}
            >
              {loading === "portal" ? "Loading..." : "Manage Billing"}
            </Button>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            const isUpgrade =
              plan.id !== "free" &&
              !isCurrent &&
              (currentPlan === "free" || (currentPlan === "pro" && plan.id === "premium"));

            return (
              <Card
                key={plan.id}
                className={`relative bg-card border-2 ${plan.borderColor} transition-all duration-300 ${
                  isCurrent ? "ring-2 ring-primary/40" : ""
                } ${plan.badge === "Most Popular" ? "scale-[1.02]" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white px-3 py-1 text-xs font-semibold">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className={`p-2 rounded-lg w-fit bg-white/5 mb-3`}>
                    <Icon className={`h-6 w-6 ${plan.iconColor}`} />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {plan.name}
                    {isCurrent && (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold">Free</span>
                    ) : (
                      <span className="text-3xl font-bold">
                        ${plan.price}
                        <span className="text-base font-normal text-muted-foreground">/mo</span>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {plan.unavailable.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                        <span className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0">✕</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full ${
                      isCurrent
                        ? "bg-white/10 text-muted-foreground cursor-default"
                        : isUpgrade
                          ? "bg-primary hover:bg-primary/90 text-white"
                          : "bg-white/10 text-muted-foreground"
                    }`}
                    disabled={isCurrent || !isUpgrade || loading !== null}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {loading === plan.id
                      ? "Redirecting..."
                      : isCurrent
                        ? "Current Plan"
                        : isUpgrade
                          ? plan.cta
                          : "Not Available"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-10">
          Payments securely processed by Stripe. Cancel anytime from your billing portal.
        </p>
      </div>
    </div>
  );
}
