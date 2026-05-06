# Developer Checkpoint — Foundry IAM Portal

**Last updated:** 2026-05-06
**Build status:** ✓ Passing — `vite build` clean (9.97s, zero TypeScript errors)
**Stack:** React 18 · Vite 7 · TailwindCSS · wouter · react-query · mock data (no live API)

This document is a single source of truth for every developer joining or resuming work on the portal. It covers what changed, what every data table means, every portal route, and every external endpoint the UI references.

---

## 1. Recent Changes Summary

### 1.1 Cosmetic Changes

| Area | Before | After |
|---|---|---|
| Wizard step content | Left-aligned | Centered (`max-w-2xl mx-auto`) on all three wizards (OIDC, SWA, API) |
| Step indicator bars | Left-aligned | Centered (`justify-center` on flex container) on all three wizards |
| SAML attribute column label | "Keycloak attribute" | "User attribute" |
| Workspace detail label | "Realm name" | "Identity domain" |
| Workspace card label | "Realm" | "Domain" |
| Workspace mode dropdown | "Isolated realm — dedicated Keycloak realm" | "Isolated — dedicated identity domain" |

### 1.2 Technology Obfuscation (Keycloak Removal)

All user-visible references to "Keycloak" have been replaced with neutral Foundry IAM language. Internal TypeScript field names (`ws.keycloak.issuer`, `keycloak_attribute`, etc.) are unchanged — they are not user-visible. The replacements by file:

| File | Old text | Replacement |
|---|---|---|
| `AppNew.tsx` | "provisions a Keycloak client" | "registers a client" |
| `AppNew.tsx` | "The Keycloak realm this client will be created in" | "The workspace this client will be registered in" |
| `AppNew.tsx` | "Keycloak enforces a code_challenge" | "The platform enforces a code_challenge" |
| `AppNew.tsx` | "Keycloak will only redirect to URIs listed here" | "Only registered redirect URIs are accepted" |
| `AppNew.tsx` | "The URL Keycloak sends the authorization code to" | "The URL Foundry IAM sends the authorization code to" |
| `AppNew.tsx` | "Where Keycloak redirects after the user signs out" | "Where Foundry IAM redirects after the user signs out" |
| `AppNew.tsx` | "A Keycloak client will be created" | "An app client will be registered" |
| `AppNewAPI.tsx` | "The Keycloak realm this confidential client will be created in" | "The workspace this service client will be registered in" |
| `AppNewAPI.tsx` | "A confidential Keycloak client will be created" | "A service client will be registered" |
| `Login.tsx` | "Add Keycloak-powered OIDC auth" | "Add enterprise OIDC auth" |
| `Signup.tsx` | "powered by Keycloak" | removed |
| `Signup.tsx` | "Dedicated Keycloak realm, zero shared infra" | "Dedicated identity domain, zero shared infra" |
| `Signup.tsx` | "A dedicated Keycloak realm will be provisioned" | "A dedicated identity workspace will be provisioned" |
| `IdPList.tsx` | "Keycloak brokers the identity" | "Foundry IAM brokers the identity" |
| `IdPDetail.tsx` | "Removes this IdP from the Keycloak realm" | "Removes this IdP from your workspace" |
| `SAMLNew.tsx` | "in your Keycloak realm" | "in your workspace" |
| `SAMLNew.tsx` | "Map Keycloak user attributes" | "Map user identity attributes" |
| `SAMLDetail.tsx` | "deleted from your Keycloak realm" | "removed from your workspace" |
| `SAMLTest.tsx` | "Keycloak Admin Console" (tool reference) | "Foundry IAM Admin Console" |
| `SCIMConfig.tsx` | "appear in Keycloak before day one" | "appear in Foundry IAM before day one" |
| `SCIMConfig.tsx` | "User is disabled in Keycloak" | "User is disabled in Foundry IAM" |
| `SCIMConfig.tsx` | "hard-deleted from Keycloak" | "hard-deleted from Foundry IAM" |
| `SCIMConfig.tsx` | "reflected in Keycloak automatically" | "reflected in Foundry IAM automatically" |
| `SCIMConfig.tsx` | "users in your Keycloak realm" | "users in your workspace" |
| `SCIMConfig.tsx` | "remain active in Keycloak" | "remain active in Foundry IAM" |
| `SCIMUsers.tsx` | "stored in Keycloak as" | "stored in Foundry IAM as" |
| `SCIMLogs.tsx` | "Keycloak connectivity issues" | "identity provider connectivity issues" |

