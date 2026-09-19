import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";
import styles from "./portal.module.css";

/**
 * Portal route group layout. Wraps every page under (portal) with:
 *   - Auth check: middleware already protects, but we double-check here so
 *     session-not-found degrades to /login via redirect.
 *   - Top nav with the four core resources + sign-out.
 *
 * The middleware matcher in /middleware.ts excludes `/login` and the API
 * routes, so unauthenticated users bounce to /login before this layout runs.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandLink}>
            <span className={styles.brandMark}>✦</span>
            <span>LifeOS</span>
          </Link>
        </div>
        <nav className={styles.nav}>
          <Link className={styles.navLink} href="/">
            Dashboard
          </Link>
          <Link className={styles.navLink} href="/goals">
            Goals
          </Link>
          <Link className={styles.navLink} href="/tasks">
            Tasks
          </Link>
          <Link className={styles.navLink} href="/time-blocks">
            Time blocks
          </Link>
        </nav>
        <div className={styles.userBlock}>
          <span className={styles.userEmail}>{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
