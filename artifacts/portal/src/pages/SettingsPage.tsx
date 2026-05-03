import { useState } from "react";
import { Layout } from "@/components/Layout";
import { MOCK_TENANT, MOCK_APPS, MOCK_WORKSPACES, MOCK_ADMINS, MOCK_USAGE } from "@/lib/mockData";
import { Shield, Globe, Lock, AlertTriangle, HeadphonesIcon, Trash2, Users, Layers, Boxes } from "lucide-react";

const MFA_OPTIONS = [
  {
    id: "disabled",
    label: "Disabled",
    description: "MFA is not enforced anywhere",
    impact: "MFA will be disabled. Existing MFA configurations are preserved but not enforced. No active sessions are affected.",
    impactSeverity: "low" as const,
  },
  {
    id: "optional",
    label: "Optional",
    description: "Users can optionally enable MFA",
    impact: "Users can choose to enable MFA. No sessions are terminated. Admins and end-users who already use MFA are unaffected.",
    impactSeverity: "low" as const,
  },
  {
    id: "required-admins",
    label: "Required for admins",
    description: "Portal admins must use MFA",
    impact: `Affects ${MOCK_ADMINS.filter(a => a.status === "active").length} active portal admins. Admins without MFA will be challenged on next login. End-users (~${MOCK_USAGE.mau.toLocaleString()} MAU) are unaffected.`,
    impactSeverity: "medium" as const,
  },
  {
    id: "required-all",
    label: "Required for everyone",
    description: "All users (admins + end-users) must use MFA",
    impact: `Affects ${MOCK_ADMINS.filter(a => a.status === "active").length} portal admins AND all ~${MOCK_USAGE.mau.toLocaleString()} end-users. All active sessions will be challenged within 5 minutes. Users without MFA enrolled will be locked out until they configure it.`,
    impactSeverity: "high" as const,
  },
];

export default function SettingsPage() {
  const [mfaPolicy, setMfaPolicy] = useState(MOCK_TENANT.mfa_policy as string);
  const [tenantName, setTenantName] = useState(MOCK_TENANT.name);
  const [supportOpen, setSupportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedMfa = MFA_OPTIONS.find(o => o.id === mfaPolicy);
  const policyChanged = mfaPolicy !== MOCK_TENANT.mfa_policy;

  const impactBorderColor = {
    low: "border-blue-200 bg-blue-50 text-blue-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    high: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <Layout breadcrumbs={[{ label: "Settings" }]} title="Settings">
      {/* General settings */}
      <div className="rounded-xl border border-border bg-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">General</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tenant name</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Slug</label>
              <div className="flex items-center rounded-lg border border-input bg-muted overflow-hidden">
                <span className="px-3 py-2.5 text-sm text-muted-foreground border-r border-input">foundry-iam.dev/</span>
                <input type="text" value={MOCK_TENANT.slug} readOnly className="flex-1 px-3 py-2.5 text-sm text-muted-foreground bg-muted focus:outline-none" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Slug cannot be changed after creation.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Region</label>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-3.5 py-2.5">
                <span className="text-sm text-muted-foreground">{MOCK_TENANT.region}</span>
                <span className="text-xs text-muted-foreground ml-auto">(immutable)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Locked at creation. Contact support to migrate regions.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tenant ID</label>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-3.5 py-2.5">
                <code className="text-xs font-mono text-muted-foreground">{MOCK_TENANT.id}</code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            {tenantName !== MOCK_TENANT.name && (
              <p className="text-xs text-amber-600">Updating name is cosmetic — tenant slug and ID are unchanged.</p>
            )}
            <button
              onClick={handleSave}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${saved ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:opacity-90"}`}
            >
              {saved ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* MFA Policy — impact preview shown before saving */}
      <div className="rounded-xl border border-border bg-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">MFA Policy</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Controls multi-factor authentication enforcement across your tenant.
        </p>
        <div className="space-y-2.5 mb-4">
          {MFA_OPTIONS.map(({ id, label, description }) => (
            <label
              key={id}
              className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${mfaPolicy === id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}
            >
              <input
                type="radio"
                name="mfa"
                value={id}
                checked={mfaPolicy === id}
                onChange={() => setMfaPolicy(id)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Impact preview — shown before clicking "Update policy" */}
        {selectedMfa && (
          <div className={`rounded-lg border px-3 py-2.5 text-xs mb-4 ${impactBorderColor[selectedMfa.impactSeverity]}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />
              <div>
                <strong>If you update: </strong>{selectedMfa.impact}
                {!policyChanged && <span className="opacity-60"> (Current setting — no change)</span>}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {policyChanged && (
            <span className="text-xs text-amber-600 font-medium">Unsaved change — review the impact above before saving</span>
          )}
          <button
            onClick={handleSave}
            className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Update policy
          </button>
        </div>
      </div>

      {/* Support access */}
      <div className="rounded-xl border border-border bg-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Support Access</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Temporarily grant Foundry IAM support read-only access for troubleshooting.
          Access is time-limited and every action is logged in your audit trail.
        </p>
        <button onClick={() => setSupportOpen(true)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <Shield className="inline h-3.5 w-3.5 mr-1.5" />
          Grant temporary support access
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          These actions are irreversible. All data across all workspaces is permanently destroyed.
        </p>
        <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Delete tenant
        </button>
      </div>

      {/* Support access modal */}
      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-semibold text-foreground mb-3">Grant support access</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <textarea placeholder="Describe the issue you need help with…" rows={3} className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Duration</label>
                <select className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="60">1 hour</option>
                  <option value="240">4 hours</option>
                  <option value="480">8 hours</option>
                  <option value="1440">24 hours</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">All support actions will appear in your audit log. Access revokes automatically after the selected duration.</p>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setSupportOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => setSupportOpen(false)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">Grant access</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal — full impact breakdown before user can confirm */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Delete {MOCK_TENANT.name} permanently?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This is immediate and cannot be undone. Everything below will be permanently destroyed:
                </p>
              </div>
            </div>

            {/* Full impact breakdown — every item that will be destroyed */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 mb-5 space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-red-700">
                <Layers className="h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong>{MOCK_WORKSPACES.length} workspaces</strong> —{" "}
                  {MOCK_WORKSPACES.map(w => w.name).join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-red-700">
                <Boxes className="h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong>{MOCK_APPS.length} apps</strong> —{" "}
                  {MOCK_APPS.map(a => a.name).join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-red-700">
                <Users className="h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong>{MOCK_ADMINS.length} portal admins</strong> and approximately{" "}
                  <strong>{MOCK_USAGE.mau.toLocaleString()} active end-user accounts</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong>All audit logs</strong> (immutable records destroyed; non-recoverable)
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-red-700 pt-1 border-t border-red-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>
                  <strong>Stripe subscription cancelled immediately</strong> — no refund for unused days.
                  Next scheduled invoice will not be issued.
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Type <code className="font-mono bg-muted px-1 rounded">{MOCK_TENANT.slug}</code> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={MOCK_TENANT.slug}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button
                disabled={deleteConfirm !== MOCK_TENANT.slug}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
