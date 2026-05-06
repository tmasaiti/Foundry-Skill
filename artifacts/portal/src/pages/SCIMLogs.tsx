import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { MOCK_SCIM_LOGS, MOCK_WORKSPACES } from "@/lib/mockData";
import { RefreshCcw, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Op = typeof MOCK_SCIM_LOGS[number]["operation"];
type Status = "success" | "error";

const OP_LABELS: Record<string, string> = {
  CREATE: "Create User",
  UPDATE: "Update User",
  DISABLE: "Disable User",
  DELETE: "Delete User",
  UPDATE_GROUP: "Update Group",
};

const STATUS_HTTP_LABELS: Record<number, string> = {
  200: "200 OK",
  201: "201 Created",
  204: "204 No Content",
  400: "400 Bad Request",
  401: "401 Unauthorized",
  403: "403 Forbidden",
  404: "404 Not Found",
  409: "409 Conflict",
  500: "500 Server Error",
  503: "503 Unavailable",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SCIMLogs() {
  const [wsId, setWsId] = useState(MOCK_WORKSPACES[0].id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [opFilter, setOpFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const allLogs = MOCK_SCIM_LOGS.filter((l) => l.workspace_id === wsId);

  // §3D: errors always first, then by date desc
  const sorted = [...allLogs].sort((a, b) => {
    if (a.status === "error" && b.status !== "error") return -1;
    if (a.status !== "error" && b.status === "error") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filtered = sorted
    .filter((l) => opFilter === "all" || l.operation === opFilter)
    .filter((l) => statusFilter === "all" || l.status === statusFilter);

  const errorCount = allLogs.filter((l) => l.status === "error").length;
  const successCount = allLogs.filter((l) => l.status === "success").length;

  const uniqueOps = Array.from(new Set(allLogs.map((l) => l.operation)));

  return (
    <Layout
      breadcrumbs={[{ label: "SCIM", href: "/scim" }, { label: "Operation Log" }]}
      title="SCIM Operation Log"
      actions={
        <Link href="/scim/users">
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Provisioned Users →
          </button>
        </Link>
      }
    >
      {/* Q1: What am I looking at? */}
      <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
        <RefreshCcw className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">SCIM Operation Log — Last 100 Operations</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every SCIM request received from your IdP is recorded here — creates, updates, disables, deletes, and group changes.
            Failed operations are shown first. Use this log to diagnose provisioning issues before they affect users.
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
              onClick={() => { setWsId(ws.id); setExpandedId(null); }}
              className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                wsId === ws.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >{ws.name}</button>
          ))}
        </div>
      </div>

      {/* Q3: What matters most? — Error summary callout (§3D) */}
      {errorCount > 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-red-200 border-l-red-500 bg-red-50/50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">
              {errorCount} failed operation{errorCount > 1 ? "s" : ""} in the last {allLogs.length} requests
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Failed operations are shown first below. Each error includes the HTTP status code and a description — resolve these before they accumulate.
              Persistent 409 errors typically indicate duplicate provisioning; 503 errors indicate identity provider connectivity issues.
            </p>
          </div>
          <button
            onClick={() => setStatusFilter("error")}
            className="shrink-0 rounded-lg border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200 transition-colors"
          >
            Show errors only
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Operations</p>
          <p className="text-xl font-semibold text-foreground mt-0.5">{allLogs.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Succeeded</p>
          <p className="text-xl font-semibold text-emerald-600 mt-0.5">{successCount}</p>
        </div>
        <div className={cn("rounded-xl border bg-card px-4 py-3", errorCount > 0 ? "border-red-200 bg-red-50/30" : "border-border")}>
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className={cn("text-xl font-semibold mt-0.5", errorCount > 0 ? "text-red-600" : "text-foreground")}>{errorCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Filter:</span>
        <select
          value={opFilter}
          onChange={(e) => setOpFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        >
          <option value="all">All operations</option>
          {uniqueOps.map((op) => (
            <option key={op} value={op}>{OP_LABELS[op] ?? op}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {["all", "success", "error"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === s
                  ? s === "error" ? "border-red-300 bg-red-100 text-red-700" : s === "success" ? "border-emerald-300 bg-emerald-100 text-emerald-700" : "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >{s === "all" ? "All" : s === "success" ? "Success" : "Error"}</button>
          ))}
        </div>
        {(opFilter !== "all" || statusFilter !== "all") && (
          <button onClick={() => { setOpFilter("all"); setStatusFilter("all"); }} className="text-xs text-primary hover:underline">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {allLogs.length} shown</span>
      </div>

      {/* Log entries */}
      {allLogs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground mb-1">No operations recorded yet</p>
          <p className="text-xs text-muted-foreground">SCIM operations from your IdP will appear here. Enable SCIM and connect your IdP to start provisioning.</p>
          <Link href="/scim"><button className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">Configure SCIM →</button></Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No operations match the selected filters.</p>
          <button onClick={() => { setOpFilter("all"); setStatusFilter("all"); }} className="mt-2 text-xs text-primary hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {filtered.map((log, idx) => {
            const isError = log.status === "error";
            const expanded = expandedId === log.id;
            return (
              <div key={log.id} className={cn(
                "border-b border-border last:border-b-0",
                isError ? "bg-red-50/30 border-l-4 border-l-red-400" : "hover:bg-muted/20"
              )}>
                {/* Row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedId(expanded ? null : log.id)}
                >
                  {/* Status icon */}
                  {isError ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}

                  {/* Operation + resource */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-mono font-medium",
                        isError ? "border-red-200 bg-red-100 text-red-700" : "border-border bg-muted text-muted-foreground"
                      )}>
                        {log.operation}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">{log.resource_display}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{log.resource_type}</span>
                    </div>
                    {isError && log.error_detail && (
                      <p className="text-xs text-red-700 mt-0.5 truncate">{log.error_detail}</p>
                    )}
                  </div>

                  {/* HTTP status */}
                  <span className={cn(
                    "shrink-0 text-xs font-mono font-medium px-2 py-0.5 rounded",
                    isError ? "text-red-700 bg-red-100" : "text-emerald-700 bg-emerald-50"
                  )}>
                    {STATUS_HTTP_LABELS[log.http_status] ?? log.http_status}
                  </span>

                  {/* Timestamp */}
                  <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hidden md:flex">
                    <Clock className="h-3 w-3" />
                    {fmtDate(log.created_at)}
                  </div>

                  {/* Expand */}
                  {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </button>

                {/* Expanded detail — §5 lineage */}
                {expanded && (
                  <div className={cn("px-4 pb-4 pt-0 border-t border-border/50", isError ? "bg-red-50/40" : "bg-muted/20")}>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mt-3">
                      <div>
                        <span className="font-medium text-muted-foreground">Operation</span>
                        <p className="text-foreground mt-0.5 font-mono">{log.operation}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">HTTP Status</span>
                        <p className={cn("mt-0.5 font-mono", isError ? "text-red-700" : "text-emerald-700")}>{log.http_status}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Resource</span>
                        <p className="text-foreground mt-0.5">{log.resource_display} ({log.resource_type})</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Timestamp</span>
                        <p className="text-foreground mt-0.5">{fmtDate(log.created_at)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-muted-foreground">IdP External ID</span>
                        <p className="text-foreground mt-0.5 font-mono">{log.external_id}</p>
                      </div>
                      {log.error_detail && (
                        <div className="col-span-2">
                          <span className="font-medium text-red-700">Error Detail</span>
                          <div className="mt-0.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-red-800 text-xs">{log.error_detail}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Retention notice */}
      <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Operation logs are retained for 90 days on the Growth plan. For longer retention, upgrade to Enterprise.
        Logs are append-only and cannot be deleted — they form part of your provisioning audit trail.
      </div>
    </Layout>
  );
}