### 1.3 Functional Changes

| Feature | Description |
|---|---|
| App creation routing fix | `AppNew.tsx` now reads `?type` query param and dispatches: `?type=swa` → `AppNewSWA`, `?type=api` → `AppNewAPI`, default → OIDC wizard. Previously all paths landed on the OIDC wizard. |
| SWA wizard (`AppNewSWA.tsx`) | New 3-step wizard: App Details → Login Form CSS selectors + shared-credentials toggle → Review & Create |
| API Services wizard (`AppNewAPI.tsx`) | New 3-step wizard: App Details → Scopes & token lifetime → Review & Create with one-time client_secret reveal + cURL snippet |
| Plan gating in new app modal | SAML shows "Requires Growth+" badge and disabled Next button for Starter plan tenants. `PLAN_RANK` and `METHOD_MIN_PLAN` constants in `AppsPage.tsx` control this. |
| Getting Started CTA fix | "Add App" button now routes to `/apps` (modal) instead of `/apps/new` (bypassed protocol picker) |
| Copy all endpoints | Workspace → Realm tab: button copies all 7 OIDC endpoints as an `.env` block to clipboard with 2s "Copied!" feedback |
| Download .env | Workspace → Realm tab: button triggers browser file download of the same `.env` block, named `{identity-domain}.env` |
| Integration Snippets — new languages | `AppDetail.tsx` now includes Java, Swift, C#, and PHP in addition to Node.js, Python, and Go. Each snippet is pre-populated with the app's live client_id, issuer, and jwks_uri. |

---

## 2. Portal Routes

All routes are defined in `artifacts/portal/src/App.tsx`.

### 2.1 Public Routes (no auth required)

| Path | Component | Purpose |
|---|---|---|
| `/login` | `Login` | Credential entry; mock auth always succeeds |
| `/signup` | `Signup` | New tenant registration form |
| `/verify-email` | `VerifyEmail` | Post-signup email confirmation screen |
| `/onboarding/survey` | `OnboardingSurvey` | Post-verify workspace/use-case survey |

### 2.2 Protected Routes (redirect to `/login` if unauthenticated)

