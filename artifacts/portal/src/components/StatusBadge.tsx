import { cn } from "@/lib/utils";

type Status =
  | "active" | "provisioning" | "error" | "suspended" | "deleted"
  | "pending" | "invited" | "owner" | "admin" | "billing" | "viewer"
  | "public" | "confidential" | "required" | "optional" | "disabled"
  | "starter" | "growth" | "enterprise";

const STATUS_MAP: Record<Status, { label: string; className: string }> = {
  active:       { label: "Active",        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  provisioning: { label: "Provisioning",  className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  error:        { label: "Error",         className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
  suspended:    { label: "Suspended",     className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  deleted:      { label: "Deleted",       className: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  pending:      { label: "Pending",       className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  invited:      { label: "Invited",       className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800" },
  owner:        { label: "Owner",         className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800" },
  admin:        { label: "Admin",         className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  billing:      { label: "Billing",       className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800" },
  viewer:       { label: "Viewer",        className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  public:       { label: "Public",        className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800" },
  confidential: { label: "Confidential",  className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
  required:     { label: "PKCE Required", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  optional:     { label: "PKCE Optional", className: "bg-slate-50 text-slate-600 border-slate-200" },
  disabled:     { label: "PKCE Off",      className: "bg-red-50 text-red-600 border-red-200" },
  starter:      { label: "Starter",       className: "bg-slate-50 text-slate-600 border-slate-200" },
  growth:       { label: "Growth",        className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400" },
  enterprise:   { label: "Enterprise",    className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400" },
};

interface Props {
  status: Status | string;
  className?: string;
  dot?: boolean;
}

const DOT_COLORS: Record<string, string> = {
  active: "bg-emerald-500", provisioning: "bg-blue-500 animate-pulse",
  error: "bg-red-500", suspended: "bg-amber-500",
  invited: "bg-violet-500", pending: "bg-slate-400",
};

export function StatusBadge({ status, className, dot = false }: Props) {
  const config = STATUS_MAP[status as Status] ?? { label: status, className: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", config.className, className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[status] ?? "bg-slate-400")} />}
      {config.label}
    </span>
  );
}
