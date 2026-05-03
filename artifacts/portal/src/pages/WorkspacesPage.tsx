import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { MOCK_WORKSPACES, MOCK_TENANT } from "@/lib/mockData";
import { Layers, Plus, ExternalLink, Cpu, Users, Shield, Info } from "lucide-react";

const PLAN_LIMITS: Record<string, number> = { starter: 1, growth: 3, enterprise: Infinity };

export default function WorkspacesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const limit = PLAN_LIMITS[MOCK_TENANT.plan];
  const atLimit = MOCK_WORKSPACES.length >= limit;

  return (
    <Layout
      breadcrumbs={[{ label: "Workspaces" }]}
      title="Workspaces"
      actions={
        <button
          onClick={() => !atLimit && setCreateOpen(true)}
          disabled={atLimit}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Workspace
        </button>
      }
    >
      {atLimit && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Workspace limit reached.</strong> Your <strong>{MOCK_TENANT.plan}</strong> plan includes {limit} workspace{limit > 1 ? "s" : ""}.{" "}
            <Link href="/billing" className="font-medium underline">Upgrade to Growth</Link> to add up to 3 workspaces.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        {MOCK_WORKSPACES.map((ws) => (
          <div key={ws.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{ws.name}</h3>
                    {ws.is_default && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">default</span>
                    )}
                    <StatusBadge status={ws.status} dot />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="capitalize">{ws.mode}</span> · Created {new Date(ws.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/workspaces/${ws.id}`}>
                  <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
                    View workspace
                  </button>
                </Link>
              </div>
            </div>

            {/* Stats row */}
            <div className="px-5 py-3 border-t border-border/60 grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{ws.mau.toLocaleString()} MAU</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{ws.app_count} apps</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{ws.admin_count} admins</span>
              </div>
            </div>

            {/* Realm info */}
            <div className="px-5 py-3 border-t border-border/60 bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">IAM Realm</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                {[
                  { label: "Realm", value: ws.keycloak.realm },
                  { label: "Issuer", value: ws.keycloak.issuer },
                  { label: "JWKS URI", value: ws.keycloak.jwks_uri },
                  { label: "Well-Known", value: ws.keycloak.well_known },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{label}:</span>
                    <span className="text-xs font-mono text-foreground truncate flex-1">{value}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <CopyButton text={value} size="sm" />
                      {value.startsWith("https://") && (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Placeholder for new workspace */}
        {!atLimit && (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl border border-dashed border-border p-8 text-center hover:bg-muted/30 hover:border-primary/30 transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 mx-auto mb-3 transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-medium text-foreground">Create workspace</p>
            <p className="text-xs text-muted-foreground mt-0.5">{limit - MOCK_WORKSPACES.length} of {limit} remaining on {MOCK_TENANT.plan}</p>
          </button>
        )}
      </div>

      {/* Create workspace modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-semibold text-foreground mb-4">Create workspace</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Workspace name</label>
                <input type="text" placeholder="e.g. Production, EU West, Staging" className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Realm mode</label>
                <select className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="isolated-realm">Isolated realm — dedicated Keycloak realm</option>
                  <option value="shared-realm">Shared realm — shared with tenant realm</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">Isolated realm provides stronger tenant isolation. Cannot be changed after creation.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">Create workspace</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
