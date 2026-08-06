"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/components/app-provider";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyMfa } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (challengeToken) {
        await verifyMfa(challengeToken, code);
        router.replace("/");
        return;
      }
      const result = await login(email.trim(), password);
      if (result.mfaRequired) {
        setChallengeToken(result.challengeToken);
      } else {
        router.replace("/");
      }
    } catch (reason) {
      setError(
        reason instanceof ApiError || reason instanceof Error
          ? reason.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="loginPage">
      <section className="loginCard">
        <div className="loginStory">
          <div className="loginBrand">
            <span>S</span> SYLORA
          </div>
          <div>
            <h1>Clarity for every moving part.</h1>
            <p>
              A focused operational view of the people, intelligence, commerce, and live systems
              that power SYLORA.
            </p>
          </div>
          <div className="loginNote">LUMEN ADMIN ENVIRONMENT · AUTHORIZED ACCESS ONLY</div>
        </div>

        <form className="loginFormWrap" onSubmit={submit}>
          <p className="eyebrow">{challengeToken ? "Second factor" : "Welcome back"}</p>
          <h2>{challengeToken ? "Verify your identity" : "Admin sign in"}</h2>
          <p>
            {challengeToken
              ? "Enter the code from your authenticator to finish signing in."
              : "Use your existing SYLORA administrator credentials."}
          </p>

          {challengeToken ? (
            <label className="formField">
              Authentication code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                minLength={6}
                maxLength={32}
                autoFocus
                required
              />
            </label>
          ) : (
            <>
              <label className="formField">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@sylora.com"
                  required
                />
              </label>
              <label className="formField">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
            </>
          )}

          {error ? <div className="formError">{error}</div> : null}

          <button className="primaryButton" type="submit" disabled={submitting}>
            {submitting ? "Connecting…" : challengeToken ? "Verify & continue" : "Continue securely"}
          </button>
        </form>
      </section>
    </main>
  );
}
