import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { samlServiceProvidersTable, workspacesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { makeId } from "../../lib/ulid.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeAuditLog } from "../../middleware/audit.js";

const router = Router();

const AttributeMappingSchema = z.object({
  keycloak_attribute: z.string().min(1),
  saml_attribute_name: z.string().min(1),
  saml_attribute_format: z.enum(["Basic", "URI"]).default("Basic"),
  required: z.boolean().default(false),
});

const RegisterSpSchema = z.discriminatedUnion("registration_mode", [
  z.object({
    registration_mode: z.literal("metadata_xml"),
    name: z.string().min(1).max(255),
    metadata_xml: z.string().min(1),
    name_id_format: z.enum(["email", "persistent", "transient", "unspecified"]).default("email"),
    sign_assertions: z.boolean().default(true),
    encrypt_assertions: z.boolean().default(false),
    attribute_mappings: z.array(AttributeMappingSchema).default([]),
  }),
  z.object({
    registration_mode: z.literal("manual"),
    name: z.string().min(1).max(255),
    entity_id: z.string().min(1),
    acs_url: z.string().url(),
    slo_url: z.string().url().optional(),
    name_id_format: z.enum(["email", "persistent", "transient", "unspecified"]).default("email"),
    sp_certificate: z.string().optional(),
    sign_assertions: z.boolean().default(true),
    encrypt_assertions: z.boolean().default(false),
    attribute_mappings: z.array(AttributeMappingSchema).default([]),
  }),
]);

function parseMetadataXml(xml: string): {
  entity_id: string;
  acs_url: string;
  slo_url?: string;
  sp_certificate?: string;
} {
  const entityIdMatch = xml.match(/entityID="([^"]+)"/);
  const acsMatch = xml.match(/AssertionConsumerService[^>]+Location="([^"]+)"/);
  const sloMatch = xml.match(/SingleLogoutService[^>]+Location="([^"]+)"/);
  const certMatch = xml.match(/<X509Certificate[^>]*>([\s\S]+?)<\/X509Certificate>/);

  if (!entityIdMatch) throw new ValidationError("metadata_xml_invalid: Missing entityID attribute");
  if (!acsMatch) throw new ValidationError("acs_url_missing: No AssertionConsumerService Location found");

  return {
    entity_id: entityIdMatch[1],
    acs_url: acsMatch[1],
    slo_url: sloMatch?.[1],
    sp_certificate: certMatch?.[1]?.replace(/\s/g, ""),
  };
}

