import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { identityProvidersTable, workspacesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { makeId } from "../../lib/ulid.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeAuditLog } from "../../middleware/audit.js";

const router = Router();

function encodeConfig(config: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(config)).toString("base64");
}

function decodeConfig(encoded: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  } catch {
    return {};
  }
}

function redactConfig(config: Record<string, unknown>): Record<string, unknown> {
  const secretKeys = ["client_secret", "signing_certificate", "bind_credential", "private_key"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    out[k] = secretKeys.some((s) => k.includes(s)) ? "***" : v;
  }
  return out;
}

function buildCallbackUrl(realm: string, alias: string) {
  const base = `https://id.foundry-iam.dev/realms/${realm}/broker/${alias}`;
  return {
    oidc: `${base}/endpoint`,
    saml_acs: `${base}/endpoint`,
    saml_sp_meta: `${base}/endpoint/descriptor`,
    test_url: `${base}/login`,
  };
}

async function requireWorkspace(workspaceId: string) {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId)).limit(1);
  if (!ws) throw new NotFoundError("Workspace", workspaceId);
  return ws;
}

async function requireIdP(workspaceId: string, idpId: string) {
  const [idp] = await db
    .select()
    .from(identityProvidersTable)
    .where(and(eq(identityProvidersTable.id, idpId), eq(identityProvidersTable.workspaceId, workspaceId)))
    .limit(1);
  if (!idp) throw new NotFoundError("IdentityProvider", idpId);
  return idp;
}

const AttributeMapperSchema = z.object({
  id: z.string().optional(),
  upstream_claim: z.string().min(1),
  user_attribute: z.string().min(1),
  mapper_type: z.string().default("oidc-user-attribute-idp-mapper"),
  sync_mode: z.enum(["inherit", "legacy", "force"]).default("inherit"),
});

const RegisterIdPSchema = z.object({
  alias: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Alias must be lowercase alphanumeric and hyphens only"),
  display_name: z.string().min(1).max(255),
  type: z.enum(["oidc", "saml", "google", "github", "microsoft", "ldap"]),
  config: z.record(z.unknown()),
  domain_hints: z.array(z.string()).default([]),
  hide_on_login_page: z.boolean().default(false),
  attribute_mappers: z.array(AttributeMapperSchema).default([]),
  sync_mode: z.enum(["inherit", "legacy", "force"]).default("inherit"),
  first_login_flow: z.string().default("first broker login"),
});

const PatchIdPSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  config: z.record(z.unknown()).optional(),
  domain_hints: z.array(z.string()).optional(),
  hide_on_login_page: z.boolean().optional(),
  attribute_mappers: z.array(AttributeMapperSchema).optional(),
  sync_mode: z.enum(["inherit", "legacy", "force"]).optional(),
});

