import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { workspacesTable, appsTable, adminsTable, tenantsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { makeId } from "../../lib/ulid.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeAuditLog } from "../../middleware/audit.js";
import { provisionRealm, getOidcMetadata, createOidcClient, rotateClientSecret, createInviteToken } from "../../services/mockKeycloak.js";
import { sendEmail, inviteEmail } from "../../services/email.js";

const router = Router();

const PLAN_WORKSPACE_LIMITS: Record<string, number> = {
  starter: 1,
  growth: 3,
  enterprise: Infinity,
};

router.post("/:tenantId/workspaces", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(255),
      mode: z.enum(["shared-realm", "isolated-realm"]).default("isolated-realm"),
    }).parse(req.body);

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, (req.params as Record<string, string>).tenantId)).limit(1);
    if (!tenant) throw new NotFoundError("Tenant", (req.params as Record<string, string>).tenantId);

    const existing = await db.select().from(workspacesTable).where(eq(workspacesTable.tenantId, (req.params as Record<string, string>).tenantId));
    const limit = PLAN_WORKSPACE_LIMITS[tenant.plan] ?? 1;
    if (existing.length >= limit) {
      throw new ForbiddenError(`Plan '${tenant.plan}' allows a maximum of ${limit} workspace(s). Upgrade to add more.`);
    }

    const workspaceId = makeId("wsp");
    const { realm, issuer } = provisionRealm(workspaceId, "system");

    const [workspace] = await db.insert(workspacesTable).values({
      id: workspaceId,
      tenantId: (req.params as Record<string, string>).tenantId,
      name: body.name,
      mode: body.mode,
      keycloakRealm: realm,
      keycloakIssuer: issuer,
      status: "active",
      isDefault: false,
    }).returning();

    await writeAuditLog(req, {
      action: "workspace.created",
      resourceType: "workspace",
      resourceId: workspaceId,
      newState: "active",
    });

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
});

