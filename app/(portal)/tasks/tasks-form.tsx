"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskEditForm } from "./task-edit-form";

type Task = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  quadrant: "I" | "II" | "III" | "IV";
  status: "TODO" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETE";
  priorityType: "BIG_ROCK" | "NORMAL";
  energyLevel: number | null;
  roleId: string | null;
  goalId: string | null;
  parentTaskId: string | null;
};

type Opt = { id: string; label: string };

type Props = {
  roles: Opt[];
  goals: Opt[];
  tasks: Opt[];
};

const QUADRANTS: Array<{ value: Task["quadrant"]; label: string }> = [
  { value: "I", label: "I — Urgent & Important" },
  { value: "II", label: "II — Important, Not Urgent" },
  { value: "III", label: "III — Urgent, Not Important" },
  { value: "IV", label: "IV — Neither" },
];

export function TasksForm({ roles, goals, tasks }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [quadrant, setQuadrant] = useState<Task["quadrant"]>("II");
  const [status, setStatus] = useState<Task["status"]>("TODO");
  const [priorityType, setPriorityType] =
    useState<Task["priorityType"]>("NORMAL");
  const [energyLevel, setEnergyLevel] = useState<number | "">("");
  const [roleId, setRoleId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        duration,
        quadrant,
        status,
        priorityType,
        energyLevel: energyLevel === "" ? undefined : Number(energyLevel),
        roleId: roleId || undefined,
        goalId: goalId || undefined,
        parentTaskId: parentTaskId || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? `HTTP ${res.status}`);
      return;
    }
    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-md border border-border bg-card p-3"
    >
      <h2 className="text-base font-semibold">New task</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        required
      />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">
            Duration (min)
          </span>
          <input
            type="number"
            min={1}
            max={1440}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-0.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Quadrant</span>
          <select
            value={quadrant}
            onChange={(e) => setQuadrant(e.target.value as Task["quadrant"])}
            className="mt-0.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          >
            {QUADRANTS.map((q) => (
              <option key={q.value} value={q.value}>
                {q.value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">
            Energy (1-5)
          </span>
          <input
            type="number"
            min={1}
            max={5}
            value={energyLevel}
            onChange={(e) =>
              setEnergyLevel(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="mt-0.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Task["status"])}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          <option value="TODO">To do</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETE">Complete</option>
        </select>
        <select
          aria-label="Priority"
          value={priorityType}
          onChange={(e) =>
            setPriorityType(e.target.value as Task["priorityType"])
          }
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          <option value="NORMAL">Normal</option>
          <option value="BIG_ROCK">Big rock</option>
        </select>
        <select
          aria-label="Role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          <option value="">No role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <details className="rounded-md border border-border bg-background p-2">
        <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted-foreground">
          Advanced
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            rows={2}
          />
          <select
            aria-label="Goal"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          >
            <option value="">No goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Parent task"
            value={parentTaskId}
            onChange={(e) => setParentTaskId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          >
            <option value="">No parent</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </details>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Create task"}
        </button>
      </div>
    </form>
  );
}

type TaskRowProps = { task: Task; roles: Opt[]; goals: Opt[]; tasks: Opt[] };

export function TaskRow({ task, roles, goals, tasks }: TaskRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      alert(`Delete failed: HTTP ${res.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <li className="rounded-md border border-border bg-card p-3">
      {editing ? (
        <TaskEditForm
          task={task}
          roles={roles}
          goals={goals}
          tasks={tasks}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <strong>{task.title}</strong>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {task.description}
                </p>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {task.duration} min
                {task.energyLevel && ` · energy ${task.energyLevel}/5`}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-input bg-secondary px-3 py-1 text-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-md border border-destructive bg-destructive px-3 py-1 text-sm text-destructive-foreground disabled:opacity-50"
              >
                {deleting ? "..." : "Delete"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {task.priorityType === "BIG_ROCK" && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                Big rock
              </span>
            )}
            <span className="rounded-full bg-secondary px-2 py-0.5">
              Q{task.quadrant}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5">
              {task.status}
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
