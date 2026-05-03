import { useState } from "react";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_TENANT, MOCK_USAGE, MOCK_PLANS } from "@/lib/mockData";
import { Check, X, Zap, TrendingUp, CreditCard, Receipt, ExternalLink, Info, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const INVOICES = [
  { id: "INV-2024-010", date: "Nov 1, 2024", amount: "$399.00", status: "paid" as const },
  { id: "INV-2024-009", date: "Oct 1, 2024", amount: "$399.00", status: "paid" as const },
  { id: "INV-2024-008", date: "Sep 1, 2024", amount: "$399.00", status: "paid" as const },
];

const DAYS_REMAINING_IN_CYCLE = 16;

export default function BillingPage() {
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);

  const currentPlan = MOCK_PLANS.find(p => p.id === MOCK_TENANT.plan)!;
  const targetPlan = MOCK_PLANS.find(p => p.id === upgradeTarget);
  const mauLimit = typeof currentPlan.mau_included === "number" && currentPlan.mau_included !== -1 ? currentPlan.mau_included : Infinity;
  const mauPct = mauLimit === Infinity ? 0 : Math.round((MOCK_USAGE.mau / mauLimit) * 100);
  const overageMAU = Math.max(0, MOCK_USAGE.mau - (mauLimit === Infinity ? 0 : mauLimit));
  const estimatedOverage = overageMAU * currentPlan.overage_rate;

  const isUpgrade = targetPlan ? MOCK_PLANS.findIndex(p => p.id === targetPlan.id) > MOCK_PLANS.findIndex(p => p.id === MOCK_TENANT.plan) : false;
  const proratedCharge = targetPlan ? Math.round((targetPlan.monthly_fee / 30) * DAYS_REMAINING_IN_CYCLE) : 0;
  const proratedCredit = Math.round((currentPlan.monthly_fee / 30) * DAYS_REMAINING_IN_CYCLE);
  const proratedNet = proratedCharge - proratedCredit;

  const getFeaturesGained = () => {
    if (!targetPlan) return [];
    const currentIdx = MOCK_PLANS.findIndex(p => p.id === MOCK_TENANT.plan);
    const targetIdx = MOCK_PLANS.findIndex(p => p.id === targetPlan.id);
    if (targetIdx > currentIdx) {
      return targetPlan.features.filter(f => !currentPlan.features.includes(f));
    }
    return [];
  };

  const getWorkspaceLimit = (plan: typeof MOCK_PLANS[0]) =>
    plan.workspaces === "unlimited" ? "Unlimited" : `${plan.workspaces} max`;

  return (
    <Layout breadcrumbs={[{ label: "Billing" }]} title="Billing">
      {/* Current plan + usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current plan</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{currentPlan.name}</span>
                <StatusBadge status={currentPlan.id as any} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                ${currentPlan.monthly_fee}/month · {currentPlan.sla} uptime SLA
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Estimated next invoice</div>
              <div className="text-xl font-bold text-foreground mt-0.5">
                ${(currentPlan.monthly_fee + estimatedOverage).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Dec 1, 2024 · {DAYS_REMAINING_IN_CYCLE} days away</div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">MAU Usage</span>
              <span className="text-sm text-muted-foreground">
                {MOCK_USAGE.mau.toLocaleString()} / {mauLimit === Infinity ? "∞" : mauLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(mauPct, 100)}%`,
                  background: mauPct > 90 ? "hsl(0 72% 51%)" : mauPct > 75 ? "hsl(38 92% 50%)" : "hsl(231 48% 48%)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{mauPct}% of included MAU used</span>
              {overageMAU > 0 && <span className="text-amber-600">+{overageMAU.toLocaleString()} overage × ${currentPlan.overage_rate}/MAU = ${estimatedOverage.toFixed(2)}</span>}
            </div>
          </div>

          {mauPct > 70 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                You're at {mauPct}% of your MAU limit. New logins are blocked above the limit.{" "}
                <button onClick={() => setUpgradeTarget("enterprise")} className="underline font-medium">Upgrade now</button>
              </p>
            </div>
          )}
        </div>

        {/* MAU bar chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold text-foreground mb-1">6-month trend</div>
          <div className="text-xs text-muted-foreground mb-3">Monthly active users</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_USAGE.monthly_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(214 32% 91%)", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [v.toLocaleString(), "MAU"]} />
                <ReferenceLine y={mauLimit === Infinity ? undefined : mauLimit} stroke="hsl(38 92% 50%)" strokeDasharray="3 3" />
                <Bar dataKey="mau" fill="hsl(231 48% 48%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {mauLimit !== Infinity && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
              <span className="h-2 w-4 border-t-2 border-dashed border-amber-500" />
              <span>Plan limit ({mauLimit.toLocaleString()})</span>
            </div>
          )}
        </div>
      </div>

      {/* Plans comparison */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Available plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MOCK_PLANS.map((plan) => {
            const isCurrent = plan.id === MOCK_TENANT.plan;
            return (
              <div key={plan.id} className={`rounded-xl border p-5 ${isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30 transition-colors"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-foreground">{plan.name}</span>
                  {isCurrent && <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">Current</span>}
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">${plan.monthly_fee}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t border-border/60">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Overage rate</span>
                    <span>{plan.overage_rate === 0 ? "Included" : `$${plan.overage_rate}/MAU`}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-4">
                    <span>SLA</span>
                    <span>{plan.sla}</span>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => setUpgradeTarget(plan.id)}
                      className={`w-full rounded-lg py-2 text-sm font-medium transition-opacity ${plan.id === "enterprise" ? "bg-violet-600 text-white hover:opacity-90" : plan.monthly_fee > currentPlan.monthly_fee ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border text-foreground hover:bg-muted"}`}
                    >
                      <Zap className="inline h-3.5 w-3.5 mr-1" />
                      {MOCK_PLANS.findIndex(p => p.id === plan.id) > MOCK_PLANS.findIndex(p => p.id === MOCK_TENANT.plan) ? "Upgrade" : "Downgrade"} to {plan.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <CreditCard className="h-3.5 w-3.5" /> Manage payment method
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Invoice", "Date", "Amount", "Status", ""].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {INVOICES.map((inv) => (
              <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-foreground">{inv.id}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{inv.date}</td>
                <td className="px-5 py-3.5 font-medium text-foreground">{inv.amount}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Paid
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button className="flex items-center gap-1 text-xs text-primary hover:underline ml-auto">
                    <Receipt className="h-3 w-3" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upgrade/downgrade modal — full consequence preview (§A5) */}
      {upgradeTarget && targetPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3 mb-5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isUpgrade ? "bg-primary/10" : "bg-amber-100"}`}>
                <Zap className={`h-4.5 w-4.5 ${isUpgrade ? "text-primary" : "text-amber-600"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {isUpgrade ? "Upgrade" : "Downgrade"} to {targetPlan.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review the changes below before confirming
                </p>
              </div>
            </div>

            {/* Plan comparison */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Current</div>
                  <div className="font-semibold text-foreground">{currentPlan.name}</div>
                  <div className="text-lg font-bold text-foreground">${currentPlan.monthly_fee}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">New</div>
                  <div className="font-semibold text-foreground">{targetPlan.name}</div>
                  <div className={`text-lg font-bold ${isUpgrade ? "text-primary" : "text-amber-600"}`}>${targetPlan.monthly_fee}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                </div>
              </div>
              <div className={`text-center text-sm font-semibold ${isUpgrade ? "text-primary" : "text-amber-600"}`}>
                {isUpgrade ? "+" : ""}${targetPlan.monthly_fee - currentPlan.monthly_fee}/month
              </div>
            </div>

            {/* What changes */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {isUpgrade ? "What you're gaining" : "What you're losing"}
              </div>
              <div className="space-y-1.5">
                {isUpgrade && getFeaturesGained().map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
                {/* Workspace limit change */}
                <div className={`flex items-center gap-2 text-sm ${isUpgrade ? "text-emerald-700" : "text-amber-700"}`}>
                  {isUpgrade ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  Workspaces: {getWorkspaceLimit(currentPlan)} → <strong>{getWorkspaceLimit(targetPlan)}</strong>
                </div>
                {/* MAU limit change */}
                <div className={`flex items-center gap-2 text-sm ${isUpgrade ? "text-emerald-700" : "text-amber-700"}`}>
                  {isUpgrade ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  MAU cap: {currentPlan.mau_included === -1 ? "Custom" : currentPlan.mau_included.toLocaleString()} → <strong>{targetPlan.mau_included === -1 ? "Custom" : targetPlan.mau_included.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Proration breakdown */}
            <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing breakdown</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prorated credit (unused {DAYS_REMAINING_IN_CYCLE} days of {currentPlan.name})</span>
                <span className="text-emerald-600 font-medium">−${proratedCredit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prorated charge ({DAYS_REMAINING_IN_CYCLE} days of {targetPlan.name})</span>
                <span className="font-medium text-foreground">+${proratedCharge}</span>
              </div>
              <div className="pt-2 border-t border-border/60 flex justify-between text-sm font-semibold">
                <span className="text-foreground">Charged today</span>
                <span className={proratedNet > 0 ? "text-foreground" : "text-emerald-600"}>${Math.abs(proratedNet)} {proratedNet < 0 ? "credit" : ""}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-muted-foreground">Next full invoice (Dec 1)</span>
                <span className="font-medium text-foreground">${targetPlan.monthly_fee}.00</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground mb-5">
              <strong>Takes effect:</strong> Immediately upon confirming. You'll be redirected to Stripe to complete payment.
              Cancellation is available at any time — plan reverts at end of the billing period.
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setUpgradeTarget(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                Confirm & pay ${Math.abs(proratedNet)} now <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
