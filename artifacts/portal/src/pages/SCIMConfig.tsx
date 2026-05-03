import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { CopyButton } from "@/components/CopyButton";
import { MOCK_SCIM_CONFIGS, MOCK_WORKSPACES } from "@/lib/mockData";
import {
  RefreshCcw, AlertTriangle, CheckCircle2, Users, BookOpen,
  ShieldCheck, Eye, EyeOff, RotateCcw, Trash2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ALL_OPS = ["CREATE", "UPDATE", "DISABLE", "DELETE"] as const;
type Op = typeof ALL_OPS[number];

export default function SCIMConfig() {
  const [wsId, setWsId] = useState(MOCK_WORKSPACES[0].id);
  const cfg = MOCK_SCIM_CONFIGS.find((c) => c.workspace_id === wsId) ?? MOCK_SCIM_CONFIGS[0];

  // Enable modal state
  const [enableModal, setEnableModal] = useState(false);
  const [enableConfirmed, setEnableConfirmed] = useState(false);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [tokenSavedConfirmed, setTokenSavedConfirmed] = useState(false);
  const DEMO_TOKEN = "scim_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";

  // Rotate token modal
  const [rotateModal, setRotateModal] = useState(false);
  const [rotateConfirmed, setRotateConfirmed] = useState(false);
  const [rotateTokenSaved, setRotateTokenSaved] = useState(false);

  // Disable modal
  const [disableModal, setDisableModal] = useState(false);

  // Settings (local simulation)
  const [deprovision, setDeprovision] = useState<"disable" | "delete">(cfg.deprovision_action);
  const [syncGroups, setSyncGroups] = useState(cfg.sync_groups);
  const [allowedOps, setAllowedOps] = useState<Set<string>>(new Set(cfg.allowed_operations));
  const [settingsSaved, setSettingsSaved] = useState(false);

  function handleSaveSettings() {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  }

  function toggleOp(op: string) {
    setAllowedOps((prev) => {
      const next = new Set(prev);
      next.has(op) ? next.delete(op) : next.add(op);
      return next;
    });
  }

  return (
    <Layout
      breadcrumbs={[{ label: "SCIM" }]}
      title="SCIM Provisioning"
      actions={
        <Link href="/scim/users">
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Users className="h-4 w-4" /> Provisioned Users
          </button>
        </Link>
      }
    >
      {/* Q1: What am I looking at? */}
      <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
        <RefreshCcw className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">SCIM 2.0 Automated Provisioning</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect Okta, Azure AD, or any SCIM 2.0 IdP to automatically sync users and groups into Foundry IAM.
            New hires appear in Keycloak before day one; terminated users are disabled within minutes of offboarding.
            Enterprise compliance (SOC 2, ISO 27001) requires this — manual invites fail audits at scale.
          </p>
        </div>
      </div>

      {/* Workspace selector */}
      <div className="mb-5 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Workspace:</span>
        <div className="flex gap-1.5">
          {MOCK_WORKSPACES.map((ws) => (
            <button
              key={ws.id}
              onClick={() => { setWsId(ws.id); setDeprovision(MOCK_SCIM_CONFIGS.find(c=>c.workspace_id===ws.id)?.deprovision_action ?? "disable"); setSyncGroups(MOCK_SCIM_CONFIGS.find(c=>c.workspace_id===ws.id)?.sync_groups ?? true); setAllowedOps(new Set(MOCK_SCIM_CONFIGS.find(c=>c.workspace_id===ws.id)?.allowed_operations ?? ALL_OPS)); }}
              className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                wsId === ws.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >{ws.name}</button>
          ))}
        </div>
      </div>

      {/* Q3: What matters most? — Sync errors are operational exceptions (§3D) */}
      {cfg.enabled && cfg.sync_error_count > 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {cfg.sync_error_count} consecutive sync error{cfg.sync_error_count > 1 ? "s" : ""} — users may not be provisioning correctly
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              The last {cfg.sync_error_count} SCIM operation{cfg.sync_error_count > 1 ? "s" : ""} from your IdP returned errors.
              If unresolved, new employees will not have access and terminated users will not be deprovisioned.
            </p>
          </div>
          <Link href="/scim/logs">
            <button className="shrink-0 rounded-lg border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200 transition-colors">
              View Logs →
            </button>
          </Link>
        </div>
      )}

      {/* Q2: What state is it in? */}
      {cfg.enabled ? (
        <>
          {/* Enabled header */}
          <div className="rounded-xl border border-border bg-card p-5 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                  {cfg.idp_hint && (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {cfg.idp_hint}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold text-foreground">{cfg.workspace_name} — SCIM Provisioning Active</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last sync: {fmtDate(cfg.last_sync_at)}
                  {" · "}Enabled by sarah@acme.com on Sep 15, 2024
                </p>
              </div>
              {/* Q4: What can I do? — Danger action placed deliberately (§3B) */}
              <button
                onClick={() => setDisableModal(true)}
                className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                Disable SCIM
              </button>
            </div>

            {/* SCIM Endpoint info */}
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">SCIM Base URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-foreground overflow-x-auto">
                    {cfg.base_url}
                  </code>
                  <CopyButton text={cfg.base_url} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Bearer Token</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-muted-foreground overflow-x-auto">
                    {cfg.token_prefix}••••••••••••••••••••••••••
                  </code>
                  <button
                    onClick={() => setRotateModal(true)}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Rotate
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Token is stored hashed — the full value is never displayed again. Rotate to generate a new one.</p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Provisioned Users</p>
                <p className="text-lg font-semibold text-foreground mt-0.5">5</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Sync</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{fmtDate(cfg.last_sync_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sync Errors</p>
                <p className={cn("text-lg font-semibold mt-0.5", cfg.sync_error_count > 0 ? "text-amber-600" : "text-foreground")}>
                  {cfg.sync_error_count}
                </p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-border bg-card p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Provisioning Settings</h3>
            <p className="text-xs text-muted-foreground mb-4">Changes take effect on the next sync cycle from your IdP.</p>

            <div className="space-y-5">
              {/* Deprovision action — §2: business rules visible before commit */}
              <div>
                <p className="text-sm font-medium text-foreground mb-1">When a user is deleted in your IdP</p>
                <p className="text-xs text-muted-foreground mb-2">Controls what Foundry IAM does when it receives a SCIM DELETE for a user.</p>
                <div className="flex gap-3">
                  <label className={cn("flex-1 flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors", deprovision === "disable" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20")}>
                    <input type="radio" name="deprov" value="disable" checked={deprovision === "disable"} onChange={() => setDeprovision("disable")} className="mt-0.5 accent-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Disable (recommended)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">User is disabled in Keycloak — cannot log in, but account and audit history are preserved. Reversible.</p>
                    </div>
                  </label>
                  <label className={cn("flex-1 flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors", deprovision === "delete" ? "border-red-300 bg-red-50/50" : "border-border hover:border-foreground/20")}>
                    <input type="radio" name="deprov" value="delete" checked={deprovision === "delete"} onChange={() => setDeprovision("delete")} className="mt-0.5 accent-red-600" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete (irreversible)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">User is hard-deleted from Keycloak. Audit history in Foundry IAM is retained, but the user cannot be restored.</p>
                    </div>
                  </label>
                </div>
                {/* §2: consequence visible before commit */}
                {deprovision === "delete" && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      <strong>Hard delete is irreversible.</strong> SOC 2 auditors require evidence that terminated users cannot authenticate.
                      Hard delete satisfies this — but if you need to recover a user (e.g. rehire), you must re-provision them from the IdP.
                      Foundry recommends Disable for all organisations running compliance programmes.
                    </p>
                  </div>
                )}
              </div>

              {/* Sync groups toggle */}
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Sync group membership</p>
                  <p className="text-xs text-muted-foreground mt-0.5">When enabled, group membership changes in your IdP are reflected in Keycloak automatically.</p>
                </div>
                <button
                  onClick={() => setSyncGroups((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    syncGroups ? "bg-primary" : "bg-muted"
                  )}
                  role="switch"
                  aria-checked={syncGroups}
                >
                  <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out", syncGroups ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>

              {/* Allowed operations */}
              <div className="pt-1">
                <p className="text-sm font-medium text-foreground mb-1">Permitted operations</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Restrict which SCIM operations Foundry IAM will accept. Unchecked operations will return HTTP 403. Use this to prevent accidental bulk deletes during IdP migration.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_OPS.map((op) => (
                    <label key={op} className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                      allowedOps.has(op) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"
                    )}>
                      <input type="checkbox" checked={allowedOps.has(op)} onChange={() => toggleOp(op)} className="accent-primary" />
                      {op}
                    </label>
                  ))}
                </div>
                {!allowedOps.has("DISABLE") && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      DISABLE is unchecked — terminations in your IdP will not propagate to Foundry IAM. Terminated employees may retain login access.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleSaveSettings}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Save Settings
              </button>
              {settingsSaved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: "/scim/users", icon: Users, label: "Provisioned Users", desc: "5 users synced from Okta" },
              { href: "/scim/logs", icon: RefreshCcw, label: "Operation Log", desc: "2 errors in last 100 ops" },
              { href: "/scim/setup-guide", icon: BookOpen, label: "Setup Guide", desc: "Okta, Azure AD, Google Workspace" },
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        /* Disabled state — large CTA (§3B: next action obvious) */
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">SCIM Provisioning is Disabled</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Users in <strong>{cfg.workspace_name}</strong> are managed manually via portal invites.
            Enable SCIM to connect Okta, Azure AD, or any SCIM 2.0 IdP for automated provisioning and deprovisioning.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setEnableModal(true)}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Enable SCIM Provisioning
            </button>
            <Link href="/scim/setup-guide">
              <button className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                View Setup Guide
              </button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            SOC 2, ISO 27001, and HIPAA require automated deprovisioning. SCIM is the enterprise standard answer.
          </p>
        </div>
      )}

      {/* ── Enable Modal ── */}
      {enableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground mb-1">Enable SCIM Provisioning</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A Bearer token will be generated for <strong>{cfg.workspace_name}</strong>.
              This token grants the ability to create, update, and disable users in your Keycloak realm.
            </p>

            {!tokenRevealed ? (
              <>
                {/* §6A: consequence shown before commit */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 mb-4">
                  <p className="text-sm font-semibold text-amber-900 mb-1">⚠ Token shown once only</p>
                  <p className="text-xs text-amber-800">
                    The Bearer token will be displayed exactly once after you confirm. It is stored hashed — Foundry IAM cannot retrieve it later.
                    Store it immediately in your IdP's configuration. If you lose it, you must rotate to generate a new one.
                  </p>
                </div>
                <label className="flex items-start gap-2 mb-5 cursor-pointer">
                  <input type="checkbox" checked={enableConfirmed} onChange={(e) => setEnableConfirmed(e.target.checked)} className="mt-0.5 accent-primary" />
                  <span className="text-sm text-foreground">I understand the Bearer token will only appear once and I must copy it immediately.</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEnableModal(false)}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!enableConfirmed}
                    onClick={() => setTokenRevealed(true)}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Generate Token
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 mb-3">
                  <p className="text-xs font-semibold text-emerald-800 mb-2">SCIM enabled. Copy your Bearer token now:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border border-emerald-200 bg-white px-2 py-1.5 text-xs font-mono break-all text-foreground">
                      {tokenSavedConfirmed ? DEMO_TOKEN : (
                        <span className="flex items-center gap-2">
                          <button onClick={() => setTokenRevealed(true)} className="text-emerald-600 underline text-xs">reveal</button>
                          {DEMO_TOKEN.replace(/./g, "•")}
                        </span>
                      )}
                    </code>
                    <CopyButton text={DEMO_TOKEN} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Token prefix: <code className="font-mono">{cfg.token_prefix || "scim_live"}</code> — this prefix will be shown in future to identify which token is active.</p>
                <label className="flex items-start gap-2 mb-4 cursor-pointer">
                  <input type="checkbox" checked={tokenSavedConfirmed} onChange={(e) => setTokenSavedConfirmed(e.target.checked)} className="mt-0.5 accent-primary" />
                  <span className="text-sm text-foreground">I have copied the Bearer token and stored it in my IdP configuration.</span>
                </label>
                <button
                  disabled={!tokenSavedConfirmed}
                  onClick={() => { setEnableModal(false); setTokenRevealed(false); setEnableConfirmed(false); setTokenSavedConfirmed(false); }}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Done — Go to Setup Guide
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Rotate Token Modal ── */}
      {rotateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground mb-1">Rotate Bearer Token</h3>
            <p className="text-sm text-muted-foreground mb-3">
              A new token will be generated. The current token (<code className="font-mono text-xs">{cfg.token_prefix}••••</code>) will be <strong>immediately invalidated</strong> — any IdP using the old token will receive 401 errors until you update its configuration.
            </p>

            {!rotateConfirmed ? (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 mb-4">
                  <p className="text-xs text-amber-800">
                    <strong>Update your IdP before rotating</strong> if possible. Between rotation and IdP update, all SCIM calls will fail — no users will be provisioned or deprovisioned during that window.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setRotateModal(false)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={() => setRotateConfirmed(true)} className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                    Rotate Token
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 mb-3">
                  <p className="text-xs font-semibold text-emerald-800 mb-2">New token generated. Copy it now:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border border-emerald-200 bg-white px-2 py-1.5 text-xs font-mono break-all">{DEMO_TOKEN}</code>
                    <CopyButton text={DEMO_TOKEN} />
                  </div>
                </div>
                <label className="flex items-start gap-2 mb-4 cursor-pointer">
                  <input type="checkbox" checked={rotateTokenSaved} onChange={(e) => setRotateTokenSaved(e.target.checked)} className="mt-0.5 accent-primary" />
                  <span className="text-sm text-foreground">I have updated my IdP with the new token.</span>
                </label>
                <button
                  disabled={!rotateTokenSaved}
                  onClick={() => { setRotateModal(false); setRotateConfirmed(false); setRotateTokenSaved(false); }}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Disable Modal ── */}
      {disableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground mb-1">Disable SCIM Provisioning?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Disabling SCIM will immediately invalidate the Bearer token. Your IdP will receive <code className="text-xs font-mono">401 Unauthorized</code> on all future SCIM calls.
            </p>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 mb-4">
              <p className="text-xs text-red-800">
                <strong>Users already provisioned are not removed.</strong> They remain active in Keycloak — but future hires, updates, and terminations will no longer sync automatically. You will need to manage users manually until SCIM is re-enabled.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDisableModal(false)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={() => setDisableModal(false)} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                Disable SCIM
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
