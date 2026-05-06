import { useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { DetailNav } from "@/components/DetailNav";
import { MOCK_WORKSPACES, MOCK_APPS, MOCK_ADMINS } from "@/lib/mockData";
import { Layers, Cpu, Users, ExternalLink, Plus, ChevronRight, Copy, Check, Download } from "lucide-react";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const ws = MOCK_WORKSPACES.find(w => w.id === id);
  const [activeTab, setActiveTab] = useState<"apps" | "team" | "realm">("apps");
  const [endpointsCopied, setEndpointsCopied] = useState(false);

  if (!ws) return (
    <Layout title="Workspace Not Found">
      <p className="text-muted-foreground">Workspace not found. <Link href="/workspaces" className="text-primary hover:underline">Back to workspaces</Link></p>
    </Layout>
  );

  const wsIndex = MOCK_WORKSPACES.findIndex(w => w.id === id);
  const prevWs = wsIndex > 0 ? MOCK_WORKSPACES[wsIndex - 1] : null;
  const nextWs = wsIndex < MOCK_WORKSPACES.length - 1 ? MOCK_WORKSPACES[wsIndex + 1] : null;

  const wsApps = MOCK_APPS.filter(a => a.workspace_id === ws.id);
  const wsAdmins = MOCK_ADMINS.filter(a => a.workspace_id === ws.id);

  function buildEndpointBlock() {
    const issuer = ws.keycloak.issuer;
    return [
      `OIDC_ISSUER=${issuer}`,
      `OIDC_JWKS_URI=${ws.keycloak.jwks_uri}`,
      `OIDC_WELL_KNOWN=${ws.keycloak.well_known}`,
      `OIDC_AUTH_ENDPOINT=${issuer}/protocol/openid-connect/auth`,
      `OIDC_TOKEN_ENDPOINT=${issuer}/protocol/openid-connect/token`,
      `OIDC_LOGOUT_ENDPOINT=${issuer}/protocol/openid-connect/logout`,
      `OIDC_USERINFO_ENDPOINT=${issuer}/protocol/openid-connect/userinfo`,
    ].join("\n");
  }

  function copyAllEndpoints() {
    navigator.clipboard.writeText(buildEndpointBlock());
    setEndpointsCopied(true);
    setTimeout(() => setEndpointsCopied(false), 2000);
  }

  function downloadEnvFile() {
    const blob = new Blob([buildEndpointBlock()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ws.keycloak.realm}.env`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const TABS = [
    { id: "apps",  label: "Apps",  count: wsApps.length },
    { id: "team",  label: "Team",  count: wsAdmins.length },
    { id: "realm", label: "Realm", count: null },
  ] as const;

  return (
    <Layout
      breadcrumbs={[
        { label: "Workspaces", href: "/workspaces" },
        { label: ws.name },
      ]}
      title={ws.name}
    >
      <DetailNav
        backHref="/workspaces"
        backLabel="All Workspaces"
        prevHref={prevWs ? `/workspaces/${prevWs.id}` : null}
        nextHref={nextWs ? `/workspaces/${nextWs.id}` : null}
        prevLabel={prevWs?.name}
        nextLabel={nextWs?.name}
      />

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{ws.name}</h2>
                {ws.is_default && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">default</span>}
                <StatusBadge status={ws.status} dot />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                {ws.mode} · us-east-1 · Created {new Date(ws.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Edit workspace
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/60">
          {[
            { icon: Cpu, label: "Apps", value: wsApps.length },
            { icon: Users, label: "MAU", value: ws.mau.toLocaleString() },
            { icon: Users, label: "Team members", value: wsAdmins.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {TABS.map(({ id: tabId, label, count }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tabId
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count !== null && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === tabId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Apps tab */}
      {activeTab === "apps" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{wsApps.length} app{wsApps.length !== 1 ? "s" : ""} in this workspace</p>
            <Link href="/apps">
              <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" /> New App
              </button>
            </Link>
          </div>
          {wsApps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Cpu className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-foreground">No apps in this workspace</p>
              <p className="text-sm text-muted-foreground mt-1">Create an app to start issuing OIDC tokens</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wsApps.map((app) => (
                <Link key={app.id} href={`/apps/${app.id}`}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <Cpu className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{app.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{app.oidc.client_id}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={app.type} />
                      <StatusBadge status={app.pkce} />
                      <span className="text-xs text-muted-foreground">{app.logins_30d.toLocaleString()} logins/mo</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team tab */}
      {activeTab === "team" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{wsAdmins.length} member{wsAdmins.length !== 1 ? "s" : ""} in this workspace</p>
            <Link href="/team">
              <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" /> Invite
              </button>
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/60">
                {wsAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {admin.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{admin.full_name}</div>
                          <div className="text-xs text-muted-foreground">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StatusBadge status={admin.role} />
                        <StatusBadge status={admin.status} dot />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Realm tab */}
      {activeTab === "realm" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">IAM Realm Configuration</h3>
              <p className="text-xs text-muted-foreground mt-0.5">These endpoints are used by your apps to obtain and validate tokens.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyAllEndpoints}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  endpointsCopied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {endpointsCopied
                  ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy all endpoints</>
                }
              </button>
              <button
                onClick={downloadEnvFile}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download .env
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {[
              { label: "Identity domain", value: ws.keycloak.realm },
              { label: "Issuer",         value: ws.keycloak.issuer },
              { label: "JWKS URI",       value: ws.keycloak.jwks_uri },
              { label: "Well-known",     value: ws.keycloak.well_known },
              { label: "Auth endpoint",  value: `${ws.keycloak.issuer}/protocol/openid-connect/auth` },
              { label: "Token endpoint", value: `${ws.keycloak.issuer}/protocol/openid-connect/token` },
              { label: "Logout endpoint",value: `${ws.keycloak.issuer}/protocol/openid-connect/logout` },
              { label: "Userinfo",       value: `${ws.keycloak.issuer}/protocol/openid-connect/userinfo` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 px-5 py-3">
                <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
                <dd className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-xs font-mono text-foreground truncate">{value}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <CopyButton text={value} size="sm" />
                    {value.startsWith("https://") && (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </dd>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
