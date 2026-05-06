import { useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { DetailNav } from "@/components/DetailNav";
import { MOCK_IDENTITY_PROVIDERS } from "@/lib/mockData";
import {
  AlertTriangle, CheckCircle2, ExternalLink, Plus, Trash2, Edit2,
  Clock, User, Globe, Info, Network, Save, X,
} from "lucide-react";

type SyncMode = "inherit" | "force" | "legacy";

interface Mapper {
  id: string | number;
  upstream_claim: string;
  user_attribute: string;
  sync_mode: SyncMode;
}

const TYPE_LABELS: Record<string, { label: string; proto: string }> = {
  oidc:      { label: "Generic OIDC",     proto: "OIDC / OpenID Connect" },
  saml:      { label: "Generic SAML",     proto: "SAML 2.0" },
  google:    { label: "Google Workspace", proto: "OIDC" },
  github:    { label: "GitHub",           proto: "OAuth 2.0" },
  microsoft: { label: "Microsoft",        proto: "OIDC" },
  okta:      { label: "Okta",             proto: "OIDC" },
  azure:     { label: "Azure AD",         proto: "SAML 2.0" },
};

const PROVIDER_INSTRUCTIONS: Record<string, string> = {
  oidc:   "Add this as a redirect URI in your IdP application settings.",
  saml:   "Register the SP Metadata URL in your IdP's SAML app configuration.",
  google: "Add to Google Cloud Console → OAuth client → Authorized redirect URIs.",
  github: "Set as Authorization callback URL in your GitHub OAuth App.",
  okta:   "Add as a Sign-in redirect URI in your Okta App → General → Login.",
  azure:  "Set as Reply URL in Azure Portal → Enterprise Applications → SAML configuration.",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className ?? ""}`}>
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ReadonlyField({ label, value, mono = false, hint }: { label: string; value: string; mono?: boolean; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <div className={`flex-1 rounded border border-border bg-muted/40 px-3 py-1.5 text-sm ${mono ? "font-mono text-xs" : ""} text-foreground truncate`}>
          {value}
        </div>
        <CopyButton text={value} />
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function IdPDetail() {
  const params = useParams<{ id: string }>();
  const idp = MOCK_IDENTITY_PROVIDERS.find((p) => p.id === params.id);

  const [enabled, setEnabled] = useState(idp?.enabled ?? true);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [mappers, setMappers] = useState<Mapper[]>(
    (idp?.attribute_mappers ?? []).map((m, i) => ({
      id: m.id ?? i,
      upstream_claim: m.upstream_claim,
      user_attribute: m.user_attribute,
      sync_mode: (m.sync_mode as SyncMode) ?? "inherit",
    }))
  );
  const [mapperCounter, setMapperCounter] = useState(200);
  const [editingMapper, setEditingMapper] = useState<string | number | null>(null);
  const [domains, setDomains] = useState<string[]>(idp?.domain_hints ?? []);
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState("");
  const [mappersSaved, setMappersSaved] = useState(false);

  if (!idp) {
    return (
      <Layout breadcrumbs={[{ label: "Identity Providers", href: "/identity-providers" }, { label: "Not Found" }]}>
        <div className="rounded-xl border border-border bg-card px-8 py-14 text-center">
          <Network className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Identity provider not found</p>
          <Link href="/identity-providers">
            <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Back to Identity Providers
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const idpIndex = MOCK_IDENTITY_PROVIDERS.findIndex((p) => p.id === params.id);
  const prevIdp = idpIndex > 0 ? MOCK_IDENTITY_PROVIDERS[idpIndex - 1] : null;
  const nextIdp = idpIndex < MOCK_IDENTITY_PROVIDERS.length - 1 ? MOCK_IDENTITY_PROVIDERS[idpIndex + 1] : null;

  const typeInfo = TYPE_LABELS[idp.type] ?? { label: idp.type, proto: idp.type };
  const realm = "tnt_01h9xk2p3q4r5s6t7u8v";
  const callbackUrl = `https://id.foundry-iam.dev/realms/${realm}/broker/${idp.alias}/endpoint`;
  const samlMetaUrl = `https://id.foundry-iam.dev/realms/${realm}/broker/${idp.alias}/endpoint/descriptor`;
  const testUrl = `https://id.foundry-iam.dev/realms/${realm}/broker/${idp.alias}/login`;
  const isSaml = (idp.type as string) === "saml" || idp.type === "azure";

  function addDomain() {
    const d = newDomain.trim().toLowerCase().replace(/^@/, "");
    if (!d) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) {
      setDomainError("Enter a valid domain (e.g. acme.com)");
      return;
    }
    if (domains.includes(d)) {
      setDomainError("This domain is already added");
      return;
    }
    setDomains((prev) => [...prev, d]);
    setNewDomain("");
    setDomainError("");
  }

  function saveMappers() {
    setMappersSaved(true);
    setTimeout(() => setMappersSaved(false), 2000);
  }

  return (
    <Layout
      breadcrumbs={[
        { label: "Identity Providers", href: "/identity-providers" },
        { label: idp.display_name },
      ]}
      title={idp.display_name}
      actions={
        <a
          href={testUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Test Authentication
        </a>
      }
    >
      <DetailNav
        backHref="/identity-providers"
        backLabel="All Identity Providers"
        prevHref={prevIdp ? `/identity-providers/${prevIdp.id}` : null}
        nextHref={nextIdp ? `/identity-providers/${nextIdp.id}` : null}
        prevLabel={prevIdp?.display_name}
        nextLabel={nextIdp?.display_name}
      />

      {/* Header — WHO, WHAT STATUS, WHAT CAN I DO */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 mb-5 flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-semibold text-foreground">{idp.display_name}</h1>
              {enabled ? <StatusBadge status="active" dot /> : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Disabled
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <code className="text-xs font-mono text-muted-foreground">{idp.alias}</code>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{typeInfo.proto}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{idp.workspace_name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabled ? (
            <button
              onClick={() => setShowDisableModal(true)}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Disable Provider
            </button>
          ) : (
            <button
              onClick={() => setEnabled(true)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Enable Provider
            </button>
          )}
        </div>
      </div>

      {/* Exception surface: disabled warning */}
      {!enabled && (
        <div className="mb-5 rounded-xl border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Login button is hidden — users cannot authenticate via this provider</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Existing sessions issued before disabling remain valid until their token expires.
              Re-enable to restore the login button on the <code className="font-mono">{realm}</code> realm.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Callback URLs — Give These to Your IdP */}
        <Section title="Callback URLs — Give These to Your IdP">
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {PROVIDER_INSTRUCTIONS[idp.type] ?? "Register these URLs in your IdP application settings."}
            </p>
          </div>
          <div className="space-y-3">
            <ReadonlyField
              label={isSaml ? "ACS URL (Assertion Consumer Service)" : "Redirect URI / Callback URL"}
              value={callbackUrl}
              mono
            />
            {isSaml && (
              <ReadonlyField
                label="SP Metadata URL"
                value={samlMetaUrl}
                mono
                hint="Paste this into your IdP's 'Import metadata from URL' field to auto-populate SP settings."
              />
            )}
          </div>
        </Section>

        {/* Configuration (secrets redacted) */}
        <Section title="Configuration">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <div className="rounded border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground">{typeInfo.label}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Sync Mode</label>
                <div className="rounded border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground capitalize">{idp.sync_mode}</div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Client Secret / Signing Certificate
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded border border-border bg-muted/40 px-3 py-1.5 text-sm font-mono text-muted-foreground">
                  ••••••••••••••••••••••••
                </div>
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                  Update Secret
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Secrets are stored encrypted and never displayed. Click Update Secret to rotate.
              </p>
            </div>
          </div>
        </Section>

        {/* Attribute Mappers */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Attribute Mappers</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Copy claims from the upstream IdP token into the Foundry IAM user profile. Changes apply to new logins.
              </p>
            </div>
            {mappersSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Upstream Claim</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Foundry IAM Attribute</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Sync Mode</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mappers.map((m) => (
                  <tr key={m.id} className="group">
                    <td className="px-4 py-2">
                      {editingMapper === m.id ? (
                        <input
                          value={m.upstream_claim}
                          onChange={(e) =>
                            setMappers((prev) =>
                              prev.map((x) => (x.id === m.id ? { ...x, upstream_claim: e.target.value } : x))
                            )
                          }
                          className="w-full rounded border border-primary bg-background px-2 py-1 text-xs font-mono focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <code className="text-xs font-mono text-foreground">{m.upstream_claim}</code>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingMapper === m.id ? (
                        <input
                          value={m.user_attribute}
                          onChange={(e) =>
                            setMappers((prev) =>
                              prev.map((x) => (x.id === m.id ? { ...x, user_attribute: e.target.value } : x))
                            )
                          }
                          className="w-full rounded border border-primary bg-background px-2 py-1 text-xs focus:outline-none"
                        />
                      ) : (
                        <span className="text-xs text-foreground">{m.user_attribute}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell">
                      <select
                        value={m.sync_mode}
                        onChange={(e) =>
                          setMappers((prev) =>
                            prev.map((x) =>
                              x.id === m.id ? { ...x, sync_mode: e.target.value as SyncMode } : x
                            )
                          )
                        }
                        className="rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                      >
                        <option value="inherit">Inherit</option>
                        <option value="force">Force</option>
                        <option value="legacy">Legacy</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingMapper(editingMapper === m.id ? null : m.id)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title={editingMapper === m.id ? "Done" : "Edit"}
                        >
                          {editingMapper === m.id ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setMappers((prev) => prev.filter((x) => x.id !== m.id))}
                          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-5 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                setMapperCounter((n) => n + 1);
                setMappers((prev) => [
                  ...prev,
                  { id: mapperCounter, upstream_claim: "", user_attribute: "", sync_mode: "inherit" },
                ]);
                setEditingMapper(mapperCounter);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Mapper
            </button>
            <button
              onClick={saveMappers}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Save className="h-3.5 w-3.5" /> Save Mappers
            </button>
          </div>
        </div>

        {/* Domain Routing */}
        <Section title="Email Domain Routing">
          <p className="text-xs text-muted-foreground mb-3">
            Users whose email domain matches are automatically redirected to this provider without seeing the password field
            (Home Realm Discovery). No domains = users must click the login button manually.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {domains.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No domains configured — manual provider selection only</span>
            ) : (
              domains.map((d) => (
                <span key={d} className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-mono text-foreground">
                  @{d}
                  <button
                    onClick={() => setDomains((prev) => prev.filter((x) => x !== d))}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => { setNewDomain(e.target.value); setDomainError(""); }}
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
              placeholder="acme.com"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={addDomain}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {domainError && <p className="mt-1.5 text-xs text-destructive">{domainError}</p>}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Two providers in the same workspace cannot claim the same domain. A conflict will be rejected when saving.
          </p>
        </Section>

        {/* Record Lineage (§5: records must show lineage) */}
        <Section title="Record Lineage">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Created {fmtDate(idp.created_at)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              By {idp.created_by}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              Workspace: {idp.workspace_name}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Last login: {fmtDate(idp.last_login_at)}
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <strong className="text-foreground">Login count (30d):</strong>{" "}
            {idp.login_count_30d.toLocaleString()} authentication{idp.login_count_30d !== 1 ? "s" : ""}
            {" "}brokered through this provider.
          </div>
        </Section>

        {/* Danger Zone */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5">
          <div className="border-b border-destructive/20 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Delete Identity Provider</p>
                <p className="text-xs text-muted-foreground">
                  Removes this IdP from the Keycloak realm immediately. The login button disappears from the realm login page.
                  Federated users retain their user record but their SSO link is broken — they will not be able to log in
                  via this provider. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="shrink-0 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                Delete Provider
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">Disable Identity Provider?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The <strong>{idp.display_name}</strong> login button will be removed from the realm login page immediately.
              Users who depend on this provider will not be able to log in until you re-enable it.
              Existing sessions remain valid until their token expires.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisableModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => { setEnabled(false); setShowDisableModal(false); }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Disable Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (alias confirmation) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-base font-semibold text-destructive mb-2">Delete Identity Provider?</h3>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 mb-4 text-xs text-destructive">
              <strong>This cannot be undone.</strong> Federated users will lose their SSO link. They will not be able to log in
              via {idp.display_name} until a new provider with the same alias is configured.
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Type <code className="font-mono text-foreground">{idp.alias}</code> to confirm deletion.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={idp.alias}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mb-4 focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirm !== idp.alias}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-40"
              >
                Delete Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
