"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useData } from "./app-provider";
import { useTheme } from "./theme-provider";
import { Spinner } from "./ui";
import { SignInCard } from "./auth/sign-in-card";
import { cn } from "@/lib/ui/cn";
import { isPublicRoute, shouldShowSupabaseSignInGate } from "./shell-state";
import {
  CalcIcon,
  HomeIcon,
  LogIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  TrendIcon,
  VialIcon,
} from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** When true the item is highlighted for any URL under href. */
  matchPrefix?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/calculator", label: "Calculate", icon: CalcIcon },
  { href: "/log", label: "Log", icon: LogIcon },
  { href: "/vials", label: "Vials", icon: VialIcon, matchPrefix: true },
  { href: "/weight", label: "Weight", icon: TrendIcon },
];

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="tap-slop flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-[1.05rem] text-sm font-bold text-brand-fg">
        P
      </span>
      <span className="text-base font-semibold tracking-tight">Pepcal</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
      className="tap-slop flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-[color,background-color,transform] duration-150 hover:bg-brand-soft hover:text-brand active:scale-95 focus-visible:outline-2 focus-visible:outline-brand"
    >
      {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { status, error, repoKind, user } = useData();
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;

  if (isPublicRoute(pathname)) {
    if (pathname === "/") return children;
    return <SignInCard initialMode={pathname === "/register" ? "register" : "sign-in"} />;
  }

  if (shouldShowSupabaseSignInGate(repoKind, user, status)) {
    return <SignInCard />;
  }

  return (
    /* The safe-area insets are set by the viewport meta (`viewportFit: cover`).
       Top padding on the wrapper plus a matching sticky offset on the header
       keeps the header parked below the notch whether or not the demo banner
       is present, and lets the banner scroll away underneath it. */
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col bg-background pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {repoKind === "demo" ? (
        <div className="demo-banner border-b border-line px-4 py-2 text-center text-xs font-medium text-brand">
          Demo mode · fictional data stored only in this browser ·{" "}
          <Link href="/settings" className="tap-slop inline-block underline underline-offset-2">
            learn more
          </Link>
        </div>
      ) : null}

      <header className="shell-header sticky top-[env(safe-area-inset-top)] z-20 border-b backdrop-blur">
        <div className="shell-header-inner mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Brand />
          <nav aria-label="Primary" className="hidden items-center gap-1 rounded-2xl border border-line/70 bg-surface/50 p-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-150",
                  isActive(item)
                    ? "bg-brand-soft text-brand shadow-sm"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="Settings"
              className="tap-slop flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-[color,background-color,transform] duration-150 hover:bg-brand-soft hover:text-brand active:scale-95"
            >
              <SettingsIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-12">
        {status === "loading" ? <Spinner label="Opening your records" /> : null}
        {status === "error" ? (
          <div className="mx-auto max-w-md rounded-2xl border border-bad bg-bad-soft p-6 text-center">
            <h1 className="font-semibold text-bad">Couldn’t open your data</h1>
            <p className="mt-2 text-sm">{error}</p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
              Reload
            </Link>
          </div>
        ) : null}
        {status === "ready" ? children : null}
      </main>

      <nav
        aria-label="Primary"
        className="mobile-nav fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur md:hidden"
      >
        {/* This nav is fixed to the viewport, so it sits outside the wrapper's
            safe-area padding and carries the insets itself. */}
        <div className="mx-auto grid max-w-5xl grid-cols-5 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors duration-150",
                isActive(item) ? "text-brand" : "text-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-2 transition-colors duration-150",
                  isActive(item) ? "bg-brand-soft" : "bg-transparent"
                )}
              >
                <item.icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