| Path | Component | Data used | Purpose |
|---|---|---|---|
| `/` | `Dashboard` | `MOCK_USAGE`, `MOCK_APPS`, `MOCK_TENANT` | MAU chart, login counts, top-level health |
| `/getting-started` | `GettingStarted` | `MOCK_TENANT` | Onboarding checklist; "Add App" CTA → `/apps` |
| `/apps` | `AppsPage` | `MOCK_APPS`, `MOCK_WORKSPACES`, `MOCK_TENANT` | App list + New App modal with protocol picker |
| `/apps/new` | `AppNew` | `MOCK_WORKSPACES` | OIDC wizard (default / `?type=oidc`) |
| `/apps/new?type=swa` | `AppNewSWA` | `MOCK_WORKSPACES` | SWA credential-injection wizard |
| `/apps/new?type=api` | `AppNewAPI` | `MOCK_WORKSPACES` | API Services M2M wizard |
| `/apps/:appId` | `AppDetail` | `MOCK_APPS`, `MOCK_WORKSPACES`, `MOCK_AUDIT_LOGS` | App config, OIDC endpoints, integration snippets, audit history |
| `/workspaces` | `WorkspacesPage` | `MOCK_WORKSPACES` | Workspace list with realm summary cards |
| `/workspaces/:id` | `WorkspaceDetail` | `MOCK_WORKSPACES`, `MOCK_APPS`, `MOCK_ADMINS` | Apps tab · Team tab · Realm tab (endpoints + Copy/Download) |
| `/team` | `TeamPage` | `MOCK_ADMINS` | Invite management, role assignment |
| `/billing` | `BillingPage` | `MOCK_TENANT`, `MOCK_PLANS`, `MOCK_USAGE` | Plan comparison, usage bar, upgrade flow |
| `/audit-logs` | `AuditLogsPage` | `MOCK_AUDIT_LOGS` | Filterable event log (severity, resource type, date) |
| `/settings` | `SettingsPage` | `MOCK_TENANT` | Tenant name, MFA policy, danger zone |
| `/saml` | `SAMLList` | `MOCK_SAML_SPS` | All SAML service providers |
| `/saml/new` | `SAMLNew` | `MOCK_WORKSPACES` | Multi-step SAML SP registration wizard |
| `/saml/:sspId` | `SAMLDetail` | `MOCK_SAML_SPS` | SP config, attribute mappings, enable/disable/delete |
| `/saml/:sspId/test` | `SAMLTest` | `MOCK_SAML_SPS` | Simulated SAML assertion viewer, attribute table |
| `/scim` | `SCIMConfig` | `MOCK_SCIM_CONFIGS` | SCIM enable/disable, token generation, deprovision policy |
| `/scim/users` | `SCIMUsers` | `MOCK_SCIM_USERS` | Provisioned user list with sync status |
| `/scim/logs` | `SCIMLogs` | `MOCK_SCIM_LOGS` | SCIM operation log with error filtering |
| `/scim/setup-guide` | `SCIMSetup` | static | Step-by-step Okta/Azure AD setup instructions |
| `/identity-providers` | `IdPList` | `MOCK_IDENTITY_PROVIDERS` | Federated IdP list |
| `/identity-providers/new` | `IdPNew` | `MOCK_WORKSPACES` | New IdP wizard (Okta, Azure AD, Google, SAML, OIDC) |
| `/identity-providers/:id` | `IdPDetail` | `MOCK_IDENTITY_PROVIDERS` | IdP config, attribute mappers, enable/disable/delete |

---

## 3. Data Tables

All tables are mock-only at present. The structures below reflect what the real API must implement when the mock layer is replaced. Field names marked `[internal]` are not rendered to users.

### 3.1 `tenants`

**Purpose:** Top-level organisation record. One per customer. All workspaces, apps, admins, and billing belong to a tenant.

**Portal routes that read it:** `/`, `/billing`, `/settings`, `/getting-started`, `/apps` (plan gating)

```ts
{
  id:                     string   // "tnt_{ulid}" — primary key
  name:                   string   // Display name, e.g. "Acme Corp"
  slug:                   string   // URL-safe slug, e.g. "acme-corp"
  status:                 "active" | "suspended" | "cancelled"
  plan:                   "starter" | "growth" | "enterprise"
  region:                 string   // e.g. "us-east-1"
  mfa_policy:             "off" | "required-admins" | "required-all"
  stripe_customer_id:     string   // [internal] Billing reference
  stripe_subscription_id: string   // [internal] Billing reference
  created_at:             string   // ISO 8601
  created_by:             string   // Email of first owner
}
```

**Plan gating logic (`AppsPage.tsx`):**
```ts
const PLAN_RANK = { starter: 0, growth: 1, enterprise: 2 };
const METHOD_MIN_PLAN = { saml: "growth" };
// A method is blocked when PLAN_RANK[tenant.plan] < PLAN_RANK[METHOD_MIN_PLAN[method]]
```

---

### 3.2 `workspaces`

**Purpose:** Isolated identity domains within a tenant. Each workspace has its own OIDC issuer. A tenant on Starter has 1; Growth has 3; Enterprise unlimited.

**Portal routes that read it:** `/workspaces`, `/workspaces/:id`, `/apps/new`, `/apps/:appId`, `/saml/new`, `/scim`, `/identity-providers`

