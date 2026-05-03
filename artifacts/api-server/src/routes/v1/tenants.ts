import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { tenantsTable, workspacesTable, adminsTable, usageSnapshotsTable } from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { makeId } from "../../lib/ulid.js";
import { NotFoundError, ValidationError, ConflictError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeAuditLog } from "../../middleware/audit.js";
import { provisionRealm, createInviteToken } from "../../services/mockKeycloak.js";

const router = Router();

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/),
  owner: z.object({ email: z.string().email(), full_name: z.string().min(1) }),
  mode: z.enum(["shared-realm", "isolated-realm"]).default("shared-realm"),
  region: z.string().default("us-east-1"),
  plan: z.enum(["starter", "growth", "enterprise"]).default("starter"),
  mfa_policy: z.enum(["disabled", "optional", "required-admins", "required-all"]).default("optional"),
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = createTenantSchema.parse(req.body);
    const existing = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, body.slug)).limit(1);
    if (existing.length > 0) throw new ConflictError(`Slug '${body.slug}' is already taken`);

    const tenantId = makeId("tnt");
    const workspaceId = makeId("wsp");
    const adminId = makeId("adm");

    const { realm, issuer } = provisionRealm(tenantId, adminId);

    const [tenant] = await db.insert(tenantsTable).values({
      id: tenantId,
      name: body.name,
      slug: body.slug,
      plan: body.plan,
      status: "active",
      region: body.region,
      mfaPolicy: body.mfa_policy,
    }).returning();

    const [workspace] = await db.insert(workspacesTable).values({
      id: workspaceId,
      tenantId: tenantId,
      name: "Default",
      mode: body.mode,
      keycloakRealm: realm,
      keycloakIssuer: issuer,
      status: "active",
      isDefault: true,
    }).returning();

    const { token, hash } = createInviteToken();
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(adminsTable).values({
      id: adminId,
      workspaceId: workspaceId,
      email: body.owner.email,
      fullName: body.owner.full_name,
      role: "owner",
      status: "active",
      inviteTokenHash: hash,
      inviteExpiresAt: inviteExpiry,
    });

    await db.update(tenantsTable).set({ ownerUserId: adminId }).where(eq(tenantsTable.id, tenantId));

    await writeAuditLog(req, {
      action: "tenant.created",
      resourceType: "tenant",
      resourceId: tenantId,
      newState: "active",
      sourceScreen: "api",
    });

    const responseBody = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        plan: tenant.plan,
        region: tenant.region,
        mfa_policy: tenant.mfaPolicy,
        created_at: tenant.createdAt,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        mode: workspace.mode,
        status: workspace.status,
        keycloak: {
          realm: workspace.keycloakRealm,
          issuer: workspace.keycloakIssuer,
          jwks_uri: `${workspace.keycloakIssuer}/protocol/openid-connect/certs`,
          well_known: `${workspace.keycloakIssuer}/.well-known/openid-configuration`,
        },
      },
      owner_invite_token: token,
    };

    res.status(201).json(responseBody);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const [tenant] = await db.select().from(tenantsTable)
      .where(and(eq(tenantsTable.id, (req.params as Record<string, string>).id), isNull(tenantsTable.deletedAt)))
      .limit(1);
    if (!tenant) throw new NotFoundError("Tenant", (req.params as Record<string, string>).id);
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const allowed = z.object({
      name: z.string().min(1).max(255).optional(),
      plan: z.enum(["starter", "growth", "enterprise"]).optional(),
      status: z.enum(["active", "suspended"]).optional(),
      mfa_policy: z.enum(["disabled", "optional", "required-admins", "required-all"]).optional(),
    }).parse(req.body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (allowed.name) updates.name = allowed.name;
    if (allowed.plan) updates.plan = allowed.plan;
    if (allowed.status) updates.status = allowed.status;
    if (allowed.mfa_policy) updates.mfaPolicy = allowed.mfa_policy;

    const [existing] = await db.select().from(tenantsTable)
      .where(and(eq(tenantsTable.id, (req.params as Record<string, string>).id), isNull(tenantsTable.deletedAt))).limit(1);
    if (!existing) throw new NotFoundError("Tenant", (req.params as Record<string, string>).id);

    const [updated] = await db.update(tenantsTable).set(updates).where(eq(tenantsTable.id, (req.params as Record<string, string>).id)).returning();

    await writeAuditLog(req, {
      action: "tenant.updated",
      resourceType: "tenant",
      resourceId: (req.params as Record<string, string>).id,
      previousState: existing.status,
      newState: updated.status,
      sourceScreen: "api",
    });

    res.json({ tenant: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/usage", requireAuth, async (req, res, next) => {
  try {
    const [tenant] = await db.select().from(tenantsTable)
      .where(eq(tenantsTable.id, (req.params as Record<string, string>).id)).limit(1);
    if (!tenant) throw new NotFoundError("Tenant", (req.params as Record<string, string>).id);

    const snapshots = await db.select().from(usageSnapshotsTable)
      .where(eq(usageSnapshotsTable.tenantId, (req.params as Record<string, string>).id));

    const totals = snapshots.reduce((acc, s) => ({
      mau: acc.mau + s.mau,
      logins: acc.logins + s.logins,
      token_refresh: acc.token_refresh + s.tokenRefresh,
    }), { mau: 0, logins: 0, token_refresh: 0 });

    res.json({ tenant_id: (req.params as Record<string, string>).id, usage: totals, snapshots });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const [existing] = await db.select().from(tenantsTable)
      .where(and(eq(tenantsTable.id, (req.params as Record<string, string>).id), isNull(tenantsTable.deletedAt))).limit(1);
    if (!existing) throw new NotFoundError("Tenant", (req.params as Record<string, string>).id);

    await db.update(tenantsTable).set({ deletedAt: new Date(), status: "deleted" })
      .where(eq(tenantsTable.id, (req.params as Record<string, string>).id));

    await writeAuditLog(req, {
      action: "tenant.deleted",
      resourceType: "tenant",
      resourceId: (req.params as Record<string, string>).id,
      previousState: existing.status,
      newState: "deleted",
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