router.post("/:id/saml/service-providers", requireAuth, async (req, res, next) => {
  try {
    const wsId = (req.params as Record<string, string>).id;
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, wsId)).limit(1);
    if (!workspace) throw new NotFoundError("Workspace", wsId);

    const body = RegisterSpSchema.parse(req.body);

    let entity_id: string;
    let acs_url: string;
    let slo_url: string | undefined;
    let sp_certificate: string | undefined;
    let metadata_xml: string | undefined;

    if (body.registration_mode === "metadata_xml") {
      const parsed = parseMetadataXml(body.metadata_xml);
      entity_id = parsed.entity_id;
      acs_url = parsed.acs_url;
      slo_url = parsed.slo_url;
      sp_certificate = parsed.sp_certificate;
      metadata_xml = body.metadata_xml;
    } else {
      entity_id = body.entity_id;
      acs_url = body.acs_url;
      slo_url = body.slo_url;
      sp_certificate = body.sp_certificate;
    }

    const sspId = makeId("ssp");
    const keycloakClientId = `ssp_${sspId}`;

    const [sp] = await db.insert(samlServiceProvidersTable).values({
      id: sspId,
      workspaceId: wsId,
      name: body.name,
      keycloakClientId,
      entityId: entity_id,
      acsUrl: acs_url,
      sloUrl: slo_url ?? null,
      nameIdFormat: body.name_id_format,
      signAssertions: body.sign_assertions,
      encryptAssertions: body.encrypt_assertions,
      spCertificate: sp_certificate ?? null,
      metadataXml: metadata_xml ?? null,
      attributeMappings: body.attribute_mappings,
      status: "active",
    }).returning();

    await writeAuditLog(req, {
      action: "saml.sp-registered",
      resourceType: "saml_sp",
      resourceId: sspId,
      newState: "active",
    });

    res.status(201).json({
      saml_sp: {
        ...sp,
        idp_metadata_url: `${workspace.keycloakIssuer}/protocol/saml/descriptor`,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/saml/service-providers", requireAuth, async (req, res, next) => {
  try {
    const wsId = (req.params as Record<string, string>).id;
    const sps = await db
      .select()
      .from(samlServiceProvidersTable)
      .where(eq(samlServiceProvidersTable.workspaceId, wsId));
    res.json({ saml_service_providers: sps });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/saml/service-providers/:sspId", requireAuth, async (req, res, next) => {
  try {
    const { id: wsId, sspId } = req.params as Record<string, string>;
    const [sp] = await db
      .select()
      .from(samlServiceProvidersTable)
      .where(and(eq(samlServiceProvidersTable.id, sspId), eq(samlServiceProvidersTable.workspaceId, wsId)))
      .limit(1);
    if (!sp) throw new NotFoundError("SAML Service Provider", sspId);
    res.json({ saml_sp: sp });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/saml/service-providers/:sspId", requireAuth, async (req, res, next) => {
  try {
    const { id: wsId, sspId } = req.params as Record<string, string>;
    const [existing] = await db
      .select()
      .from(samlServiceProvidersTable)
      .where(and(eq(samlServiceProvidersTable.id, sspId), eq(samlServiceProvidersTable.workspaceId, wsId)))
      .limit(1);
    if (!existing) throw new NotFoundError("SAML Service Provider", sspId);

    const body = z.object({
      name: z.string().min(1).max(255).optional(),
      name_id_format: z.enum(["email", "persistent", "transient", "unspecified"]).optional(),
      sign_assertions: z.boolean().optional(),
      encrypt_assertions: z.boolean().optional(),
      status: z.enum(["active", "disabled"]).optional(),
      attribute_mappings: z.array(AttributeMappingSchema).optional(),
    }).parse(req.body);

    const [updated] = await db
      .update(samlServiceProvidersTable)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.name_id_format !== undefined && { nameIdFormat: body.name_id_format }),
        ...(body.sign_assertions !== undefined && { signAssertions: body.sign_assertions }),
        ...(body.encrypt_assertions !== undefined && { encryptAssertions: body.encrypt_assertions }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.attribute_mappings !== undefined && { attributeMappings: body.attribute_mappings }),
        updatedAt: new Date(),
      })
      .where(eq(samlServiceProvidersTable.id, sspId))
      .returning();

    await writeAuditLog(req, {
      action: "saml.sp-updated",
      resourceType: "saml_sp",
      resourceId: sspId,
      newState: updated.status,
    });

    res.json({ saml_sp: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/saml/service-providers/:sspId", requireAuth, async (req, res, next) => {
  try {
    const { id: wsId, sspId } = req.params as Record<string, string>;
    const [existing] = await db
      .select()
      .from(samlServiceProvidersTable)
      .where(and(eq(samlServiceProvidersTable.id, sspId), eq(samlServiceProvidersTable.workspaceId, wsId)))
      .limit(1);
    if (!existing) throw new NotFoundError("SAML Service Provider", sspId);

    await db.delete(samlServiceProvidersTable).where(eq(samlServiceProvidersTable.id, sspId));

    await writeAuditLog(req, {
      action: "saml.sp-deleted",
      resourceType: "saml_sp",
      resourceId: sspId,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/:id/saml/idp-metadata", async (req, res, next) => {
  try {
    const wsId = (req.params as Record<string, string>).id;
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, wsId))
      .limit(1);
    if (!workspace) throw new NotFoundError("Workspace", wsId);

    const issuer = workspace.keycloakIssuer;
    const realm = workspace.keycloakRealm;

    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${issuer}">
  <IDPSSODescriptor
    WantAuthnRequestsSigned="false"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIICmzCCAYMCBgF...</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${issuer}/protocol/saml"/>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${issuer}/protocol/saml"/>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${issuer}/protocol/saml"/>
  </IDPSSODescriptor>
</EntityDescriptor>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename="foundry-iam-idp-${realm}.xml"`);
    res.send(metadata);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/saml/service-providers/:sspId/test", requireAuth, async (req, res, next) => {
  try {
    const { id: wsId, sspId } = req.params as Record<string, string>;
    const [sp] = await db
      .select()
      .from(samlServiceProvidersTable)
      .where(and(eq(samlServiceProvidersTable.id, sspId), eq(samlServiceProvidersTable.workspaceId, wsId)))
      .limit(1);
    if (!sp) throw new NotFoundError("SAML Service Provider", sspId);

    const now = new Date().toISOString();
    const notAfter = new Date(Date.now() + 300_000).toISOString();
    const assertionId = `_assertion_${Date.now()}`;

    const assertionXml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_resp_${Date.now()}" Version="2.0"
  IssueInstant="${now}" Destination="${sp.acsUrl}">
  <saml:Issuer>${wsId}/protocol/saml</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion Version="2.0" ID="${assertionId}" IssueInstant="${now}">
    <saml:Issuer>${wsId}/protocol/saml</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">test.user@acme.com</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${notAfter}" Recipient="${sp.acsUrl}"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${now}" NotOnOrAfter="${notAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${sp.entityId}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>test.user@acme.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="firstName">
        <saml:AttributeValue>Test</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="groups">
        <saml:AttributeValue>viewer</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

    res.json({
      test_result: {
        sp_id: sspId,
        sp_name: sp.name,
        entity_id: sp.entityId,
        acs_url: sp.acsUrl,
        issued_at: now,
        subject_name_id: "test.user@acme.com",
        assertion_xml: assertionXml,
        decoded_attributes: [
          { name: "email", value: "test.user@acme.com" },
          { name: "firstName", value: "Test" },
          { name: "groups", value: "viewer" },
        ],
        note: "Simulated assertion for inspection only. Not transmitted to the SP in this environment.",
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