router.get("/:tenantId/workspaces", requireAuth, async (req, res, next) => {
  try {
    const workspaces = await db.select().from(workspacesTable)
      .where(eq(workspacesTable.tenantId, (req.params as Record<string, string>).tenantId));
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/oidc", async (req, res, next) => {
  try {
    const [workspace] = await db.select().from(workspacesTable)
      .where(eq(workspacesTable.id, (req.params as Record<string, string>).id)).limit(1);
    if (!workspace) throw new NotFoundError("Workspace", (req.params as Record<string, string>).id);
    const metadata = getOidcMetadata(workspace.keycloakRealm);
    res.json(metadata);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/apps", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(255),
      type: z.enum(["public", "confidential"]).default("public"),
      redirect_uris: z.array(z.string().url()),
      post_logout_redirect_uris: z.array(z.string()).default([]),
      web_origins: z.array(z.string()).default([]),
      pkce: z.enum(["required", "optional", "disabled"]).default("required"),
      scopes: z.array(z.string()).default(["openid", "profile", "email"]),
      token_lifetimes: z.object({
        access_token_seconds: z.number().int().positive().default(900),
        refresh_token_seconds: z.number().int().positive().default(2592000),
      }).default({}),
    }).parse(req.body);

    const [workspace] = await db.select().from(workspacesTable)
      .where(eq(workspacesTable.id, (req.params as Record<string, string>).id)).limit(1);
    if (!workspace) throw new NotFoundError("Workspace", (req.params as Record<string, string>).id);

    if (body.type === "public" && body.pkce === "disabled") {
      throw new ValidationError("Public apps must use PKCE. Set pkce to 'required' or 'optional'.");
    }

    const appId = makeId("app");
    const { clientId, clientSecret } = createOidcClient(workspace.keycloakRealm, appId, body.type);

    const [app] = await db.insert(appsTable).values({
      id: appId,
      workspaceId: (req.params as Record<string, string>).id,
      name: body.name,
      type: body.type,
      keycloakClientId: clientId,
      redirectUris: JSON.stringify(body.redirect_uris),
      postLogoutRedirectUris: JSON.stringify(body.post_logout_redirect_uris),
      webOrigins: JSON.stringify(body.web_origins),
      pkce: body.pkce,
      scopes: JSON.stringify(body.scopes),
      accessTokenSeconds: body.token_lifetimes.access_token_seconds,
      refreshTokenSeconds: body.token_lifetimes.refresh_token_seconds,
    }).returning();

    await writeAuditLog(req, {
      action: "app.created",
      resourceType: "app",
      resourceId: appId,
      newState: "active",
    });

    res.status(201).json({
      app: {
        id: app.id,
        workspace_id: app.workspaceId,
        name: app.name,
        type: app.type,
        pkce: app.pkce,
        scopes: JSON.parse(app.scopes),
        redirect_uris: JSON.parse(app.redirectUris),
        oidc: {
          client_id: app.keycloakClientId,
          client_secret: clientSecret,
          issuer: workspace.keycloakIssuer,
          authorization_endpoint: `${workspace.keycloakIssuer}/protocol/openid-connect/auth`,
          token_endpoint: `${workspace.keycloakIssuer}/protocol/openid-connect/token`,
          jwks_uri: `${workspace.keycloakIssuer}/protocol/openid-connect/certs`,
        },
        created_at: app.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/apps", requireAuth, async (req, res, next) => {
  try {
    const apps = await db.select().from(appsTable).where(eq(appsTable.workspaceId, (req.params as Record<string, string>).id));
    const [workspace] = await db.select().from(workspacesTable)
      .where(eq(workspacesTable.id, (req.params as Record<string, string>).id)).limit(1);
    if (!workspace) throw new NotFoundError("Workspace", (req.params as Record<string, string>).id);

    const enriched = apps.map((a) => ({
      id: a.id,
      workspace_id: a.workspaceId,
      name: a.name,
      type: a.type,
      pkce: a.pkce,
      scopes: JSON.parse(a.scopes),
      redirect_uris: JSON.parse(a.redirectUris),
      access_token_seconds: a.accessTokenSeconds,
      refresh_token_seconds: a.refreshTokenSeconds,
      oidc: {
        client_id: a.keycloakClientId,
        issuer: workspace.keycloakIssuer,
        jwks_uri: `${workspace.keycloakIssuer}/protocol/openid-connect/certs`,
      },
      created_at: a.createdAt,
    }));
    res.json({ apps: enriched });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/apps/:appId", requireAuth, async (req, res, next) => {
  try {
    const [app] = await db.select().from(appsTable)
      .where(and(eq(appsTable.id, (req.params as Record<string, string>).appId), eq(appsTable.workspaceId, (req.params as Record<string, string>).id))).limit(1);
    if (!app) throw new NotFoundError("App", (req.params as Record<string, string>).appId);
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, (req.params as Record<string, string>).id)).limit(1);
    res.json({
      app: {
        ...app,
        scopes: JSON.parse(app.scopes),
        redirect_uris: JSON.parse(app.redirectUris),
        post_logout_redirect_uris: JSON.parse(app.postLogoutRedirectUris),
        web_origins: JSON.parse(app.webOrigins),
        oidc: workspace ? {
          client_id: app.keycloakClientId,
          issuer: workspace.keycloakIssuer,
          jwks_uri: `${workspace.keycloakIssuer}/protocol/openid-connect/certs`,
          authorization_endpoint: `${workspace.keycloakIssuer}/protocol/openid-connect/auth`,
          token_endpoint: `${workspace.keycloakIssuer}/protocol/openid-connect/token`,
        } : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/apps/:appId/client-secret/rotate", requireAuth, async (req, res, next) => {
  try {
    const [app] = await db.select().from(appsTable)
      .where(and(eq(appsTable.id, (req.params as Record<string, string>).appId), eq(appsTable.workspaceId, (req.params as Record<string, string>).id))).limit(1);
    if (!app) throw new NotFoundError("App", (req.params as Record<string, string>).appId);

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, (req.params as Record<string, string>).id)).limit(1);
    if (!workspace) throw new NotFoundError("Workspace", (req.params as Record<string, string>).id);

    const newSecret = rotateClientSecret(workspace.keycloakRealm, app.keycloakClientId);

    await writeAuditLog(req, {
      action: "app.secret-rotated",
      resourceType: "app",
      resourceId: (req.params as Record<string, string>).appId,
    });

    res.json({ client_id: app.keycloakClientId, client_secret: newSecret, rotated_at: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/integration-snippets", requireAuth, async (req, res, next) => {
  try {
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, (req.params as Record<string, string>).id)).limit(1);
    if (!workspace) throw new NotFoundError("Workspace", (req.params as Record<string, string>).id);

    const apps = await db.select().from(appsTable).where(eq(appsTable.workspaceId, (req.params as Record<string, string>).id));
    const firstApp = apps[0];
    const clientId = firstApp?.keycloakClientId ?? "your-client-id";
    const issuer = workspace.keycloakIssuer;
    const jwksUri = `${issuer}/protocol/openid-connect/certs`;

    const snippets = {
      nodejs: `import { expressjwt as jwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'

export const authMiddleware = jwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: '${jwksUri}',
    cache: true,
    rateLimit: true,
  }),
  audience: '${clientId}',
  issuer: '${issuer}',
  algorithms: ['RS256'],
})

// req.auth.sub         → user ID
// req.auth.tenant_id   → tenant identifier
// req.auth.realm_roles → assigned roles`,

      python: `from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
import httpx

JWKS_URI = "${jwksUri}"
ISSUER = "${issuer}"
AUDIENCE = "${clientId}"

security = HTTPBearer()

def get_current_user(token = Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            get_jwks(),
            algorithms=["RS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")`,

      go: `package middleware

import (
  "context"
  "net/http"
  "github.com/lestrrat-go/jwx/v2/jwk"
  "github.com/lestrrat-go/jwx/v2/jwt"
)

const jwksURI = "${jwksUri}"
const issuer = "${issuer}"

func AuthMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    keySet, _ := jwk.Fetch(context.Background(), jwksURI)
    tokenStr := r.Header.Get("Authorization")[7:]
    token, err := jwt.Parse([]byte(tokenStr), jwt.WithKeySet(keySet))
    if err != nil {
      http.Error(w, "Unauthorized", 401)
      return
    }
    ctx := context.WithValue(r.Context(), "user", token)
    next.ServeHTTP(w, r.WithContext(ctx))
  })
}`,
    };

    res.json({ workspace_id: (req.params as Record<string, string>).id, issuer, jwks_uri: jwksUri, snippets });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/admins/invite", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      full_name: z.string().min(1),
      role: z.enum(["admin", "billing", "viewer"]).default("admin"),
    }).parse(req.body);

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, (req.params as Record<string, string>).id)).limit(1);
    if (!workspace) throw new NotFoundError("Workspace", (req.params as Record<string, string>).id);

    const adminId = makeId("adm");
    const { token, hash } = createInviteToken();
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [admin] = await db.insert(adminsTable).values({
      id: adminId,
      workspaceId: (req.params as Record<string, string>).id,
      email: body.email,
      fullName: body.full_name,
      role: body.role,
      status: "invited",
      inviteTokenHash: hash,
      inviteExpiresAt: inviteExpiry,
    }).returning();

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, workspace.tenantId)).limit(1);

    await sendEmail(inviteEmail({
      inviteeEmail: body.email,
      inviterName: req.auth?.email ?? "Foundry IAM",
      tenantName: tenant?.name ?? "your organization",
      inviteToken: token,
      baseUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
    }));

    await writeAuditLog(req, {
      action: "admin.invited",
      resourceType: "admin",
      resourceId: adminId,
      newState: "invited",
    });

    res.status(201).json({ admin: { id: admin.id, email: admin.email, full_name: admin.fullName, role: admin.role, status: admin.status, created_at: admin.createdAt } });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/admins", requireAuth, async (req, res, next) => {
  try {
    const admins = await db.select().from(adminsTable).where(eq(adminsTable.workspaceId, (req.params as Record<string, string>).id));
    res.json({
      admins: admins.map((a) => ({
        id: a.id, email: a.email, full_name: a.fullName,
        role: a.role, status: a.status, created_at: a.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/admins/:adminId", requireAuth, async (req, res, next) => {
  try {
    const [admin] = await db.select().from(adminsTable)
      .where(and(eq(adminsTable.id, (req.params as Record<string, string>).adminId), eq(adminsTable.workspaceId, (req.params as Record<string, string>).id))).limit(1);
    if (!admin) throw new NotFoundError("Admin", (req.params as Record<string, string>).adminId);
    await db.delete(adminsTable).where(eq(adminsTable.id, (req.params as Record<string, string>).adminId));
    await writeAuditLog(req, { action: "admin.removed", resourceType: "admin", resourceId: String((req.params as Record<string, string>).adminId), previousState: admin.status, newState: "removed" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/support/access", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      enabled: z.boolean(),
      reason: z.string().min(1).max(500),
      duration_minutes: z.number().int().min(1).max(1440).default(60),
    }).parse(req.body);

    await writeAuditLog(req, {
      action: body.enabled ? "support.access-enabled" : "support.access-disabled",
      resourceType: "workspace",
      resourceId: String((req.params as Record<string, string>).id),
      meta: { reason: body.reason, duration_minutes: body.duration_minutes },
    });

    res.json({
      workspace_id: (req.params as Record<string, string>).id,
      support_access: body.enabled,
      reason: body.reason,
      duration_minutes: body.duration_minutes,
      expires_at: body.enabled ? new Date(Date.now() + body.duration_minutes * 60000).toISOString() : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
