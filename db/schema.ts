import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ============================================
// ENUMS
// ============================================

// Prisma Postgres enum types are snake_case (Prisma lowercases the model name
// for the underlying type). Match that here so column references resolve.
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "FREE",
  "TRIAL",
  "PREMIUM",
]);

export const goalHorizonEnum = pgEnum("goal_horizon", ["LONG_TERM", "MID_TERM"]);

export const goalStatusEnum = pgEnum("goal_status", [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const quadrantEnum = pgEnum("quadrant", ["I", "II", "III", "IV"]);

export const taskStatusEnum = pgEnum("task_status", [
  "TODO",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETE",
]);

export const priorityTypeEnum = pgEnum("priority_type", ["BIG_ROCK", "NORMAL"]);

export const habitFrequencyEnum = pgEnum("habit_frequency", [
  "DAILY",
  "WEEKLY",
  "CUSTOM",
]);

// ============================================
// MODELS
// ============================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    subscriptionTier: subscriptionTierEnum("subscription_tier")
      .notNull()
      .default("TRIAL"),
    trialExpiresAt: timestamp("trial_expires_at", { withTimezone: true }),
    subscriptionExpiresAt: timestamp("subscription_expires_at", {
      withTimezone: true,
    }),
    uploadedBytes: bigint("uploaded_bytes", { mode: "bigint" })
      .notNull()
      .default(0n),
    // Time scale configuration (set during onboarding). Shape:
    //   { "boulder": { "value": 2, "unit": "hours" }, "rock": { ... }, ... }
    timeScaleConfig: jsonb("time_scale_config"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priorityWeight: integer("priority_weight").notNull().default(3),
    color: text("color").notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("roles_user_id_idx").on(table.userId),
  }),
);

export const values = pgTable(
  "values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // optional tags: ["family", "career"]
    tags: text("tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("values_user_id_idx").on(table.userId),
  }),
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").references(() => roles.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    horizon: goalHorizonEnum("horizon").notNull(),
    targetDate: timestamp("target_date", { withTimezone: true }),
    status: goalStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("goals_user_id_idx").on(table.userId),
    roleIdIdx: index("goals_role_id_idx").on(table.roleId),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").references(() => roles.id, {
      onDelete: "set null",
    }),
    goalId: uuid("goal_id").references(() => goals.id, {
      onDelete: "set null",
    }),
    // Self-reference: parent_task_id → tasks.id. Drizzle needs AnyPgColumn cast
    // for self-referential foreign keys.
    parentTaskId: uuid("parent_task_id").references(
      (): AnyPgColumn => tasks.id,
      { onDelete: "cascade" },
    ),
    title: text("title").notNull(),
    description: text("description"),
    duration: integer("duration").notNull(),
    quadrant: quadrantEnum("quadrant").notNull().default("I"),
    status: taskStatusEnum("status").notNull().default("TODO"),
    priorityType: priorityTypeEnum("priority_type").notNull().default("NORMAL"),
    energyLevel: integer("energy_level"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("tasks_user_id_idx").on(table.userId),
    roleIdIdx: index("tasks_role_id_idx").on(table.roleId),
    goalIdIdx: index("tasks_goal_id_idx").on(table.goalId),
    parentTaskIdIdx: index("tasks_parent_task_id_idx").on(table.parentTaskId),
  }),
);

export const timeBlocks = pgTable(
  "time_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    // denormalized date for queries (Prisma: DateTime — kept as TIMESTAMP to
    // preserve source schema; promote to DATE later if query plans require it).
    date: timestamp("date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("time_blocks_user_id_idx").on(table.userId),
    taskIdIdx: index("time_blocks_task_id_idx").on(table.taskId),
    dateIdx: index("time_blocks_date_idx").on(table.date),
  }),
);

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    frequency: habitFrequencyEnum("frequency").notNull().default("DAILY"),
    targetCount: integer("target_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("habits_user_id_idx").on(table.userId),
  }),
);

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // @@unique([habitId, date]) in Prisma
    habitIdDateIdx: uniqueIndex("habit_logs_habit_id_date_idx").on(
      table.habitId,
      table.date,
    ),
    userIdIdx: index("habit_logs_user_id_idx").on(table.userId),
    dateIdx: index("habit_logs_date_idx").on(table.date),
  }),
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).notNull(),
    // JSONB: bullet journal entries
    //   [
    //     { "type": "task", "content": "Call mom", "completed": false },
    //     { "type": "event", "content": "Meeting at 2pm" },
    //     { "type": "note", "content": "Idea for project" }
    //   ]
    entries: jsonb("entries"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // @@unique([userId, date]) in Prisma — one journal entry per user per day
    userIdDateIdx: uniqueIndex("journal_entries_user_id_date_idx").on(
      table.userId,
      table.date,
    ),
    userIdIdx: index("journal_entries_user_id_idx").on(table.userId),
  }),
);

export const fileUploads = pgTable(
  "file_uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileUrl: varchar("file_url", { length: 500 }).notNull(),
    fileName: text("file_name").notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("file_uploads_user_id_idx").on(table.userId),
    journalEntryIdIdx: index("file_uploads_journal_entry_id_idx").on(
      table.journalEntryId,
    ),
  }),
);

// ============================================
// INFERRED TYPES
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Value = typeof values.$inferSelect;
export type NewValue = typeof values.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TimeBlock = typeof timeBlocks.$inferSelect;
export type NewTimeBlock = typeof timeBlocks.$inferInsert;

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;

export type HabitLog = typeof habitLogs.$inferSelect;
export type NewHabitLog = typeof habitLogs.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export type FileUpload = typeof fileUploads.$inferSelect;
export type NewFileUpload = typeof fileUploads.$inferInsert;
