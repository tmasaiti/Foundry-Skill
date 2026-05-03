import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  workspaceId: varchar("workspace_id", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("admin"),
  keycloakUserId: varchar("keycloak_user_id", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("invited"),
  inviteTokenHash: varchar("invite_token_hash", { length: 128 }),
  inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Admin = typeof adminsTable.$inferSelect;
export type InsertAdmin = typeof adminsTable.$inferInsert;
