"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export function LoginForm({ credsEnabled }: { credsEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onGithub() {
    setBusy(true);
    await signIn("github", { callbackUrl: "/" });
  }
  async function onCreds(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className={styles.stack}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onGithub}
        disabled={busy}
      >
        Sign in with GitHub
      </button>
      {credsEnabled && (
        <>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <form className={styles.stack} onSubmit={onCreds}>
            <label className={styles.label}>
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="email"
              />
            </label>
            <label className={styles.label}>
              <span>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className="btn btn-secondary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in (dev)"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
