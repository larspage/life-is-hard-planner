import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { UserSelect } from "./user-select";
import styles from "./login.module.css";

export const metadata = {
  title: "Sign in — LifeOS",
};

type Mode = "production" | "staging" | "development";

function resolveMode(): Mode {
  const m = process.env.LIFEOS_DEPLOYMENT_MODE;
  return m === "staging" || m === "development" ? m : "production";
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  const mode = resolveMode();
  const credsEnabled =
    mode !== "production" && process.env.ENABLE_CREDENTIALS_PROVIDER === "true";

  const isStaging = mode === "staging";

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1 className={styles.title}>LifeOS</h1>
        <p className={styles.subtitle}>Sign in to plan with purpose.</p>
        {isStaging && (
          <p className={styles.banner}>
            Staging — pick a seeded user to sign in as
          </p>
        )}
        {isStaging && credsEnabled ? (
          <UserSelect />
        ) : (
          <LoginForm credsEnabled={credsEnabled} />
        )}
      </section>
    </main>
  );
}
