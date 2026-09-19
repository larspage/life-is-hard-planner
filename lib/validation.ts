/**
 * Zod validation schemas for request bodies.
 *
 * Server-only: any file that imports these is implicitly server-side because
 * drizzle-orm pulls in node-only deps. Keep them out of client components.
 *
 * IDs use `z.string().uuid()` matching the Postgres `gen_random_uuid()` PKs
 * declared in `db/schema.ts`.
 */

import { z } from "zod";

export const roleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  priorityWeight: z.number().int().min(1).max(5).default(3),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "color must be a 6-digit hex code")
    .default("#6366f1"),
});

export const valueSchema = z.object({
  text: z.string().min(1).max(500),
  tags: z.array(z.string().min(1).max(50)).default([]),
});

export const goalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  horizon: z.enum(["LONG_TERM", "MID_TERM"]),
  targetDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).default("ACTIVE"),
  roleId: z.string().uuid().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  duration: z
    .number()
    .int()
    .min(1)
    .max(1440, "duration must be <= 24 hours (1440 minutes)"),
  quadrant: z.enum(["I", "II", "III", "IV"]).default("I"),
  status: z
    .enum(["TODO", "SCHEDULED", "IN_PROGRESS", "COMPLETE"])
    .default("TODO"),
  priorityType: z.enum(["BIG_ROCK", "NORMAL"]).default("NORMAL"),
  energyLevel: z.number().int().min(1).max(5).optional(),
  roleId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
});

export const timeBlockSchema = z.object({
  taskId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  date: z.coerce.date(),
});
// Business rule (endTime > startTime) is checked explicitly in the route
// handler after parsing, so failures surface as 422 Unprocessable rather
// than 400 Invalid Parameter. The form should also check this before
// submit so the server only fires it when a non-form caller lets it
// through.

export const idSchema = z.object({
  id: z.string().uuid(),
});

export const userIdSchema = z.object({
  userId: z.string().uuid(),
});

export type RoleInput = z.infer<typeof roleSchema>;
export type ValueInput = z.infer<typeof valueSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type TimeBlockInput = z.infer<typeof timeBlockSchema>;
