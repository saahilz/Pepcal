"use client";

/**
 * Estimated active-level curve. The decay maths lives in
 * src/lib/domain/half-life.ts; the x/y geometry is the weight chart's own
 * (`buildWeightChart` is unit-agnostic — its `kg` field carries mcg here).
 * Past 30 days plus 7 days of projected decay, dose events marked as peaks,
 * a divider at now. An estimate modelled from the user's records and their
 * own chosen half-life — never a blood measurement.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { buildWeightChart, nearestPointIndex, type WeightPoint } from "@/lib/domain/weight";
import { buildSerumSeries, type SerumDose } from "@/lib/domain/half-life";
import { formatDate, trimNumber } from "@/lib/format";

const HEIGHT = 220;
const TOOLTIP_CLAMP = 62;

/** Sub-1000 mcg reads in mcg; beyond that in mg. */
export function serumAmountLabel(mcg: number): string {
  return mcg >= 1000 ? `${trimNumber(mcg / 1000, 2)} mg` : `${trimNumber(mcg, 1)} mcg`;
}

function shortDate(at: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(at));
}

export function SerumLevelChart({
  doses,
  halfLifeHours,
  now,
}: {
  doses: SerumDose[];
  halfLifeHours: number;
  now: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(-1);

  const series = useMemo(
    () => buildSerumSeries(doses, now, halfLifeHours),
    [doses, now, halfLifeHours]
  );
  const points = useMemo<WeightPoint[]>(
    () => series.map((s, i) => ({ id: `p${i}`, at: s.at, kg: s.mcg })),
    [series]
  );

  /* Measured width, setState inside the observer only — the weight chart's rule. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Touch has no "pointer left": taps pin the readout, an outside tap clears it. */
  useEffect(() => {
    if (active < 0) return;
    function onDocumentPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setActive(-1);
    }
    document.addEventListener("pointerdown", onDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", onDocumentPointerDown);
  }, [active]);

  const geometry = useMemo(
    () => buildWeightChart(points, { width, height: HEIGHT }),
    [points, width]
  );

  if (!geometry) return <div ref={containerRef} className="h-[220px] w-full" />;

  const t0 = series[0].at;
  const t1 = series[series.length - 1].at;
  const span = t1 - t0 || 1;
  const xFor = (at: number) => geometry.plot.left + ((at - t0) / span) * geometry.plot.width;
  const nowX = xFor(now);
  const idxAt = (at: number) =>
    Math.min(series.length - 1, Math.max(0, Math.round(((at - t0) / span) * (series.length - 1))));

  const peaks = doses.filter((d) => d.at >= t0 && d.at <= t1).map((d) => geometry.points[idxAt(d.at)]);
  const current = geometry.points[idxAt(now)];

  const activeIndex = active >= 0 && active < points.length ? active : -1;
  const activeSample = activeIndex >= 0 ? series[activeIndex] : null;

  function move(to: number) {
    setActive(Math.max(0, Math.min(points.length - 1, to)));
  }

  const yStep =
    geometry.yTicks.length > 1 ? Math.abs(geometry.yTicks[1].kg - geometry.yTicks[0].kg) : 1;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        tabIndex={0}
        aria-label={`Estimated active peptide over the last 30 days, with 7 days of projected decay at a ${halfLifeHours}-hour half-life. Current estimate ${serumAmountLabel(current.kg)}. ${peaks.length} dose event${peaks.length === 1 ? "" : "s"} marked. Use the arrow keys to read the curve.`}
        className="block max-w-full select-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onPointerMove={(e) =>
          setActive(nearestPointIndex(geometry.points, e.clientX - e.currentTarget.getBoundingClientRect().left))
        }
        onPointerDown={(e) =>
          setActive(nearestPointIndex(geometry.points, e.clientX - e.currentTarget.getBoundingClientRect().left))
        }
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") setActive(-1);
        }}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) {
            setActive((i) => (i >= 0 ? i : points.length - 1));
          }
        }}
        onBlur={() => setActive(-1)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(activeIndex < 0 ? points.length - 1 : activeIndex + 1);
          else if (e.key === "ArrowLeft") move(activeIndex < 0 ? points.length - 1 : activeIndex - 1);
          else if (e.key === "Home") move(0);
          else if (e.key === "End") move(points.length - 1);
          else if (e.key === "Escape") setActive(-1);
          else return;
          e.preventDefault();
        }}
      >
        {geometry.yTicks.map((t) => (
          <line
            key={`grid-${t.kg}`}
            x1={geometry.plot.left}
            x2={geometry.plot.right}
            y1={Math.round(t.y) + 0.5}
            y2={Math.round(t.y) + 0.5}
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}
        <line
          x1={geometry.plot.left}
          x2={geometry.plot.right}
          y1={Math.round(geometry.plot.bottom) + 0.5}
          y2={Math.round(geometry.plot.bottom) + 0.5}
          stroke="var(--line-strong)"
          strokeWidth={1}
        />

        {/* The projection: everything after now is modelled decay, not record. */}
        <rect
          x={nowX}
          y={geometry.plot.top}
          width={Math.max(0, geometry.plot.right - nowX)}
          height={geometry.plot.bottom - geometry.plot.top}
          fill="var(--line)"
          fillOpacity={0.35}
        />
        <line
          x1={nowX}
          x2={nowX}
          y1={geometry.plot.top}
          y2={geometry.plot.bottom}
          stroke="var(--line-strong)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text x={nowX + 4} y={geometry.plot.top + 9} className="fill-subtle text-[10px]">
          now
        </text>

        {geometry.areaPath ? (
          <path d={geometry.areaPath} fill="var(--brand)" fillOpacity={0.12} stroke="none" />
        ) : null}

        {activeSample ? (
          <line
            x1={geometry.points[activeIndex].x}
            x2={geometry.points[activeIndex].x}
            y1={geometry.plot.top}
            y2={geometry.plot.bottom}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />
        ) : null}

        <path
          d={geometry.linePath}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dose events sit where the curve peaks (samples are dense; ≤1 step off). */}
        {peaks.map((p, i) => (
          <path
            key={`peak-${i}`}
            d="M0 -4.5 L4.5 0 L0 4.5 L-4.5 0 Z"
            transform={`translate(${p.x} ${p.y})`}
            fill="var(--brand)"
            stroke="var(--surface)"
            strokeWidth={1.5}
          />
        ))}
        <circle
          cx={current.x}
          cy={current.y}
          r={4.5}
          fill="var(--brand-soft)"
          stroke="var(--brand)"
          strokeWidth={2}
        />

        {geometry.yTicks.map((t) => (
          <text
            key={`y-${t.kg}`}
            x={geometry.plot.left - 8}
            y={t.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-subtle text-[11px] tabular-nums"
          >
            {t.kg.toFixed(yStep < 1 ? 2 : 0)}
          </text>
        ))}
        {geometry.xTicks.map((t) => (
          <text
            key={`x-${t.at}`}
            x={t.x}
            y={geometry.plot.bottom + 18}
            textAnchor={
              t.x <= geometry.plot.left + 1 ? "start" : t.x >= geometry.plot.right - 1 ? "end" : "middle"
            }
            className="fill-subtle text-[11px]"
          >
            {shortDate(t.at)}
          </text>
        ))}
      </svg>

      {activeSample ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-2.5 py-1.5 shadow-pop"
          style={{
            left: Math.max(TOOLTIP_CLAMP, Math.min(width - TOOLTIP_CLAMP, geometry.points[activeIndex].x)),
            top: Math.max(46, geometry.points[activeIndex].y - 10),
          }}
        >
          <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
            {serumAmountLabel(activeSample.mcg)}
          </p>
          <p className="whitespace-nowrap text-xs text-muted">
            {shortDate(activeSample.at)}
            {activeSample.at > now ? " · projected" : ""}
          </p>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {activeSample
          ? `${serumAmountLabel(activeSample.mcg)} active on ${formatDate(
              new Date(activeSample.at).toISOString()
            )}${activeSample.at > now ? " (projected)" : ""}`
          : ""}
      </p>
    </div>
  );
}
