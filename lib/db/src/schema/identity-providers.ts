import { pgTable, varchar, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const identityProvidersTable = pgTable("identity_providers", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  workspaceId: varchar("workspace_id", { length: 30 }).notNull(),
  alias: varchar("alias", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  hideOnLoginPage: boolean("hide_on_login_page").notNull().default(false),
  keycloakAlias: varchar("keycloak_alias", { length: 64 }).notNull(),
  configEncrypted: text("config_encrypted").notNull().default(""),
  attributeMappers: jsonb("attribute_mappers").notNull().default("[]"),
  domainHints: text("domain_hints").array().notNull().default([]),
  firstLoginFlow: varchar("first_login_flow", { length: 64 }).notNull().default("first broker login"),
  syncMode: varchar("sync_mode", { length: 32 }).notNull().default("inherit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IdentityProvider = typeof identityProvidersTable.$inferSelect;
export type InsertIdentityProvider = typeof identityProvidersTable.$inferInsert;
