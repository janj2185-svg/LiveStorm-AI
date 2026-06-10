import { type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type Plan = "free" | "pro" | "creator" | "premium" | "studio";

const PLAN_LEVELS: Record<Plan, number> = {
  free: 0,
  pro: 1,
  creator: 2,
  premium: 2,
  studio: 3,
};

export const OWNER_EMAIL = "kvasnytcya21@gmail.com";

export function isOwner(userEmail: string | null | undefined): boolean {
  return userEmail === OWNER_EMAIL;
}

async function fetchUser(clerkId: string) {
  const [user] = await db
    .select({ id: usersTable.id, plan: usersTable.plan, role: usersTable.role, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));
  return user;
}

export function requirePlan(minPlan: Plan) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.clerkUserId) return res.status(401).json({ error: "Unauthorized" });
      const user = await fetchUser(req.clerkUserId);
      if (!user) return res.status(401).json({ error: "User not found" });

      if (isOwner(user.email)) {
        req.user = user;
        req.ownerBypass = true;
        return next();
      }

      const userLevel = PLAN_LEVELS[(user.plan as Plan)] ?? 0;
      if (userLevel >= PLAN_LEVELS[minPlan]) {
        req.user = user;
        return next();
      }

      return res.status(403).json({
        error: "Upgrade required",
        upgradeRequired: true,
        requiredPlan: minPlan,
        currentPlan: user.plan,
      });
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function requirePlanOrOwner(minPlan: Plan) {
  return requirePlan(minPlan);
}

export function requireAdmin() {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.clerkUserId) return res.status(401).json({ error: "Unauthorized" });
      const user = await fetchUser(req.clerkUserId);
      if (!user) return res.status(401).json({ error: "User not found" });

      if (isOwner(user.email) || user.role === "admin" || user.role === "owner") {
        req.user = user;
        return next();
      }

      return res.status(403).json({ error: "Admin access required" });
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function requireOwner() {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.clerkUserId) return res.status(401).json({ error: "Unauthorized" });
      const user = await fetchUser(req.clerkUserId);
      if (!user) return res.status(401).json({ error: "User not found" });

      if (isOwner(user.email) || user.role === "owner") {
        req.user = user;
        return next();
      }

      return res.status(403).json({ error: "Owner access required" });
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
