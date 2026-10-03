"use client";

/**
 * Hand-rolled SVG line chart for body-weight readings. No chart library — the
 * app ships zero UI dependencies, and one time series does not need one.
 *
 * Design rules this follows (see the dataviz guidance):
 *  - one series, so no legend box — the card title names it;
 *  - 2px line, round joins/caps, 8px markers filled with the series colour and
 *    ringed in the surface colour so overlapping dots stay separable;
 *  - a ~12% area wash under the line, never a saturated block;
 *  - gridlines and the baseline are solid hairlines one step off the surface —
 *    never dashed, never competing with the data;
 *  - no number on every point. The latest value is read from the stat directly
 *    above the chart, and the readings table below carries every value, so the
 *    plot stays clean;
 *  - every label wears a text token, never the series colour;
 *  - crosshair + tooltip snaps to the nearest reading, and the same stepping is
 *    available from the keyboard (arrows / Home / End / Escape) with a polite
 *    live region announcing each stop.
 *
 * Weight is stored in kg; `unit` only changes what the labels say.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildWeightChart,
  fromKg,
  nearestPointIndex,
  weightLabel,
  type WeightPoint,
  type WeightUnit,
} from "@/lib/domain/weight";
import { formatDate } from "@/lib/format";

const DEFAULT_HEIGHT = 240;
/** Above this many readings the dots turn into noise; the line carries it. */
const MARKER_LIMIT = 60;
const Y_LABEL_GAP = 8;
/** Tooltip half-width ceiling — used to keep it inside the plot at the edges. */
const TOOLTIP_CLAMP = 62;

function shortDate(at: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(at)
  );
}

function tickLabel(kg: number, unit: WeightUnit, step: number): string {
  const stepInUnit = unit === "kg" ? step : step / 0.45359237;
  const decimals = stepInUnit % 1 === 0 ? 0 : stepInUnit < 1 ? 2 : 1;
  return fromKg(kg, unit).toFixed(decimals);
}

