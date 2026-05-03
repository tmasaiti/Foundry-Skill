import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const realmKeysTable = pgTable("realm_keys", {
  realmName: varchar("realm_name", { length: 128 }).primaryKey(),
  privateKeyPem: text("private_key_pem").notNull(),
  publicKeyPem: text("public_key_pem").notNull(),
  keyId: varchar("key_id", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RealmKey = typeof realmKeysTable.$inferSelect;
export type InsertRealmKey = typeof realmKeysTable.$inferInsert;
