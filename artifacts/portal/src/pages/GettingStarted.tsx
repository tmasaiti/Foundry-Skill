import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import {
  CheckCircle2, Circle, Users, Boxes, UserPlus, ShieldCheck,
  Lock, ChevronRight, Sparkles, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  completionHint: string;
  ctaLabel: string;
  ctaHref: string;
  done: boolean;
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: "add-app",
    icon: Boxes,
    title: "Add an app to use Single Sign-On",
    description:
      "Create your first OIDC application and get a Client ID and Issuer URL. A developer can have working auth in under 30 minutes.",
    completionHint: "Completed when your first app is created in a workspace.",
    ctaLabel: "Add App",
    ctaHref: "/apps",
    done: false,
  },
  {
    id: "add-users",
    icon: Users,
    title: "Add users to Foundry IAM",
    description:
      "Invite your team or configure SCIM to automatically sync users from Okta, Azure AD, or Workday. Manual invites work too.",
    completionHint: "Completed when at least one non-owner user exists in your workspace.",
    ctaLabel: "Import Users",
    ctaHref: "/team",
    done: false,
  },
  {
    id: "add-admin",
    icon: UserPlus,
    title: "Add another workspace admin",
    description:
      "Share access to the control plane with a colleague. Admins can manage apps, configure SAML, and view audit logs.",
    completionHint: "Completed when a second admin has been invited.",
    ctaLabel: "Add Admin",
    ctaHref: "/team",
    done: false,
  },
  {
    id: "select-auth",
    icon: ShieldCheck,
    title: "Select authentication method",
    description:
      "Choose how your users verify their identity — password, TOTP, WebAuthn, or a combination. Foundry IAM supports all standard MFA methods.",
    completionHint: "Completed when MFA policy is set to a non-default value.",
    ctaLabel: "Select Authenticators",
    ctaHref: "/settings",
    done: false,
  },
  {
    id: "require-mfa",
    icon: Lock,
    title: "Require MFA to access Foundry IAM",
    description:
      "Enforce MFA for all admin logins to the control plane itself. Recommended for SOC 2 and ISO 27001 compliance programmes.",
    completionHint: "Completed when MFA policy is set to required-all.",
    ctaLabel: "Configure Policy",
    ctaHref: "/settings",
    done: false,
  },
];

function ChecklistCard({
  item,
  onToggle,
  index,
}: {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  index: number;
}) {
  const Icon = item.icon;
  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-5 py-4 transition-all",
        item.done
          ? "border-emerald-200 bg-emerald-50/40 opacity-70"
          : "border-border hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Completion toggle */}
        <button
          onClick={() => onToggle(item.id)}
          className="mt-0.5 shrink-0 transition-transform hover:scale-110"
          title={item.done ? "Mark incomplete" : "Mark complete"}
        >
          {item.done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/40" />
          )}
        </button>

        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            item.done ? "bg-emerald-100" : "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-4.5 w-4.5",
              item.done ? "text-emerald-600" : "text-muted-foreground"
            )}
            style={{ height: "1.125rem", width: "1.125rem" }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                className={cn(
                  "text-sm font-semibold",
                  item.done ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
            {!item.done && (
              <Link href={item.ctaHref}>
                <button className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap">
                  {item.ctaLabel} <ChevronRight className="h-3 w-3" />
                </button>
              </Link>
            )}
          </div>

          {/* Step number badge */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60">Step {index + 1}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs text-muted-foreground/60">{item.completionHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GettingStarted() {
  const [items, setItems] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total;

  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  }

  return (
    <Layout
      breadcrumbs={[{ label: "Getting Started" }]}
      title="Getting Started"
    >
      {/* Hero — progress overview */}
      <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {allDone
                  ? "You're all set!"
                  : `${completed} of ${total} steps complete`}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allDone
                  ? "Your workspace is fully configured. Explore advanced features below."
                  : "Complete these steps to get your first users authenticating via Foundry IAM."}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-foreground">{pct}%</div>
            <div className="text-xs text-muted-foreground">complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3 mb-8">
        {items.map((item, i) => (
          <ChecklistCard
            key={item.id}
            item={item}
            onToggle={toggleItem}
            index={i}
          />
        ))}
      </div>

      {/* Quick access cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Explore the platform</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              href: "/apps",
              title: "Applications",
              desc: "Manage OIDC clients and view token usage",
              badge: null,
            },
            {
              href: "/saml",
              title: "SAML 2.0",
              desc: "Register enterprise service providers",
              badge: "Growth+",
            },
            {
              href: "/scim",
              title: "SCIM Provisioning",
              desc: "Automate user sync from Okta or Azure AD",
              badge: "Growth+",
            },
            {
              href: "/identity-providers",
              title: "Federation / BYO IdP",
              desc: "Connect Okta, Azure AD, Google Workspace",
              badge: "Enterprise",
            },
            {
              href: "/audit-logs",
              title: "Audit Logs",
              desc: "Full control plane activity history",
              badge: null,
            },
            {
              href: "/billing",
              title: "Billing",
              desc: "Usage, plan limits, and invoices",
              badge: null,
            },
          ].map(({ href, title, desc, badge }) => (
            <Link key={href} href={href}>
              <div className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {title}
                  </p>
                  {badge && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-primary/60 transition-all mt-1 self-end" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
