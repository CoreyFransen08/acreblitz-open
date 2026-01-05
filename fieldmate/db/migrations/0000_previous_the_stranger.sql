CREATE TABLE "john_deere_connections" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) DEFAULT 'default' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_type" varchar(20) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"scopes" jsonb NOT NULL,
	"organization_ids" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cached_boundaries" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"boundary_id" varchar(255) NOT NULL,
	"field_id" varchar(255) NOT NULL,
	"geometry" jsonb NOT NULL,
	"raw_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cached_boundaries_boundary_id_unique" UNIQUE("boundary_id")
);
--> statement-breakpoint
CREATE TABLE "cached_fields" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"field_id" varchar(255) NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"area" jsonb,
	"boundary_id" varchar(255),
	"raw_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_organizations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100),
	"raw_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cached_organizations_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "cached_work_plans" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"work_plan_id" varchar(255) NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"work_type" varchar(100),
	"work_status" varchar(50),
	"year" varchar(10),
	"raw_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "boundary_id_idx" ON "cached_boundaries" USING btree ("boundary_id");--> statement-breakpoint
CREATE INDEX "field_boundary_idx" ON "cached_boundaries" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "field_id_idx" ON "cached_fields" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "org_field_idx" ON "cached_fields" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_id_idx" ON "cached_organizations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "work_plan_id_idx" ON "cached_work_plans" USING btree ("work_plan_id");--> statement-breakpoint
CREATE INDEX "org_work_plan_idx" ON "cached_work_plans" USING btree ("organization_id");