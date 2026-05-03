import { pgTable, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const idempotencyKeysTable = pgTable("idempotency_keys", {
  key: varchar("key", { length: 256 }).primaryKey(),
  responseStatus: integer("response_status").notNull(),
  responseBody: jsonb("response_body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type IdempotencyKey = typeof idempotencyKeysTable.$inferSelect;
export type InsertIdempotencyKey = typeof idempotencyKeysTable.$inferInsert;
