import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { MOCK_WORKSPACES } from "@/lib/mockData";
import { Check, ChevronRight, Cpu, Info, CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["App Details", "Scopes & Tokens", "Review & Create"];

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const AVAILABLE_SCOPES = [
  { id: "foundry:admin:read", desc: "Read tenant and workspace configuration" },
  { id: "foundry:admin:write", desc: "Modify tenant and workspace settings" },
  { id: "foundry:users:read", desc: "Read directory users and groups" },
  { id: "foundry:users:write", desc: "Create, update, and disable users" },
  { id: "foundry:apps:read", desc: "List and read app registrations" },
  { id: "foundry:apps:write", desc: "Create and modify app registrations" },
  { id: "foundry:audit:read", desc: "Read audit log events" },
  { id: "foundry:scim:read", desc: "Read SCIM provisioning config and users" },
  { id: "foundry:scim:write", desc: "Write SCIM provisioning data" },
];

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
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const MOCK_CLIENT_ID = "svc_" + Math.random().toString(36).slice(2, 18);
const MOCK_CLIENT_SECRET =
  "cs_live_" + Array.from({ length: 48 }, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join("");

export default function AppNewAPI() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  const [appName, setAppName] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState(MOCK_WORKSPACES[0].id);

  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(["foundry:apps:read"]));
  const [accessTokenMins, setAccessTokenMins] = useState(60);

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const ws = MOCK_WORKSPACES.find((w) => w.id === workspaceId);

  function toggleScope(id: string) {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setCreating(false);
    setCreated(true);
  }

  function copyText(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <Layout
        breadcrumbs={[{ label: "Apps", href: "/apps" }, { label: "New API Service" }]}
        title="New API Service"
      >
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">API service created — save your credentials now</p>
              <p className="text-xs text-emerald-700 mt-1">
                The client secret is shown <strong>only once</strong>. Copy it now and store it in a
                secret manager (e.g. AWS Secrets Manager, Vault). It cannot be retrieved again.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold text-foreground">{appName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use these credentials in your service to request access tokens via the{" "}
                <code className="font-mono">client_credentials</code> grant.
              </p>
            </div>

            <div className="divide-y divide-border/60">
              <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Client ID</p>
                  <p className="text-sm font-mono text-foreground truncate">{MOCK_CLIENT_ID}</p>
                </div>
                <button
                  onClick={() => copyText(MOCK_CLIENT_ID, setIdCopied)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {idCopied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Client Secret</p>
                  <p className="text-sm font-mono text-foreground truncate">
                    {secretVisible ? MOCK_CLIENT_SECRET : "•".repeat(32)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSecretVisible((v) => !v)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={secretVisible ? "Hide" : "Reveal"}
                  >
                    {secretVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => copyText(MOCK_CLIENT_SECRET, setSecretCopied)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {secretCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="px-5 py-3.5">
                <p className="text-xs text-muted-foreground mb-1">Token endpoint</p>
                <p className="text-xs font-mono text-foreground break-all">
                  {ws?.keycloak.issuer ?? "https://id.foundry-iam.dev/realms/…"}/protocol/openid-connect/token
                </p>
              </div>

              <div className="px-5 py-3.5">
                <p className="text-xs text-muted-foreground mb-1.5">Example request</p>
                <pre className="rounded-lg bg-muted px-3 py-2.5 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">{`curl -X POST \\
  ${ws?.keycloak.issuer ?? "https://id.foundry-iam.dev/realms/…"}/protocol/openid-connect/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=${MOCK_CLIENT_ID}" \\
  -d "client_secret=<YOUR_SECRET>"`}</pre>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => navigate("/apps")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Done — go to Apps
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbs={[{ label: "Apps", href: "/apps" }, { label: "New API Service" }]}
      title="New API Service"
    >
      <StepIndicator step={step} />

      {step === 1 && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 flex items-start gap-3">
            <Cpu className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">
              <strong>API Services</strong> — machine-to-machine OAuth 2.0 using the{" "}
              <code className="font-mono text-xs">client_credentials</code> grant. A{" "}
              <strong>Client ID</strong> and <strong>Client Secret</strong> are issued on creation.
              No user login occurs — your service authenticates directly to obtain a scoped access
              token.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <Field
              label="Service name"
              required
              hint="Human-readable label shown in audit logs. Not visible to end users."
            >
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. CI/CD Pipeline, Data Sync Worker, Reporting Service"
                className={INPUT_CLS}
              />
            </Field>

            <Field
              label="Description"
              hint="Optional — what does this service do? Helps future admins understand the purpose."
            >
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Reads user data nightly to sync to the analytics warehouse."
                className={cn(INPUT_CLS, "resize-none")}
              />
            </Field>

            <Field
              label="Workspace"
              required
              hint="The workspace this service client will be registered in. Production and Staging workspaces are isolated."
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
              disabled={!appName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Next: Scopes & Tokens <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5">
                Scopes <span className="text-destructive">*</span>
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Select the permissions this service needs. Grant only the minimum required — tokens
                are audited. At least one scope is required.
              </p>
              <div className="space-y-2">
                {AVAILABLE_SCOPES.map((s) => {
                  const on = selectedScopes.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                        on
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/20 hover:bg-muted/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleScope(s.id)}
                        className="mt-0.5 accent-primary shrink-0"
                      />
                      <div>
                        <code className="text-xs font-mono text-foreground font-semibold">{s.id}</code>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">Access token lifetime</label>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {accessTokenMins >= 60
                    ? `${accessTokenMins / 60} hour${accessTokenMins / 60 !== 1 ? "s" : ""}`
                    : `${accessTokenMins} min`}
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={480}
                step={15}
                value={accessTokenMins}
                onChange={(e) => setAccessTokenMins(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>15 min</span>
                <span className="text-muted-foreground/60">Default: 1 hour</span>
                <span>8 hours</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                M2M tokens are not user-facing, so longer lifetimes are acceptable. Tokens are
                cached by the client until expiry. Shorter lifetimes reduce blast radius if a
                secret is leaked.
              </p>
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
              disabled={selectedScopes.size === 0}
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
              <p className="text-sm font-semibold text-foreground">Review your API service</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A service client will be registered. A client secret will be generated
                and shown <strong>once</strong> — copy it immediately after creation.
              </p>
            </div>

            {(
              [
                ["Protocol", "OAuth 2.0 — client_credentials (M2M)"],
                ["Application type", "Confidential"],
                ["Service name", appName],
                ...(description ? [["Description", description] as [string, string]] : []),
                ["Workspace", ws?.name ?? workspaceId],
                [
                  "Scopes",
                  Array.from(selectedScopes).join("\n"),
                ],
                [
                  "Access token lifetime",
                  accessTokenMins >= 60
                    ? `${accessTokenMins / 60} hour${accessTokenMins / 60 !== 1 ? "s" : ""}`
                    : `${accessTokenMins} minutes`,
                ],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex gap-4 px-5 py-3 border-b border-border/60 last:border-0">
                <div className="w-44 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</div>
                <div className="text-xs text-foreground font-mono break-all whitespace-pre-line">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              The client secret will be displayed <strong>only once</strong> after creation. Have
              your secret manager ready before clicking Create.
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
                "Create API Service"
              )}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
