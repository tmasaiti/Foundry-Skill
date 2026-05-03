import { Router } from "express";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { scimConfigurationsTable, scimUsersTable, workspacesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { makeId } from "../../lib/ulid.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeAuditLog } from "../../middleware/audit.js";

const router = Router();

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function generateScimToken(): { raw: string; hash: string; prefix: string } {
  const raw = "scim_live_" + randomBytes(24).toString("hex");
  return { raw, hash: sha256(raw), prefix: raw.slice(0, 12) };
}

async function requireWorkspace(workspaceId: string) {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId)).limit(1);
  if (!ws) throw new NotFoundError("Workspace", workspaceId);
  return ws;
}

async function getOrCreateConfig(workspaceId: string) {
  const [existing] = await db.select().from(scimConfigurationsTable).where(eq(scimConfigurationsTable.workspaceId, workspaceId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(scimConfigurationsTable).values({
    id: makeId("scimcfg"),
    workspaceId,
    enabled: false,
  }).returning();
  return created;
}

// POST /v1/workspaces/:id/scim/enable
router.post("/:id/scim/enable", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    const { raw, hash, prefix } = generateScimToken();
    const baseUrl = `https://api.foundry-iam.dev/scim/v2/${workspaceId}`;
    const existingRows = await db.select().from(scimConfigurationsTable).where(eq(scimConfigurationsTable.workspaceId, workspaceId)).limit(1);
    if (existingRows.length > 0) {
      await db.update(scimConfigurationsTable)
        .set({ enabled: true, bearerTokenHash: hash, tokenPrefix: prefix, syncErrorCount: 0, updatedAt: new Date() })
        .where(eq(scimConfigurationsTable.workspaceId, workspaceId));
    } else {
      await db.insert(scimConfigurationsTable).values({
        id: makeId("scimcfg"),
        workspaceId,
        enabled: true,
        bearerTokenHash: hash,
        tokenPrefix: prefix,
      });
    }
    await writeAuditLog(req, { action: "scim.enabled", resourceType: "workspace", resourceId: workspaceId, newState: "enabled" });
    res.status(201).json({
      scim: {
        enabled: true,
        base_url: baseUrl,
        bearer_token: raw,
        token_prefix: prefix,
        schemas_url: `${baseUrl}/Schemas`,
        service_provider_config_url: `${baseUrl}/ServiceProviderConfig`,
      },
      warning: "The bearer_token will not be shown again. Copy it now.",
    });
  } catch (err) { next(err); }
});

// POST /v1/workspaces/:id/scim/disable
router.post("/:id/scim/disable", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    await db.update(scimConfigurationsTable)
      .set({ enabled: false, bearerTokenHash: "", tokenPrefix: "", updatedAt: new Date() })
      .where(eq(scimConfigurationsTable.workspaceId, workspaceId));
    await writeAuditLog(req, { action: "scim.disabled", resourceType: "workspace", resourceId: workspaceId, newState: "disabled" });
    res.json({ enabled: false });
  } catch (err) { next(err); }
});

// GET /v1/workspaces/:id/scim/config
router.get("/:id/scim/config", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    const config = await getOrCreateConfig(workspaceId);
    const { bearerTokenHash: _hash, ...safe } = config;
    res.json({ config: safe });
  } catch (err) { next(err); }
});

// PATCH /v1/workspaces/:id/scim/config
router.patch("/:id/scim/config", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    const body = z.object({
      deprovision_action: z.enum(["disable", "delete"]).optional(),
      sync_groups: z.boolean().optional(),
      allowed_operations: z.array(z.enum(["CREATE", "UPDATE", "DISABLE", "DELETE"])).optional(),
      user_attribute_mappings: z.record(z.string()).optional(),
    }).parse(req.body);
    const config = await getOrCreateConfig(workspaceId);
    const [updated] = await db.update(scimConfigurationsTable)
      .set({
        ...(body.deprovision_action !== undefined && { deprovisionAction: body.deprovision_action }),
        ...(body.sync_groups !== undefined && { syncGroups: body.sync_groups }),
        ...(body.allowed_operations !== undefined && { allowedOperations: body.allowed_operations }),
        ...(body.user_attribute_mappings !== undefined && { userAttributeMappings: body.user_attribute_mappings }),
        updatedAt: new Date(),
      })
      .where(eq(scimConfigurationsTable.id, config.id))
      .returning();
    const { bearerTokenHash: _hash, ...safe } = updated;
    res.json({ config: safe });
  } catch (err) { next(err); }
});

// POST /v1/workspaces/:id/scim/token/rotate
router.post("/:id/scim/token/rotate", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    const config = await getOrCreateConfig(workspaceId);
    if (!config.enabled) throw new ValidationError("scim_not_enabled: SCIM must be enabled before rotating the token");
    const { raw, hash, prefix } = generateScimToken();
    await db.update(scimConfigurationsTable)
      .set({ bearerTokenHash: hash, tokenPrefix: prefix, updatedAt: new Date() })
      .where(eq(scimConfigurationsTable.id, config.id));
    await writeAuditLog(req, { action: "scim.token-rotated", resourceType: "workspace", resourceId: workspaceId });
    res.json({
      bearer_token: raw,
      token_prefix: prefix,
      warning: "The bearer_token will not be shown again. The old token is immediately invalid. Copy it now.",
    });
  } catch (err) { next(err); }
});

// GET /v1/workspaces/:id/scim/users
router.get("/:id/scim/users", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    const users = await db.select().from(scimUsersTable).where(eq(scimUsersTable.workspaceId, workspaceId));
    res.json({ users, total: users.length });
  } catch (err) { next(err); }
});

// GET /v1/workspaces/:id/scim/logs — placeholder (audit table used in real impl)
router.get("/:id/scim/logs", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    res.json({ logs: [], total: 0 });
  } catch (err) { next(err); }
});

export default router;
