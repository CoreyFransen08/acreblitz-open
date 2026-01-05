import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

// Cache for organizations
export const cachedOrganizations = pgTable(
  "cached_organizations",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    organizationId: varchar("organization_id", { length: 255 })
      .notNull()
      .unique(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }),

    // Raw API response for full data
    rawData: jsonb("raw_data").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("org_id_idx").on(table.organizationId)]
);

// Cache for fields
export const cachedFields = pgTable(
  "cached_fields",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    fieldId: varchar("field_id", { length: 255 }).notNull(),
    organizationId: varchar("organization_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    // Field details
    area: jsonb("area").$type<{ value: number; unit: string }>(),
    boundaryId: varchar("boundary_id", { length: 255 }),

    // Raw API response
    rawData: jsonb("raw_data").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("field_id_idx").on(table.fieldId),
    index("org_field_idx").on(table.organizationId),
  ]
);

// Cache for boundaries (GeoJSON)
export const cachedBoundaries = pgTable(
  "cached_boundaries",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    boundaryId: varchar("boundary_id", { length: 255 }).notNull().unique(),
    fieldId: varchar("field_id", { length: 255 }).notNull(),

    // GeoJSON geometry
    geometry: jsonb("geometry").notNull(),

    // Raw API response
    rawData: jsonb("raw_data").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("boundary_id_idx").on(table.boundaryId),
    index("field_boundary_idx").on(table.fieldId),
  ]
);

// Cache for work plans
export const cachedWorkPlans = pgTable(
  "cached_work_plans",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    workPlanId: varchar("work_plan_id", { length: 255 }).notNull(),
    organizationId: varchar("organization_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),

    // Work plan metadata
    workType: varchar("work_type", { length: 100 }),
    workStatus: varchar("work_status", { length: 50 }),
    year: varchar("year", { length: 10 }),

    // Raw API response
    rawData: jsonb("raw_data").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("work_plan_id_idx").on(table.workPlanId),
    index("org_work_plan_idx").on(table.organizationId),
  ]
);

export type CachedOrganization = typeof cachedOrganizations.$inferSelect;
export type CachedField = typeof cachedFields.$inferSelect;
export type CachedBoundary = typeof cachedBoundaries.$inferSelect;
export type CachedWorkPlan = typeof cachedWorkPlans.$inferSelect;
