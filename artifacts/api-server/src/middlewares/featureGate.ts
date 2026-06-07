import { type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type Plan = "free" | "pro" | "premium";

const PLAN_LEVELS: Record<Plan, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

export function requirePlan(minPlan: Plan) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.clerkUserId) return res.status(401).json({ error: "Unauthorized" });
      const [user] = await db
        .select({ plan: usersTable.plan, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.clerkId, req.clerkUserId));
      const userPlan = (user?.plan as Plan) ?? "free";
      if (PLAN_LEVELS[userPlan] >= PLAN_LEVELS[minPlan]) return next();
      return res.status(403).json({
        error: "Upgrade required",
        upgradeRequired: true,
        requiredPlan: minPlan,
        currentPlan: userPlan,
      });
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function requireAdmin() {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.clerkUserId) return res.status(401).json({ error: "Unauthorized" });
      const [user] = await db
        .select({ id: usersTable.id, role: usersTable.role, plan: usersTable.plan })
        .from(usersTable)
        .where(eq(usersTable.clerkId, req.clerkUserId));
      if (user?.role === "admin") {
        req.user = user;
        return next();
      }
      return res.status(403).json({ error: "Admin access required" });
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
