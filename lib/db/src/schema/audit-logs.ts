import { pgTable, bigserial, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 30 }),
  workspaceId: varchar("workspace_id", { length: 30 }),
  actorId: varchar("actor_id", { length: 64 }),
  actorEmail: varchar("actor_email", { length: 255 }),
  action: varchar("action", { length: 128 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  resourceId: varchar("resource_id", { length: 30 }).notNull(),
  meta: jsonb("meta"),
  ipAddress: varchar("ip_address", { length: 64 }),
  sourceScreen: varchar("source_screen", { length: 128 }),
  previousState: varchar("previous_state", { length: 64 }),
  newState: varchar("new_state", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
