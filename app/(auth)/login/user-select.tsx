"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

type SeededUser = {
  id: string;
  email: string;
  subscriptionTier: "TRIAL" | "FREE" | "PAID";
  trialExpiresAt: string | null;
};

const TIER_CLASS: Record<SeededUser["subscriptionTier"], string | undefined> = {
  TRIAL: styles.tierTrial,
  FREE: styles.tierFree,
  PAID: styles.tierPaid,
};

function formatTrial(expiresAt: string | null): string {
  if (!expiresAt) return "—";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${days}d left`;
}

export function UserSelect() {
  const [users, setUsers] = useState<SeededUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staging/users", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as SeededUser[];
      })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Could not load seeded users: ${err.message}`
              : "Could not load seeded users",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onPick(email: string) {
    setError(null);
    setBusyEmail(email);
    const res = await signIn("credentials", {
      email,
      // Magic password — the credentials provider skips bcrypt when both
      // LIFEOS_DEPLOYMENT_MODE === "staging" and this exact value is sent.
      password: "__lifeos_staging__",
      redirect: false,
      callbackUrl: "/",
    });
    setBusyEmail(null);
    if (res?.error) {
      setError("Sign-in failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!users) {
    return (
      <p className={styles.subtitle} aria-live="polite">
        Loading seeded users…
      </p>
    );
  }

  if (users.length === 0) {
    return (
      <p className={styles.subtitle}>
        No seeded users yet. Run <code>npm run seed</code> against this
        environment.
      </p>
    );
  }

  return (
    <ul className={styles.userList}>
      {users.map((u) => (
        <li key={u.id}>
          <button
            type="button"
            className={styles.userItem}
            onClick={() => onPick(u.email)}
            disabled={busyEmail !== null}
            aria-busy={busyEmail === u.email}
          >
            <span className={styles.userEmail}>{u.email}</span>
            <span className={styles.userMeta}>
              <span
                className={`${styles.tierBadge} ${TIER_CLASS[u.subscriptionTier]}`}
              >
                {u.subscriptionTier}
              </span>
              <span>{formatTrial(u.trialExpiresAt)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
