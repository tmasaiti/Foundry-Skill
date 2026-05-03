import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_SAML_SPS, MOCK_WORKSPACES } from "@/lib/mockData";
import { Plus, FlaskConical, ChevronRight, AlertTriangle, Shield, Clock } from "lucide-react";

const NAME_ID_LABELS: Record<string, string> = {
  email: "Email",
  persistent: "Persistent",
  transient: "Transient",
  unspecified: "Unspecified",
};

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SAMLList() {
  const [wsFilter, setWsFilter] = useState("all");

  const filtered = [...MOCK_SAML_SPS]
    .filter((sp) => wsFilter === "all" || sp.workspace_id === wsFilter)
    .sort((a, b) => {
      if (a.status === "disabled" && b.status !== "disabled") return -1;
      if (a.status !== "disabled" && b.status === "disabled") return 1;
      return b.sso_count_30d - a.sso_count_30d;
    });

  const disabledSPs = filtered.filter((sp) => sp.status === "disabled");

  return (
    <Layout
      breadcrumbs={[{ label: "SAML" }]}
      title="SAML Service Providers"
      actions={
        <Link href="/saml/new">
          <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Register Service Provider
          </button>
        </Link>
      }
    >
      {/* Q1: What am I looking at? — Protocol context banner */}
      <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
        <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Foundry IAM as SAML Identity Provider</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each registered SP can send users here to authenticate. Foundry IAM issues a signed XML assertion back to the SP — no re-authentication needed.
            Enterprise apps like Salesforce, Workday, and Google Workspace require SAML for SSO.
          </p>
        </div>
      </div>

      {/* Q3: What matters most? — Disabled SPs are exceptions that break SSO */}
      {disabledSPs.length > 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {disabledSPs.length} service provider{disabledSPs.length > 1 ? "s are" : " is"} disabled —
              SSO requests will be rejected
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {disabledSPs.map((sp) => sp.name).join(", ")} — users attempting to log in via{" "}
              {disabledSPs.length > 1 ? "these SPs" : "this SP"} will receive an error.
              Open the SP to re-enable it.
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
          {filtered.length} service provider{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-14 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No SAML service providers yet</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
            Register your first SP to enable SAML SSO for enterprise apps like Salesforce, Workday, or
            Google Workspace.
          </p>
          <Link href="/saml/new">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Register Service Provider
            </button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Service Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Workspace
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  NameID Format
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  SSO (30d)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Last SSO
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((sp) => {
                const isDisabled = sp.status === "disabled";
                return (
                  <tr
                    key={sp.id}
                    className={`transition-colors hover:bg-muted/30 ${
                      isDisabled ? "border-l-4 border-l-amber-400" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium text-foreground">{sp.name}</div>
                      <div className="text-xs font-mono text-muted-foreground truncate max-w-[220px] mt-0.5">
                        {sp.entity_id}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{sp.workspace_name}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-foreground">
                        {NAME_ID_LABELS[sp.name_id_format] ?? sp.name_id_format}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-right">
                      <span
                        className={`text-sm font-semibold ${
                          sp.sso_count_30d > 0 ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {sp.sso_count_30d.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {fmtDate(sp.last_sso_at)}
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
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/saml/${sp.id}/test`}>
                          <button className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <FlaskConical className="h-3 w-3" /> Test
                          </button>
                        </Link>
                        <Link href={`/saml/${sp.id}`}>
                          <button className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                            View <ChevronRight className="h-3 w-3" />
                          </button>
                        </Link>
                      </div>
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
