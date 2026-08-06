"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/Button";
import { describeError } from "@/components/DataState";
import { Field, TextInput } from "@/components/Field";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/lib/auth-context";

import styles from "./login.module.css";

export default function LoginPage() {
  const { status, login, verifyMfa } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const outcome = await login(email.trim(), password);
      if (outcome.mfaRequired && outcome.challengeToken) {
        setChallengeToken(outcome.challengeToken);
      } else {
        router.replace("/");
      }
    } catch (err) {
      setError(describeError(err).detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!challengeToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyMfa(challengeToken, code.trim());
      router.replace("/");
    } catch (err) {
      setError(describeError(err).detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <span className={[styles.orb, styles.orbGold].join(" ")} aria-hidden />
      <span className={[styles.orb, styles.orbViolet].join(" ")} aria-hidden />
      <span className={[styles.orb, styles.orbSky].join(" ")} aria-hidden />

      <div className={styles.panel}>
        <div className={styles.brandRow}>
          <span className={styles.mark} aria-hidden>
            S
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>SYLORA</span>
            <span className={styles.brandSub}>Admin Console</span>
          </span>
        </div>

        <GlassCard padding="lg">
          {challengeToken ? (
            <form onSubmit={handleVerify}>
              <h1 className={styles.heading}>Two-factor verification</h1>
              <p className={styles.subheading}>Enter the 6-digit code from your authenticator app.</p>
              {error ? <div className={styles.errorBanner}>{error}</div> : null}
              <Field label="Authentication code">
                <TextInput
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Button type="submit" variant="gold" fullWidth disabled={submitting}>
                {submitting ? "Verifying…" : "Verify and sign in"}
              </Button>
              <button
                type="button"
                className={styles.backLink}
                onClick={() => {
                  setChallengeToken(null);
                  setCode("");
                  setError(null);
                }}
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className={styles.heading}>Welcome back</h1>
              <p className={styles.subheading}>Sign in with your SYLORA admin or owner account.</p>
              {error ? <div className={styles.errorBanner}>{error}</div> : null}
              <Field label="Email">
                <TextInput
                  type="email"
                  autoComplete="email"
                  placeholder="you@sylora.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Field label="Password">
                <TextInput
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
              <Button type="submit" variant="gold" fullWidth disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}
        </GlassCard>

        <p className={styles.footerNote}>
          Access is restricted to accounts with the <strong>admin</strong> or <strong>owner</strong>{" "}
          role. Contact a platform owner if you need access.
        </p>
      </div>
    </div>
  );
}
