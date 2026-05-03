import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_TENANT, MOCK_WORKSPACES, MOCK_APPS, MOCK_AUDIT_LOGS, MOCK_USAGE, MOCK_ADMINS } from "@/lib/mockData";
import { Boxes, Layers, Users, TrendingUp, Shield, ArrowUpRight, Clock, AlertTriangle, UserX, Cpu, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PLAN_MAU_LIMIT: Record<string, number> = { starter: 10000, growth: 50000, enterprise: Infinity };

export default function Dashboard() {
  const mauLimit = PLAN_MAU_LIMIT[MOCK_TENANT.plan];
  const mauPct = mauLimit === Infinity ? 0 : Math.round((MOCK_USAGE.mau / mauLimit) * 100);

  const errorApps = MOCK_APPS.filter(a => a.status === "error");
  const pendingInvites = MOCK_ADMINS.filter(a => a.status === "invited");

  const attentionItems = [
    ...errorApps.map(app => ({
      id: `app-error-${app.id}`,
      icon: AlertTriangle,
      severity: "critical" as const,
      title: `${app.name} — authentication failing`,
      description: (app as any).error_reason ?? "Token validation is failing for new requests.",
      consequence: "Users cannot log in to this app until resolved.",
      href: `/apps/${app.id}`,
      action: "Investigate",
    })),
    ...pendingInvites.map(admin => {
      const expires = admin.invite_expires_at ? new Date(admin.invite_expires_at) : null;
      const daysLeft = expires ? Math.ceil((expires.getTime() - Date.now()) / 86400000) : null;
      const expired = daysLeft !== null && daysLeft < 0;
      return {
        id: `invite-${admin.id}`,
        icon: UserX,
        severity: expired ? "critical" as const : "warning" as const,
        title: `${admin.full_name} hasn't accepted their invitation`,
        description: expired
          ? `Invite expired — they no longer have access. Re-invite to restore.`
          : `Invited by ${admin.invited_by} · ${daysLeft !== null ? `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : "Invite pending"}.`,
        consequence: expired ? "Access is blocked until re-invited." : "They cannot access the portal until they accept.",
        href: "/team",
        action: expired ? "Re-invite" : "Resend invite",
      };
    }),
  ];

  const PLAN_WS_LIMITS: Record<string, string> = { starter: "1", growth: "3", enterprise: "∞" };

  const stats = [
    { label: "Monthly Active Users", value: MOCK_USAGE.mau.toLocaleString(), sub: `${mauPct}% of ${mauLimit === Infinity ? "∞" : mauLimit.toLocaleString()} limit`, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", href: "/billing" },
    { label: "Total Apps", value: MOCK_APPS.length, sub: `${errorApps.length > 0 ? `${errorApps.length} in error` : "all healthy"}`, icon: Boxes, color: errorApps.length > 0 ? "text-red-600" : "text-blue-600", bg: errorApps.length > 0 ? "bg-red-50" : "bg-blue-50", href: "/apps" },
    { label: "Logins (30 days)", value: MOCK_USAGE.logins_30d.toLocaleString(), sub: "+12% vs last month", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", href: "/audit-logs" },
    { label: "Workspaces", value: MOCK_WORKSPACES.length, sub: `${PLAN_WS_LIMITS[MOCK_TENANT.plan] ?? "∞"} max on ${MOCK_TENANT.plan}`, icon: Layers, color: "text-violet-600", bg: "bg-violet-50", href: "/workspaces" },
  ];

  return (
    <Layout breadcrumbs={[{ label: "Dashboard" }]} title="Dashboard">

      {/* Requires attention — surfaces hidden workflows before the user has to hunt */}
      {attentionItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              {attentionItems.length} item{attentionItems.length !== 1 ? "s" : ""} require your attention
            </h3>
          </div>
          <div className="space-y-2">
            {attentionItems.map(item => {
              const borderColor = item.severity === "critical" ? "border-l-red-500 border-red-200 bg-red-50/60" : "border-l-amber-500 border-amber-200 bg-amber-50/60";
              const iconColor = item.severity === "critical" ? "text-red-600" : "text-amber-600";
              return (
                <div key={item.id} className={`rounded-xl border border-l-4 px-4 py-3.5 flex items-start gap-3 ${borderColor}`}>
                  <item.icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    <p className="text-xs font-medium text-foreground/70 mt-1">
                      If unresolved: {item.consequence}
                    </p>
                  </div>
                  <Link href={item.href} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0">
                    {item.action} <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tenant status bar */}
      <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{MOCK_TENANT.name}</span>
              <StatusBadge status={MOCK_TENANT.status} dot />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Tenant ID: <code className="font-mono text-xs">{MOCK_TENANT.id}</code> · Region: {MOCK_TENANT.region}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={MOCK_TENANT.plan} />
          <Link href="/billing" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            Manage plan <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* MAU progress */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">MAU Usage</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly Active Users · resets in 4 days</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">{MOCK_USAGE.mau.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground"> / {mauLimit === Infinity ? "∞" : mauLimit.toLocaleString()}</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(mauPct, 100)}%`,
              background: mauPct > 90 ? "hsl(0 72% 51%)" : mauPct > 75 ? "hsl(38 92% 50%)" : "hsl(231 48% 48%)",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{mauPct}% used</span>
          {mauPct > 75 && (
            <Link href="/billing" className="text-xs font-medium text-primary hover:underline">
              Upgrade before limit reached →
            </Link>
          )}
        </div>
      </div>

      {/* Stats grid — subtexts reflect operational state, not vanity counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-3`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-sm font-medium text-foreground mt-0.5">{label}</div>
              <div className={`text-xs mt-0.5 ${sub.includes("error") || sub.includes("expired") ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAU trend — chart reveals growth trajectory and proximity to plan cap */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">MAU Trend</h3>
              <p className="text-xs text-muted-foreground">Monthly active users over 6 months</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <TrendingUp className="h-3.5 w-3.5" /> +65% YoY
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_USAGE.monthly_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mauGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(231 48% 48%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(231 48% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(v: number) => [v.toLocaleString(), "MAU"]}
                />
                <Area type="monotone" dataKey="mau" stroke="hsl(231 48% 48%)" strokeWidth={2} fill="url(#mauGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity — shows what changed and who changed it */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <Link href="/audit-logs" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {MOCK_AUDIT_LOGS.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5 ${log.severity === "high" ? "bg-red-100" : log.severity === "medium" ? "bg-amber-100" : "bg-muted"}`}>
                  <Activity className={`h-3 w-3 ${log.severity === "high" ? "text-red-600" : log.severity === "medium" ? "text-amber-600" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{log.actor_email}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(log.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workspace + App quick overview — status drives visual hierarchy */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Workspaces</h3>
            <Link href="/workspaces" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {MOCK_WORKSPACES.map((ws) => (
              <Link key={ws.id} href={`/workspaces/${ws.id}`}>
                <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{ws.name}</span>
                      {ws.is_default && <span className="text-xs text-muted-foreground">(default)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{ws.app_count} apps · {ws.mau.toLocaleString()} MAU</div>
                  </div>
                  <StatusBadge status={ws.status} dot />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Apps</h3>
            <Link href="/apps" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {MOCK_APPS.map((app) => (
              <Link key={app.id} href={`/apps/${app.id}`}>
                <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer ${app.status === "error" ? "border-red-200 bg-red-50/40" : "border-border/60"}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${app.status === "error" ? "bg-red-100" : "bg-muted"}`}>
                    <Cpu className={`h-3.5 w-3.5 ${app.status === "error" ? "text-red-600" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{app.name}</div>
                    <div className="text-xs text-muted-foreground">{app.workspace_name}</div>
                  </div>
                  <StatusBadge status={app.status} dot />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
