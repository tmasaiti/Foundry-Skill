# Foundry IAM — Developer-First IAM SaaS Platform

## Overview

Foundry IAM is a multi-tenant, developer-first IAM SaaS ("Stripe for IAM") built on a pnpm monorepo. It provides Keycloak-powered OIDC authentication without running your own cluster — workspaces get isolated realms, apps get PKCE/confidential client configs, and developers get copy-paste integration snippets.

## Architecture

```
artifacts/
  api-server/       — Express 5 control-plane API (TypeScript, esbuild)
  portal/           — React + Vite SaaS control-plane dashboard
  mockup-sandbox/   — Component preview server (internal)
lib/
  db/               — Drizzle ORM schema + migration helpers (PostgreSQL)
  api-spec/         — OpenAPI 3.1 spec + Orval codegen config
  api-client-react/ — Generated React Query hooks (from OpenAPI)
  api-zod/          — Generated Zod validators (from OpenAPI)
scripts/            — Shared utility scripts
```

## Stack

- **Monorepo**: pnpm workspaces
- **Runtime**: Node.js 24
- **TypeScript**: 5.9 (strict)
- **API**: Express 5, Pino logging, Zod validation
- **Database**: PostgreSQL + Drizzle ORM (no drizzle-zod — use `$inferSelect`/`$inferInsert`)
- **Auth mock**: jose-based JWT (mock Keycloak — RSA-2048 per realm)
- **API codegen**: Orval v8 from `lib/api-spec/openapi.yaml`
- **Frontend**: React 19 + Vite 7, Tailwind v4, shadcn/ui, Wouter, React Query
- **Charts**: Recharts
- **Validation**: Zod (catalog version), NOT drizzle-zod (version conflict)

## Key Commands

```bash
# Codegen (regenerate hooks + validators from OpenAPI)
pnpm --filter @workspace/api-spec run codegen

# Typecheck all packages
pnpm run typecheck

# Typecheck individual packages
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/portal run typecheck

# Push DB schema (dev only)
pnpm --filter @workspace/db run push

# Build API server
pnpm --filter @workspace/api-server run build
```

## Service Routes

| Service    | Path  | Local port |
|------------|-------|------------|
| Portal     | `/`   | 25265      |
| API Server | `/api`| 8080       |

## Database Schema (PostgreSQL)

Tables created/pushed via `pnpm --filter @workspace/db run push`:

- `tenants` — owner orgs, plan, status, stripe IDs
- `workspaces` — realm-isolated environments per tenant
- `apps` — OIDC clients (public/confidential), PKCE config
- `admins` — workspace admin users with roles
- `audit_logs` — immutable append-only event trail
- `idempotency_keys` — API idempotency
- `usage_snapshots` — MAU/login billing metrics
- `realm_keys` — RSA-2048 key pairs per mock realm
- `saml_service_providers` — SAML 2.0 SP registrations per workspace (entityId, acsUrl, sloUrl, nameIdFormat, sign/encrypt flags, attributeMappings jsonb, status)
- `scim_configurations` — SCIM 2.0 config per workspace (enabled, bearerTokenHash, tokenPrefix, allowedOperations array, syncGroups, deprovisionAction, lastSyncAt, syncErrorCount)
- `scim_users` — SCIM-provisioned user ID ↔ Keycloak user ID mapping (workspaceId, keycloakUserId, externalId, username, active, lastSyncedAt)
- `scim_groups` — SCIM group ID ↔ Keycloak group ID mapping (workspaceId, keycloakGroupId, displayName, externalId)
- `identity_providers` — BYO IdP / Custom Federation registrations (alias, displayName, type, protocol, enabled, domainHints, syncMode, clientId/secret, saml config jsonb, attributeMappers jsonb, loginCount30d)

## API Routes (`/api/v1/...`)

