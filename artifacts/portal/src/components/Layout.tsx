import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Boxes, Layers, Users, CreditCard,
  ScrollText, Settings, LogOut, ChevronRight, Shield,
  Bell, Menu, X, Key, RefreshCcw, Network
} from "lucide-react";
import { useState } from "react";
import { MOCK_TENANT } from "@/lib/mockData";

const NAV = [
  { href: "/",           icon: LayoutDashboard, label: "Dashboard" },
  { href: "/apps",       icon: Boxes,           label: "Apps" },
  { href: "/saml",       icon: Key,             label: "SAML" },
  { href: "/scim",       icon: RefreshCcw,      label: "SCIM" },
  { href: "/identity-providers", icon: Network, label: "Federation" },
  { href: "/workspaces", icon: Layers,          label: "Workspaces" },
  { href: "/team",       icon: Users,           label: "Team" },
  { href: "/billing",    icon: CreditCard,      label: "Billing" },
  { href: "/audit-logs", icon: ScrollText,      label: "Audit Logs" },
  { href: "/settings",   icon: Settings,        label: "Settings" },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function Layout({ children, title, breadcrumbs, actions }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground",
      mobile ? "w-full" : "w-60 shrink-0"
    )}>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/20">
          <Shield className="h-4 w-4 text-sidebar-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-sidebar-foreground">Foundry IAM</div>
          <div className="text-xs text-sidebar-foreground/50">Control Plane</div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-sidebar-border">
        <div className="rounded-md bg-sidebar-accent/60 px-3 py-2">
          <div className="text-xs text-sidebar-foreground/50 uppercase tracking-wider mb-1">Tenant</div>
          <div className="text-sm font-medium text-sidebar-foreground truncate">{MOCK_TENANT.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              MOCK_TENANT.status === "active" ? "bg-emerald-400" : "bg-amber-400"
            )} />
            <span className="text-xs text-sidebar-foreground/60 capitalize">{MOCK_TENANT.plan}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {active && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-semibold text-sidebar-primary">
            {user?.avatar_initials ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</div>
            <div className="text-xs text-sidebar-foreground/50 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground/80 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 shadow-xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            {!breadcrumbs && title && (
              <h1 className="text-base font-semibold text-foreground">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
            {title && breadcrumbs && (
              <h1 className="text-xl font-semibold text-foreground mb-6">{title}</h1>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
