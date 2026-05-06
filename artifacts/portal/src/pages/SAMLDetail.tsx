import { useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { DetailNav } from "@/components/DetailNav";
import { MOCK_SAML_SPS, MOCK_WORKSPACES, MOCK_AUDIT_LOGS } from "@/lib/mockData";
import {
  AlertTriangle, CheckCircle2, Download, FlaskConical, ExternalLink,
  Plus, Trash2, Clock, User, ChevronDown, ChevronRight, Shield,
} from "lucide-react";

type Mapping = {
  id: number;
  keycloak_attribute: string;
  saml_attribute_name: string;
  saml_attribute_format: "Basic" | "URI";
  required: boolean;
};

const NAME_ID_LABELS: Record<string, string> = {
  email: "Email address",
  persistent: "Persistent",
  transient: "Transient",
  unspecified: "Unspecified",
};

const SP_GUIDES: Array<{
  key: string;
  name: string;
  steps: string[];
}> = [
  {
    key: "salesforce",
    name: "Salesforce",
    steps: [
      "In Salesforce: Setup → Identity → Single Sign-On Settings → New.",
      "Enable 'SAML Enabled'. Set Issuer to the Entity ID shown above.",
      "Paste the IdP Metadata URL into the 'Identity Provider Login URL' field, or upload the downloaded XML.",
      "Set Identity Type to 'Assertion contains the Federation ID'. Click Save.",
      "Create a Connected App and assign the SSO configuration to enable login.",
    ],
  },
  {
    key: "google",
    name: "Google Workspace",
    steps: [
      "In Google Admin: Apps → Web and mobile apps → Add App → Add custom SAML app.",
      "Enter a name and click Continue.",
      "Choose 'Upload IdP metadata' and upload the downloaded XML file.",
      "Set the ACS URL and Entity ID from your Google app's SSO settings. Click Continue.",
      "Map the email attribute to the Google primary email field. Save.",
    ],
  },
  {
    key: "azure",
    name: "Microsoft 365 / Azure AD",
    steps: [
      "In Azure Portal: Azure Active Directory → Enterprise Applications → New application → Non-gallery.",
      "Open the app → Single sign-on → SAML.",
      "In 'Basic SAML Configuration', set Identifier (Entity ID) and Reply URL (ACS URL) from above.",
      "In 'SAML Signing Certificate', download the Federation Metadata XML and import it.",
      "Assign users/groups to the application to allow access.",
    ],
  },
  {
    key: "generic",
    name: "Generic SP",
    steps: [
      "In your SP's SSO/Trust settings, locate the 'IdP Metadata URL' field.",
      "Paste the IdP Metadata URL — the SP will fetch Foundry IAM's signing certificate and endpoints automatically.",
      "If the SP requires manual entry: use the SSO URL as the Single Sign-On URL and the Entity ID as the IdP Issuer.",
      "Set the NameID format to match what you configured above.",
      "Map any required attributes from the Attribute Mappings table above.",
    ],
  },
];

function ConfigField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-border/60 last:border-0">
      <dt className="w-full sm:w-48 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5 flex-1 min-w-0">
        {value ? (
          <>
            <span
              className={`text-sm text-foreground truncate ${mono ? "font-mono text-xs" : ""}`}
            >
              {value}
            </span>
            <CopyButton text={value} />
          </>
        ) : (
          <span className="text-sm text-muted-foreground italic">Not configured</span>
        )}
      </dd>
    </div>
  );
}

