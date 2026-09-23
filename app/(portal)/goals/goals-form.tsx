"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = { id: string; name: string };

type Goal = {
  id: string;
  title: string;
  description: string | null;
  horizon: "LONG_TERM" | "MID_TERM";
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  targetDate: string | null;
  roleId: string | null;
};

type Props = {
  roles: Role[];
  onCreated?: () => void;
};

export function GoalsForm({ roles, onCreated }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [horizon, setHorizon] = useState<"LONG_TERM" | "MID_TERM">("LONG_TERM");
  const [status, setStatus] = useState<"ACTIVE" | "COMPLETED" | "ARCHIVED">(
    "ACTIVE",
  );
  const [targetDate, setTargetDate] = useState("");
  const [roleId, setRoleId] = useState("");
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
    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      horizon,
      status,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      roleId: roleId || undefined,
    };
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    setTargetDate("");
    setRoleId("");
    router.refresh();
    onCreated?.();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-border bg-card p-4"
    >
      <h2 className="text-lg font-semibold">New goal</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        rows={2}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Horizon"
          value={horizon}
          onChange={(e) => setHorizon(e.target.value as typeof horizon)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="LONG_TERM">Long term</option>
          <option value="MID_TERM">Mid term</option>
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          <span className="block text-muted-foreground">
            Target date (YYYY-MM-DD)
          </span>
          <input
            type="date"
            aria-label="Target date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            pattern="\d{4}-\d{2}-\d{2}"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <select
          aria-label="Role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">No role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Create goal"}
      </button>
    </form>
  );
}

type GoalRowProps = {
  goal: Goal;
  roles: Role[];
};

export function GoalRow({ goal, roles }: GoalRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete goal "${goal.title}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      alert(`Delete failed: HTTP ${res.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <li className="rounded-md border border-border bg-card p-4">
      {editing ? (
        <GoalEditForm
          goal={goal}
          roles={roles}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <strong>{goal.title}</strong>
              {goal.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {goal.description}
                </p>
              )}
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
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2 py-0.5">
              {goal.horizon}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5">
              {goal.status}
            </span>
          </div>
        </div>
      )}
    </li>
  );
}

function GoalEditForm({
  goal,
  roles,
  onDone,
}: {
  goal: Goal;
  roles: Role[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [horizon, setHorizon] = useState<"LONG_TERM" | "MID_TERM">(
    goal.horizon,
  );
  const [status, setStatus] = useState<"ACTIVE" | "COMPLETED" | "ARCHIVED">(
    goal.status,
  );
  const [targetDate, setTargetDate] = useState(
    goal.targetDate ? goal.targetDate.slice(0, 10) : "",
  );
  const [roleId, setRoleId] = useState(goal.roleId ?? "");
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
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      horizon,
      status,
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      roleId: roleId || null,
    };
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
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
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        rows={2}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Horizon"
          value={horizon}
          onChange={(e) => setHorizon(e.target.value as typeof horizon)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="LONG_TERM">Long term</option>
          <option value="MID_TERM">Mid term</option>
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          <span className="block text-muted-foreground">
            Target date (YYYY-MM-DD)
          </span>
          <input
            type="date"
            aria-label="Target date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            pattern="\d{4}-\d{2}-\d{2}"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <select
          aria-label="Role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">No role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-input bg-secondary px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
