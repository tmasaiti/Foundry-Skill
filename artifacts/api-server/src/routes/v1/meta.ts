import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db/schema";
import { requireAuth } from "../../middleware/auth.js";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/realm-template", (_req, res) => {
  res.json({
    version: "1.0.0",
    roles: ["tenant_owner", "tenant_admin", "tenant_billing", "tenant_viewer"],
    groups: ["owners", "admins", "billing"],
    group_role_mapping: {
      owners: "tenant_owner",
      admins: "tenant_admin",
      billing: "tenant_billing",
    },
    password_policy: "length(10) and digit(1) and lowerCase(1) and upperCase(1) and specialChars(1) and passwordHistory(5)",
    defaults: {
      registrationAllowed: false,
      loginWithEmailAllowed: true,
      duplicateEmailsAllowed: false,
      verifyEmail: true,
      resetPasswordAllowed: true,
      sslRequired: "external",
      bruteForceProtected: true,
      failureFactor: 5,
      accessTokenLifespan: 900,
      ssoSessionIdleTimeout: 28800,
      ssoSessionMaxLifespan: 86400,
      offlineSessionIdleTimeout: 2592000,
    },
  });
});

router.get("/audit-logs", requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id as string | undefined;
    const logs = tenantId
      ? await db.select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenantId)).orderBy(desc(auditLogsTable.createdAt)).limit(100)
      : await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(100);
    res.json({ audit_logs: logs });
  } catch (err) {
    next(err);
  }
});

export default router;
