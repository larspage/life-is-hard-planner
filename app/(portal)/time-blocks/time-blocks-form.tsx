"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Task = { id: string; title: string };

type TimeBlock = {
  id: string;
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
};

type Props = { tasks: Task[] };

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimeBlocksForm({ tasks }: Props) {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!taskId) {
      setError("Pick a task");
      return;
    }
    if (!date || !startTime || !endTime) {
      setError("Date, start, and end are required");
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      setError("End time must be after start time");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/time-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        date: new Date(date).toISOString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
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
    setTaskId("");
    setDate("");
    setStartTime("");
    setEndTime("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-border bg-card p-4"
    >
      <h2 className="text-lg font-semibold">New time block</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <select
        aria-label="Task"
        value={taskId}
        onChange={(e) => setTaskId(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      >
        <option value="">Pick a task</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      <input
        type="date"
        aria-label="Date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          aria-label="Start time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
        <input
          type="datetime-local"
          aria-label="End time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Create time block"}
      </button>
    </form>
  );
}

export function TimeBlockRow({
  block,
  tasks,
}: {
  block: TimeBlock;
  tasks: Task[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const task = tasks.find((t) => t.id === block.taskId);

  async function onDelete() {
    if (!confirm("Delete this time block?")) return;
    setDeleting(true);
    const res = await fetch(`/api/time-blocks/${block.id}`, {
      method: "DELETE",
    });
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
        <TimeBlockEditForm
          block={block}
          tasks={tasks}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <strong>{task?.title ?? "(unknown task)"}</strong>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(block.startTime).toLocaleString()} →{" "}
              {new Date(block.endTime).toLocaleString()}
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
      )}
    </li>
  );
}

function TimeBlockEditForm({
  block,
  tasks,
  onDone,
}: {
  block: TimeBlock;
  tasks: Task[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [taskId, setTaskId] = useState(block.taskId);
  const [date, setDate] = useState(block.date.slice(0, 10));
  const [startTime, setStartTime] = useState(toLocalInput(block.startTime));
  const [endTime, setEndTime] = useState(toLocalInput(block.endTime));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      setError("End time must be after start time");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/time-blocks/${block.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        date: new Date(date).toISOString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
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
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <select
        aria-label="Task"
        value={taskId}
        onChange={(e) => setTaskId(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      >
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      <input
        type="date"
        aria-label="Date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          aria-label="Start time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
        <input
          type="datetime-local"
          aria-label="End time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
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