```ts
{
  id:           string   // "wsp_{ulid}"
  name:         string   // e.g. "Production"
  mode:         "isolated-realm" | "shared-realm"
  status:       "active" | "inactive"
  is_default:   boolean
  tenant_id:    string   // FK → tenants.id
  keycloak: {            // [internal] — not shown to users by that name
    realm:      string   // Identity domain identifier
    issuer:     string   // Base OIDC issuer URL
    jwks_uri:   string   // JSON Web Key Set URL
    well_known: string   // OIDC discovery document URL
  }
  created_at:   string
  created_by:   string
  mau:          number   // Monthly active users (denormalised counter)
  app_count:    number   // Denormalised counter
  admin_count:  number   // Denormalised counter
}
```

**Derived OIDC endpoints (not stored separately — computed from `issuer`):**

| Label | Formula |
|---|---|
| Auth endpoint | `{issuer}/protocol/openid-connect/auth` |
| Token endpoint | `{issuer}/protocol/openid-connect/token` |
| Logout endpoint | `{issuer}/protocol/openid-connect/logout` |
| Userinfo endpoint | `{issuer}/protocol/openid-connect/userinfo` |
| JWKS URI | `{issuer}/protocol/openid-connect/certs` |
| Well-known | `{issuer}/.well-known/openid-configuration` |
| SAML metadata | `{issuer}/protocol/saml/descriptor` |

---

### 3.3 `apps` (OIDC clients)

**Purpose:** Represents an OIDC client registered in a workspace. Supports three sub-types: OIDC (web/mobile), SWA (browser-plugin credential injection), and API Services (M2M / client_credentials).

**Portal routes that read it:** `/apps`, `/apps/:appId`, `/workspaces/:id`

```ts
{
  id:                       string   // "app_{ulid}" — also used as client_id
  workspace_id:             string   // FK → workspaces.id
  workspace_name:           string   // Denormalised display name
  name:                     string   // Human name, e.g. "Acme Dashboard"
  status:                   "active" | "error" | "provisioning" | "disabled"
  error_reason?:            string   // Human-readable error description (error status only)
  error_since?:             string   // ISO 8601 (error status only)
  type:                     "public" | "confidential"
  pkce:                     "required" | "optional" | "none"
  scopes:                   string[]
  redirect_uris:            string[]
  post_logout_redirect_uris:string[]
  web_origins:              string[]
  access_token_seconds:     number
  refresh_token_seconds:    number
  oidc: {
    client_id:              string   // Same as apps.id
    issuer:                 string
    authorization_endpoint: string
    token_endpoint:         string
    jwks_uri:               string
  }
  created_at:               string
  created_by:               string
  last_login_at:            string | null
  logins_30d:               number
  active_sessions:          number
}
```

**App type routing (query param `?type` on `/apps/new`):**

| `?type` | Wizard | Use case |
|---|---|---|
| *(omitted)* or `oidc` | `AppNew` (OIDC wizard) | Web apps, SPAs, mobile — authorization_code + PKCE |
| `swa` | `AppNewSWA` | Legacy web apps — browser plugin injects stored credentials |
| `api` | `AppNewAPI` | Backend services, daemons — client_credentials grant |

---

### 3.4 `admins`

**Purpose:** Portal users. Each admin belongs to a workspace and holds one role. Does not represent end-users of the OIDC apps — only people who log into this management portal.

**Portal routes that read it:** `/team`, `/workspaces/:id` (Team tab)

```ts
{
  id:               string   // "adm_{ulid}"
  workspace_id:     string   // FK → workspaces.id
  email:            string
  full_name:        string
  role:             "owner" | "admin" | "billing" | "viewer"
  status:           "active" | "invited" | "disabled"
  created_at:       string
  invited_by:       string | null   // Email of inviting admin
  invite_expires_at:string | null   // ISO 8601; null once accepted
}
```

**Role capabilities:**

| Role | Manage apps | Manage team | Access billing | Read-only |
|---|---|---|---|---|
| `owner` | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | — | ✓ |
| `billing` | — | — | ✓ | ✓ |
| `viewer` | — | — | — | ✓ |

---

### 3.5 `audit_logs`

**Purpose:** Immutable event trail for every write action taken in the portal. Retained per plan (30 days on Starter, 1 year on Growth, unlimited on Enterprise).

**Portal routes that read it:** `/audit-logs`, `/apps/:appId` (recent events panel)

