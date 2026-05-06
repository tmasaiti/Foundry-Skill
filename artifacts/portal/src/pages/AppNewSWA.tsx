import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { MOCK_WORKSPACES } from "@/lib/mockData";
import { Check, ChevronRight, Globe, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["App Details", "Login Form", "Review & Create"];

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : n}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-3 h-px w-8", done ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  mono,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {mono && (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            CSS selector
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export default function AppNewSWA() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [workspaceId, setWorkspaceId] = useState(MOCK_WORKSPACES[0].id);

  const [loginUrl, setLoginUrl] = useState("");
  const [usernameSelector, setUsernameSelector] = useState("");
  const [passwordSelector, setPasswordSelector] = useState("");
  const [submitSelector, setSubmitSelector] = useState("");
  const [sharedCredentials, setSharedCredentials] = useState(false);

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const ws = MOCK_WORKSPACES.find((w) => w.id === workspaceId);

  async function handleCreate() {
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setCreating(false);
    setCreated(true);
    setTimeout(() => navigate("/apps"), 1800);
  }

  if (created) {
    return (
      <Layout
        breadcrumbs={[{ label: "Apps", href: "/apps" }, { label: "New SWA App" }]}
        title="New SWA App"
      >
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold text-foreground">SWA app created successfully</p>
          <p className="text-sm text-muted-foreground">
            The browser plugin will inject credentials at the configured login URL. Redirecting…
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbs={[{ label: "Apps", href: "/apps" }, { label: "New SWA App" }]}
      title="New SWA App"
    >
      <StepIndicator step={step} />

      {step === 1 && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 flex items-start gap-3">
            <Globe className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-800">
              <strong>Secure Web Authentication (SWA)</strong> — Foundry IAM's browser plugin
              injects stored credentials into the application's login form. Use SWA only when the
              application does not support OIDC or SAML. No client secret is issued; credentials are
              stored encrypted per user.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <Field
              label="Application name"
              required
              hint="Human-readable label shown in the app catalog and audit logs."
            >
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. Legacy HR Portal, Internal Wiki"
                className={INPUT_CLS}
              />
            </Field>

            <Field
              label="Application URL"
              required
              hint="The homepage or launch URL of the application. This is what users click to start SSO."
            >
              <input
                type="url"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://app.example.com"
                className={cn(INPUT_CLS, "font-mono text-xs")}
              />
            </Field>

            <Field
              label="Workspace"
              required
              hint="The workspace this app belongs to. Credentials are scoped per workspace."
            >
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className={INPUT_CLS}
              >
                {MOCK_WORKSPACES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!appName.trim() || !appUrl.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Next: Login Form <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              CSS selectors must uniquely identify form fields. Open your browser's DevTools (F12),
              right-click a field, and choose <strong>Inspect</strong> to copy the selector. Use
              the most specific selector available (e.g. <code className="font-mono text-xs">#username</code> or{" "}
              <code className="font-mono text-xs">input[name="email"]</code>).
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <Field
              label="Login page URL"
              hint="The URL of the page containing the login form. Leave blank if it is the same as the Application URL."
            >
              <input
                type="url"
                value={loginUrl}
                onChange={(e) => setLoginUrl(e.target.value)}
                placeholder="https://app.example.com/login  (optional)"
                className={cn(INPUT_CLS, "font-mono text-xs")}
              />
            </Field>

            <Field label="Username field selector" required mono hint="The CSS selector for the username or email input.">
              <input
                type="text"
                value={usernameSelector}
                onChange={(e) => setUsernameSelector(e.target.value)}
                placeholder='#username  or  input[name="email"]'
                className={cn(INPUT_CLS, "font-mono text-xs")}
              />
            </Field>

            <Field label="Password field selector" required mono hint="The CSS selector for the password input.">
              <input
                type="text"
                value={passwordSelector}
                onChange={(e) => setPasswordSelector(e.target.value)}
                placeholder='#password  or  input[type="password"]'
                className={cn(INPUT_CLS, "font-mono text-xs")}
              />
            </Field>

            <Field label="Submit button selector" required mono hint="The CSS selector for the login/submit button.">
              <input
                type="text"
                value={submitSelector}
                onChange={(e) => setSubmitSelector(e.target.value)}
                placeholder='button[type="submit"]  or  #login-btn'
                className={cn(INPUT_CLS, "font-mono text-xs")}
              />
            </Field>

            <div className="pt-2 border-t border-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5 shrink-0">
                  <button
                    role="switch"
                    aria-checked={sharedCredentials}
                    onClick={() => setSharedCredentials((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      sharedCredentials ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        sharedCredentials ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Shared credentials</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    All users share one set of credentials stored by an admin. If off, each user
                    sets their own credentials the first time they launch the app.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!usernameSelector.trim() || !passwordSelector.trim() || !submitSelector.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Next: Review & Create <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Review your SWA application</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Creating this app registers it in the workspace. No OIDC client or client secret is
                issued — the browser plugin handles credential injection.
              </p>
            </div>

            {(
              [
                ["Protocol", "SWA — Secure Web Authentication"],
                ["Application name", appName],
                ["Application URL", appUrl],
                ["Workspace", ws?.name ?? workspaceId],
                ["Login page URL", loginUrl || "(same as Application URL)"],
                ["Username selector", usernameSelector],
                ["Password selector", passwordSelector],
                ["Submit selector", submitSelector],
                ["Credentials mode", sharedCredentials ? "Shared (admin-set)" : "Per-user (self-service)"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex gap-4 px-5 py-3 border-b border-border/60 last:border-0">
                <div className="w-40 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</div>
                <div className="text-sm text-foreground font-mono text-xs break-all">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              After creation, assign this app to users or groups in your workspace directory.
              The Foundry IAM browser extension will auto-fill the login form when a user launches
              the app.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {creating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating…
                </>
              ) : (
                "Create SWA App"
              )}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
