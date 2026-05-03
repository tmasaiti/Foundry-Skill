import { pgTable, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const workspacesTable = pgTable("workspaces", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  tenantId: varchar("tenant_id", { length: 30 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull().default("shared-realm"),
  keycloakRealm: varchar("keycloak_realm", { length: 128 }).notNull().unique(),
  keycloakIssuer: text("keycloak_issuer").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("provisioning"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Workspace = typeof workspacesTable.$inferSelect;
export type InsertWorkspace = typeof workspacesTable.$inferInsert;
