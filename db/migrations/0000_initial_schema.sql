-- 0000_initial_schema.sql
--
-- LifeOS initial schema. Source-of-truth is db/schema.ts (Drizzle).
-- Tables created in dependency order: users first, dependents after.
--
-- Rationale: this is the rewrite's initial schema. The rewrite plan in SPEC.md
-- defers subscription/uploads/habits/journal features, but the schema stays
-- complete so future phases don't need schema migrations to add them back.
--
-- Per ADR-008 (Supabase Postgres + RLS): RLS policies for each user-owned
-- table will be added in a follow-up migration (0001_rls_policies.sql).
-- This file stays a plain schema baseline; RLS lives in its own file so
-- the Supabase dashboard's policy editor can ingest it cleanly.

-- Required for gen_random_uuid(). drizzle-kit does NOT emit this automatically;
-- the Prisma schema's @default(dbgenerated("gen_random_uuid()")) calls assume it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "subscription_tier" AS ENUM ('FREE', 'TRIAL', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "goal_horizon" AS ENUM ('LONG_TERM', 'MID_TERM');--> statement-breakpoint
CREATE TYPE "goal_status" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "quadrant" AS ENUM ('I', 'II', 'III', 'IV');--> statement-breakpoint
CREATE TYPE "task_status" AS ENUM ('TODO', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "priority_type" AS ENUM ('BIG_ROCK', 'NORMAL');--> statement-breakpoint
CREATE TYPE "habit_frequency" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');--> statement-breakpoint

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'TRIAL' NOT NULL,
	"trial_expires_at" timestamp with time zone,
	"subscription_expires_at" timestamp with time zone,
	"uploaded_bytes" bigint DEFAULT 0 NOT NULL,
	"time_scale_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"priority_weight" integer DEFAULT 3 NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"horizon" "goal_horizon" NOT NULL,
	"target_date" timestamp with time zone,
	"status" "goal_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid,
	"goal_id" uuid,
	"parent_task_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"duration" integer NOT NULL,
	"quadrant" "quadrant" DEFAULT 'I' NOT NULL,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"priority_type" "priority_type" DEFAULT 'NORMAL' NOT NULL,
	"energy_level" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"frequency" "habit_frequency" DEFAULT 'DAILY' NOT NULL,
	"target_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"entries" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "file_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" varchar(100),
	"journal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- ============================================
-- FOREIGN KEYS
-- ============================================

DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "values" ADD CONSTRAINT "values_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS "roles_user_id_idx" ON "roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "values_user_id_idx" ON "values" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_user_id_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_role_id_idx" ON "goals" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_user_id_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_role_id_idx" ON "tasks" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_goal_id_idx" ON "tasks" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_parent_task_id_idx" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_blocks_user_id_idx" ON "time_blocks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_blocks_task_id_idx" ON "time_blocks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_blocks_date_idx" ON "time_blocks" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_user_id_idx" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "habit_logs_habit_id_date_idx" ON "habit_logs" USING btree ("habit_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_logs_user_id_idx" ON "habit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_logs_date_idx" ON "habit_logs" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_user_id_date_idx" ON "journal_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_entries_user_id_idx" ON "journal_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_uploads_user_id_idx" ON "file_uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_uploads_journal_entry_id_idx" ON "file_uploads" USING btree ("journal_entry_id");--> statement-breakpoint

-- DOWN MIGRATION:
-- DROP TABLE IF EXISTS file_uploads CASCADE;
-- DROP TABLE IF EXISTS journal_entries CASCADE;
-- DROP TABLE IF EXISTS habit_logs CASCADE;
-- DROP TABLE IF EXISTS habits CASCADE;
-- DROP TABLE IF EXISTS time_blocks CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS goals CASCADE;
-- DROP TABLE IF EXISTS values CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS habit_frequency;
-- DROP TYPE IF EXISTS priority_type;
-- DROP TYPE IF EXISTS task_status;
-- DROP TYPE IF EXISTS quadrant;
-- DROP TYPE IF EXISTS goal_status;
-- DROP TYPE IF EXISTS goal_horizon;
-- DROP TYPE IF EXISTS subscription_tier;
