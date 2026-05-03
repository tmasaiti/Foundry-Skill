import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id: varchar("id", { length: 30 }).primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 63 }).unique().notNull(),
  ownerUserId: varchar("owner_user_id", { length: 30 }),
  plan: varchar("plan", { length: 32 }).notNull().default("starter"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  region: varchar("region", { length: 32 }).notNull().default("us-east-1"),
  mfaPolicy: varchar("mfa_policy", { length: 32 }).notNull().default("optional"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 64 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Tenant = typeof tenantsTable.$inferSelect;
export type InsertTenant = typeof tenantsTable.$inferInsert;