export function WeightChart({
  points,
  unit,
  height = DEFAULT_HEIGHT,
}: {
  points: WeightPoint[];
  unit: WeightUnit;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(-1);

  /* Measured, not guessed: the SVG is drawn in absolute pixels at exactly the
     container's width, so screen coordinates map 1:1 onto chart coordinates and
     nothing is scaled or letterboxed. setState happens inside the observer
     callback, never synchronously in the effect body. */
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

  const geometry = useMemo(
    () => buildWeightChart(points, { width, height }),
    [points, width, height]
  );

  /* Touch has no "pointer left": a finger-lift fires pointerleave immediately
     after pointerup, so clearing on leave would dismiss the tooltip the user
     just asked for. A touch selection is therefore pinned, and dismissed by a
     tap outside the chart instead — or by Escape, or by blurring it. */
  useEffect(() => {
    if (active < 0) return;
    function onDocumentPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setActive(-1);
    }
    document.addEventListener("pointerdown", onDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", onDocumentPointerDown);
  }, [active]);

  /* `active` is an index into the series, which can shrink underneath it. */
  const activeIndex =
    geometry && active >= 0 && active < geometry.points.length ? active : -1;
  const activePoint = activeIndex >= 0 && geometry ? geometry.points[activeIndex] : null;

  const first = points[0];
  const last = points[points.length - 1];
  const summary =
    points.length === 1
      ? `One reading, ${weightLabel(first.kg, unit)}.`
      : `${points.length} readings from ${weightLabel(first.kg, unit)} on ${formatDate(
          new Date(first.at).toISOString()
        )} to ${weightLabel(last.kg, unit)} on ${formatDate(new Date(last.at).toISOString())}.`;

  if (points.length === 0) return null;

  function move(to: number) {
    if (!geometry) return;
    const count = geometry.points.length;
    setActive(Math.max(0, Math.min(count - 1, to)));
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        tabIndex={0}
        aria-label={`Weight over time. ${summary} Use the arrow keys to step through the readings.`}
        className="block max-w-full select-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onPointerMove={(e) => {
          if (!geometry) return;
          setActive(nearestPointIndex(geometry.points, e.clientX - e.currentTarget.getBoundingClientRect().left));
        }}
        onPointerDown={(e) => {
          if (!geometry) return;
          setActive(nearestPointIndex(geometry.points, e.clientX - e.currentTarget.getBoundingClientRect().left));
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") setActive(-1);
        }}
        onFocus={(e) => {
          /* Keyboard focus selects the latest reading as a starting point. A
             tap also focuses this element, and doing it there would fight the
             pointer handlers above — so only keyboard focus counts. */
          if (e.currentTarget.matches(":focus-visible")) {
            setActive((i) => (i >= 0 ? i : points.length - 1));
          }
        }}
        onBlur={() => setActive(-1)}
        onKeyDown={(e) => {
          if (!geometry) return;
          if (e.key === "ArrowRight") move(activeIndex < 0 ? points.length - 1 : activeIndex + 1);
          else if (e.key === "ArrowLeft") move(activeIndex < 0 ? points.length - 1 : activeIndex - 1);
          else if (e.key === "Home") move(0);
          else if (e.key === "End") move(points.length - 1);
          else if (e.key === "Escape") setActive(-1);
          else return;
          e.preventDefault();
        }}
      >
        {geometry ? (
          <>
            {/* Recessive grid: one hairline per y tick, plus a slightly firmer
                baseline so the area wash has something to sit on. */}
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

            {geometry.areaPath ? (
              <path d={geometry.areaPath} fill="var(--brand)" fillOpacity={0.12} stroke="none" />
            ) : null}

            {activePoint ? (
              <line
                x1={activePoint.x}
                x2={activePoint.x}
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

            {points.length <= MARKER_LIMIT
              ? geometry.points.map((p, i) => (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={activeIndex === i ? 5.5 : 4}
                    fill="var(--brand)"
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ))
              : null}

            {geometry.yTicks.map((t) => (
              <text
                key={`y-${t.kg}`}
                x={geometry.plot.left - Y_LABEL_GAP}
                y={t.y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-subtle text-[11px] tabular-nums"
              >
                {tickLabel(
                  t.kg,
                  unit,
                  geometry.yTicks.length > 1
                    ? Math.abs(geometry.yTicks[1].kg - geometry.yTicks[0].kg)
                    : 1
                )}
              </text>
            ))}

            {geometry.xTicks.map((t) => (
              <text
                key={`x-${t.at}`}
                x={t.x}
                y={geometry.plot.bottom + 18}
                textAnchor={
                  t.x <= geometry.plot.left + 1
                    ? "start"
                    : t.x >= geometry.plot.right - 1
                      ? "end"
                      : "middle"
                }
                className="fill-subtle text-[11px]"
              >
                {shortDate(t.at)}
              </text>
            ))}
          </>
        ) : null}
      </svg>

      {activePoint && geometry ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-2.5 py-1.5 shadow-pop"
          style={{
            left: Math.max(TOOLTIP_CLAMP, Math.min(width - TOOLTIP_CLAMP, activePoint.x)),
            top: Math.max(46, activePoint.y - 10),
          }}
        >
          <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
            {weightLabel(activePoint.kg, unit)}
          </p>
          <p className="whitespace-nowrap text-xs text-muted">
            {formatDate(new Date(activePoint.at).toISOString())}
          </p>
        </div>
      ) : null}

      {/* The visual tooltip is decorative; this is what a screen reader hears. */}
      <p aria-live="polite" className="sr-only">
        {activePoint
          ? `${weightLabel(activePoint.kg, unit)}, recorded ${formatDate(
              new Date(activePoint.at).toISOString()
            )}`
          : ""}
      </p>
    </div>
  );
}
