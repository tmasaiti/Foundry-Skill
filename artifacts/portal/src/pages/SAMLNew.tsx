import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import {
  Plus, Trash2, CheckCircle2, XCircle, Upload, AlertTriangle, Info,
} from "lucide-react";

type NameIdFormat = "email" | "persistent" | "transient" | "unspecified";

interface AttributeMapping {
  id: number;
  keycloak_attribute: string;
  saml_attribute_name: string;
  saml_attribute_format: "Basic" | "URI";
  required: boolean;
}

interface ParsedMetadata {
  entity_id: string;
  acs_url: string;
  slo_url: string;
  certificate: string;
  error?: string;
}

function parseMetadataXml(xml: string): ParsedMetadata | { error: string } {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const parseErr = doc.querySelector("parsererror");
    if (parseErr) {
      return {
        error:
          "XML is malformed: " +
          (parseErr.textContent?.trim().split("\n")[0] ?? "parse error"),
      };
    }
    const entityDesc = doc.querySelector("EntityDescriptor");
    if (!entityDesc)
      return {
        error:
          "Missing <EntityDescriptor> element. Is this a valid SAML SP metadata document?",
      };

    const entity_id = entityDesc.getAttribute("entityID") ?? "";
    if (!entity_id)
      return {
        error: "EntityDescriptor is missing the required entityID attribute.",
      };

    const acs = doc.querySelector("AssertionConsumerService");
    if (!acs)
      return {
        error:
          "No <AssertionConsumerService> found. This metadata does not contain an ACS URL.",
      };
    const acs_url = acs.getAttribute("Location") ?? "";
    if (!acs_url)
      return {
        error:
          "AssertionConsumerService element is missing the Location attribute (ACS URL).",
      };

    const slo = doc.querySelector("SingleLogoutService");
    const slo_url = slo?.getAttribute("Location") ?? "";

    const certEl = doc.querySelector(
      "KeyDescriptor[use='signing'] X509Certificate, KeyDescriptor X509Certificate"
    );
    const certificate = certEl?.textContent?.trim() ?? "";

    return { entity_id, acs_url, slo_url, certificate };
  } catch {
    return {
      error:
        "Failed to parse XML. Ensure the document is well-formed SAML metadata.",
    };
  }
}

const DEFAULT_MAPPINGS: AttributeMapping[] = [
  {
    id: 1,
    keycloak_attribute: "email",
    saml_attribute_name:
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    saml_attribute_format: "URI",
    required: true,
  },
  {
    id: 2,
    keycloak_attribute: "firstName",
    saml_attribute_name:
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    saml_attribute_format: "URI",
    required: false,
  },
];

