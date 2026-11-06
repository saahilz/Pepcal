"use client";

/**
 * Visual U-100 syringe with the rubber plunger pulled to the computed draw
 * volume. The markings are a VOLUME scale (1 unit ≡ 0.01 mL) — the caption
 * restates that, per the house rule wherever the scale appears.
 *
 * Capacity defaults to the smallest standard U-100 (0.3 → 0.5 → 1 mL) that
 * holds the dose; callers that know the syringe on screen pass it explicitly.
 * shortcut: no dead-space or overdraw modelling, only the drawn volume.
 */

import { measureWithU100, u100UnitsForVolume } from "@/lib/domain/syringe";
import { trimNumber } from "@/lib/format";
import { cn } from "@/lib/ui/cn";

export function SyringeScale({
  volumeMl,
  capacityMl,
  tickUnits = 1,
  className,
  compact = false,
}: {
  volumeMl: number;
  /** When omitted the smallest of 0.3/0.5/1 mL that fits is used. */
  capacityMl?: number;
  tickUnits?: number;
  className?: string;
  /** Tight cards render the number only — no barrel or caption. */
  compact?: boolean;
}) {
  const capacity = capacityMl ?? ([0.3, 0.5, 1] as const).find((c) => volumeMl <= c) ?? 1;
  const measurement = measureWithU100({ kind: "u100", capacityMl: capacity, tickUnits }, volumeMl);

  const W = 260;
  const H = 78;
  const bx = 20;
  const by = 16;
  const bw = 200;
  const bh = 30;
  const frac = Math.min(1, Math.max(0, volumeMl / capacity));
  const sealX = bx + bw * frac;
  const totalUnits = u100UnitsForVolume(capacity);

  const ticks = [];
  for (let u = 0; u <= totalUnits + 1e-9; u += tickUnits) {
    const x = bx + (bw * u) / totalUnits;
    const major = u % 10 < 1e-9;
    ticks.push(
      <line
        key={`t${u}`}
        x1={x}
        x2={x}
        y1={by}
        y2={by + (major ? 8 : 4)}
        stroke="var(--line-strong)"
        strokeWidth={1}
      />
    );
    if (major) {
      ticks.push(
        <text key={`l${u}`} x={x} y={by + bh + 14} textAnchor="middle" className="fill-subtle text-[9px] tabular-nums">
          {u}
        </text>
      );
    }
  }

  if (compact) {
    // Tight cards (dashboard countdown strip): readable at ~6rem wide means a
    // barrel outline + plunger position, no graduation labels.
    return (
      <div className={cn("flex flex-col items-center gap-1", className)}>
        <svg viewBox="0 0 52 16" className="block h-4 w-11" aria-hidden="true">
          <rect x="2" y="5" width="38" height="8" rx="2" fill="var(--brand)" fillOpacity={0.18} />
          <rect x={2 + 38 * frac - 4} y="5" width="4" height="8" fill="var(--brand)" />
          <rect x="2" y="5" width="38" height="8" rx="2" fill="none" stroke="var(--line-strong)" strokeWidth="1.2" />
          <line x1="40" y1="9" x2="49" y2="9" stroke="var(--line-strong)" strokeWidth="3" />
          <rect x="48" y="4" width="3" height="10" rx="1" fill="var(--line-strong)" />
        </svg>
        <p className="text-xs font-semibold tabular-nums text-brand">
          Draw to: {trimNumber(measurement.units, 1)} units
        </p>
      </div>
    );
  }

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Syringe diagram: a ${capacity} mL U-100 syringe with the plunger pulled to ${trimNumber(measurement.units, 1)} units.`}
        className="block h-auto w-full select-none"
      >
        {/* luer tip */}
        <path d={`M${bx} ${by + 6} L6 ${by + bh / 2 - 2} L6 ${by + bh / 2 + 2} L${bx} ${by + bh - 6}`} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
        {/* liquid already in the barrel */}
        <rect x={bx} y={by} width={sealX - bx} height={bh} fill="var(--brand)" fillOpacity={0.18} />
        {/* barrel */}
        <rect x={bx} y={by} width={bw} height={bh} rx={3} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
        {ticks}
        {/* plunger seal */}
        <rect x={Math.max(bx, sealX - 7)} y={by + 2} width={7} height={bh - 4} rx={2} fill="var(--brand)" />
        {/* rod + finger flange */}
        <line x1={sealX} y1={by + bh / 2} x2={244} y2={by + bh / 2} stroke="var(--line-strong)" strokeWidth={5} strokeLinecap="butt" />
        <rect x={242} y={by - 6} width={7} height={bh + 12} rx={2} fill="var(--line-strong)" />
      </svg>
      <figcaption className="mt-1 text-sm">
        <span className="font-semibold">Draw to: {trimNumber(measurement.units, 1)} units</span>{" "}
        <span className="text-xs text-muted">· U-100 {capacity} mL scale — markings are volume, not potency.</span>
        {measurement.issues.length > 0 ? (
          <span className="mt-1 block text-xs font-medium text-warn">{measurement.issues[0].message}</span>
        ) : null}
      </figcaption>
    </figure>
  );
}