```ts
{
  id:             number
  action:         string   // e.g. "app.created", "admin.invited", "saml.sp-registered"
  resource_type:  "app" | "admin" | "tenant" | "workspace" | "saml_sp"
  resource_id:    string   // ID of the affected record
  actor_email:    string
  new_state:      string | null
  previous_state: string | null
  created_at:     string   // ISO 8601
  ip_address:     string
  source_screen:  string   // Portal path that triggered the event
  severity:       "info" | "medium" | "high"
}
```

**Known `action` values:**

| Action | Severity | Trigger |
|---|---|---|
| `app.created` | info | New app registered |
| `app.secret-rotated` | medium | Client secret rotated |
| `admin.invited` | info | Team member invited |
| `tenant.updated` | info | Settings changed |
| `workspace.created` | info | New workspace provisioned |
| `saml.sp-registered` | info | SAML SP added |
| `saml.sp-disabled` | medium | SAML SP disabled |
| `support.access-enabled` | high | Break-glass support access granted |

---

### 3.6 `usage`

**Purpose:** Aggregated tenant-level usage metrics. Used on the Dashboard and Billing page.

**Portal routes that read it:** `/`, `/billing`

```ts
{
  mau:                 number   // Current month active users
  mau_limit:           number   // Plan ceiling
  mau_pct:             number   // mau / mau_limit * 100
  logins_30d:          number
  token_refreshes_30d: number
  monthly_trend: Array<{
    month: string   // e.g. "Oct"
    mau:   number
  }>
}
```

---

### 3.7 `saml_service_providers`

**Purpose:** SAML 2.0 Service Provider registrations. Each SP trusts signed XML assertions issued by the Foundry IAM identity domain of its workspace.

**Portal routes that read it:** `/saml`, `/saml/:sspId`, `/saml/:sspId/test`

```ts
{
  id:               string   // "ssp_{ulid}"
  workspace_id:     string   // FK → workspaces.id
  workspace_name:   string
  name:             string   // e.g. "Salesforce Production"
  entity_id:        string   // SP Entity ID (URI)
  acs_url:          string   // Assertion Consumer Service URL
  slo_url:          string | null   // Single Logout URL (optional)
  name_id_format:   "email" | "persistent" | "transient" | "unspecified"
  sign_assertions:  boolean
  encrypt_assertions:boolean
  status:           "active" | "disabled"
  last_sso_at:      string | null
  sso_count_30d:    number
  created_at:       string
  created_by:       string
  idp_metadata_url: string   // Foundry IAM SAML descriptor URL for this workspace
  attribute_mappings: Array<{
    keycloak_attribute:   string   // [internal field name] User identity attribute source
    saml_attribute_name:  string   // Attribute name sent in the SAML assertion
    saml_attribute_format:"Basic" | "URI"
    required:             boolean
  }>
}
```

**Note on UI label:** The `keycloak_attribute` field is labelled **"User attribute"** in the portal UI (SAMLNew and SAMLDetail pages) to avoid technology exposure.

**Common user attribute values:**

| Field value | Maps to |
|---|---|
| `email` | User's email address |
| `firstName` | Given name |
| `lastName` | Family / surname |
| `realm_roles` | Assigned roles (sent as multi-value) |

**IdP Metadata URL pattern:**
```
https://id.foundry-iam.dev/realms/{workspace.keycloak.realm}/protocol/saml/descriptor
```

---

### 3.8 `scim_configs`

**Purpose:** SCIM 2.0 provisioning configuration per workspace. One config per workspace. Controls whether an external IdP (e.g. Okta, Azure AD) can push user and group changes.

**Portal routes that read it:** `/scim`, `/scim/users`, `/scim/logs`

```ts
{
  id:                  string   // "scimcfg_{id}"
  workspace_id:        string   // FK → workspaces.id
  workspace_name:      string
  enabled:             boolean
  token_prefix:        string   // Prefix on the bearer token ("scim_live" when enabled)
  base_url:            string   // SCIM base URL for this workspace
  allowed_operations:  string[] // ["CREATE","UPDATE","DISABLE"] or includes "DELETE"
  sync_groups:         boolean
  deprovision_action:  "disable" | "delete"
  last_sync_at:        string | null
  sync_error_count:    number
  idp_hint:            string   // e.g. "Okta" — informational only
  created_at:          string
  created_by:          string
}
```

