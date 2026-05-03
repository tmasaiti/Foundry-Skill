import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { CopyButton } from "@/components/CopyButton";
import { MOCK_SCIM_CONFIGS } from "@/lib/mockData";
import { BookOpen, CheckCircle2, ChevronRight, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const PROD_CFG = MOCK_SCIM_CONFIGS[0];

type IdpKey = "okta" | "azure" | "google" | "onelogin" | "generic";

interface IdpGuide {
  name: string;
  logo: string;
  tenantUrlLabel: string;
  tokenLabel: string;
  steps: string[];
  note?: string;
}

const GUIDES: Record<IdpKey, IdpGuide> = {
  okta: {
    name: "Okta",
    logo: "O",
    tenantUrlLabel: "SCIM connector base URL",
    tokenLabel: "API Token (Bearer)",
    steps: [
      "In Okta Admin: Applications → Applications → locate your Foundry IAM app → Provisioning tab.",
      "Click 'Configure API Integration'. Enable 'Enable API integration'.",
      "Set 'SCIM connector base URL' to the Base URL below. Set 'API Token' to your Bearer token.",
      "Click 'Test API Credentials' — it should return a green success message.",
      "Click Save. Under 'To App', enable: Create Users, Update User Attributes, Deactivate Users.",
      "Under 'To Okta', leave disabled (Foundry IAM is the downstream system, not the source of truth for Okta).",
      "Assign users or groups to the app. Okta will immediately push them to Foundry IAM via SCIM.",
    ],
    note: "Okta calls GET /Users?filter=userName+eq+... before every CREATE to check for existing users. Ensure your Base URL is accessible from Okta's servers.",
  },
  azure: {
    name: "Microsoft Entra ID (Azure AD)",
    logo: "Az",
    tenantUrlLabel: "Tenant URL",
    tokenLabel: "Secret Token",
    steps: [
      "In Azure Portal: Microsoft Entra ID → Enterprise Applications → select your Foundry IAM app.",
      "Click 'Provisioning' in the left menu. Set Provisioning Mode to 'Automatic'.",
      "Under 'Admin Credentials': set Tenant URL to the Base URL below. Set Secret Token to your Bearer token.",
      "Click 'Test Connection' — Azure will validate the token against GET /ServiceProviderConfig.",
      "Click Save. Expand 'Mappings' and verify User and Group attribute mappings.",
      "Set Provisioning Status to 'On'. Azure will begin an initial sync cycle.",
      "Monitor under 'Provisioning logs' in Azure to confirm users are being provisioned.",
    ],
    note: "Azure AD performs a full sync on the first cycle, then incremental syncs every ~40 minutes. Large directories may take several hours for the initial sync.",
  },
  google: {
    name: "Google Workspace",
    logo: "G",
    tenantUrlLabel: "SCIM URL",
    tokenLabel: "Bearer Token",
    steps: [
      "In Google Admin Console: Apps → Web and mobile apps → locate your Foundry IAM SAML app.",
      "Click 'Auto-provisioning'. If not visible, the app must first have SAML SSO configured.",
      "Enable auto-provisioning. Set SCIM URL to the Base URL below.",
      "Set the authentication token to your Bearer token.",
      "Under Attribute Mapping, map Google Directory attributes to SCIM attributes (email → userName, givenName → name.givenName, familyName → name.familyName).",
      "Click Save. Google will begin provisioning assigned users on the next sync cycle.",
    ],
    note: "Google Workspace's SCIM implementation requires the app to have SAML SSO configured first. Users must be assigned to the app before they are provisioned.",
  },
  onelogin: {
    name: "OneLogin",
    logo: "1L",
    tenantUrlLabel: "SCIM Base URL",
    tokenLabel: "SCIM Bearer Token",
    steps: [
      "In OneLogin Administration: Applications → Applications → select your Foundry IAM app.",
      "Click the 'Provisioning' tab. Enable 'Enable provisioning'.",
      "Under 'API Connection', set SCIM Base URL to the Base URL below. Set Bearer Token to your token.",
      "Click 'Save'. Under 'Entitlements', verify CREATE, UPDATE, and DELETE operations are permitted.",
      "Under 'Parameters', confirm attribute mappings: Email → userName, First Name → name.givenName, Last Name → name.familyName.",
      "Assign users or roles to the app. OneLogin will push them to Foundry IAM via SCIM.",
    ],
    note: "OneLogin sends a test request to GET /ServiceProviderConfig when you save. If this fails, verify network connectivity between OneLogin and your Foundry IAM SCIM endpoint.",
  },
  generic: {
    name: "Generic SCIM 2.0",
    logo: "⚙",
    tenantUrlLabel: "Base URL",
    tokenLabel: "Bearer Token",
    steps: [
      "In your IdP's SCIM connector settings, locate the 'Endpoint URL' or 'Base URL' field.",
      "Set Base URL to the value below. Ensure your IdP appends /Users and /Groups to this URL automatically.",
      "Set authentication to 'Bearer Token' and paste your token. Do not prefix the token — Foundry IAM expects the raw token value.",
      "Test the connection by having your IdP call GET {Base URL}/ServiceProviderConfig — it should return a JSON capabilities document.",
      "Enable the operations your IdP supports: Create Users, Update Users, Deactivate Users, Sync Groups.",
      "Confirm filter support: Foundry IAM supports filter=userName eq, filter=externalId eq, and filter=emails.value eq.",
      "Run a test provisioning for a single user and verify they appear in the Provisioned Users page.",
    ],
    note: "Foundry IAM does not support SCIM Bulk operations. Each user create/update must be sent as an individual request. Pagination uses startIndex + count (1-based index).",
  },
};

const IDP_ORDER: IdpKey[] = ["okta", "azure", "google", "onelogin", "generic"];

export default function SCIMSetup() {
  const [selectedIdp, setSelectedIdp] = useState<IdpKey>("okta");
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const guide = GUIDES[selectedIdp];

  function toggleStep(i: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const allDone = guide.steps.every((_, i) => checkedSteps.has(i));

  return (
    <Layout
      breadcrumbs={[{ label: "SCIM", href: "/scim" }, { label: "Setup Guide" }]}
      title="SCIM Setup Guide"
    >
      {/* Q1: What am I looking at? */}
      <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
        <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Connect Your Identity Provider to Foundry IAM via SCIM 2.0</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step-by-step instructions for each major IdP. Complete the steps in order — incorrect setup is the #1 source of SCIM support tickets.
            You need your SCIM Base URL and Bearer token from the <Link href="/scim" className="text-primary underline">SCIM configuration page</Link> before starting.
          </p>
        </div>
      </div>

      {/* Values to copy — get these first */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 mb-5">
        <p className="text-sm font-semibold text-indigo-900 mb-3">Get These Values First</p>
        <p className="text-xs text-indigo-700 mb-3">
          You'll paste these into your IdP. Go to <Link href="/scim" className="underline">SCIM Configuration</Link> to enable SCIM and retrieve your Bearer token before continuing.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-indigo-800 mb-1">{guide.tenantUrlLabel} (Base URL)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-mono text-foreground overflow-x-auto">
                {PROD_CFG.base_url}
              </code>
              <CopyButton text={PROD_CFG.base_url} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-indigo-800 mb-1">{guide.tokenLabel}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-mono text-muted-foreground">
                {PROD_CFG.enabled ? `${PROD_CFG.token_prefix}••••••••••••••••••••••••••` : "Enable SCIM first to generate a Bearer token"}
              </code>
              {!PROD_CFG.enabled && (
                <Link href="/scim">
                  <button className="shrink-0 rounded-lg border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Enable →</button>
                </Link>
              )}
            </div>
            {PROD_CFG.enabled && (
              <p className="text-xs text-indigo-700 mt-1">Your token was shown once at creation. If you don't have it, rotate the token to generate a new one.</p>
            )}
          </div>
        </div>
      </div>

      {/* IdP selector */}
      <div className="mb-5">
        <p className="text-sm font-medium text-foreground mb-3">Select Your Identity Provider</p>
        <div className="flex flex-wrap gap-2">
          {IDP_ORDER.map((key) => (
            <button
              key={key}
              onClick={() => { setSelectedIdp(key); setCheckedSteps(new Set()); }}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                selectedIdp === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold bg-muted">{GUIDES[key].logo}</span>
              {GUIDES[key].name}
              {selectedIdp === key && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Step-by-step guide */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="text-base font-semibold text-foreground mb-1">
          {guide.name} — Setup Instructions
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          Check each step as you complete it. All steps must be done in order for provisioning to work correctly.
        </p>

        {/* Q4/Q5: Steps with consequence-first clarity */}
        <div className="space-y-3">
          {guide.steps.map((step, i) => {
            const done = checkedSteps.has(i);
            return (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <div className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done ? "border-emerald-500 bg-emerald-500" : "border-border group-hover:border-primary/50"
                )}>
                  {done && <CheckCircle2 className="h-3 w-3 text-white" />}
                  <input type="checkbox" checked={done} onChange={() => toggleStep(i)} className="sr-only" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-xs font-bold text-muted-foreground mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className={cn("text-sm", done ? "line-through text-muted-foreground" : "text-foreground")}>
                      {step}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* IdP-specific note (§2: business rules visible) */}
        {guide.note && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{guide.note}</p>
          </div>
        )}

        {/* Completion */}
        {allDone && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">All steps complete</p>
              <p className="text-xs text-emerald-700">
                Verify provisioning is working by checking the{" "}
                <Link href="/scim/users" className="underline">Provisioned Users</Link> page — new users should appear within the next sync cycle.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Testing recommendation */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Verify Your Integration</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>After completing setup, validate the integration works before assigning production users:</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs">
            <li>In your IdP, assign a single test user to the Foundry IAM SCIM app.</li>
            <li>Trigger a manual sync (Okta: Push → Push Now; Azure: Provision on demand).</li>
            <li>Check <Link href="/scim/users" className="text-primary underline">Provisioned Users</Link> — the user should appear with status Active.</li>
            <li>Check <Link href="/scim/logs" className="text-primary underline">Operation Log</Link> — confirm a CREATE success entry.</li>
            <li>Test that the user can log in to an app in this workspace using their IdP credentials.</li>
          </ol>
        </div>
      </div>

      {/* Reference links */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">External References</p>
        <div className="space-y-1">
          {[
            { label: "RFC 7643 — SCIM Core Schema", href: "https://datatracker.ietf.org/doc/html/rfc7643" },
            { label: "RFC 7644 — SCIM Protocol", href: "https://datatracker.ietf.org/doc/html/rfc7644" },
            { label: "Okta SCIM provisioning guide", href: "https://developer.okta.com/docs/guides/scim-provisioning-integration-overview/" },
            { label: "Azure AD SCIM provisioning", href: "https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups" },
          ].map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> {label}
            </a>
          ))}
        </div>
      </div>
    </Layout>
  );
}
