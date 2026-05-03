import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const appsTable = pgTable("apps", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  workspaceId: varchar("workspace_id", { length: 30 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default("public"),
  keycloakClientId: varchar("keycloak_client_id", { length: 128 }).notNull().unique(),
  redirectUris: text("redirect_uris").notNull().default("[]"),
  postLogoutRedirectUris: text("post_logout_redirect_uris").notNull().default("[]"),
  webOrigins: text("web_origins").notNull().default("[]"),
  pkce: varchar("pkce", { length: 32 }).notNull().default("required"),
  scopes: text("scopes").notNull().default('["openid","profile","email"]'),
  accessTokenSeconds: integer("access_token_seconds").notNull().default(900),
  refreshTokenSeconds: integer("refresh_token_seconds").notNull().default(2592000),
  clientSecretHash: varchar("client_secret_hash", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type App = typeof appsTable.$inferSelect;
export type InsertApp = typeof appsTable.$inferInsert;