**SCIM base URL pattern:**
```
https://api.foundry-iam.dev/scim/v2/{workspace_id}
```

**SCIM endpoints (relative to base URL):**

| Method | Path | Operation |
|---|---|---|
| `POST` | `/Users` | Create user |
| `GET` | `/Users` | List users |
| `GET` | `/Users/{id}` | Get user |
| `PUT` | `/Users/{id}` | Replace user |
| `PATCH` | `/Users/{id}` | Update / disable user |
| `DELETE` | `/Users/{id}` | Delete user (if `DELETE` in `allowed_operations`) |
| `GET` | `/Groups` | List groups |
| `POST` | `/Groups` | Create group |
| `PATCH` | `/Groups/{id}` | Update group membership |
| `GET` | `/ServiceProviderConfig` | SCIM capabilities document |

---

### 3.9 `scim_users`

**Purpose:** Users provisioned via SCIM. These are end-users of the tenant's apps, not portal admins. Each record links the IdP's external ID to the internal user record in the identity platform.

**Portal routes that read it:** `/scim/users`

```ts
{
  id:                string   // "scusr_{ulid}"
  workspace_id:      string   // FK → workspaces.id
  keycloak_user_id:  string   // [internal] Platform user UUID
  external_id:       string   // IdP's own user ID, e.g. "okta-user-00Abc123"
                               // Stored as attributes.scim_external_id
  username:          string   // Usually email
  display_name:      string
  active:            boolean
  last_synced_at:    string
  created_at:        string
  groups:            string[]
}
```

**Matching logic:** On every SCIM `PUT`/`PATCH`, the platform looks up the user by `external_id` → `attributes.scim_external_id`. The `scim_users` table owns the ID mapping. The identity platform record is never queried directly by SCIM record ID.

---

### 3.10 `scim_logs`

**Purpose:** Operation-level log for every SCIM call. Used to diagnose provisioning failures.

**Portal routes that read it:** `/scim/logs`

```ts
{
  id:               string   // "sclog_{id}"
  workspace_id:     string   // FK → workspaces.id
  operation:        "CREATE" | "UPDATE" | "DISABLE" | "DELETE" | "UPDATE_GROUP"
  resource_type:    "User" | "Group"
  resource_display: string   // Human-readable identifier (email / group name)
  status:           "success" | "error"
  error_detail:     string | null
  http_status:      number   // HTTP status code returned to the IdP
  created_at:       string
  external_id:      string   // IdP's external ID for the affected resource
}
```

**Common error patterns:**

| HTTP status | Cause |
|---|---|
| 409 | Duplicate provisioning — user already exists |
| 503 | Identity provider connectivity timeout |
| 400 | Malformed SCIM payload from IdP |
| 401 | Bearer token invalid or expired |

---

### 3.11 `identity_providers`

**Purpose:** Federated IdP connections. Foundry IAM brokers the identity — apps always receive Foundry IAM tokens, never upstream IdP tokens.

**Portal routes that read it:** `/identity-providers`, `/identity-providers/:id`

```ts
{
  id:               string   // "idp_{ulid}"
  workspace_id:     string   // FK → workspaces.id
  workspace_name:   string
  alias:            string   // URL-safe, used in callback URL
  display_name:     string   // Shown on the login page button
  type:             "okta" | "azure" | "google" | "saml" | "oidc"
  enabled:          boolean
  hide_on_login_page:boolean
  domain_hints:     string[] // Email domain hints for auto-redirect
  sync_mode:        "inherit" | "force"
  callback_url:     string   // Broker callback URL for this IdP
  attribute_mappers: Array<{
    id:              string
    upstream_claim:  string   // Claim name from the upstream IdP token
    user_attribute:  string   // Target user attribute in Foundry IAM
    sync_mode:       "inherit" | "force"
  }>
  login_count_30d:  number
  last_login_at:    string | null
  created_at:       string
  created_by:       string
}
```

