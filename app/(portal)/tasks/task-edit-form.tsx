"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const QUADRANTS: Array<{ value: Task["quadrant"]; label: string }> = [
  { value: "I", label: "I — Urgent & Important" },
  { value: "II", label: "II — Important, Not Urgent" },
  { value: "III", label: "III — Urgent, Not Important" },
  { value: "IV", label: "IV — Neither" },
];

export function TaskEditForm({
  task,
  roles,
  goals,
  tasks,
  onDone,
}: {
  task: Task;
  roles: Opt[];
  goals: Opt[];
  tasks: Opt[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [duration, setDuration] = useState(task.duration);
  const [quadrant, setQuadrant] = useState<Task["quadrant"]>(task.quadrant);
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [priorityType, setPriorityType] = useState<Task["priorityType"]>(
    task.priorityType,
  );
  const [energyLevel, setEnergyLevel] = useState<number | "">(
    task.energyLevel ?? "",
  );
  const [roleId, setRoleId] = useState(task.roleId ?? "");
  const [goalId, setGoalId] = useState(task.goalId ?? "");
  const [parentTaskId, setParentTaskId] = useState(task.parentTaskId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        duration,
        quadrant,
        status,
        priorityType,
        energyLevel: energyLevel === "" ? null : Number(energyLevel),
        roleId: roleId || null,
        goalId: goalId || null,
        parentTaskId: parentTaskId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? `HTTP ${res.status}`);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        required
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          min={1}
          max={1440}
          aria-label="Duration"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        />
        <select
          aria-label="Quadrant"
          value={quadrant}
          onChange={(e) => setQuadrant(e.target.value as Task["quadrant"])}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          {QUADRANTS.map((q) => (
            <option key={q.value} value={q.value}>
              {q.value}
            </option>
          ))}
        </select>
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
      </div>
      <div className="grid grid-cols-2 gap-2">
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
        <input
          type="number"
          min={1}
          max={5}
          aria-label="Energy level"
          value={energyLevel}
          onChange={(e) =>
            setEnergyLevel(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
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
        <select
          aria-label="Goal"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            rows={2}
          />
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
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