export default function SAMLDetail() {
  const { sspId } = useParams<{ sspId: string }>();
  const sp = MOCK_SAML_SPS.find((s) => s.id === sspId);

  const [mappings, setMappings] = useState<Mapping[]>(
    (sp?.attribute_mappings ?? []).map((m, i) => ({ ...m, id: i + 1 }))
  );
  const [nextMappingId, setNextMappingId] = useState((sp?.attribute_mappings.length ?? 0) + 1);
  const [mappingsSaved, setMappingsSaved] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(sp?.name ?? "");
  const [editNameId, setEditNameId] = useState<string>(sp?.name_id_format ?? "email");
  const [editSign, setEditSign] = useState(sp?.sign_assertions ?? true);
  const [editEncrypt, setEditEncrypt] = useState(sp?.encrypt_assertions ?? false);
  const [editSaved, setEditSaved] = useState(false);

  const [guideOpen, setGuideOpen] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleted, setDeleted] = useState(false);

  const [enabled, setEnabled] = useState(sp?.status !== "disabled");

  if (!sp) {
    return (
      <Layout title="Not Found">
        <p className="text-muted-foreground">
          Service provider not found.{" "}
          <Link href="/saml" className="text-primary hover:underline">
            Back to SAML
          </Link>
        </p>
      </Layout>
    );
  }

  if (deleted) {
    return (
      <Layout
        breadcrumbs={[{ label: "SAML", href: "/saml" }, { label: sp.name }]}
        title={sp.name}
      >
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-base font-semibold text-foreground">
            {sp.name} has been removed
          </p>
          <p className="text-sm text-muted-foreground">
            The service provider has been removed from your workspace. SSO via this SP will no longer
            work.
          </p>
          <Link href="/saml">
            <button className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Back to SAML
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const spIndex = MOCK_SAML_SPS.findIndex((s) => s.id === sspId);
  const prevSp = spIndex > 0 ? MOCK_SAML_SPS[spIndex - 1] : null;
  const nextSp = spIndex < MOCK_SAML_SPS.length - 1 ? MOCK_SAML_SPS[spIndex + 1] : null;

  const ws = MOCK_WORKSPACES.find((w) => w.id === sp.workspace_id);
  const spLogs = MOCK_AUDIT_LOGS.filter((l) => l.resource_id === sp.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  const isDisabled = !enabled;

  function saveEdit() {
    setEditSaved(true);
    setTimeout(() => {
      setEditOpen(false);
      setEditSaved(false);
    }, 800);
  }

  function saveMappings() {
    setSavingMappings(true);
    setTimeout(() => {
      setSavingMappings(false);
      setMappingsSaved(true);
      setTimeout(() => setMappingsSaved(false), 2500);
    }, 800);
  }

  function addMapping() {
    setMappings((prev) => [
      ...prev,
      {
        id: nextMappingId,
        keycloak_attribute: "",
        saml_attribute_name: "",
        saml_attribute_format: "Basic",
        required: false,
      },
    ]);
    setNextMappingId((n) => n + 1);
  }

  function removeMapping(id: number) {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMapping(
    id: number,
    field: keyof Mapping,
    value: string | boolean
  ) {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  return (
    <Layout
      breadcrumbs={[{ label: "SAML", href: "/saml" }, { label: sp.name }]}
      title={sp.name}
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/saml/${sp.id}/test`}>
            <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <FlaskConical className="h-3.5 w-3.5" /> Test SSO
            </button>
          </Link>
        </div>
      }
    >
      <DetailNav
        backHref="/saml"
        backLabel="All SAML Providers"
        prevHref={prevSp ? `/saml/${prevSp.id}` : null}
        nextHref={nextSp ? `/saml/${nextSp.id}` : null}
        prevLabel={prevSp?.name}
        nextLabel={nextSp?.name}
      />

      {/* Q2: Exception callout if disabled */}
      {isDisabled && (
        <div className="mb-5 rounded-xl border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/70 px-4 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              This service provider is disabled — SSO requests will be rejected
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Users attempting to authenticate via {sp.name} will receive an error until this SP is
              re-enabled. No action is required at the SP side — the change takes effect immediately.
            </p>
            <button
              onClick={() => setEnabled(true)}
              className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Re-enable this SP
            </button>
          </div>
        </div>
      )}

      {/* ── Header card — Q1: identity + Q2: state ── */}
      <div
        className={`rounded-xl border bg-card px-5 py-4 mb-5 ${
          isDisabled ? "border-amber-200" : "border-border"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-foreground">{sp.name}</h2>
              {isDisabled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Disabled
                </span>
              ) : (
                <StatusBadge status="active" dot />
              )}
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">{sp.entity_id}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
              <span>
                Workspace:{" "}
                <Link href={`/workspaces/${ws?.id}`} className="text-primary hover:underline">
                  {sp.workspace_name}
                </Link>
              </span>
              <span>NameID: {NAME_ID_LABELS[sp.name_id_format] ?? sp.name_id_format}</span>
              <span>
                Sign: {sp.sign_assertions ? "RSA-SHA256 ✓" : "Off"}
              </span>
              <span>
                Encrypt: {sp.encrypt_assertions ? "AES-256 ✓" : "Off"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors shrink-0"
          >
            Edit
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/60">
          <div>
            <div className="text-xs text-muted-foreground">SSO (30d)</div>
            <div className="text-xl font-semibold text-foreground">
              {sp.sso_count_30d.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last SSO</div>
            <div className="text-sm font-medium text-foreground mt-0.5">
              {sp.last_sso_at ? (
                new Date(sp.last_sso_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              ) : (
                <span className="text-muted-foreground italic">Never</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Attribute mappings</div>
            <div className="text-xl font-semibold text-foreground">{mappings.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Registered</div>
            <div className="text-sm font-medium text-foreground mt-0.5">
              {new Date(sp.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Give This to Your SP — primary action, Q4 ── */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-indigo-200/60">
          <div className="flex items-center gap-2 mb-0.5">
            <Shield className="h-4 w-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-semibold text-indigo-900">Give This to Your Service Provider</h3>
          </div>
          <p className="text-xs text-indigo-700 mt-0.5">
            Your SP needs the IdP metadata to establish trust with Foundry IAM. Give them the URL or
            upload the XML file directly in their SSO configuration.
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-indigo-800 mb-1">IdP Metadata URL</div>
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2">
              <span className="text-xs font-mono text-foreground truncate flex-1">
                {sp.idp_metadata_url}
              </span>
              <CopyButton text={sp.idp_metadata_url} />
              <a
                href={sp.idp_metadata_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <a
            href={`/api/v1/workspaces/${sp.workspace_id}/saml/idp-metadata`}
            download={`foundry-iam-idp-${sp.workspace_id}.xml`}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors shrink-0"
          >
            <Download className="h-4 w-4" /> Download IdP Metadata XML
          </a>
        </div>
      </div>

      {/* ── SP Configuration — always visible ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">SP Configuration</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Read-only. Click Edit in the header to modify.
          </p>
        </div>
        <div className="px-5">
          <dl>
            <ConfigField label="ACS URL" value={sp.acs_url} mono />
            <ConfigField label="SLO URL" value={sp.slo_url} mono />
            <ConfigField
              label="NameID Format"
              value={NAME_ID_LABELS[sp.name_id_format] ?? sp.name_id_format}
            />
            <ConfigField
              label="Sign assertions"
              value={sp.sign_assertions ? "RSA-SHA256 (enabled)" : "Disabled"}
            />
            <ConfigField
              label="Encrypt assertions"
              value={
                sp.encrypt_assertions
                  ? "AES-256 (enabled)"
                  : "Disabled (Phase 2 — enable in Phase 3 after SP testing)"
              }
            />
          </dl>
        </div>
      </div>

      {/* ── Attribute Mappings — editable ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-5">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border/60">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Attribute Mappings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These attributes are included in every SAML assertion sent to {sp.name}. Changes take
              effect on the next SSO request.
            </p>
          </div>
          <button
            onClick={addMapping}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors ml-4 shrink-0"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  User attribute
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  → SAML attribute name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  Format
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  Req.
                </th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappings.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={m.keycloak_attribute}
                      onChange={(e) =>
                        updateMapping(m.id, "keycloak_attribute", e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={m.saml_attribute_name}
                      onChange={(e) =>
                        updateMapping(m.id, "saml_attribute_name", e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 hidden sm:table-cell">
                    <select
                      value={m.saml_attribute_format}
                      onChange={(e) =>
                        updateMapping(m.id, "saml_attribute_format", e.target.value)
                      }
                      className="rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="Basic">Basic</option>
                      <option value="URI">URI</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center hidden sm:table-cell">
                    <input
                      type="checkbox"
                      checked={m.required}
                      onChange={(e) => updateMapping(m.id, "required", e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => removeMapping(m.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {mappings.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-5 text-center text-xs text-muted-foreground italic"
                  >
                    No attribute mappings. The assertion will only contain the Subject NameID.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border/60 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {mappingsSaved && (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Mappings saved — applies to next SSO
                request.
              </span>
            )}
          </div>
          <button
            onClick={saveMappings}
            disabled={savingMappings}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingMappings ? "Saving…" : "Save attribute mappings"}
          </button>
        </div>
      </div>

      {/* ── SP Integration Guide — collapsible reference content ──
           Justified §3A: supplementary per-SP steps are reference material, not operational workflow.
           Users consult this once during setup, not on every visit. ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">SP Integration Guide</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step-by-step setup instructions for common service providers. Expand the one that
            matches your SP.
          </p>
        </div>
        <div className="divide-y divide-border">
          {SP_GUIDES.map((guide) => (
            <div key={guide.key}>
              <button
                onClick={() =>
                  setGuideOpen((prev) => (prev === guide.key ? null : guide.key))
                }
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors text-left"
              >
                {guide.name}
                {guideOpen === guide.key ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {guideOpen === guide.key && (
                <div className="px-5 pb-4">
                  <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Lineage — §5 Records must show lineage ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">SP Lineage</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Origin and change history for this service provider
          </p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Registered by</div>
              <div className="text-sm font-medium text-foreground">{sp.created_by}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Registered at</div>
              <div className="text-sm font-medium text-foreground">
                {new Date(sp.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Workspace</div>
              <div className="text-sm font-medium text-foreground">{sp.workspace_name}</div>
            </div>
          </div>
        </div>
        {spLogs.length > 0 ? (
          <div className="px-5 py-3 space-y-2.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recent events
            </div>
            {spLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    log.severity === "high"
                      ? "bg-red-100 text-red-700"
                      : log.severity === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {log.action}
                </span>
                <span className="text-xs text-muted-foreground">{log.actor_email}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(log.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
            <Link href="/audit-logs" className="text-xs text-primary hover:underline block mt-1">
              View full audit trail →
            </Link>
          </div>
        ) : (
          <div className="px-5 py-3 text-xs text-muted-foreground italic">
            No audit events recorded for this SP yet.
          </div>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className="rounded-xl border border-destructive/30 bg-card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-destructive/20">
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        </div>
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Delete this service provider</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently removes the service provider from your workspace. Users attempting SSO via{" "}
              {sp.name} will receive an error immediately. This cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            Delete SP
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-semibold text-foreground mb-4">Edit SP Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  NameID Format
                </label>
                <select
                  value={editNameId}
                  onChange={(e) => setEditNameId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="email">Email address</option>
                  <option value="persistent">Persistent</option>
                  <option value="transient">Transient</option>
                  <option value="unspecified">Unspecified</option>
                </select>
              </div>
              {[
                {
                  label: "Sign assertions (RSA-SHA256)",
                  val: editSign,
                  set: setEditSign,
                },
                {
                  label: "Encrypt assertions (AES-256)",
                  val: editEncrypt,
                  set: setEditEncrypt,
                },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer">
                  <button
                    role="switch"
                    aria-checked={val}
                    onClick={() => set((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                      val ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        val ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {editSaved ? "Saved ✓" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Delete {sp.name}?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This permanently removes the service provider from your workspace. All SSO flows using this SP
                  will break immediately.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 mb-4 space-y-1">
              <p>
                <strong>Affected:</strong> Any users currently logged in via {sp.name} will not be
                affected — their sessions remain valid until expiry.
              </p>
              <p>
                <strong>Future logins:</strong> All new SSO attempts via {sp.name} will fail with an
                error immediately after deletion.
              </p>
              <p>
                <strong>Irreversible:</strong> The SP will need to be re-registered from scratch.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Type <span className="font-mono bg-muted px-1 rounded">{sp.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={sp.name}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleted(true)}
                disabled={deleteConfirm !== sp.name}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
