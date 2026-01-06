import {
  pgTable,
  varchar,
  timestamp,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export const johnDeereConnections = pgTable("john_deere_connections", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => uuidv7()),

  // Single-user app - this will always be 'default'
  userId: varchar("user_id", { length: 50 }).notNull().default("default"),

  // OAuth tokens
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: varchar("token_type", { length: 20 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),

  // Token scopes
  scopes: jsonb("scopes").$type<string[]>().notNull(),

  // Connected organizations
  organizationIds: jsonb("organization_ids").$type<string[]>(),

  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export type JohnDeereConnection = typeof johnDeereConnections.$inferSelect;
export type NewJohnDeereConnection = typeof johnDeereConnections.$inferInsert;
