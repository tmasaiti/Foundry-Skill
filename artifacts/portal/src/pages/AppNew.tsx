import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { MOCK_WORKSPACES } from "@/lib/mockData";
import {
  Check, ChevronRight, Plus, Trash2, Info, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppType = "public" | "confidential";
type PkceMode = "required" | "optional";

const STEPS = ["Name & Type", "Redirect URIs", "Token Lifetimes", "Review & Create"];

const SCOPES_LOCKED = ["openid", "profile", "email"];
const SCOPES_OPTIONAL = ["offline_access", "roles", "groups", "address", "phone"];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
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
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export default function AppNew() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  // Step 1
  const [appName, setAppName] = useState("");
  const [appType, setAppType] = useState<AppType>("public");
  const [pkce, setPkce] = useState<PkceMode>("required");
  const [workspaceId, setWorkspaceId] = useState(MOCK_WORKSPACES[0].id);

  // Step 2
  const [redirectUris, setRedirectUris] = useState<string[]>([""]);
  const [postLogoutUris, setPostLogoutUris] = useState<string[]>([""]);
  const [webOrigins, setWebOrigins] = useState<string[]>([""]);

  // Step 3
  const [accessTokenMins, setAccessTokenMins] = useState(15);
  const [refreshTokenDays, setRefreshTokenDays] = useState(30);
  const [extraScopes, setExtraScopes] = useState<Set<string>>(new Set());

  // Step 4
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const validRedirects = redirectUris.filter((u) => u.trim().length > 0);

  function toggleScope(s: string) {
    setExtraScopes((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function addUri(
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter([...list, ""]);
  }

  function updateUri(
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    i: number,
    val: string
  ) {
    const next = [...list];
    next[i] = val;
    setter(next);
  }

  function removeUri(
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    i: number
  ) {
    setter(list.filter((_, idx) => idx !== i));
  }

  function uriListField(
    label: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    required: boolean,
    placeholder: string,
    hint: string
  ) {
    return (
      <Field label={label} required={required} hint={hint}>
        <div className="space-y-2">
          {list.map((uri, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={uri}
                onChange={(e) => updateUri(list, setter, i, e.target.value)}
                placeholder={placeholder}
                className={cn(INPUT_CLS, "flex-1 font-mono text-xs")}
              />
              {list.length > 1 && (
                <button
                  onClick={() => removeUri(list, setter, i)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addUri(list, setter)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add another
          </button>
        </div>
      </Field>
    );
  }

  async function handleCreate() {
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setCreating(false);
    setCreated(true);
    setTimeout(() => navigate("/apps"), 1600);
  }

  const ws = MOCK_WORKSPACES.find((w) => w.id === workspaceId);
  const allScopes = [...SCOPES_LOCKED, ...Array.from(extraScopes)];

  if (created) {
    return (
      <Layout
        breadcrumbs={[{ label: "Apps", href: "/apps" }, { label: "New App" }]}
        title="New App"
      >
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold text-foreground">App created successfully</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to your app list — copy the Client ID and Issuer URL to start integrating.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbs={[{ label: "Apps", href: "/apps" }, { label: "New App" }]}
      title="New App"
    >
      <StepIndicator step={step} />

      {/* ── Step 1: Name & Type ── */}
      {step === 1 && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Creating an OIDC app provisions a Keycloak client in your selected workspace realm.
              You'll receive a <strong>Client ID</strong> and <strong>Issuer URL</strong> immediately on creation.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <Field
              label="Application name"
              required
              hint="Human-readable label shown in audit logs and this portal. Not visible to end users."
            >
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. Acme Web App, Mobile App, Backend API"
                className={INPUT_CLS}
              />
            </Field>

            <Field
              label="Workspace"
              required
              hint="The Keycloak realm this client will be created in. Production and Staging realms are isolated."
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

            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Application type <span className="text-destructive">*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    {
                      value: "public" as AppType,
                      label: "Public",
                      sublabel: "SPA / mobile",
                      desc: "Browser or mobile apps that cannot keep a client secret. PKCE is required and pre-enabled.",
                    },
                    {
                      value: "confidential" as AppType,
                      label: "Confidential",
                      sublabel: "Server-side",
                      desc: "Backend apps that can securely store a client secret. A secret is issued on creation.",
                    },
                  ] as const
                ).map(({ value, label, sublabel, desc }) => (
                  <label
                    key={value}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all",
                      appType === value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-foreground/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="appType"
                      value={value}
                      checked={appType === value}
                      onChange={() => {
                        setAppType(value);
                        if (value === "public") setPkce("required");
                      }}
                      className="mt-1 accent-primary shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                        <span className="text-xs text-muted-foreground">{sublabel}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {appType === "confidential" && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">PKCE</p>
                <div className="flex gap-3">
                  {(
                    [
                      { value: "required" as PkceMode, label: "Required", desc: "Enforced even for confidential clients." },
                      { value: "optional" as PkceMode, label: "Optional", desc: "Allow either PKCE or client-secret auth." },
                    ] as const
                  ).map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex flex-1 items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all text-sm",
                        pkce === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="pkce"
                        value={value}
                        checked={pkce === value}
                        onChange={() => setPkce(value)}
                        className="mt-0.5 accent-primary shrink-0"
                      />
                      <div>
                        <span className="font-medium text-foreground">{label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {appType === "public" && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Public apps use PKCE (RFC 7636) and do not receive a client secret. Keycloak enforces
                  a code_challenge on every authorization request. This is the security default for SPAs and mobile.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!appName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Next: Redirect URIs <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Redirect URIs ── */}
      {step === 2 && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Keycloak will only redirect to URIs listed here. Unregistered URIs cause an{" "}
              <code className="font-mono text-xs">invalid_redirect_uri</code> error. HTTP localhost URIs are allowed in development; HTTPS is required in production.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            {uriListField(
              "Redirect URIs",
              redirectUris,
              setRedirectUris,
              true,
              "https://app.example.com/auth/callback",
              "The URL Keycloak sends the authorization code to after login. Add one per line for multiple environments."
            )}
            {uriListField(
              "Post-logout redirect URIs",
              postLogoutUris,
              setPostLogoutUris,
              false,
              "https://app.example.com/logged-out",
              "Where Keycloak redirects after the user signs out. Optional but strongly recommended."
            )}
            {uriListField(
              "Web origins",
              webOrigins,
              setWebOrigins,
              false,
              "https://app.example.com",
              "Allowed CORS origins. Required if your frontend and token endpoint are on different domains."
            )}
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
              disabled={validRedirects.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Next: Token Lifetimes <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Token Lifetimes ── */}
      {step === 3 && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-6">
            {/* Access token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">
                  Access token lifetime
                </label>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {accessTokenMins} min
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={accessTokenMins}
                onChange={(e) => setAccessTokenMins(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5 min</span>
                <span className="text-muted-foreground/60">Default: 15 min</span>
                <span>60 min</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                How long access tokens are valid before the client must refresh. Shorter lifetimes reduce the blast radius of token leaks.
                15 minutes is the recommended default.
              </p>
            </div>

            {/* Refresh token */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">
                  Refresh token lifetime
                </label>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {refreshTokenDays} day{refreshTokenDays !== 1 ? "s" : ""}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={90}
                step={1}
                value={refreshTokenDays}
                onChange={(e) => setRefreshTokenDays(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1 day</span>
                <span className="text-muted-foreground/60">Default: 30 days</span>
                <span>90 days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                How long a user stays logged in without re-authenticating. A longer lifetime is more convenient but increases exposure if a refresh token is stolen.
              </p>
            </div>

            {/* Scopes */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-1">Scopes</p>
              <p className="text-xs text-muted-foreground mb-3">
                <code className="font-mono">openid</code>, <code className="font-mono">profile</code>, and{" "}
                <code className="font-mono">email</code> are always included. Add optional scopes below.
              </p>
              <div className="flex flex-wrap gap-2">
                {SCOPES_LOCKED.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-mono text-primary"
                  >
                    {s} <span className="text-primary/50 ml-1">locked</span>
                  </span>
                ))}
                {SCOPES_OPTIONAL.map((s) => {
                  const on = extraScopes.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleScope(s)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-mono transition-all",
                        on
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/20"
                      )}
                    >
                      {on && <Check className="inline h-2.5 w-2.5 mr-1" />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Next: Review & Create <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review & Create ── */}
      {step === 4 && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Review your application</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A Keycloak client will be created when you click Create App. You can edit all settings afterwards.
              </p>
            </div>

            {/* Summary rows */}
            {(
              [
                ["Application name", appName],
                ["Workspace", ws?.name ?? workspaceId],
                ["Type", appType === "public" ? "Public (SPA / mobile)" : "Confidential (server-side)"],
                ["PKCE", appType === "public" ? "Required (locked for public apps)" : pkce === "required" ? "Required" : "Optional"],
                ["Redirect URIs", validRedirects.join("\n") || "—"],
                ["Post-logout URIs", postLogoutUris.filter((u) => u.trim()).join("\n") || "—"],
                ["Web origins", webOrigins.filter((u) => u.trim()).join("\n") || "—"],
                ["Access token lifetime", `${accessTokenMins} minutes`],
                ["Refresh token lifetime", `${refreshTokenDays} day${refreshTokenDays !== 1 ? "s" : ""}`],
                ["Scopes", allScopes.join(", ")],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex gap-4 px-5 py-3 border-b border-border/60 last:border-0">
                <dt className="w-44 shrink-0 text-xs font-medium text-muted-foreground pt-0.5">{label}</dt>
                <dd className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">{value}</dd>
              </div>
            ))}
          </div>

          {appType === "confidential" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                A <strong>client secret</strong> will be generated for this confidential app. It will be shown once
                in the App Detail page immediately after creation. Store it securely.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {creating ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Creating app…
                </>
              ) : (
                "Create App"
              )}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
