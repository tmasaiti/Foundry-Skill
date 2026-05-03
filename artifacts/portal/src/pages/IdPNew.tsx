import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { CopyButton } from "@/components/CopyButton";
import {
  ChevronRight, Plus, Trash2, CheckCircle2, AlertTriangle, Info, Check,
} from "lucide-react";

type ProviderType = "okta" | "azure" | "google" | "github" | "oidc" | "saml";

interface AttributeMapper {
  id: number;
  upstream_claim: string;
  user_attribute: string;
  sync_mode: "inherit" | "force";
}

const PROVIDER_TILES: Array<{
  type: ProviderType;
  label: string;
  protocol: string;
  description: string;
  abbr: string;
  color: string;
  bg: string;
}> = [
  {
    type: "okta",
    label: "Okta",
    protocol: "OIDC",
    description: "Okta workforce SSO — auto-derives all URLs from your Okta domain",
    abbr: "Ok",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  {
    type: "azure",
    label: "Azure AD",
    protocol: "SAML",
    description: "Microsoft Entra ID / Azure Active Directory via SAML 2.0",
    abbr: "Az",
    color: "text-teal-700",
    bg: "bg-teal-100",
  },
  {
    type: "google",
    label: "Google Workspace",
    protocol: "OIDC",
    description: "Google Workspace — restrict to a hosted domain (e.g. acme.com)",
    abbr: "G",
    color: "text-red-700",
    bg: "bg-red-100",
  },
  {
    type: "github",
    label: "GitHub",
    protocol: "OAuth2",
    description: "GitHub OAuth — optionally restrict to an organization",
    abbr: "GH",
    color: "text-slate-700",
    bg: "bg-slate-200",
  },
  {
    type: "oidc",
    label: "Generic OIDC",
    protocol: "OIDC",
    description: "Any OIDC 1.0-compliant provider — full manual configuration",
    abbr: "OI",
    color: "text-violet-700",
    bg: "bg-violet-100",
  },
  {
    type: "saml",
    label: "Generic SAML",
    protocol: "SAML",
    description: "Any SAML 2.0 IdP — upload metadata XML or enter manually",
    abbr: "SA",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
];

const DEFAULT_MAPPERS: Record<ProviderType, AttributeMapper[]> = {
  okta: [
    { id: 1, upstream_claim: "email", user_attribute: "email", sync_mode: "inherit" },
    { id: 2, upstream_claim: "given_name", user_attribute: "firstName", sync_mode: "inherit" },
    { id: 3, upstream_claim: "family_name", user_attribute: "lastName", sync_mode: "inherit" },
  ],
  azure: [
    { id: 1, upstream_claim: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", user_attribute: "email", sync_mode: "inherit" },
    { id: 2, upstream_claim: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname", user_attribute: "firstName", sync_mode: "inherit" },
    { id: 3, upstream_claim: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname", user_attribute: "lastName", sync_mode: "inherit" },
  ],
  google: [
    { id: 1, upstream_claim: "email", user_attribute: "email", sync_mode: "inherit" },
    { id: 2, upstream_claim: "given_name", user_attribute: "firstName", sync_mode: "inherit" },
  ],
  github: [
    { id: 1, upstream_claim: "login", user_attribute: "username", sync_mode: "inherit" },
    { id: 2, upstream_claim: "email", user_attribute: "email", sync_mode: "inherit" },
  ],
  oidc: [
    { id: 1, upstream_claim: "email", user_attribute: "email", sync_mode: "inherit" },
    { id: 2, upstream_claim: "given_name", user_attribute: "firstName", sync_mode: "inherit" },
    { id: 3, upstream_claim: "family_name", user_attribute: "lastName", sync_mode: "inherit" },
  ],
  saml: [
    { id: 1, upstream_claim: "email", user_attribute: "email", sync_mode: "inherit" },
    { id: 2, upstream_claim: "firstName", user_attribute: "firstName", sync_mode: "inherit" },
  ],
};

const CALLBACK_URL = "https://id.foundry-iam.dev/realms/tnt_01h9xk2p3q4r5s6t7u8v/broker/{alias}/endpoint";
const SAML_ACS_URL = "https://id.foundry-iam.dev/realms/tnt_01h9xk2p3q4r5s6t7u8v/broker/{alias}/endpoint";
const SAML_SP_META = "https://id.foundry-iam.dev/realms/tnt_01h9xk2p3q4r5s6t7u8v/broker/{alias}/endpoint/descriptor";

function ConfigForm({
  type, alias, config, onChange,
}: {
  type: ProviderType;
  alias: string;
  config: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const field = (key: string, label: string, placeholder: string, secret = false, hint?: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <input
        type={secret ? "password" : "text"}
        value={config[key] ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  if (type === "okta") return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
        <strong>Okta setup:</strong> System apps → Create App Integration → OIDC → Web App. Add the callback URL from Step 3.
        All other URLs are auto-derived from your Okta domain.
      </div>
      {field("okta_domain", "Okta Domain", "acme.okta.com", false, "Your Okta tenant domain, without https://")}
      {field("client_id", "Client ID", "0oa1abc2defGHIJK")}
      {field("client_secret", "Client Secret", "••••••••••••••••", true)}
      {field("alias", "Alias", "acme-okta", false, "URL-safe slug, unique within this workspace")}
      {field("display_name", "Button Label", "Sign in with Acme Corp", false, "Shown on the login button")}
    </div>
  );

  if (type === "azure") return (
    <div className="space-y-4">
      <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs text-teal-800">
        <strong>Azure AD setup:</strong> Azure Portal → Enterprise Applications → New → Non-gallery → SAML. Use the SP Metadata URL from Step 3.
        Auto-derives all SAML endpoint URLs from Tenant ID.
      </div>
      {field("tenant_id", "Tenant ID", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", false, "Azure AD directory (tenant) ID — SAML URLs are auto-derived from this")}
      {field("signing_certificate", "Signing Certificate (Base64)", "MIIC...", false, "Download from Azure: SAML Signing Certificate → Base64 → Certificate")}
      {field("alias", "Alias", "acme-azure")}
      {field("display_name", "Button Label", "Sign in with Azure AD")}
    </div>
  );

  if (type === "google") return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
        <strong>Google setup:</strong> Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application). Add the callback URL as an authorised redirect URI.
      </div>
      {field("client_id", "Client ID", "GOOGLE_CLIENT_ID.apps.googleusercontent.com")}
      {field("client_secret", "Client Secret", "GOCSPX-••••••••••••", true)}
      {field("hosted_domain", "Hosted Domain", "acme.com", false, "Restrict sign-in to this G Suite domain. Leave blank to allow all Google accounts.")}
      {field("alias", "Alias", "google")}
      {field("display_name", "Button Label", "Sign in with Google")}
    </div>
  );

  if (type === "github") return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
        <strong>GitHub setup:</strong> GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Add the callback URL as the Authorization callback URL.
      </div>
      {field("client_id", "Client ID", "Iv1.abc123def456")}
      {field("client_secret", "Client Secret", "••••••••••••••••", true)}
      {field("organization", "Organization (optional)", "acme-corp", false, "Restrict to members of this GitHub organization. Leave blank to allow all GitHub users.")}
      {field("alias", "Alias", "github")}
      {field("display_name", "Button Label", "Sign in with GitHub")}
    </div>
  );

  if (type === "oidc") return (
    <div className="space-y-4">
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-800">
        <strong>Tip:</strong> Point your browser to <code className="font-mono">https://your-idp/.well-known/openid-configuration</code> to look up all endpoint URLs.
      </div>
      {field("authorization_url", "Authorization URL", "https://your-idp.com/oauth2/v1/authorize")}
      {field("token_url", "Token URL", "https://your-idp.com/oauth2/v1/token")}
      {field("user_info_url", "UserInfo URL", "https://your-idp.com/oauth2/v1/userinfo")}
      {field("jwks_url", "JWKS URL", "https://your-idp.com/oauth2/v1/keys")}
      {field("issuer", "Issuer", "https://your-idp.com")}
      {field("client_id", "Client ID", "client_id_here")}
      {field("client_secret", "Client Secret", "••••••••••••••••", true)}
      {field("scopes", "Scopes", "openid profile email groups", false, "Space-separated list")}
      {field("alias", "Alias", "my-oidc-idp")}
      {field("display_name", "Button Label", "Sign in with My IdP")}
    </div>
  );

  if (type === "saml") return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs text-indigo-800">
        <strong>Tip:</strong> Upload your IdP's metadata XML below to auto-populate all fields, or enter them manually.
      </div>
      {field("single_sign_on_service_url", "SSO URL", "https://your-idp.com/sso/saml")}
      {field("single_logout_service_url", "SLO URL (optional)", "https://your-idp.com/slo/saml")}
      {field("idp_entity_id", "IdP Entity ID", "https://your-idp.com/entity")}
      {field("signing_certificate", "Signing Certificate (Base64)", "MIIC...")}
      {field("alias", "Alias", "my-saml-idp")}
      {field("display_name", "Button Label", "Sign in with My IdP")}
    </div>
  );

  return null;
}

export default function IdPNew() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [callbackChecked, setCallbackChecked] = useState(false);
  const [mappers, setMappers] = useState<AttributeMapper[]>([]);
  const [mapperCounter, setMapperCounter] = useState(100);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const alias = config.alias ?? (selectedType ?? "");
  const displayName = config.display_name ?? "";

  const isSaml = selectedType === "azure" || selectedType === "saml";
  const callbackUrl = CALLBACK_URL.replace("{alias}", alias || "{alias}");
  const samlAcs = SAML_ACS_URL.replace("{alias}", alias || "{alias}");
  const samlMeta = SAML_SP_META.replace("{alias}", alias || "{alias}");

  function handleProviderSelect(type: ProviderType) {
    setSelectedType(type);
    setConfig({});
    setMappers(DEFAULT_MAPPERS[type]);
    setStep(2);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 900);
  }

  const STEPS = ["Provider", "Configure", "Callback URL", "Mappers", "Save & Test"];

  const selectedTile = PROVIDER_TILES.find((t) => t.type === selectedType);

  return (
    <Layout
      breadcrumbs={[
        { label: "Identity Providers", href: "/identity-providers" },
        { label: "Add Provider" },
      ]}
      title="Add Identity Provider"
    >
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={n} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : n}
                </div>
                <span
                  className={`text-xs font-medium ${
                    active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-3 h-px w-8 ${done ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Provider Selection */}
      {step === 1 && (
        <div>
          <p className="mb-5 text-sm text-muted-foreground">
            Select your identity provider. For known providers, Foundry IAM pre-fills endpoint URLs automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDER_TILES.map((tile) => (
              <button
                key={tile.type}
                onClick={() => handleProviderSelect(tile.type)}
                className="rounded-xl border border-border bg-card px-4 py-4 text-left transition-all hover:border-primary hover:shadow-sm group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tile.bg} ${tile.color}`}>
                    {tile.abbr}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {tile.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{tile.protocol}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tile.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Configuration Form */}
      {step === 2 && selectedType && (
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${selectedTile?.bg} ${selectedTile?.color}`}>
              {selectedTile?.abbr}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{selectedTile?.label} Configuration</h2>
              <p className="text-xs text-muted-foreground">{selectedTile?.protocol} • {selectedTile?.description}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <ConfigForm
              type={selectedType}
              alias={alias}
              config={config}
              onChange={(k, v) => setConfig((prev) => ({ ...prev, [k]: v }))}
            />
          </div>
          <div className="flex justify-between mt-5">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!config.alias || !config.display_name}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Next: Callback URL <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Callback URL (§2: business rules visible before commit) */}
      {step === 3 && (
        <div className="max-w-2xl">
          <div className="rounded-xl border border-border bg-card p-5 mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-1">Register These URLs in Your IdP</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Your upstream IdP will only accept redirects to pre-registered URLs. If you skip this step,
              the integration will fail when users try to log in.
            </p>

            {isSaml ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">ACS URL (Assertion Consumer Service)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border border-border bg-muted px-3 py-1.5 text-xs font-mono break-all">{samlAcs}</code>
                    <CopyButton text={samlAcs} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">SP Metadata URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border border-border bg-muted px-3 py-1.5 text-xs font-mono break-all">{samlMeta}</code>
                    <CopyButton text={samlMeta} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Paste this into your IdP's 'Import from URL' field to auto-populate all SP settings.</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Redirect URI / Callback URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border border-border bg-muted px-3 py-1.5 text-xs font-mono break-all">{callbackUrl}</code>
                  <CopyButton text={callbackUrl} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {selectedType === "okta" && "In Okta App Settings → General → Add this as a Sign-in redirect URI."}
                  {selectedType === "google" && "In Google Cloud Console → OAuth client → Authorized redirect URIs."}
                  {selectedType === "github" && "In GitHub OAuth App → Authorization callback URL."}
                  {selectedType === "oidc" && "In your IdP's application settings — register this as the redirect URI."}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 mb-5 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Required before saving:</strong> The callback URL above must be registered in your IdP application before you continue.
              If it is not registered, users will see an "invalid redirect" error when logging in.
            </p>
          </div>

          <label className="flex items-start gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={callbackChecked}
              onChange={(e) => setCallbackChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="text-sm text-foreground">
              I have registered the callback URL in my IdP application settings.
            </span>
          </label>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!callbackChecked}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Next: Attribute Mappers <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Attribute Mappers */}
      {step === 4 && (
        <div className="max-w-2xl">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-1">Attribute Mappers</h2>
            <p className="text-xs text-muted-foreground">
              These rules copy claims from the upstream IdP token into the Foundry IAM user profile.
              Default mappers for {selectedTile?.label} are pre-filled. Add custom claim mappings as needed.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Upstream Claim</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Foundry IAM Attribute</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Sync Mode</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mappers.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">
                      <input
                        value={m.upstream_claim}
                        onChange={(e) =>
                          setMappers((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, upstream_claim: e.target.value } : x))
                          )
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={m.user_attribute}
                        onChange={(e) =>
                          setMappers((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, user_attribute: e.target.value } : x))
                          )
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell">
                      <select
                        value={m.sync_mode}
                        onChange={(e) =>
                          setMappers((prev) =>
                            prev.map((x) =>
                              x.id === m.id ? { ...x, sync_mode: e.target.value as "inherit" | "force" } : x
                            )
                          )
                        }
                        className="rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                      >
                        <option value="inherit">Inherit</option>
                        <option value="force">Force</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setMappers((prev) => prev.filter((x) => x.id !== m.id))}
                        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => {
              setMapperCounter((n) => n + 1);
              setMappers((prev) => [
                ...prev,
                { id: mapperCounter, upstream_claim: "", user_attribute: "", sync_mode: "inherit" },
              ]);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors mb-5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Mapper
          </button>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Review & Create <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 5 — Review & Save */}
      {step === 5 && (
        <div className="max-w-2xl">
          {!saved ? (
            <>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-foreground mb-1">Review Configuration</h2>
                <p className="text-xs text-muted-foreground">Check the details below before creating the identity provider.</p>
              </div>

              <div className="rounded-xl border border-border bg-card divide-y divide-border mb-5">
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-xs text-muted-foreground">Provider Type</span>
                  <span className="text-xs font-medium text-foreground">{selectedTile?.label} ({selectedTile?.protocol})</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-xs text-muted-foreground">Button Label</span>
                  <span className="text-xs font-medium text-foreground">{displayName || "—"}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-xs text-muted-foreground">Alias</span>
                  <code className="text-xs font-mono text-foreground">{alias || "—"}</code>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-xs text-muted-foreground">Attribute Mappers</span>
                  <span className="text-xs font-medium text-foreground">{mappers.length} configured</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-xs text-muted-foreground">Callback URL Registered</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 mb-5 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  After saving, the login button will appear on the <code className="font-mono">tnt_01h9xk2p3q4r5s6t7u8v</code> realm
                  login page immediately. Test the flow using the Test button that appears after creation.
                  You can edit all settings from the provider detail page.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {saving ? "Creating…" : "Create Identity Provider"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-foreground mb-1">Identity Provider Created</h2>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>{displayName}</strong> (<code className="font-mono text-xs">{alias}</code>) is now active.
                The login button is live on the realm login page.
              </p>
              <p className="text-xs text-muted-foreground mb-5">
                Callback URL: <code className="font-mono">{callbackUrl}</code>
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://id.foundry-iam.dev/realms/tnt_01h9xk2p3q4r5s6t7u8v/broker/${alias}/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Test Authentication Flow
                </a>
                <Link href="/identity-providers">
                  <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    Back to Identity Providers
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