**Callback URL pattern:**
```
https://id.foundry-iam.dev/realms/{workspace.keycloak.realm}/broker/{alias}/endpoint
```

---

### 3.12 `plans`

**Purpose:** Available subscription tiers. Controls feature gating throughout the portal. Checked at runtime against `MOCK_TENANT.plan`.

**Portal routes that read it:** `/billing`, `/apps` (plan gating in new app modal)

```ts
{
  id:            "starter" | "growth" | "enterprise"
  name:          string
  monthly_fee:   number   // USD
  mau_included:  number   // -1 = unlimited
  overage_rate:  number   // USD per MAU over limit
  workspaces:    number | "unlimited"
  sla:           string   // e.g. "99.9%"
  features:      string[] // Marketing bullet list
}
```

**Current plan gating rules:**

| Feature | Starter | Growth | Enterprise |
|---|---|---|---|
| OIDC apps | ✓ | ✓ | ✓ |
| SWA apps | ✓ | ✓ | ✓ |
| API Services (M2M) | ✓ | ✓ | ✓ |
| SAML SPs | — | ✓ | ✓ |
| Max workspaces | 1 | 3 | Unlimited |
| Audit log retention | 30 days | 1 year | Unlimited |

**To test plan gating:** Change `MOCK_TENANT.plan` in `src/lib/mockData.ts` to `"starter"` — the SAML tile in the New App modal will show the "Requires Growth+" lock badge and disable the Next button.

---

## 4. OIDC Endpoint Reference

All endpoints are derived from the workspace `issuer`. The issuer follows the pattern:

```
https://id.foundry-iam.dev/realms/{realm}
```

Where `{realm}` equals `workspace.keycloak.realm` (the identity domain identifier).

| Name | URL pattern | Used by |
|---|---|---|
| OIDC Discovery | `{issuer}/.well-known/openid-configuration` | All OIDC libraries, C# `Authority` |
| Authorization | `{issuer}/protocol/openid-connect/auth` | Login redirect |
| Token | `{issuer}/protocol/openid-connect/token` | Code exchange, client_credentials |
| JWKS | `{issuer}/protocol/openid-connect/certs` | JWT validation (all language snippets) |
| Userinfo | `{issuer}/protocol/openid-connect/userinfo` | Profile data fetch post-login |
| Logout | `{issuer}/protocol/openid-connect/logout` | RP-initiated logout |
| SAML Metadata | `{issuer}/protocol/saml/descriptor` | SAML SP setup — give this URL to the SP |
| SCIM Base | `https://api.foundry-iam.dev/scim/v2/{workspace_id}` | IdP provisioning config |

---

## 5. Integration Snippet Languages

The App Detail page (`/apps/:appId`) provides copy-ready JWT validation snippets. Each snippet is pre-populated with the app's real `client_id`, `issuer`, and `jwks_uri`.

| Language | Runtime target | Validation method | Library / package |
|---|---|---|---|
| Node.js | Express (web/API backend) | `expressjwt` + JWKS auto-fetch | `express-jwt`, `jwks-rsa` |
| Python | FastAPI | Manual JWT decode | `python-jose`, `httpx` |
| Go | Standard `net/http` | JWX v2 | `github.com/lestrrat-go/jwx/v2` |
| Java | Spring Boot / Android backend | Servlet filter + JJWT JWKS resolver | `io.jsonwebtoken:jjwt` |
| Swift | iOS (token validation after AppAuth) | `URLSession` + RS256 claim check | `AppAuth-iOS` (for flow); `JWTDecode.swift` recommended for sig |
| C# | ASP.NET Core / Xamarin backend | `AddJwtBearer` with OIDC auto-discovery | `Microsoft.AspNetCore.Authentication.JwtBearer` |
| PHP | Laravel / legacy PHP backends | `JWT::decode` + `JWK::parseKeySet` | `firebase/php-jwt` |

---

## 6. File Structure Reference

