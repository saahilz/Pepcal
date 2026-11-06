"use client";

/**
 * Days since reconstitution against the standard 28-day bacteriostatic-water
 * window — a calendar ring, not a beyond-use date or storage claim. User data
 * wins: the existing badge for the user-entered date stays on every card.
 * Maths in src/lib/domain/vial-stock.ts.
 */

import type { Vial } from "@/lib/data/repository";
import { vialFreshness, BACTERIOSTATIC_WINDOW_DAYS } from "@/lib/domain/vial-stock";
import { cn } from "@/lib/ui/cn";

export function FreshnessRing({
  vial,
  now = new Date(),
  size = 40,
  className,
}: {
  vial: Pick<Vial, "reconstitutedAt">;
  now?: Date;
  size?: number;
  className?: string;
}) {
  const freshness = vialFreshness(vial, now);
  const color = !freshness
    ? "var(--line-strong)"
    : freshness.expired
      ? "var(--bad)"
      : freshness.fraction >= 0.75
        ? "var(--warn)"
        : "var(--ok)";

  if (!freshness) {
    return (
      <span
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        title="No reconstitution recorded"
        aria-label="No reconstitution recorded"
        role="img"
      >
        <span className="text-xs text-subtle">–</span>
      </span>
    );
  }

  const daysLeft = BACTERIOSTATIC_WINDOW_DAYS - freshness.elapsedDays;
  const R = 15;
  const C = 2 * Math.PI * R;

  return (
    <span
      role="img"
      aria-label={`Reconstituted ${freshness.elapsedDays} of ${BACTERIOSTATIC_WINDOW_DAYS} days ago — ${
        freshness.expired ? "the 28-day bacteriostatic window has passed" : `${daysLeft} days left in the 28-day window`
      }. Standard window only; your beyond-use date takes precedence.`}
      title={freshness.expired ? "28-day window passed" : `${daysLeft} days of 28 left`}
      className={cn("relative inline-flex", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 36 36" className="block h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" stroke="var(--line)" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${C * freshness.fraction} ${C}`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums"
        style={{ color }}
      >
        {freshness.expired ? "28d" : `${BACTERIOSTATIC_WINDOW_DAYS - freshness.elapsedDays}`}
      </span>
    </span>
  );
}
