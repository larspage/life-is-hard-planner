import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata = {
  title: "Sign in — LifeOS",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  const credsEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_CREDENTIALS_PROVIDER === "true";

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1 className={styles.title}>LifeOS</h1>
        <p className={styles.subtitle}>Sign in to plan with purpose.</p>
        <LoginForm credsEnabled={credsEnabled} />
      </section>
    </main>
  );
}
