"use client";

/**
 * Shared UI primitives. Mobile-first: fields are ≥48px tall and never below
 * 16px on touch screens (prevents iOS auto-zoom), every control exposes an
 * accessible label, and controls that render smaller than a comfortable touch
 * target carry the `tap-slop` helper (see globals.css), which grows the
 * tappable area without changing the visual box.
 */

import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/* ------------------------------ Button ------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-brand to-brand-strong text-brand-fg shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/30 active:from-brand-strong active:to-brand-strong disabled:opacity-50",
  secondary:
    "border border-line bg-surface text-foreground shadow-sm hover:border-line-strong hover:bg-surface-2 active:bg-surface-2 disabled:opacity-50",
  ghost: "text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50",
  danger:
    "bg-bad-soft text-bad hover:bg-bad hover:text-white disabled:opacity-50",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-full gap-2",
  lg: "h-12 px-6 text-base rounded-full gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-[color,background-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        buttonVariants[variant],
        buttonSizes[size],
        block && "w-full",
        className
      )}
      {...rest}
    />
  );
}

/* ------------------------------ Card -------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-[1.35rem] border border-line bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  aside,
  children,
}: {
  title?: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
      <div className="min-w-0">
        {title ? (
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        ) : null}
        {children}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/* ------------------------------ Badge ------------------------------- */

export type BadgeTone = "neutral" | "demo" | "ok" | "warn" | "bad" | "info";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted",
  demo: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ Fields ------------------------------ */

const controlClass =
  "w-full rounded-[1.05rem] border border-line bg-surface px-3.5 text-foreground placeholder:text-subtle shadow-sm transition-[border-color,box-shadow,background-color] focus:border-brand-strong focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-bad">{error}</p> : null}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(controlClass, "h-12", invalid && "border-bad focus:ring-bad/40 focus:border-bad", className)}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClass, "min-h-24 py-2.5", className)}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, "h-12 appearance-none pr-8 bg-no-repeat", className)} {...rest}>
      {children}
    </select>
  );
}

/* ------------------------- Segmented control ------------------------ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? <span className="text-sm font-medium">{label}</span> : null}
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex w-fit max-w-full overflow-x-auto rounded-full border border-line bg-surface-2 p-1"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={value === opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              /* tap-slop-y, not tap-slop: options sit flush against each other,
                 so a wider hit box would overlap the neighbour's. */
              "tap-slop-y h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-150 active:scale-[0.98]",
              value === opt.value
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Toggle ------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-brand" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-[cubic-bezier(.2,.9,.3,1.25)]",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

/* ------------------------------ Feedback ---------------------------- */

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-brand" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function EmptyState({
  emoji = "🗂️",
  title,
  body,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2.5 rounded-[1.5rem] border border-dashed border-line-strong bg-surface/55 px-6 py-12 text-center", className)}>
      <span
        className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-brand-soft text-2xl shadow-sm ring-8 ring-brand-soft/40"
        aria-hidden
      >
        {emoji}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {body ? <p className="max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Full-width notice shown when the current repo reports a problem. */
export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
      <span aria-hidden>⚠️</span>
      <div>{children}</div>
    </div>
  );
}
