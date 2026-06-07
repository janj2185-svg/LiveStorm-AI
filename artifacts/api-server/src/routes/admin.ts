import { Router, type IRouter } from "express";
import { requireAuth } from "./users";
import { requireAdmin } from "../middlewares/featureGate";
import { db, usersTable, subscriptionsTable, sessionsTable, platformEventsTable } from "@workspace/db";
import { eq, desc, like, or, sql, count } from "drizzle-orm";
import { getMRR, getActiveSubscriptionCount, listAllStripeSubscriptions } from "../lib/stripeStorage";

const router: IRouter = Router();

// GET /admin/stats — platform overview stats
router.get("/admin/stats", requireAuth, requireAdmin(), async (req: any, res: any) => {
  try {
    const [totalUsersResult] = await db.select({ count: count() }).from(usersTable);
    const [totalSessionsResult] = await db.select({ count: count() }).from(sessionsTable);

    // New signups in the last 30 days by day
    const signupsByDay = await db.execute(
      sql`SELECT DATE_TRUNC('day', created_at) as day, COUNT(*) as count
          FROM users
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY day ASC`,
    );

    let mrr = 0;
    let activeSubscriptions = 0;
    try {
      [mrr, activeSubscriptions] = await Promise.all([getMRR(), getActiveSubscriptionCount()]);
    } catch {}

    res.json({
      totalUsers: Number(totalUsersResult.count),
      totalSessions: Number(totalSessionsResult.count),
      mrr,
      activeSubscriptions,
      signupsByDay: signupsByDay.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch stats" });
  }
});

// GET /admin/users — searchable user table
router.get("/admin/users", requireAuth, requireAdmin(), async (req: any, res: any) => {
  try {
    const search = (req.query.search as string) ?? "";
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    let users;
    if (search) {
      users = await db
        .select()
        .from(usersTable)
        .where(
          or(
            like(usersTable.email, `%${search}%`),
            like(usersTable.displayName, `%${search}%`),
          ),
        )
        .orderBy(desc(usersTable.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      users = await db
        .select()
        .from(usersTable)
        .orderBy(desc(usersTable.createdAt))
        .limit(limit)
        .offset(offset);
    }

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch users" });
  }
});

// PATCH /admin/users/:id — update user plan or role
router.patch("/admin/users/:id", requireAuth, requireAdmin(), async (req: any, res: any) => {
  try {
    const userId = Number(req.params.id);
    const { plan, role, banned } = req.body;

    const updates: Record<string, any> = {};
    if (plan !== undefined) updates.plan = plan;
    if (role !== undefined) updates.role = role;
    if (banned !== undefined) updates.role = banned ? "banned" : "user";

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) return res.status(404).json({ error: "User not found" });

    // Log the action
    await db.insert(platformEventsTable).values({
      userId: req.user?.id ?? null,
      eventType: "admin_user_update",
      description: `Admin updated user ${userId}: ${JSON.stringify(updates)}`,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to update user" });
  }
});

// GET /admin/subscriptions — list all subscriptions
router.get("/admin/subscriptions", requireAuth, requireAdmin(), async (req: any, res: any) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const offset = Number(req.query.offset ?? 0);
    let subs: any[] = [];
    try {
      subs = await listAllStripeSubscriptions(limit, offset);
    } catch {}
    res.json(subs);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch subscriptions" });
  }
});

// GET /admin/logs — last 500 platform events
router.get("/admin/logs", requireAuth, requireAdmin(), async (req: any, res: any) => {
  try {
    const logs = await db
      .select()
      .from(platformEventsTable)
      .orderBy(desc(platformEventsTable.createdAt))
      .limit(500);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch logs" });
  }
});

// GET /admin/reports/users.csv — CSV export of users
router.get("/admin/reports/users.csv", requireAuth, requireAdmin(), async (req: any, res: any) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        role: usersTable.role,
        plan: usersTable.plan,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    const header = "id,email,displayName,role,plan,createdAt\n";
    const rows = users
      .map(
        (u) =>
          `${u.id},${JSON.stringify(u.email)},${JSON.stringify(u.displayName ?? "")},${u.role},${u.plan},${u.createdAt.toISOString()}`,
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users.csv");
    res.send(header + rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to generate CSV" });
  }
});

// GET /admin/reports/revenue.csv — CSV export of subscription revenue
router.get("/admin/reports/revenue.csv", requireAuth, requireAdmin(), async (req: any, res: any) => {
  try {
    let subs: any[] = [];
    try {
      subs = await listAllStripeSubscriptions(1000, 0);
    } catch {}

    const header = "subscriptionId,customerId,customerEmail,status,currentPeriodEnd\n";
    const rows = subs
      .map(
        (s: any) =>
          `${s.id},${s.customer},${JSON.stringify(s.customer_email ?? "")},${s.status},${s.current_period_end ?? ""}`,
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=revenue.csv");
    res.send(header + rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to generate CSV" });
  }
});

export default router;
