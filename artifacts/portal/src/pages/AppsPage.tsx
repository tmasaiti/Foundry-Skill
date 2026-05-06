import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_APPS, MOCK_WORKSPACES } from "@/lib/mockData";
import {
  Boxes, Plus, Search, AlertTriangle, ArrowUpRight, Activity, X,
  Zap, Shield, Globe, Cpu, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_SORT: Record<string, number> = { error: 0, provisioning: 1, active: 2 };

type IntegrationMethod = "oidc" | "saml" | "swa" | "api";

const METHODS: Array<{
  id: IntegrationMethod;
  label: string;
  sublabel: string;
  description: string;
  isDefault: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  href: string;
}> = [
  {
    id: "oidc",
    label: "OIDC",
    sublabel: "OpenID Connect",
    description:
      "Token-based OAuth 2.0 authentication for SSO through API endpoints. Recommended for custom app integrations. Supports the Foundry IAM Sign-In Widget and direct PKCE flows.",
    isDefault: true,
    icon: Zap,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    href: "/apps/new",
  },
  {
    id: "saml",
    label: "SAML 2.0",
    sublabel: "Enterprise SSO",
    description:
      "XML-based open standard for SSO. Use if the Identity Provider for the application only supports SAML. Required for Salesforce, Workday, and most legacy enterprise SaaS.",
    isDefault: false,
    icon: Shield,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    href: "/saml/new",
  },
  {
    id: "swa",
    label: "SWA",
    sublabel: "Secure Web Authentication",
    description:
      "Foundry IAM-specific SSO method. Use if the application does not support OIDC or SAML and you need browser-based credential injection.",
    isDefault: false,
    icon: Globe,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    href: "/apps/new?type=swa",
  },
  {
    id: "api",
    label: "API Services",
    sublabel: "Machine-to-machine",
    description:
      "Interact with Foundry IAM APIs using scoped OAuth 2.0 access tokens for machine-to-machine (M2M) authentication. No user login required.",
    isDefault: false,
    icon: Cpu,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    href: "/apps/new?type=api",
  },
];

function NewAppModal({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<IntegrationMethod>("oidc");

  const method = METHODS.find((m) => m.id === selected)!;

  function handleContinue() {
    onClose();
    navigate(method.href);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Create a new app integration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select the sign-in method your application supports.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Method tiles */}
        <div className="px-6 py-5 space-y-2.5">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={cn(
                  "w-full flex items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-foreground/20 hover:bg-muted/40"
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5", m.iconBg)}>
                  <Icon className={cn("h-4.5 w-4.5", m.iconColor)} style={{ height: "1.125rem", width: "1.125rem" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{m.label}</span>
                    <span className="text-xs text-muted-foreground">— {m.sublabel}</span>
                    {m.isDefault && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.description}</p>
                </div>
                <div
                  className={cn(
                    "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active ? "border-primary" : "border-muted-foreground/30"
                  )}
                >
                  {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppsPage() {
  const [search, setSearch] = useState("");
  const [wsFilter, setWsFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  const filtered = MOCK_APPS
    .filter((a) => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.oidc.client_id.toLowerCase().includes(search.toLowerCase());
      const matchWs = wsFilter === "all" || a.workspace_id === wsFilter;
      const matchType = typeFilter === "all" || a.type === typeFilter;
      return matchSearch && matchWs && matchType;
    })
    .sort((a, b) => (STATUS_SORT[a.status] ?? 2) - (STATUS_SORT[b.status] ?? 2));

  const errorApps = MOCK_APPS.filter(a => a.status === "error");
  const provisioningApps = MOCK_APPS.filter(a => a.status === "provisioning");

  return (
    <Layout
      breadcrumbs={[{ label: "Apps" }]}
      title="Apps"
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New App
        </button>
      }
    >
      {showModal && <NewAppModal onClose={() => setShowModal(false)} />}

      {/* Exception callout — errors surface before any other content */}
      {errorApps.length > 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-red-200 border-l-red-500 bg-red-50/70 px-4 py-3.5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {errorApps.length} app{errorApps.length !== 1 ? "s" : ""} {errorApps.length === 1 ? "is" : "are"} failing authentication
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              {errorApps.map(a => a.name).join(", ")} — affected users cannot log in until resolved.
            </p>
          </div>
        </div>
      )}

      {provisioningApps.length > 0 && errorApps.length === 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-blue-200 border-l-blue-400 bg-blue-50/60 px-4 py-3 flex items-center gap-3">
          <Activity className="h-4 w-4 text-blue-600 shrink-0 animate-pulse" />
          <p className="text-sm text-blue-800">
            <span className="font-semibold">{provisioningApps.map(a => a.name).join(", ")}</span>
            {" "}— realm is being provisioned. Ready in ~2 minutes.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">{MOCK_APPS.length}</div>
          <div className="text-sm text-muted-foreground mt-0.5">Total apps</div>
        </div>
        <div className={`rounded-xl border p-4 ${errorApps.length > 0 ? "border-red-200 bg-red-50/40" : "border-border bg-card"}`}>
          <div className={`text-2xl font-bold ${errorApps.length > 0 ? "text-red-700" : "text-foreground"}`}>
            {errorApps.length > 0 ? errorApps.length : MOCK_APPS.filter(a => a.status === "active").length}
          </div>
          <div className={`text-sm mt-0.5 ${errorApps.length > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            {errorApps.length > 0 ? "In error — action required" : "Active"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">{MOCK_APPS.filter(a => a.type === "confidential").length}</div>
          <div className="text-sm text-muted-foreground mt-0.5">Confidential</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search apps or client IDs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={wsFilter}
          onChange={(e) => setWsFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All workspaces</option>
          {MOCK_WORKSPACES.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All types</option>
          <option value="public">Public</option>
          <option value="confidential">Confidential</option>
        </select>
      </div>

      {/* App list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Boxes className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No apps match your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((app) => {
            const ws = MOCK_WORKSPACES.find(w => w.id === app.workspace_id);
            const isError = app.status === "error";
            const isProvisioning = app.status === "provisioning";

            return (
              <Link key={app.id} href={`/apps/${app.id}`}>
                <div className={`group rounded-xl border bg-card px-5 py-4 hover:shadow-sm transition-all cursor-pointer ${
                  isError
                    ? "border-l-4 border-red-200 border-l-red-500 bg-red-50/30 hover:border-red-300"
                    : isProvisioning
                    ? "border-l-4 border-blue-200 border-l-blue-400 bg-blue-50/20"
                    : "border-border hover:border-primary/30"
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isError ? "bg-red-100" : isProvisioning ? "bg-blue-100" : "bg-muted group-hover:bg-primary/10"
                      }`}>
                        <Boxes className={`h-5 w-5 ${isError ? "text-red-600" : isProvisioning ? "text-blue-600 animate-pulse" : "text-muted-foreground group-hover:text-primary"} transition-colors`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{app.name}</h3>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{app.oidc.client_id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={app.status} dot />
                      <StatusBadge status={app.pkce} />
                      <StatusBadge status={app.type} />
                    </div>
                  </div>

                  {isError && (app as any).error_reason && (
                    <div className="mt-3 rounded-lg bg-red-100 border border-red-200 px-3 py-2 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">
                        <span className="font-semibold">Error: </span>{(app as any).error_reason}
                      </p>
                    </div>
                  )}

                  {isProvisioning && (
                    <div className="mt-3 rounded-lg bg-blue-100 border border-blue-200 px-3 py-2">
                      <p className="text-xs text-blue-700">Realm is provisioning — OIDC endpoints will be available in ~2 minutes. No action required.</p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/60">
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Workspace</div>
                      <div className="text-sm font-medium text-foreground">{ws?.name ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Logins (30d)</div>
                      <div className="text-sm font-medium text-foreground">{app.logins_30d.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Active sessions</div>
                      <div className="text-sm font-medium text-foreground">{app.active_sessions}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Created by</div>
                      <div className="text-sm font-medium text-foreground truncate">{app.created_by}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {app.scopes.map((s) => (
                      <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono">{s}</span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
