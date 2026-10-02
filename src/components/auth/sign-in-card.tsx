"use client";

import { useState } from "react";
import { useData } from "../app-provider";
import { Button, Card } from "../ui";
import { startGoogleSignIn } from "./sign-in-card-state";

export function SignInCard() {
  const { signInWithGoogle } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-sm p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-xl font-bold text-brand">
          P
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Sign in to Pepcal</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your connected Supabase account keeps your records private and available across your
          devices.
        </p>
        <Button
          className="mt-6"
          block
          disabled={busy}
          onClick={() => void startGoogleSignIn(signInWithGoogle, setBusy, setError)}
        >
          {busy ? "Starting Google sign-in…" : "Continue with Google"}
        </Button>
        {error ? (
          <p className="mt-3 text-sm font-medium text-bad" role="alert">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
