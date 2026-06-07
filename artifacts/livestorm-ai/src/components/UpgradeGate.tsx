import { Link } from "wouter";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMyProfile } from "@workspace/api-client-react";

type Plan = "free" | "pro" | "premium";

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

const PLAN_LEVELS: Record<Plan, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

interface UpgradeGateProps {
  plan: Plan;
  children: React.ReactNode;
  featureName?: string;
}

export function UpgradeGate({ plan, children, featureName }: UpgradeGateProps) {
  const { data: profile } = useGetMyProfile();
  const userPlan = (profile?.plan as Plan) ?? "free";

  if (PLAN_LEVELS[userPlan] >= PLAN_LEVELS[plan]) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-50">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border border-primary/30 z-10">
        <Lock className="h-8 w-8 text-primary mb-3" />
        <p className="text-sm font-semibold text-foreground mb-1">
          {featureName ? `${featureName} requires` : "Requires"}{" "}
          <span className="text-primary">{PLAN_LABELS[plan]}</span> plan
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          You&apos;re on the <span className="font-medium">{PLAN_LABELS[userPlan]}</span> plan
        </p>
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
          <Link to="/pricing">Upgrade Now</Link>
        </Button>
      </div>
    </div>
  );
}
