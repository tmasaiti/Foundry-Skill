import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeAuditLog } from "../../middleware/audit.js";

const router = Router();

const PLAN_PRICES: Record<string, { monthly: number; mauIncluded: number; overageRate: number }> = {
  starter: { monthly: 99, mauIncluded: 10000, overageRate: 0.012 },
  growth: { monthly: 399, mauIncluded: 50000, overageRate: 0.010 },
  enterprise: { monthly: 999, mauIncluded: -1, overageRate: 0 },
};

router.post("/:tenantId/billing/checkout", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      plan: z.enum(["starter", "growth", "enterprise"]),
      success_url: z.string().url().optional(),
      cancel_url: z.string().url().optional(),
    }).parse(req.body);

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, (req.params as Record<string, string>).tenantId)).limit(1);
    if (!tenant) throw new NotFoundError("Tenant", (req.params as Record<string, string>).tenantId);

    const planInfo = PLAN_PRICES[body.plan];
    const checkoutId = `cs_foundry_${Date.now()}`;

    const checkoutUrl = process.env.STRIPE_SECRET_KEY
      ? `https://checkout.stripe.com/pay/${checkoutId}`
      : `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/billing/mock-checkout?plan=${body.plan}&tenant=${tenant.id}&price=${planInfo.monthly}`;

    res.json({
      checkout_url: checkoutUrl,
      checkout_session_id: checkoutId,
      plan: body.plan,
      amount: planInfo.monthly,
      currency: "usd",
      billing_period: "monthly",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/webhooks/stripe", async (req, res, next) => {
  try {
    const event = req.body;
    if (!event?.type) {
      res.status(400).json({ error: "Invalid webhook payload" });
      return;
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data?.object;
        if (sub?.metadata?.tenant_id) {
          const plan = sub.metadata.plan ?? "starter";
          await db.update(tenantsTable)
            .set({ plan, stripeSubscriptionId: sub.id, status: "active" })
            .where(eq(tenantsTable.id, sub.metadata.tenant_id));
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data?.object;
        if (sub?.metadata?.tenant_id) {
          await db.update(tenantsTable)
            .set({ stripeSubscriptionId: null, status: "suspended" })
            .where(eq(tenantsTable.id, sub.metadata.tenant_id));
        }
        break;
      }
      case "invoice.payment_failed": {
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:tenantId/billing/plans", async (_req, res) => {
  res.json({
    plans: Object.entries(PLAN_PRICES).map(([key, val]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      monthly_fee: val.monthly,
      mau_included: val.mauIncluded === -1 ? "custom" : val.mauIncluded,
      overage_rate: val.overageRate,
      workspaces: key === "starter" ? 1 : key === "growth" ? 3 : "unlimited",
      sla: key === "starter" ? "99.5%" : key === "growth" ? "99.9%" : "99.95%",
    })),
  });
});

export default router;
