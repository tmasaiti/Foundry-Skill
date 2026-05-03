import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { MOCK_SCIM_USERS, MOCK_SCIM_CONFIGS, MOCK_WORKSPACES } from "@/lib/mockData";
import { Users, AlertTriangle, Clock, RefreshCcw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

export default function SCIMUsers() {
  const [wsId, setWsId] = useState(MOCK_WORKSPACES[0].id);
  const cfg = MOCK_SCIM_CONFIGS.find((c) => c.workspace_id === wsId);

  const users = MOCK_SCIM_USERS
    .filter((u) => u.workspace_id === wsId)
    // §3D: disabled users (deprovisioned employees) surface first
    .sort((a, b) => {
      if (!a.active && b.active) return -1;
      if (a.active && !b.active) return 1;
      return new Date(b.last_synced_at).getTime() - new Date(a.last_synced_at).getTime();
    });

  const disabledUsers = users.filter((u) => !u.active);
  const activeUsers = users.filter((u) => u.active);

  return (
    <Layout
      breadcrumbs={[{ label: "SCIM", href: "/scim" }, { label: "Provisioned Users" }]}
      title="Provisioned Users"
      actions={
        <Link href="/scim/logs">
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCcw className="h-4 w-4" /> Operation Log
          </button>
        </Link>
      }
    >
      {/* Q1: What am I looking at? */}
      <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
        <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">SCIM-Provisioned Users</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            These users were created automatically by your IdP via SCIM push — not by manual invite.
            Their lifecycle (create, update, disable) is managed by your IdP. Editing them here does not affect the IdP source of truth.
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
              onClick={() => setWsId(ws.id)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                wsId === ws.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >{ws.name}</button>
          ))}
        </div>
      </div>

      {/* Q3: What matters most? — Deprovisioned users are active security exceptions (§3D) */}
      {disabledUsers.length > 0 && (
        <div className="mb-5 rounded-xl border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {disabledUsers.length} deprovisioned user{disabledUsers.length > 1 ? "s" : ""} — cannot authenticate
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {disabledUsers.map((u) => u.display_name).join(", ")} — disabled by your IdP via SCIM. They appear below highlighted in red. They cannot log in to any app in this workspace.
            </p>
          </div>
        </div>
      )}

      {/* SCIM not enabled for this workspace */}
      {cfg && !cfg.enabled && (
        <div className="mb-5 rounded-xl border border-border bg-muted/30 px-4 py-4 text-center">
          <p className="text-sm font-medium text-foreground mb-1">SCIM is not enabled for {MOCK_WORKSPACES.find(w => w.id === wsId)?.name}</p>
          <p className="text-xs text-muted-foreground mb-3">No users have been provisioned via SCIM in this workspace. Enable SCIM and connect your IdP to see users here.</p>
          <Link href="/scim">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Enable SCIM →</button>
          </Link>
        </div>
      )}

      {/* User list */}
      {cfg?.enabled && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{users.length} provisioned user{users.length !== 1 ? "s" : ""}</p>
            {cfg.idp_hint && (
              <span className="text-xs text-muted-foreground">Source: {cfg.idp_hint}</span>
            )}
          </div>

          {users.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No users provisioned yet. Your IdP will push users on the next sync cycle.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Groups</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Provisioned</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Sync</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user, idx) => (
                    <tr
                      key={user.id}
                      className={cn(
                        "transition-colors",
                        !user.active
                          ? "bg-red-50/40 border-l-4 border-l-red-400"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                            {initials(user.display_name)}
                          </div>
                          <div>
                            <p className={cn("font-medium text-foreground", !user.active && "line-through text-muted-foreground")}>{user.display_name}</p>
                            <p className="text-xs text-muted-foreground">{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {user.groups.map((g) => (
                            <span key={g} className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">{g}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {fmtDateShort(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {fmtDate(user.last_synced_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Deprovisioned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary footer */}
          <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{activeUsers.length}</strong> active</span>
              <span><strong className={disabledUsers.length > 0 ? "text-red-600" : "text-foreground"}>{disabledUsers.length}</strong> deprovisioned</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last sync: {fmtDate(cfg.last_sync_at ?? new Date().toISOString())}
            </div>
          </div>
        </>
      )}

      {/* External ID reference — §5: lineage (where did these users come from?) */}
      {cfg?.enabled && users.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">User Lineage</p>
          <p className="text-xs text-muted-foreground">
            Each SCIM-provisioned user is linked to their IdP external ID (e.g. <code className="font-mono">okta-user-00Abc123</code>).
            This ID is stored in Keycloak as <code className="font-mono">attributes.scim_external_id</code> and is used to match the user across future SCIM updates.
            The SCIM record ID shown to the IdP maps via the <code className="font-mono">scim_users</code> table — never from Keycloak directly.
          </p>
        </div>
      )}
    </Layout>
  );
}
