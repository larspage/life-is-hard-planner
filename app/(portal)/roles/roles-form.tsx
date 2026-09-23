"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  id: string;
  name: string;
  description: string | null;
  priorityWeight: number;
  color: string;
};

type Props = { roles: Role[] };

export function RolesForm({ roles }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priorityWeight, setPriorityWeight] = useState(3);
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        priorityWeight,
        color,
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
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-md border border-border bg-card p-3"
    >
      <h2 className="text-base font-semibold">New role</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        required
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
        rows={1}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">
            Priority (1 = highest, 5 = lowest)
          </span>
          <input
            type="number"
            min={1}
            max={5}
            value={priorityWeight}
            onChange={(e) => setPriorityWeight(Number(e.target.value))}
            className="mt-0.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Create role"}
        </button>
      </div>
    </form>
  );
}

export function RoleRow({ role }: { role: Role }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [priorityWeight, setPriorityWeight] = useState(role.priorityWeight);
  const [color, setColor] = useState(role.color);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      alert(`Delete failed: HTTP ${res.status}`);
      return;
    }
    router.refresh();
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        priorityWeight,
        color,
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
    setEditing(false);
    router.refresh();
  }

  return (
    <li className="rounded-md border border-border bg-card p-3">
      {editing ? (
        <form onSubmit={onSave} className="space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            rows={1}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="block text-xs text-muted-foreground">
                Priority (1 = highest, 5 = lowest)
              </span>
              <input
                type="number"
                min={1}
                max={5}
                value={priorityWeight}
                onChange={(e) => setPriorityWeight(Number(e.target.value))}
                className="mt-0.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-muted-foreground">Color</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-0.5 h-9 w-full rounded-md border border-input bg-background"
              />
            </label>
          </div>
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
              onClick={() => setEditing(false)}
              className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: role.color }}
              />
              <strong>{role.name}</strong>
            </div>
            {role.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {role.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              Priority {role.priorityWeight}
            </span>
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
