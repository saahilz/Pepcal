"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "../app-provider";
import { Button, Card, Field, Input } from "../ui";
import {
  type EmailAuthErrors,
  type EmailAuthMode,
  submitEmailAuth,
  startGoogleSignIn,
  validateEmailAuth,
} from "./sign-in-card-state";

export function SignInCard({ initialMode = "sign-in" }: { initialMode?: EmailAuthMode }) {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useData();
  const [mode, setMode] = useState<EmailAuthMode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<EmailAuthErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [router, user]);

  function changeMode(nextMode: EmailAuthMode) {
    setMode(nextMode);
    setError(null);
    setConfirmation(null);
    setFieldErrors({});
    formRef.current?.reset();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };
    const nextErrors = validateEmailAuth(input, mode);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await submitEmailAuth(
      mode,
      input,
      signInWithEmail,
      signUpWithEmail,
      setBusy,
      setError,
      setConfirmation
    );
    const passwordInput = formRef.current?.elements.namedItem("password");
    const confirmPasswordInput = formRef.current?.elements.namedItem("confirmPassword");
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
    if (confirmPasswordInput instanceof HTMLInputElement) confirmPasswordInput.value = "";
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-xl font-bold text-brand">
            P
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">
            {mode === "sign-in" ? "Sign in to Pepcal" : "Create your Pepcal account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your connected Supabase account keeps your records private and available across your devices.
          </p>
        </div>

        <Button
          className="mt-6"
          block
          disabled={busy}
          onClick={() => void startGoogleSignIn(signInWithGoogle, setBusy, setError)}
        >
          {busy ? "Starting Google sign-in…" : "Continue with Google"}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-subtle" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span>or use email</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Email account action">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sign-in"}
            disabled={busy}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === "sign-in" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => changeMode("sign-in")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            disabled={busy}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === "register" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            onClick={() => changeMode("register")}
          >
            Register
          </button>
        </div>

        <form ref={formRef} className="mt-5 space-y-4" onSubmit={submit} noValidate>
          <Field label="Email address" htmlFor="auth-email" error={fieldErrors.email}>
            <Input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              invalid={Boolean(fieldErrors.email)}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </Field>
          <Field label="Password" htmlFor="auth-password" error={fieldErrors.password}>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              placeholder="At least 8 characters"
              invalid={Boolean(fieldErrors.password)}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.password)}
            />
          </Field>
          {mode === "register" ? (
            <Field label="Confirm password" htmlFor="auth-confirm-password" error={fieldErrors.confirmPassword}>
              <Input
                id="auth-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                invalid={Boolean(fieldErrors.confirmPassword)}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
            </Field>
          ) : null}
          <Button type="submit" block variant="secondary" disabled={busy}>
            {busy ? "Working…" : mode === "sign-in" ? "Sign in with email" : "Register with email"}
          </Button>
        </form>

        {confirmation ? (
          <p className="mt-4 text-sm font-medium text-ok" role="status">
            {confirmation}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm font-medium text-bad" role="alert">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