```
artifacts/portal/src/
├── App.tsx                     — Route table (all 30 routes)
├── lib/
│   ├── mockData.ts             — All mock data (replace with API calls)
│   └── auth.tsx                — AuthProvider + useAuth hook (mock auth)
├── components/
│   ├── Layout.tsx              — Shell: sidebar nav + breadcrumbs + page title
│   ├── CopyButton.tsx          — Clipboard copy with 2s "Copied!" feedback
│   ├── CodeBlock.tsx           — Syntax-highlighted code with copy button
│   ├── StatusBadge.tsx         — Pill badge for status/type/role values
│   ├── StepIndicator.tsx       — (internal to each wizard) — progress steps
│   └── DetailNav.tsx           — Prev/Next chevron navigation for detail pages
└── pages/
    ├── AppNew.tsx              — Protocol router + OIDC 4-step wizard
    ├── AppNewSWA.tsx           — SWA 3-step wizard
    ├── AppNewAPI.tsx           — API Services M2M 3-step wizard
    ├── AppDetail.tsx           — App config + integration snippets (7 languages)
    ├── AppsPage.tsx            — App list + New App modal (plan-gated)
    ├── WorkspaceDetail.tsx     — Workspace tabs: Apps · Team · Realm
    ├── WorkspacesPage.tsx      — Workspace list
    ├── SAMLNew.tsx             — SAML SP registration wizard
    ├── SAMLDetail.tsx          — SP config + attribute mappings
    ├── SAMLTest.tsx            — SAML assertion simulator
    ├── SAMLList.tsx            — SP list
    ├── SCIMConfig.tsx          — SCIM enable/config/token
    ├── SCIMUsers.tsx           — Provisioned users
    ├── SCIMLogs.tsx            — SCIM operation log
    ├── SCIMSetup.tsx           — Setup guide (static)
    ├── IdPList.tsx             — Federated IdP list
    ├── IdPNew.tsx              — New IdP wizard
    ├── IdPDetail.tsx           — IdP config + attribute mappers
    ├── TeamPage.tsx            — Admin invite/role management
    ├── BillingPage.tsx         — Plan comparison + usage
    ├── AuditLogsPage.tsx       — Filterable audit trail
    ├── SettingsPage.tsx        — Tenant settings + danger zone
    ├── Dashboard.tsx           — MAU chart + health summary
    ├── GettingStarted.tsx      — Onboarding checklist
    ├── Login.tsx               — Login form (mock auth)
    ├── Signup.tsx              — Signup form
    ├── VerifyEmail.tsx         — Email verification screen
    └── OnboardingSurvey.tsx    — Post-signup survey
```

---

## 7. Development Notes

### Replacing mock data with a real API

Every page imports directly from `src/lib/mockData.ts`. The swap path is:

1. Create `src/lib/api.ts` — typed fetch wrappers for each resource
2. Replace `MOCK_*` imports in each page with `useQuery` hooks calling `api.ts`
3. The `react-query` client is already configured in `App.tsx` (`staleTime: 30s, retry: 1`)

### Technology confidentiality

The identity platform internals are intentionally hidden from the UI. When writing new UI copy, follow these substitution rules:

| Avoid | Use instead |
|---|---|
| "realm" (in isolation) | "workspace" or "identity domain" |
| Any vendor product name | "Foundry IAM" or "the platform" |
| Internal field paths | Generic descriptions |

Internal TypeScript field names (`ws.keycloak.issuer`, `keycloak_attribute`, etc.) are acceptable in code since they are never rendered to users.

### Plan gating for new protocol types

To add a new gated protocol in the New App modal, edit `AppsPage.tsx`:

```ts
const METHOD_MIN_PLAN: Record<string, PlanId> = {
  saml:     "growth",
  myProto:  "enterprise",   // ← add here
};
```

### Build

```bash
pnpm --filter @workspace/portal run build
# Output: dist/public/  (index.html + hashed assets)
# Bundle: ~1 MB JS / ~265 KB gzip
# Warning: single chunk > 500 KB — acceptable for now; fix with dynamic import() if needed
```

### TypeScript check

```bash
pnpm --filter @workspace/portal exec tsc --noEmit
# Must exit 0 before any commit
```
