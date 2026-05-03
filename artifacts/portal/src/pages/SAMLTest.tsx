import { useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { CopyButton } from "@/components/CopyButton";
import { MOCK_SAML_SPS } from "@/lib/mockData";
import { FlaskConical, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Info } from "lucide-react";

interface TestResult {
  subject_name_id: string;
  issued_at: string;
  assertion_xml: string;
  decoded_attributes: Array<{ name: string; value: string }>;
}

function buildTestResult(sp: typeof MOCK_SAML_SPS[0]): TestResult {
  const now = new Date().toISOString();
  const notAfter = new Date(Date.now() + 300_000).toISOString();
  const assertionId = `_assertion_test_${Date.now()}`;

  const mappedAttrs = sp.attribute_mappings.map((m) => ({
    name: m.saml_attribute_name,
    value:
      m.keycloak_attribute === "email"
        ? "test.user@acme.com"
        : m.keycloak_attribute === "firstName"
        ? "Test"
        : m.keycloak_attribute === "lastName"
        ? "User"
        : m.keycloak_attribute === "realm_roles"
        ? "viewer"
        : "sample-value",
  }));

  const attrXml = mappedAttrs
    .map(
      (a) =>
        `      <saml:Attribute Name="${a.name}">\n        <saml:AttributeValue>${a.value}</saml:AttributeValue>\n      </saml:Attribute>`
    )
    .join("\n");

  const assertion_xml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_resp_test_${Date.now()}" Version="2.0"
  IssueInstant="${now}"
  Destination="${sp.acs_url}">
  <saml:Issuer>${sp.idp_metadata_url.replace("/protocol/saml/descriptor", "")}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion Version="2.0" ID="${assertionId}" IssueInstant="${now}">
    <saml:Issuer>${sp.idp_metadata_url.replace("/protocol/saml/descriptor", "")}</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <!-- RSA-SHA256 signature omitted in test preview -->
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
        test.user@acme.com
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
          NotOnOrAfter="${notAfter}"
          Recipient="${sp.acs_url}"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${now}" NotOnOrAfter="${notAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${sp.entity_id}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AttributeStatement>
${attrXml}
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

  return {
    subject_name_id: "test.user@acme.com",
    issued_at: now,
    assertion_xml,
    decoded_attributes: mappedAttrs,
  };
}

export default function SAMLTest() {
  const { sspId } = useParams<{ sspId: string }>();
  const sp = MOCK_SAML_SPS.find((s) => s.id === sspId);

  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<TestResult | null>(null);
  const [xmlOpen, setXmlOpen] = useState(false);

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

  const isDisabled = sp.status === "disabled";

  function runTest() {
    if (isDisabled) return;
    setStatus("running");
    setTimeout(() => {
      setResult(buildTestResult(sp!));
      setStatus("done");
    }, 1400);
  }

  return (
    <Layout
      breadcrumbs={[
        { label: "SAML", href: "/saml" },
        { label: sp.name, href: `/saml/${sp.id}` },
        { label: "Test SSO" },
      ]}
      title="Test SSO"
    >
      {/* Q1: What is this page? */}
      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">
            IdP-Initiated SSO Test for <span className="font-semibold">{sp.name}</span>
          </p>
          <p className="text-xs text-blue-700 mt-0.5">
            This generates a sample SAML assertion for inspection — letting you verify that attribute
            mappings are correct and the assertion structure is well-formed. The assertion is{" "}
            <strong>not transmitted to the SP</strong> in this test environment. Use SAML Tracer or
            samltool.io to inspect real assertions during a live SSO flow.
          </p>
        </div>
      </div>

      {/* Q2: SP status */}
      {isDisabled && (
        <div className="mb-5 rounded-xl border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">SP is disabled</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You can still generate a test assertion for inspection, but live SSO flows will be
              rejected until this SP is re-enabled.
            </p>
          </div>
        </div>
      )}

      {/* SP context card */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Service Provider</div>
            <div className="text-sm font-semibold text-foreground">{sp.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Entity ID</div>
            <div className="text-xs font-mono text-foreground truncate">{sp.entity_id}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">ACS URL (assertion destination)</div>
            <div className="text-xs font-mono text-foreground truncate">{sp.acs_url}</div>
          </div>
        </div>
      </div>

      {/* Test trigger */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-5">
        <div className="px-5 py-5 border-b border-border/60 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Generate Test Assertion</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generates a sample assertion using test user <span className="font-mono">test.user@acme.com</span>.
              Verify that all required attributes appear correctly before going live.
            </p>
          </div>
          <button
            onClick={runTest}
            disabled={status === "running"}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
          >
            <FlaskConical className="h-4 w-4" />
            {status === "running"
              ? "Generating…"
              : status === "done"
              ? "Re-run Test"
              : "Run Test Assertion"}
          </button>
        </div>

        {status === "running" && (
          <div className="px-5 py-6 flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              Building assertion structure, signing with realm key…
            </span>
          </div>
        )}

        {status === "done" && result && (
          <div className="px-5 py-5 space-y-5">
            {/* Success banner */}
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-800">
                <strong>Assertion generated successfully.</strong> Issued at{" "}
                {new Date(result.issued_at).toLocaleTimeString()} · Subject:{" "}
                <span className="font-mono">{result.subject_name_id}</span>
              </div>
            </div>

            {/* Decoded attributes — Q3: what matters most */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Decoded Attribute Claims
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        SAML Attribute Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Value in assertion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                        Subject NameID
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-foreground">
                        {result.subject_name_id}
                      </td>
                    </tr>
                    {result.decoded_attributes.map((attr, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground break-all">
                          {attr.name}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-foreground">{attr.value}</td>
                      </tr>
                    ))}
                    {result.decoded_attributes.length === 0 && (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-3 py-4 text-center text-xs text-muted-foreground italic"
                        >
                          No attribute mappings configured. Only Subject NameID will appear in
                          the assertion.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {result.decoded_attributes.length === 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    No attribute mappings are configured. Most SPs require at least an email
                    attribute to identify the user.{" "}
                    <Link href={`/saml/${sp.id}`} className="font-medium underline">
                      Add mappings →
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {/* Raw assertion XML — collapsible (supplementary reference per §3A) */}
            <div>
              <button
                onClick={() => setXmlOpen((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider mb-2 hover:text-primary transition-colors"
              >
                {xmlOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Raw Assertion XML
              </button>
              {xmlOpen && (
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <CopyButton text={result.assertion_xml} />
                  </div>
                  <pre className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {result.assertion_xml}
                  </pre>
                </div>
              )}
            </div>

            {/* Test tooling recommendation */}
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium text-foreground mb-1.5">
                Recommended tools for inspecting live assertions
              </p>
              <ul className="space-y-1">
                {[
                  { name: "SAML Tracer", desc: "Firefox/Chrome extension — captures real SAML flows in the browser" },
                  { name: "samltool.io", desc: "Paste a base64 assertion to decode and validate signature" },
                  { name: "Keycloak Admin Console", desc: "Client Scopes → Evaluate — generate assertion for any user" },
                ].map(({ name, desc }) => (
                  <li key={name} className="flex gap-2 text-xs">
                    <span className="font-medium text-foreground shrink-0">{name}</span>
                    <span className="text-muted-foreground">— {desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Link href={`/saml/${sp.id}`}>
          <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            ← Back to {sp.name}
          </button>
        </Link>
      </div>
    </Layout>
  );
}