export default function SAMLNew() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"xml" | "manual">("xml");

  const [name, setName] = useState("");
  const [signAssertions, setSignAssertions] = useState(true);
  const [encryptAssertions, setEncryptAssertions] = useState(false);
  const [nameIdFormat, setNameIdFormat] = useState<NameIdFormat>("email");
  const [mappings, setMappings] = useState<AttributeMapping[]>(DEFAULT_MAPPINGS);
  const [nextId, setNextId] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [metadataXml, setMetadataXml] = useState("");
  const [parsed, setParsed] = useState<ParsedMetadata | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [entityId, setEntityId] = useState("");
  const [acsUrl, setAcsUrl] = useState("");
  const [sloUrl, setSloUrl] = useState("");
  const [spCert, setSpCert] = useState("");

  function handleXmlChange(xml: string) {
    setMetadataXml(xml);
    if (!xml.trim()) {
      setParsed(null);
      setParseError(null);
      return;
    }
    const result = parseMetadataXml(xml);
    if ("error" in result && result.error) {
      setParsed(null);
      setParseError(result.error);
    } else {
      setParsed(result as ParsedMetadata);
      setParseError(null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      handleXmlChange(text);
    };
    reader.readAsText(file);
  }

  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { id: nextId, keycloak_attribute: "", saml_attribute_name: "", saml_attribute_format: "Basic", required: false },
    ]);
    setNextId((n) => n + 1);
  }

  function removeMapping(id: number) {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMapping(
    id: number,
    field: keyof AttributeMapping,
    value: string | boolean
  ) {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  const xmlValid = tab === "xml" && !!parsed && !parseError && !!name.trim();
  const manualValid =
    tab === "manual" &&
    !!name.trim() &&
    !!entityId.trim() &&
    !!acsUrl.trim();
  const canSubmit = xmlValid || manualValid;

  function blockingReason(): string {
    if (tab === "xml") {
      if (!name.trim()) return "Enter a service provider name to continue.";
      if (!metadataXml.trim()) return "Paste or upload SP metadata XML.";
      if (parseError) return "Fix the metadata XML error above.";
      return "";
    }
    if (!name.trim()) return "Enter a service provider name to continue.";
    if (!entityId.trim()) return "Entity ID is required.";
    if (!acsUrl.trim()) return "ACS URL is required.";
    return "";
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => navigate("/saml"), 1800);
    }, 1200);
  }

  if (submitted) {
    return (
      <Layout
        breadcrumbs={[
          { label: "SAML", href: "/saml" },
          { label: "Register SP" },
        ]}
        title="Register Service Provider"
      >
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold text-foreground">Service provider registered</p>
          <p className="text-sm text-muted-foreground">
            The SAML client has been created in your Keycloak realm. Redirecting…
          </p>
        </div>
      </Layout>
    );
  }

  const reason = blockingReason();

  return (
    <Layout
      breadcrumbs={[
        { label: "SAML", href: "/saml" },
        { label: "Register Service Provider" },
      ]}
      title="Register Service Provider"
    >
      {/* Q1 + Q5: What this creates and what happens downstream */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          This registers a SAML 2.0 Service Provider in your Keycloak realm. The SP will trust signed
          XML assertions issued by Foundry IAM. After registration, give your SP the{" "}
          <strong>IdP Metadata URL</strong> — it contains Foundry IAM's signing certificate and SSO
          endpoints.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        {/* SP Name — always required */}
        <div className="px-5 py-5 border-b border-border/60">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Service Provider name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Salesforce Production, Google Workspace, Workday HR"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Human-readable label visible only in this portal. Does not affect the SAML configuration.
          </p>
        </div>

        {/* Registration mode tabs */}
        <div className="px-5 pt-5 pb-0 border-b border-border/60">
          <div className="flex items-center gap-1 mb-5">
            <button
              onClick={() => setTab("xml")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === "xml"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Upload Metadata
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-xs font-semibold">
                Recommended
              </span>
            </button>
            <button
              onClick={() => setTab("manual")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === "manual"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Manual Config
            </button>
          </div>

          {tab === "xml" ? (
            <div className="space-y-4 pb-5">
              <p className="text-xs text-muted-foreground">
                Download your SP's metadata XML from their admin console (Salesforce: Setup → SSO
                Settings → Download Metadata). Paste it below or upload the file — fields are
                extracted automatically.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Metadata XML</label>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Upload className="h-3 w-3" /> Upload file
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <textarea
                  rows={7}
                  value={metadataXml}
                  onChange={(e) => handleXmlChange(e.target.value)}
                  placeholder={`<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://...">\n  ...\n</EntityDescriptor>`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {parseError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-800">Metadata validation failed</p>
                    <p className="text-xs text-red-700 mt-0.5">{parseError}</p>
                  </div>
                </div>
              )}

              {parsed && !parseError && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-800">
                      Valid SAML metadata — fields extracted
                    </p>
                  </div>
                  <dl className="space-y-1.5">
                    {[
                      { label: "Entity ID", value: parsed.entity_id },
                      { label: "ACS URL", value: parsed.acs_url },
                      {
                        label: "SLO URL",
                        value: parsed.slo_url || "Not provided (optional — needed for single logout)",
                      },
                      {
                        label: "Signing cert",
                        value: parsed.certificate
                          ? `Found (${Math.round(parsed.certificate.length / 76)} lines) — will be stored for request signing validation`
                          : "Not found (optional)",
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-3">
                        <dt className="w-24 shrink-0 text-xs text-emerald-700 font-medium">{label}</dt>
                        <dd className="text-xs font-mono text-emerald-900 break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-5">
              <p className="text-xs text-muted-foreground">
                Use manual config if your SP doesn't provide a metadata XML document. Find these values
                in your SP's SSO or "Trust" settings page.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Entity ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="https://app.customer.com/saml/metadata"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The SP's unique identifier URI. Used as the SAML Audience in the assertion.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    ACS URL <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={acsUrl}
                    onChange={(e) => setAcsUrl(e.target.value)}
                    placeholder="https://app.customer.com/saml/acs"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Assertion Consumer Service URL — where Foundry IAM POSTs the signed assertion.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    SLO URL{" "}
                    <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={sloUrl}
                    onChange={(e) => setSloUrl(e.target.value)}
                    placeholder="https://app.customer.com/saml/slo"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for single logout (SLO) to propagate to this SP.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    NameID Format
                  </label>
                  <select
                    value={nameIdFormat}
                    onChange={(e) => setNameIdFormat(e.target.value as NameIdFormat)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="email">Email address (most common)</option>
                    <option value="persistent">Persistent (opaque, stable ID)</option>
                    <option value="transient">Transient (anonymous, session-only)</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Determines the Subject NameID sent in the assertion.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    SP Signing Certificate{" "}
                    <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={spCert}
                    onChange={(e) => setSpCert(e.target.value)}
                    placeholder={"-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----"}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    SP's public cert for validating signed AuthnRequests. Required only if the SP
                    signs its requests.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assertion settings — shared by both tabs */}
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground mb-3">Assertion Settings</h3>
          <div className="space-y-3">
            {[
              {
                label: "Sign assertions (RSA-SHA256)",
                desc: "Required by most SPs. Foundry IAM signs the assertion XML with the realm's signing key.",
                value: signAssertions,
                set: setSignAssertions,
              },
              {
                label: "Encrypt assertions (AES-256)",
                desc: "Encrypts the assertion body. Accepted but not enforced in Phase 2 — requires SP encryption certificate to activate.",
                value: encryptAssertions,
                set: setEncryptAssertions,
              },
            ].map(({ label, desc, value, set }) => (
              <label key={label} className="flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5 shrink-0">
                  <button
                    role="switch"
                    aria-checked={value}
                    onClick={() => set((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      value ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        value ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Attribute Mappings — shared */}
        <div className="px-5 py-4 border-b border-border/60">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Attribute Mappings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Map Keycloak user attributes to SAML assertion attributes. The SP reads these to
                identify and authorise the user.
              </p>
            </div>
            <button
              onClick={addMapping}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0 ml-4"
            >
              <Plus className="h-3 w-3" /> Add mapping
            </button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Keycloak attribute
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    → SAML attribute name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    Format
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    Req.
                  </th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mappings.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={m.keycloak_attribute}
                        onChange={(e) =>
                          updateMapping(m.id, "keycloak_attribute", e.target.value)
                        }
                        placeholder="email"
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={m.saml_attribute_name}
                        onChange={(e) =>
                          updateMapping(m.id, "saml_attribute_name", e.target.value)
                        }
                        placeholder="http://schemas.xmlsoap.org/..."
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
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
                    <td className="px-3 py-2 text-center hidden sm:table-cell">
                      <input
                        type="checkbox"
                        checked={m.required}
                        onChange={(e) => updateMapping(m.id, "required", e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
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
                    <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                      No mappings. Most SPs require at least an email mapping.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit footer */}
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            {!canSubmit && reason && (
              <div className="flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {reason}
              </div>
            )}
            {canSubmit && (
              <div className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Ready to register — the SAML client will be created in your Keycloak realm
                immediately.
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/saml">
              <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
            </Link>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Registering…" : "Register Service Provider"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
