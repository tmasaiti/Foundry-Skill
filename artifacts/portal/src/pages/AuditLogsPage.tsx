import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { MOCK_AUDIT_LOGS, MOCK_TENANT } from "@/lib/mockData";
import { Search, Download, Activity, Clock, Globe, Monitor, ShieldAlert } from "lucide-react";

const ACTION_COLOR: Record<string, string> = {
  "app.created": "bg-emerald-100 text-emerald-700",
  "app.secret-rotated": "bg-amber-100 text-amber-700",
  "admin.invited": "bg-violet-100 text-violet-700",
  "admin.removed": "bg-red-100 text-red-700",
  "tenant.updated": "bg-blue-100 text-blue-700",
  "workspace.created": "bg-indigo-100 text-indigo-700",
  "support.access-enabled": "bg-red-100 text-red-700",
};

const SEVERITY_CONFIG = {
  high: {
    label: "High",
    class: "bg-red-100 text-red-700 border-red-200",
    rowClass: "bg-red-50/40",
    dot: "bg-red-500",
    description: "Security-sensitive — requires your review",
  },
  medium: {
    label: "Medium",
    class: "bg-amber-100 text-amber-700 border-amber-200",
    rowClass: "bg-amber-50/20",
    dot: "bg-amber-500",
    description: "May affect authentication behaviour",
  },
  info: {
    label: "Info",
    class: "bg-slate-100 text-slate-600 border-slate-200",
    rowClass: "",
    dot: "bg-slate-400",
    description: "Routine operational event",
  },
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  app: Monitor, workspace: Monitor, tenant: Globe, admin: Activity,
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  // Sort newest-first — most recent events at the top, always
  const sorted = [...MOCK_AUDIT_LOGS].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filtered = sorted.filter((log) => {
    const matchSearch =
      log.action.includes(search.toLowerCase()) ||
      (log.actor_email?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
      log.resource_id.toLowerCase().includes(search.toLowerCase());
    const matchResource = resourceFilter === "all" || log.resource_type === resourceFilter;
    const matchSeverity = severityFilter === "all" || log.severity === severityFilter;
    return matchSearch && matchResource && matchSeverity;
  });

  const highCount = MOCK_AUDIT_LOGS.filter(l => l.severity === "high").length;
  const mediumCount = MOCK_AUDIT_LOGS.filter(l => l.severity === "medium").length;

  return (
    <Layout
      breadcrumbs={[{ label: "Audit Logs" }]}
      title="Audit Logs"
      actions={
        <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      }
    >
      {/* Security-sensitive events callout — exceptions louder than routine (§3D) */}
      {highCount > 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-red-200 border-l-red-500 bg-red-50/60 px-4 py-3.5 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {highCount} high-severity event{highCount !== 1 ? "s" : ""} in this log
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Support access grants and secret rotations require your review. These events affect security posture.
            </p>
          </div>
          <button
            onClick={() => setSeverityFilter("high")}
            className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
          >
            Filter to high →
          </button>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Logs are retained for <strong>1 year</strong> on your Growth plan · Sorted by newest first · All timestamps UTC ·
        Immutable — required for SOC 2 compliance
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search actions, actors, resource IDs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All severities</option>
          <option value="high">High ({highCount})</option>
          <option value="medium">Medium ({mediumCount})</option>
          <option value="info">Info</option>
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All resources</option>
          <option value="tenant">Tenant</option>
          <option value="workspace">Workspace</option>
          <option value="app">App</option>
          <option value="admin">Admin</option>
        </select>
        {severityFilter !== "all" && (
          <button onClick={() => setSeverityFilter("all")} className="text-xs text-primary hover:underline">
            Clear filter
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-8">Risk</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Resource</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">IP</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((log) => {
              const isExpanded = expanded === log.id;
              const severity = SEVERITY_CONFIG[log.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;

              return (
                <React.Fragment key={log.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                    className={`transition-colors cursor-pointer hover:brightness-95 ${severity.rowClass} hover:bg-muted/20`}
                  >
                    {/* Severity dot — exceptions louder than routine */}
                    <td className="px-4 py-3.5">
                      <span title={`${severity.label} — ${severity.description}`}>
                        <span className={`inline-flex h-2 w-2 rounded-full ${severity.dot} ${log.severity === "high" ? "ring-2 ring-red-300" : ""}`} />
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLOR[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                          {log.action}
                        </span>
                        {log.severity !== "info" && (
                          <span className={`hidden sm:inline-flex items-center gap-1 border rounded-full px-1.5 py-0.5 text-xs font-medium ${severity.class}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${severity.dot}`} />
                            {severity.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-foreground">{log.actor_email}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground capitalize">{log.resource_type}</span>
                        <span className="font-mono text-xs text-foreground">{log.resource_id.slice(0, 20)}…</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs font-mono text-muted-foreground">{log.ip_address}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                      {isExpanded ? "▲" : "▼"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${log.id}-detail`} className="bg-muted/10">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <div className="text-muted-foreground mb-0.5">Resource ID</div>
                            <div className="font-mono text-foreground break-all">{log.resource_id}</div>
                          </div>
                          {log.previous_state && (
                            <div>
                              <div className="text-muted-foreground mb-0.5">Previous state</div>
                              <div className="font-medium text-foreground capitalize">{log.previous_state}</div>
                            </div>
                          )}
                          {log.new_state && (
                            <div>
                              <div className="text-muted-foreground mb-0.5">New state</div>
                              <div className="font-medium text-emerald-600 capitalize">{log.new_state}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-muted-foreground mb-0.5">Severity</div>
                            <div className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 font-medium ${severity.class}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${severity.dot}`} />
                              {severity.label} — {severity.description}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-0.5">Source</div>
                            <div className="font-mono text-foreground">{log.source_screen}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-0.5">Full timestamp (UTC)</div>
                            <div className="font-mono text-foreground">{new Date(log.created_at).toISOString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-0.5">Tenant</div>
                            <div className="font-mono text-foreground">{MOCK_TENANT.id}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No audit logs match your filters</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground text-center">
        Showing {filtered.length} of {MOCK_AUDIT_LOGS.length} events · Newest first
      </p>
    </Layout>
  );
}