// GET /v1/workspaces/:id/identity-providers/callback-url
router.get("/:id/identity-providers/callback-url", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    const ws = await requireWorkspace(workspaceId);
    const realm = (ws as Record<string, unknown>).keycloak_realm as string ?? workspaceId;
    res.json({
      workspace_id: workspaceId,
      callback_urls: {
        oidc: `https://id.foundry-iam.dev/realms/${realm}/broker/{alias}/endpoint`,
        saml_acs: `https://id.foundry-iam.dev/realms/${realm}/broker/{alias}/endpoint`,
        saml_sp_meta: `https://id.foundry-iam.dev/realms/${realm}/broker/{alias}/endpoint/descriptor`,
      },
      note: "Replace {alias} with your IdP alias. Register the callback_url in your upstream IdP application settings.",
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/workspaces/:id/identity-providers
router.post("/:id/identity-providers", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    const ws = await requireWorkspace(workspaceId);
    const body = RegisterIdPSchema.parse(req.body);

    const existing = await db
      .select({ id: identityProvidersTable.id })
      .from(identityProvidersTable)
      .where(
        and(
          eq(identityProvidersTable.workspaceId, workspaceId),
          eq(identityProvidersTable.alias, body.alias)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      throw new ValidationError("alias_already_exists: An IdP with this alias already exists in this workspace");
    }

    if (body.domain_hints.length > 0) {
      const allIdPs = await db
        .select({ domainHints: identityProvidersTable.domainHints })
        .from(identityProvidersTable)
        .where(eq(identityProvidersTable.workspaceId, workspaceId));
      const claimed = allIdPs.flatMap((i) => i.domainHints ?? []);
      const conflict = body.domain_hints.find((d) => claimed.includes(d));
      if (conflict) {
        throw new ValidationError(`domain_already_claimed: Domain '${conflict}' is already claimed by another IdP in this workspace`);
      }
    }

    const id = makeId("idp");
    const realm = (ws as Record<string, unknown>).keycloak_realm as string ?? workspaceId;
    const urls = buildCallbackUrl(realm, body.alias);

    const mappers = body.attribute_mappers.map((m, i) => ({
      id: m.id ?? `map_${i}_${Date.now()}`,
      ...m,
    }));

    const [created] = await db
      .insert(identityProvidersTable)
      .values({
        id,
        workspaceId,
        alias: body.alias,
        displayName: body.display_name,
        type: body.type,
        enabled: true,
        hideOnLoginPage: body.hide_on_login_page,
        keycloakAlias: body.alias,
        configEncrypted: encodeConfig(body.config as Record<string, unknown>),
        attributeMappers: mappers,
        domainHints: body.domain_hints,
        firstLoginFlow: body.first_login_flow,
        syncMode: body.sync_mode,
      })
      .returning();

    await writeAuditLog(req, {
      action: "identity_provider.created",
      resourceType: "identity_provider",
      resourceId: id,
      meta: { alias: body.alias, type: body.type, workspace_id: workspaceId },
    });

    res.status(201).json({
      identity_provider: {
        id: created.id,
        workspace_id: created.workspaceId,
        alias: created.alias,
        display_name: created.displayName,
        type: created.type,
        enabled: created.enabled,
        domain_hints: created.domainHints,
        callback_url: urls.oidc,
        created_at: created.createdAt,
      },
      setup: urls,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/workspaces/:id/identity-providers
router.get("/:id/identity-providers", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = (req.params as Record<string, string>).id;
    await requireWorkspace(workspaceId);
    const idps = await db
      .select()
      .from(identityProvidersTable)
      .where(eq(identityProvidersTable.workspaceId, workspaceId));

    res.json({
      identity_providers: idps.map((idp) => ({
        id: idp.id,
        workspace_id: idp.workspaceId,
        alias: idp.alias,
        display_name: idp.displayName,
        type: idp.type,
        enabled: idp.enabled,
        hide_on_login_page: idp.hideOnLoginPage,
        domain_hints: idp.domainHints,
        sync_mode: idp.syncMode,
        created_at: idp.createdAt,
        updated_at: idp.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/workspaces/:id/identity-providers/:idpId
router.get("/:id/identity-providers/:idpId", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    const config = redactConfig(decodeConfig(idp.configEncrypted));
    res.json({
      id: idp.id,
      workspace_id: idp.workspaceId,
      alias: idp.alias,
      display_name: idp.displayName,
      type: idp.type,
      enabled: idp.enabled,
      hide_on_login_page: idp.hideOnLoginPage,
      domain_hints: idp.domainHints,
      sync_mode: idp.syncMode,
      first_login_flow: idp.firstLoginFlow,
      config,
      attribute_mappers: idp.attributeMappers,
      created_at: idp.createdAt,
      updated_at: idp.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/workspaces/:id/identity-providers/:idpId
router.patch("/:id/identity-providers/:idpId", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    const body = PatchIdPSchema.parse(req.body);

    if (body.domain_hints && body.domain_hints.length > 0) {
      const allIdPs = await db
        .select({ id: identityProvidersTable.id, domainHints: identityProvidersTable.domainHints })
        .from(identityProvidersTable)
        .where(eq(identityProvidersTable.workspaceId, p.id));
      const claimed = allIdPs.filter((i) => i.id !== idp.id).flatMap((i) => i.domainHints ?? []);
      const conflict = body.domain_hints.find((d) => claimed.includes(d));
      if (conflict) {
        throw new ValidationError(`domain_already_claimed: Domain '${conflict}' is already claimed by another IdP in this workspace`);
      }
    }

    let newConfig = decodeConfig(idp.configEncrypted);
    if (body.config) {
      newConfig = { ...newConfig, ...body.config };
    }

    await db
      .update(identityProvidersTable)
      .set({
        ...(body.display_name !== undefined && { displayName: body.display_name }),
        ...(body.domain_hints !== undefined && { domainHints: body.domain_hints }),
        ...(body.hide_on_login_page !== undefined && { hideOnLoginPage: body.hide_on_login_page }),
        ...(body.sync_mode !== undefined && { syncMode: body.sync_mode }),
        ...(body.attribute_mappers !== undefined && { attributeMappers: body.attribute_mappers }),
        ...(body.config !== undefined && { configEncrypted: encodeConfig(newConfig) }),
        updatedAt: new Date(),
      })
      .where(eq(identityProvidersTable.id, idp.id));

    await writeAuditLog(req, {
      action: "identity_provider.updated",
      resourceType: "identity_provider",
      resourceId: idp.id,
      meta: { alias: idp.alias, workspace_id: p.id },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/workspaces/:id/identity-providers/:idpId
router.delete("/:id/identity-providers/:idpId", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    await db.delete(identityProvidersTable).where(eq(identityProvidersTable.id, idp.id));
    await writeAuditLog(req, {
      action: "identity_provider.deleted",
      resourceType: "identity_provider",
      resourceId: idp.id,
      meta: { alias: idp.alias, workspace_id: p.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /v1/workspaces/:id/identity-providers/:idpId/enable
router.post("/:id/identity-providers/:idpId/enable", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    await db
      .update(identityProvidersTable)
      .set({ enabled: true, updatedAt: new Date() })
      .where(eq(identityProvidersTable.id, idp.id));
    await writeAuditLog(req, {
      action: "identity_provider.enabled",
      resourceType: "identity_provider",
      resourceId: idp.id,
      meta: { alias: idp.alias },
    });
    res.json({ success: true, enabled: true });
  } catch (err) {
    next(err);
  }
});

// POST /v1/workspaces/:id/identity-providers/:idpId/disable
router.post("/:id/identity-providers/:idpId/disable", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    await db
      .update(identityProvidersTable)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(identityProvidersTable.id, idp.id));
    await writeAuditLog(req, {
      action: "identity_provider.disabled",
      resourceType: "identity_provider",
      resourceId: idp.id,
      meta: { alias: idp.alias },
    });
    res.json({ success: true, enabled: false });
  } catch (err) {
    next(err);
  }
});

// GET /v1/workspaces/:id/identity-providers/:idpId/test-url
router.get("/:id/identity-providers/:idpId/test-url", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const ws = await requireWorkspace(p.id);
    const idp = await requireIdP(p.id, p.idpId);
    const realm = (ws as Record<string, unknown>).keycloak_realm as string ?? p.id;
    const testUrl = `https://id.foundry-iam.dev/realms/${realm}/broker/${idp.alias}/login`;
    res.json({ test_url: testUrl, alias: idp.alias, enabled: idp.enabled });
  } catch (err) {
    next(err);
  }
});

// POST /v1/workspaces/:id/identity-providers/:idpId/mappers
router.post("/:id/identity-providers/:idpId/mappers", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    const mapper = AttributeMapperSchema.parse(req.body);
    const newMapper = { id: `map_${Date.now()}`, ...mapper };
    const existing = (idp.attributeMappers as unknown[]) ?? [];
    await db
      .update(identityProvidersTable)
      .set({ attributeMappers: [...existing, newMapper], updatedAt: new Date() })
      .where(eq(identityProvidersTable.id, idp.id));
    res.status(201).json({ mapper: newMapper });
  } catch (err) {
    next(err);
  }
});

// GET /v1/workspaces/:id/identity-providers/:idpId/mappers
router.get("/:id/identity-providers/:idpId/mappers", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    res.json({ mappers: idp.attributeMappers ?? [] });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/workspaces/:id/identity-providers/:idpId/mappers/:mapperId
router.patch("/:id/identity-providers/:idpId/mappers/:mapperId", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    const patch = AttributeMapperSchema.partial().parse(req.body);
    const mappers = ((idp.attributeMappers as unknown[]) ?? []) as Array<Record<string, unknown>>;
    const idx = mappers.findIndex((m) => m.id === p.mapperId);
    if (idx === -1) throw new NotFoundError("Mapper", p.mapperId);
    mappers[idx] = { ...mappers[idx], ...patch };
    await db
      .update(identityProvidersTable)
      .set({ attributeMappers: mappers, updatedAt: new Date() })
      .where(eq(identityProvidersTable.id, idp.id));
    res.json({ mapper: mappers[idx] });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/workspaces/:id/identity-providers/:idpId/mappers/:mapperId
router.delete("/:id/identity-providers/:idpId/mappers/:mapperId", requireAuth, async (req, res, next) => {
  try {
    const p = req.params as Record<string, string>;
    const idp = await requireIdP(p.id, p.idpId);
    const mappers = ((idp.attributeMappers as unknown[]) ?? []) as Array<Record<string, unknown>>;
    const filtered = mappers.filter((m) => m.id !== p.mapperId);
    await db
      .update(identityProvidersTable)
      .set({ attributeMappers: filtered, updatedAt: new Date() })
      .where(eq(identityProvidersTable.id, idp.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
