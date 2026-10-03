"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/app-provider";
import { shouldRedirectAuthenticatedLanding } from "@/components/landing-state";
import { CalcIcon, LogIcon, VialIcon } from "@/components/icons";

export default function LandingPage() {
  const router = useRouter();
  const { repoKind, status, user } = useData();

  useEffect(() => {
    if (shouldRedirectAuthenticatedLanding(repoKind, user, status)) {
      router.replace("/dashboard");
    }
  }, [repoKind, router, status, user]);

  return (
    <main className="landing-page min-h-dvh overflow-hidden bg-background">
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-10 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <header className="landing-header flex items-center justify-between py-5 sm:py-7">
          <Link href="/" className="tap-slop flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-brand">
            <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-[1.05rem] text-sm font-bold text-brand-fg">P</span>
            <span className="text-base font-semibold tracking-tight">Pepcal</span>
          </Link>
          <Link href="/login" className="landing-text-link tap-slop rounded-lg text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-brand">
            Log in
          </Link>
        </header>

        <section className="landing-hero flex flex-1 items-center py-10 sm:py-14 lg:py-16" aria-labelledby="landing-title">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,0.8fr)] lg:gap-16">
            <div className="landing-copy max-w-xl">
              <p className="landing-kicker">A quieter record for your health routine</p>
              <h1 id="landing-title" className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
                Keep the numbers clear. Keep the record yours.
              </h1>
              <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-muted sm:text-lg sm:leading-8">
                Pepcal helps you calculate concentration and keep a private record of the details you choose to enter.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/register" className="landing-primary-action justify-center">
                  Create an account
                </Link>
                <Link href="/login" className="landing-secondary-action justify-center">
                  Log in
                </Link>
              </div>
              {repoKind === "demo" ? (
                <p className="mt-5 text-sm leading-6 text-muted">
                  Prefer to look around first? <Link href="/dashboard" className="font-medium text-brand underline underline-offset-4">Open the local demo</Link>.
                </p>
              ) : null}
              <p className="mt-8 max-w-lg text-xs leading-5 text-subtle">
                Calculation and record-keeping only. Pepcal does not provide prescribing, dosing, or clinical advice.
              </p>
            </div>

            <div className="landing-preview" aria-label="Example Pepcal dashboard preview">
              <div className="landing-preview-topbar">
                <span className="flex items-center gap-2 text-sm font-semibold"><span className="landing-preview-mark">P</span> Pepcal</span>
                <span className="landing-preview-avatar" aria-hidden="true" />
              </div>
              <div className="landing-preview-body">
                <p className="text-xs font-semibold text-brand">Your health log</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">A clear view of what you track.</p>
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  <PreviewMetric label="Today" value="0" />
                  <PreviewMetric label="Active" value="2" />
                  <PreviewMetric label="Recorded" value="8" />
                </div>
                <div className="mt-5 rounded-2xl border border-line bg-surface px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Make a record</span>
                    <span className="text-xs text-subtle">your information</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <PreviewAction icon={<CalcIcon className="h-4 w-4" />} label="Calculate" />
                    <PreviewAction icon={<LogIcon className="h-4 w-4" />} label="Log" />
                    <PreviewAction icon={<VialIcon className="h-4 w-4" />} label="Vials" />
                  </div>
                </div>
              </div>
              <div className="landing-preview-note">Example only — not your health data</div>
            </div>
          </div>
        </section>

        <footer className="landing-footer border-t border-line/80 pt-5 text-xs leading-5 text-subtle sm:flex sm:items-center sm:justify-between">
          <p>Your data stays scoped to your account when connected to Supabase.</p>
          <p className="mt-2 sm:mt-0">Built for clarity, not recommendations.</p>
        </footer>
      </div>
    </main>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3">
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] text-subtle">{label}</p>
    </div>
  );
}

function PreviewAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-18 flex-col justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-xs font-medium text-muted">
      <span className="text-brand" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
