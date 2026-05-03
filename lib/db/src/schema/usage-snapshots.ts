import { pgTable, bigserial, varchar, integer, date, timestamp } from "drizzle-orm/pg-core";

export const usageSnapshotsTable = pgTable("usage_snapshots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 30 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  mau: integer("mau").notNull().default(0),
  logins: integer("logins").notNull().default(0),
  tokenRefresh: integer("token_refresh").notNull().default(0),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UsageSnapshot = typeof usageSnapshotsTable.$inferSelect;
export type InsertUsageSnapshot = typeof usageSnapshotsTable.$inferInsert;
