"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

import { Button } from "./Button";
import { GlassCard } from "./GlassCard";
import styles from "./AccessDenied.module.css";

export function AccessDenied() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className={styles.wrap}>
      <GlassCard padding="lg" className={styles.card}>
        <span className={styles.badge} aria-hidden>
          ⛔
        </span>
        <h1 className={styles.title}>Access denied</h1>
        <p className={styles.detail}>
          Signed in as <strong>{user?.email}</strong>, but this console is restricted to SYLORA
          <strong> admin</strong> or <strong>owner</strong> roles. Ask a platform owner to grant
          your account the correct role, then sign in again.
        </p>
        <p className={styles.roles}>
          Current roles: {user?.roles.length ? user.roles.join(", ") : "none assigned"}
        </p>
        <Button variant="ghost" onClick={handleLogout}>
          Sign out
        </Button>
      </GlassCard>
    </div>
  );
}
