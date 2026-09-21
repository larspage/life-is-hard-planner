"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Value = {
  id: string;
  text: string;
  tags: string[];
};

export function ValuesForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Text is required");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), tags }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? `HTTP ${res.status}`);
      return;
    }
    setText("");
    setTagsInput("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-border bg-card p-4"
    >
      <h2 className="text-lg font-semibold">New value</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        type="text"
        placeholder="Value statement"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      />
      <input
        type="text"
        placeholder="Tags (comma-separated)"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Create value"}
      </button>
    </form>
  );
}

export function ValueRow({ value }: { value: Value }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [text, setText] = useState(value.text);
  const [tagsInput, setTagsInput] = useState(value.tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete value "${value.text}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/values/${value.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      alert(`Delete failed: HTTP ${res.status}`);
      return;
    }
    router.refresh();
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Text is required");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/values/${value.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), tags }),
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
    <li className="rounded-md border border-border bg-card p-4">
      {editing ? (
        <form onSubmit={onSave} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
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
              onClick={() => setEditing(false)}
              className="rounded-md border border-input bg-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <strong>{value.text}</strong>
            {value.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {value.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
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
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
