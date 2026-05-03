import { pgTable, varchar, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const samlServiceProvidersTable = pgTable("saml_service_providers", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  workspaceId: varchar("workspace_id", { length: 30 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  keycloakClientId: varchar("keycloak_client_id", { length: 128 }).notNull().unique(),
  entityId: text("entity_id").notNull(),
  acsUrl: text("acs_url").notNull(),
  sloUrl: text("slo_url"),
  nameIdFormat: varchar("name_id_format", { length: 128 }).notNull().default("email"),
  signAssertions: boolean("sign_assertions").notNull().default(true),
  encryptAssertions: boolean("encrypt_assertions").notNull().default(false),
  spCertificate: text("sp_certificate"),
  metadataXml: text("metadata_xml"),
  metadataUrl: text("metadata_url"),
  attributeMappings: jsonb("attribute_mappings").notNull().default("[]"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SamlServiceProvider = typeof samlServiceProvidersTable.$inferSelect;
export type InsertSamlServiceProvider = typeof samlServiceProvidersTable.$inferInsert;