- `GET /healthz` — health check
- `POST /v1/tenants` — create tenant
- `GET/PUT/DELETE /v1/tenants/:id` — manage tenant
- `GET /v1/tenants/:id/usage` — MAU/usage metrics
- `POST/GET /v1/tenants/:tenantId/workspaces` — workspace management
- `GET/PUT/DELETE /v1/tenants/:tenantId/workspaces/:id` — workspace ops
- `POST/GET /v1/tenants/:tenantId/workspaces/:id/apps` — app management
- `POST/GET /v1/tenants/:tenantId/workspaces/:id/admins` — admin invites
- `POST /v1/tenants/:tenantId/billing/portal` — Stripe billing portal
- `POST /v1/webhooks/stripe` — Stripe webhook handler
- `GET /v1/meta/plans` — plan metadata
- `GET /v1/meta/audit-logs` — paginated audit logs
- `GET /v1/realms/:realm/.well-known/openid-configuration` — OIDC discovery
- `GET /v1/realms/:realm/protocol/openid-connect/certs` — JWKS endpoint
- **SAML** (`artifacts/api-server/src/routes/v1/saml.ts`, mounted at `/v1/workspaces`):
  - `POST /:id/saml/service-providers` — register SP (metadata_xml or manual mode)
  - `GET /:id/saml/service-providers` — list SPs for workspace
  - `GET /:id/saml/service-providers/:sspId` — get SP detail
  - `PATCH /:id/saml/service-providers/:sspId` — update SP (name, status, mappings, toggles)
  - `DELETE /:id/saml/service-providers/:sspId` — delete SP
  - `GET /:id/saml/idp-metadata` — download IdP metadata XML (Content-Disposition: attachment)
  - `POST /:id/saml/service-providers/:sspId/test` — generate test assertion (not transmitted)
- **Federation / BYO IdP** (`artifacts/api-server/src/routes/v1/federation.ts`, mounted at `/v1/workspaces`):
  - `POST /:id/identity-providers` — create IdP (alias, type, protocol, clientId, clientSecret, config)
  - `GET /:id/identity-providers` — list IdPs for workspace
  - `GET /:id/identity-providers/:idpId` — get IdP detail (secret redacted)
  - `PATCH /:id/identity-providers/:idpId` — update IdP config
  - `DELETE /:id/identity-providers/:idpId` — delete IdP (alias confirmation required)
  - `POST /:id/identity-providers/:idpId/enable` — enable IdP
  - `POST /:id/identity-providers/:idpId/disable` — disable IdP
  - `GET /:id/identity-providers/:idpId/callback-url` — get Keycloak broker callback URL
  - `POST /:id/identity-providers/:idpId/test-url` — generate test login URL
  - `POST /:id/identity-providers/:idpId/mappers` — add attribute mapper
  - `GET /:id/identity-providers/:idpId/mappers` — list attribute mappers
  - `PATCH /:id/identity-providers/:idpId/mappers/:mapperId` — update mapper
  - `DELETE /:id/identity-providers/:idpId/mappers/:mapperId` — delete mapper
- **SCIM** (`artifacts/api-server/src/routes/v1/scim.ts`, mounted at `/v1/workspaces`):
  - `POST /:id/scim/enable` — enable SCIM, generate bearer token (returned once, stored SHA-256 hashed)
  - `POST /:id/scim/disable` — disable SCIM, invalidate token
  - `GET /:id/scim/config` — get SCIM config (token hash never returned)
  - `PATCH /:id/scim/config` — update deprovisionAction, syncGroups, allowedOperations, userAttributeMappings
  - `POST /:id/scim/token/rotate` — rotate bearer token (old immediately invalid, new returned once)
  - `GET /:id/scim/users` — list SCIM-provisioned users
  - `GET /:id/scim/logs` — list SCIM operation log entries

## Frontend Pages (`/portal`)

