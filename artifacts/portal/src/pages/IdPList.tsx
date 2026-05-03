import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_IDENTITY_PROVIDERS, MOCK_WORKSPACES } from "@/lib/mockData";
import { Plus, Network, AlertTriangle, ChevronRight, Clock, Globe, GitBranch } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  oidc:      { label: "OIDC",       color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  saml:      { label: "SAML",       color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  google:    { label: "Google",     color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  github:    { label: "GitHub",     color: "text-slate-700",  bg: "bg-slate-100 border-slate-300" },
  microsoft: { label: "Microsoft",  color: "text-teal-700",   bg: "bg-teal-50 border-teal-200" },
  ldap:      { label: "LDAP",       color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function IdPList() {
  const [wsFilter, setWsFilter] = useState("all");

  const filtered = [...MOCK_IDENTITY_PROVIDERS]
    .filter((idp) => wsFilter === "all" || idp.workspace_id === wsFilter)
    .sort((a, b) => {
      if (!a.enabled && b.enabled) return -1;
      if (a.enabled && !b.enabled) return 1;
      return b.login_count_30d - a.login_count_30d;
    });

  const disabledIdPs = filtered.filter((idp) => !idp.enabled);

  return (
    <Layout
      breadcrumbs={[{ label: "Identity Providers" }]}
      title="Identity Providers"
      actions={
        <Link href="/identity-providers/new">
          <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Provider
          </button>
        </Link>
      }
    >
      {/* Q1/Q2: What is this and why does it matter — Identity Broker context */}
      <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
        <Network className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Custom Federation — Bring Your Own IdP</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your existing corporate IdP (Okta, Azure AD, Google) so employees log in with company credentials.
            Keycloak brokers the identity — your applications always receive Foundry IAM tokens, never upstream IdP tokens.
            Disable an IdP to remove its login button immediately; existing sessions remain valid until expiry.
          </p>
        </div>
      </div>

      {/* Q3: Exceptions surface first — disabled IdPs break SSO for those domains */}
      {disabledIdPs.length > 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {disabledIdPs.length} identity provider{disabledIdPs.length > 1 ? "s are" : " is"} disabled —
              login button{disabledIdPs.length > 1 ? "s are" : " is"} hidden from the realm login page
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {disabledIdPs.map((idp) => idp.display_name).join(", ")} — users who rely on{" "}
              {disabledIdPs.length > 1 ? "these providers" : "this provider"} cannot authenticate. Open the provider to re-enable it.
            </p>
          </div>
        </div>
      )}

      {/* Workspace filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Workspace:</span>
          <div className="flex gap-1">
            {[
              { id: "all", label: "All" },
              ...MOCK_WORKSPACES.map((w) => ({ id: w.id, label: w.name })),
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setWsFilter(opt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  wsFilter === opt.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} provider{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-14 text-center">
          <Globe className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No identity providers configured</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
            Connect Okta, Azure AD, Google Workspace, or any OIDC/SAML provider so employees
            use their existing corporate credentials.
          </p>
          <Link href="/identity-providers/new">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Add Identity Provider
            </button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Workspace</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Domain Hints</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Logins (30d)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((idp) => {
                const isDisabled = !idp.enabled;
                return (
                  <tr
                    key={idp.id}
                    className={`transition-colors hover:bg-muted/30 ${isDisabled ? "border-l-4 border-l-amber-400" : ""}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <GitBranch className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{idp.display_name}</div>
                          <div className="text-xs font-mono text-muted-foreground">{idp.alias}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <TypeBadge type={idp.type} />
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{idp.workspace_name}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {idp.domain_hints.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">None — manual selection</span>
                        ) : (
                          idp.domain_hints.map((d) => (
                            <span key={d} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                              @{d}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-right">
                      <span className={`text-sm font-semibold ${idp.login_count_30d > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {idp.login_count_30d.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {fmtDate(idp.last_login_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {isDisabled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Disabled
                        </span>
                      ) : (
                        <StatusBadge status="active" dot />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/identity-providers/${idp.id}`}>
                        <button className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                          View <ChevronRight className="h-3 w-3" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
