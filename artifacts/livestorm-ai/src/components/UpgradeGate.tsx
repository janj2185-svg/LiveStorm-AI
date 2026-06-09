import { Link } from "wouter";
import { Lock, Sparkles, Crown, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMyProfile } from "@workspace/api-client-react";

export type Plan = "free" | "pro" | "creator" | "studio";

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  creator: "Creator",
  studio: "Studio",
};

export const PLAN_PRICES: Record<Plan, string> = {
  free: "Free",
  pro: "€9.99/mo",
  creator: "€19.99/mo",
  studio: "€39.99/mo",
};

export const PLAN_LEVELS: Record<Plan, number> = {
  free: 0,
  pro: 1,
  creator: 2,
  studio: 3,
};

const PLAN_ICONS: Record<Plan, typeof Zap> = {
  free: Zap,
  pro: Sparkles,
  creator: Crown,
  studio: Star,
};

const PLAN_COLORS: Record<Plan, string> = {
  free: "text-slate-400",
  pro: "text-purple-400",
  creator: "text-amber-400",
  studio: "text-pink-400",
};

interface UpgradeGateProps {
  plan: Plan;
  children: React.ReactNode;
  featureName?: string;
  compact?: boolean;
}

export function UpgradeGate({ plan, children, featureName, compact = false }: UpgradeGateProps) {
  const { data: profile } = useGetMyProfile();
  const userPlan = (profile?.plan as Plan) ?? "free";

  if (PLAN_LEVELS[userPlan] >= PLAN_LEVELS[plan]) {
    return <>{children}</>;
  }

  const Icon = PLAN_ICONS[plan];
  const color = PLAN_COLORS[plan];
  const label = PLAN_LABELS[plan];
  const price = PLAN_PRICES[plan];

  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <div className="pointer-events-none select-none blur-[2px] opacity-40">{children}</div>
        <Link to="/pricing">
          <Badge className="absolute -top-2 -right-2 bg-primary/90 hover:bg-primary text-white text-[10px] px-1.5 cursor-pointer">
            <Lock className="h-2.5 w-2.5 mr-0.5" />
            {label}
          </Badge>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden">
      <div className="pointer-events-none select-none blur-sm opacity-40">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm border border-primary/20 z-10 rounded-lg p-4">
        <div className={`p-2 rounded-full bg-white/5 mb-3`}>
          <Icon className={`h-7 w-7 ${color}`} />
        </div>
        <p className="text-sm font-semibold text-foreground mb-0.5 text-center">
          {featureName ? `${featureName}` : "This feature"} requires{" "}
          <span className={color}>{label}</span>
        </p>
        <p className="text-xs text-muted-foreground mb-4 text-center">
          Starting at <span className="font-medium text-foreground">{price}</span> · Cancel anytime
        </p>
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
          <Link to="/pricing">View Plans</Link>
        </Button>
      </div>
    </div>
  );
}

export function usePlan(): { plan: Plan; level: number; is: (p: Plan) => boolean; atLeast: (p: Plan) => boolean } {
  const { data: profile } = useGetMyProfile();
  const plan = (profile?.plan as Plan) ?? "free";
  const level = PLAN_LEVELS[plan];
  return {
    plan,
    level,
    is: (p: Plan) => plan === p,
    atLeast: (p: Plan) => level >= PLAN_LEVELS[p],
  };
}