- `/login` — Split-panel brand login page
- `/` — Dashboard with MAU trend, workspace/app overview, recent activity
- `/apps` — Filterable app list with PKCE/type badges
- `/apps/:appId` — App detail with OIDC config, integration snippets (Node/Python/Go), secret rotation workflow
- `/workspaces` — Workspace list with realm info, create modal
- `/workspaces/:id` — Workspace detail with tabs (Apps, Team, Realm endpoints)
- `/team` — Admin team management with role permissions matrix
- `/billing` — Plan comparison, MAU usage chart, invoice history
- `/audit-logs` — Immutable audit trail with inline event detail
- `/settings` — Tenant config, MFA policy, support access, danger zone
- `/saml` — SAML SP list, disabled-first sort, amber exception callout, workspace filter
- `/saml/new` — Register SP: XML upload tab (recommended, live parse/validation) + manual config tab; attribute mapping table; sign/encrypt toggles
- `/saml/:sspId` — SP detail: "Give This to Your SP" IdP metadata section; editable attribute mappings; SP integration guide (collapsible per §3A); lineage; danger zone (name confirmation)
- `/saml/:sspId/test` — IdP-initiated test: generates sample assertion, decoded claims table, raw XML inspector
- `/scim` — SCIM config per workspace: enabled/disabled state, amber sync-error callout (§3D), base URL + masked token + Rotate button, deprovision action (disable/delete with amber warning on delete), syncGroups toggle, allowedOperations selector, enable/disable modals with one-time token reveal (checkbox-gated per §6A)
- `/scim/users` — SCIM-provisioned user table: deprovisioned users first (§3D, red left-border rows), amber callout names them, groups + last sync + status columns, Source IdP shown
- `/scim/logs` — SCIM operation log: errors first (§3D, red left-border), 3-stat summary bar, filterable by operation + status, expandable rows show external_id + error detail + HTTP status
- `/scim/setup-guide` — IdP setup guide: 5 IdPs (Okta, Azure AD, Google, OneLogin, Generic), copy Base URL + masked token, checkable numbered steps, IdP-specific notes (§2 business rules), completion state → links to verify
- `/identity-providers` — Federation list: amber callout for disabled providers (§3D), disabled-first sort, workspace filter tabs, login count (30d), domain hints, last login; "Add Provider" CTA
- `/identity-providers/new` — 5-step add wizard: (1) provider picker (Okta/Azure/Google/GitHub/Generic OIDC/SAML), (2) configure (auto-derived or manual URLs), (3) callback URL step (checkbox-gated copy, §6A), (4) attribute mappers, (5) test + save
- `/identity-providers/:id` — IdP detail: status header + Disable/Enable button, callback URLs panel, configuration (type/sync mode/redacted secret with Update Secret, §2), attribute mapper table (add/delete), domain hints, danger zone (alias confirmation delete)

## UIUX Doctrine Compliance

Every screen answers the 5 questions: WHO is responsible / WHAT is the current status / WHAT CHANGED / WHAT CAN I DO / WHAT WILL HAPPEN. Status badges carry operational consequences (active = green + dot, provisioning = blue + pulse, error = red). Record lineage is visible on all detail pages (created-at, actor email, previous→new state in audit logs). Workflow-first: secret rotation shows impact before confirming, workspace creation shows plan limits inline.

## Known Architectural Decisions

- **No drizzle-zod**: Incompatible with drizzle-orm 0.38+ (Zod v4 API conflict). Use `$inferSelect`/`$inferInsert` for types.
- **Orval zod config**: Must use absolute file path as `target` (not `workspace` + relative) to avoid orval generating a conflicting `index.ts` barrel.
- **Express 5 params**: `req.params` is typed as `Record<string, string | string[]>`. Cast with `(req.params as Record<string, string>).xxx` in route handlers.
- **Mock Keycloak**: `services/mockKeycloak.ts` uses `node:crypto` + `jose` for RSA JWT signing. Realm keys are stored in `realm_keys` table and cached in memory.
- **Demo auth**: Portal auto-seeds the demo session (`sessionStorage`) on first load. Login with any email / any password. Sign out clears the session.
