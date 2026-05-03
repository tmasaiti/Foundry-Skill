import { pgTable, varchar, text, boolean, jsonb, timestamp, integer } from "drizzle-orm/pg-core";

export const scimConfigurationsTable = pgTable("scim_configurations", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  workspaceId: varchar("workspace_id", { length: 30 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  bearerTokenHash: varchar("bearer_token_hash", { length: 128 }).notNull().default(""),
  tokenPrefix: varchar("token_prefix", { length: 16 }).notNull().default(""),
  allowedOperations: text("allowed_operations").array().notNull().default(["CREATE", "UPDATE", "DISABLE", "DELETE"]),
  userAttributeMappings: jsonb("user_attribute_mappings").notNull().default("{}"),
  syncGroups: boolean("sync_groups").notNull().default(true),
  deprovisionAction: varchar("deprovision_action", { length: 32 }).notNull().default("disable"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncErrorCount: integer("sync_error_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scimUsersTable = pgTable("scim_users", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  workspaceId: varchar("workspace_id", { length: 30 }).notNull(),
  keycloakUserId: varchar("keycloak_user_id", { length: 64 }).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  username: varchar("username", { length: 255 }).notNull(),
  active: boolean("active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scimGroupsTable = pgTable("scim_groups", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  workspaceId: varchar("workspace_id", { length: 30 }).notNull(),
  keycloakGroupId: varchar("keycloak_group_id", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScimConfiguration = typeof scimConfigurationsTable.$inferSelect;
export type InsertScimConfiguration = typeof scimConfigurationsTable.$inferInsert;
export type ScimUser = typeof scimUsersTable.$inferSelect;
export type InsertScimUser = typeof scimUsersTable.$inferInsert;
export type ScimGroup = typeof scimGroupsTable.$inferSelect;
export type InsertScimGroup = typeof scimGroupsTable.$inferInsert;
