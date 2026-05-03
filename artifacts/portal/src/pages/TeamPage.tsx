import { useState } from "react";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_ADMINS, MOCK_WORKSPACES } from "@/lib/mockData";
import { UserPlus, Trash2, RefreshCw, Users, Crown, ShieldCheck, Receipt, Eye, AlertTriangle, Clock, CheckCircle } from "lucide-react";

const ROLE_PERMISSIONS: Record<string, { label: string; icon: React.ElementType; permissions: string[] }> = {
  owner:   { label: "Owner", icon: Crown, permissions: ["Full control", "Billing access", "Delete tenant", "Manage all admins"] },
  admin:   { label: "Admin", icon: ShieldCheck, permissions: ["Manage apps & workspaces", "Invite admins", "View audit logs", "No billing access"] },
  billing: { label: "Billing", icon: Receipt, permissions: ["View & manage subscription", "Access invoices", "No app/workspace changes"] },
  viewer:  { label: "Viewer", icon: Eye, permissions: ["Read-only access", "No write operations", "Can view apps & logs"] },
};

export default function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [wsFilter, setWsFilter] = useState("all");
  const [resentFor, setResentFor] = useState<string | null>(null);

  const filtered = wsFilter === "all" ? MOCK_ADMINS : MOCK_ADMINS.filter(a => a.workspace_id === wsFilter);
  const pendingInvites = MOCK_ADMINS.filter(a => a.status === "invited");

  const handleResendInvite = (id: string) => {
    setResentFor(id);
    setTimeout(() => setResentFor(null), 3000);
  };

  const formatExpiry = (isoDate: string | null) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, daysLeft };
  };

  return (
    <Layout
      breadcrumbs={[{ label: "Team" }]}
      title="Team"
      actions={
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <UserPlus className="h-4 w-4" /> Invite member
        </button>
      }
    >
      {/* Pending invitation banner — "waiting on them, not you" framing */}
      {pendingInvites.length > 0 && (
        <div className="mb-5 space-y-2">
          {pendingInvites.map((admin) => {
            const expiry = formatExpiry(admin.invite_expires_at);
            const isExpired = expiry !== null && expiry.daysLeft < 0;
            return (
              <div key={admin.id} className={`rounded-xl border border-l-4 px-4 py-3.5 flex items-start gap-3 ${isExpired ? "border-red-200 border-l-red-500 bg-red-50/60" : "border-amber-200 border-l-amber-500 bg-amber-50/60"}`}>
                <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${isExpired ? "text-red-600" : "text-amber-600"}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isExpired ? "text-red-800" : "text-amber-800"}`}>
                    {admin.full_name} hasn't accepted their invitation
                  </p>
                  <p className={`text-xs mt-0.5 ${isExpired ? "text-red-700" : "text-amber-700"}`}>
                    {isExpired
                      ? `Invite expired — they cannot access the portal. Re-invite to restore access.`
                      : `Invited by ${admin.invited_by} · ${expiry ? `Expires ${expiry.label} (${expiry.daysLeft} day${expiry.daysLeft !== 1 ? "s" : ""} left)` : "Pending"}`
                    }
                  </p>
                  {!isExpired && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      Until accepted: they cannot log in to the portal and have no access to any resources.
                    </p>
                  )}
                </div>
                {resentFor === admin.id ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 whitespace-nowrap">
                    <CheckCircle className="h-3.5 w-3.5" /> Invite resent
                  </span>
                ) : (
                  <button
                    onClick={() => handleResendInvite(admin.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-100 border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-colors whitespace-nowrap"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend invite
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Object.entries(ROLE_PERMISSIONS).map(([role, { label, icon: Icon }]) => {
          const count = MOCK_ADMINS.filter(a => a.role === role).length;
          return (
            <div key={role} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{count}</div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select
          value={wsFilter}
          onChange={(e) => setWsFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All workspaces</option>
          {MOCK_WORKSPACES.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} member{filtered.length !== 1 ? "s" : ""}</span>
        {pendingInvites.length > 0 && (
          <span className="text-sm text-amber-600 font-medium">· {pendingInvites.length} pending</span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Added</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((admin) => {
              const RoleIcon = ROLE_PERMISSIONS[admin.role]?.icon ?? Users;
              const isInvited = admin.status === "invited";
              const expiry = formatExpiry(admin.invite_expires_at);
              const isExpired = expiry !== null && expiry.daysLeft < 0;
              const wasResentNow = resentFor === admin.id;

              return (
                <tr
                  key={admin.id}
                  className={`transition-colors ${
                    isInvited
                      ? isExpired
                        ? "bg-red-50/40 hover:bg-red-50/60 border-l-4 border-l-red-400"
                        : "bg-amber-50/40 hover:bg-amber-50/60 border-l-4 border-l-amber-400"
                      : "hover:bg-muted/20"
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isInvited ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                      }`}>
                        {admin.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{admin.full_name}</div>
                        <div className="text-xs text-muted-foreground">{admin.email}</div>
                        {isInvited && admin.invited_by && (
                          <div className="flex items-center gap-1 text-xs text-amber-700 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Invited by {admin.invited_by}
                            {expiry && (
                              <span className={`ml-1 ${isExpired ? "text-red-600 font-medium" : ""}`}>
                                · {isExpired ? "Expired" : `Expires ${expiry.label}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <RoleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <StatusBadge status={admin.role} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <StatusBadge status={admin.status} dot />
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-muted-foreground">{new Date(admin.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isInvited && (
                        wasResentNow ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle className="h-3 w-3" /> Resent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResendInvite(admin.id)}
                            className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" /> Resend
                          </button>
                        )
                      )}
                      {admin.role !== "owner" && (
                        <button
                          onClick={() => setRemoveId(admin.id)}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role reference */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Role permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(ROLE_PERMISSIONS).map(([role, { label, icon: Icon, permissions }]) => (
            <div key={role} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
              <ul className="space-y-1">
                {permissions.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Remove confirm dialog */}
      {removeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Remove team member?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>{MOCK_ADMINS.find(a => a.id === removeId)?.full_name}</strong> will lose all portal access immediately.
                  If they are logged in, their session will be terminated within 5 minutes.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRemoveId(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => setRemoveId(null)} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-opacity">Remove member</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-semibold text-foreground mb-4">Invite team member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
                <input type="text" placeholder="Alex Rivera" className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                <input type="email" placeholder="alex@company.com" className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <select className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="admin">Admin — manage apps & workspaces</option>
                  <option value="billing">Billing — subscription & invoices only</option>
                  <option value="viewer">Viewer — read-only access</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Workspace</label>
                <select className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {MOCK_WORKSPACES.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              They will receive an invitation email. The link expires in 7 days.
              Until they accept, they have no access to any resources.
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setInviteOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => setInviteOpen(false)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">Send invite</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
