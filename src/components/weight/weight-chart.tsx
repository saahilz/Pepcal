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
 * Optional dose markers (`markers`, epoch ms) are annotation pins, not a
 * second series: they project through the very same time scale (see
 * domain/weight.ts projectMarkers), hang from the baseline in the warn colour
 * (a secondary shape+position encoding, never colour-alone identity), and show
 * a tooltip built from `markerContent` — a pure label function owned by the
 * caller, so the chart never learns what an injection record is.
 *
 * Weight is stored in kg; `unit` only changes what the labels say.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildWeightChart,
  fromKg,
  nearestPointIndex,
  projectMarkers,
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
/** Dose pins live in this pixel band above the baseline, ±this wide to hit. */
const PIN_BAND = 28;
const PIN_HIT = 11;

export interface MarkerTooltip {
  title: string;
  lines: string[];
}

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
  markers,
  markerContent,
}: {
  points: WeightPoint[];
  unit: WeightUnit;
  height?: number;
  /** Instants (epoch ms) to annotate with dose pins. */
  markers?: number[];
  /** Label text for the pin at `at`; returning an empty title hides the tip. */
  markerContent?: (at: number) => MarkerTooltip | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(-1);
  const [activePin, setActivePin] = useState<number | null>(null);

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

  /* Sorted once so an index stays stable across the array it was built from. */
  const markerTimes = useMemo(
    () => (markers && markers.length > 0 ? [...markers].sort((a, b) => a - b) : []),
    [markers]
  );
  const pins = useMemo(
    () => (geometry && markerTimes.length > 0 ? projectMarkers(geometry, markerTimes) : []),
    [geometry, markerTimes]
  );

  /* Touch has no "pointer left": a finger-lift fires pointerleave immediately
     after pointerup, so clearing on leave would dismiss the tooltip the user
     just asked for. A touch selection is therefore pinned, and dismissed by a
     tap outside the chart instead — or by Escape, or by blurring it. */
  useEffect(() => {
    if (active < 0 && activePin === null) return;
    function onDocumentPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setActive(-1);
        setActivePin(null);
      }
    }
    document.addEventListener("pointerdown", onDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", onDocumentPointerDown);
  }, [active, activePin]);

  /* `active` is an index into the series, which can shrink underneath it. */
  const activeIndex =
    geometry && active >= 0 && active < geometry.points.length ? active : -1;
  const activePoint = activeIndex >= 0 && geometry ? geometry.points[activeIndex] : null;

  /* Likewise the pin index; a stale index (markers re-grouped under us) is
     dropped, and an empty title means the caller has nothing to say. */
  const pinIndex = activePin !== null && activePin < pins.length ? activePin : null;
  const activePinAt = pinIndex !== null ? pins[pinIndex] : null;
  const pinTip =
    activePinAt && markerContent ? markerContent(activePinAt.at) : null;

  /* Pin hit-testing is 2-D: pins live only in a short band above the baseline,
     so the reading crosshair keeps the rest of the plot. */
  function pinAt(x: number, y: number): number | null {
    if (!geometry || pins.length === 0) return null;
    if (y < geometry.plot.bottom - PIN_BAND || y > geometry.plot.bottom + 4) return null;
    let best: number | null = null;
    let bestDistance = PIN_HIT;
    pins.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return best;
  }

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
        aria-label={`Weight over time. ${summary}${
          pins.length > 0
            ? ` ${pins.length} dose marker${pins.length === 1 ? "" : "s"} sit on the baseline; the list under the chart reads them out.`
            : ""
        } Use the arrow keys to step through the readings.`
        }
        className="block max-w-full select-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onPointerMove={(e) => {
          if (!geometry) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pin = pinAt(x, e.clientY - rect.top);
          setActivePin(pin);
          if (pin === null) setActive(nearestPointIndex(geometry.points, x));
        }}
        onPointerDown={(e) => {
          if (!geometry) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pin = pinAt(x, e.clientY - rect.top);
          setActivePin(pin);
          if (pin === null) setActive(nearestPointIndex(geometry.points, x));
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") {
            setActive(-1);
            setActivePin(null);
          }
        }}
        onFocus={(e) => {
          /* Keyboard focus selects the latest reading as a starting point. A
             tap also focuses this element, and doing it there would fight the
             pointer handlers above — so only keyboard focus counts. */
          if (e.currentTarget.matches(":focus-visible")) {
            setActive((i) => (i >= 0 || pinIndex !== null ? i : points.length - 1));
          }
        }}
        onBlur={() => {
          setActive(-1);
          setActivePin(null);
        }}
        onKeyDown={(e) => {
          if (!geometry) return;
          if (e.key === "ArrowRight") move(activeIndex < 0 ? points.length - 1 : activeIndex + 1);
          else if (e.key === "ArrowLeft") move(activeIndex < 0 ? points.length - 1 : activeIndex - 1);
          else if (e.key === "Home") move(0);
          else if (e.key === "End") move(points.length - 1);
          else if (e.key === "Escape") {
            setActive(-1);
            setActivePin(null);
          } else return;
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

            {activePoint && pinIndex === null ? (
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

            {/* Dose pins: annotation marks, so shape (a stem with a head, on
                the baseline) and position carry them — colour is secondary. */}
            {pins.map((p, i) => {
              const on = pinIndex === i;
              return (
                <g key={`pin-${p.at}`}>
                  <line
                    x1={p.x}
                    x2={p.x}
                    y1={p.yBottom - (on ? 26 : 18)}
                    y2={p.yBottom}
                    stroke="var(--warn)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeOpacity={on ? 1 : 0.9}
                  />
                  <circle
                    cx={p.x}
                    cy={p.yBottom - (on ? 26 : 18)}
                    r={on ? 5 : 3.5}
                    fill="var(--warn)"
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                </g>
              );
            })}

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

      {pinTip && activePinAt ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 rounded-xl border border-line bg-surface px-2.5 py-1.5 shadow-pop"
          style={(() => {
            /* The tip can out-width the plot on phones, so near either edge it
               pins to that edge instead of centring on the pin. ~200px is the
               estimated widest tip; centring only applies while it must fit. */
            const top = Math.max(8, activePinAt.yBottom - 42);
            const est = 200;
            if (activePinAt.x < est / 2 + 8) {
              return { left: 8, top, transform: "translateY(-100%)", maxWidth: "min(240px, calc(100% - 16px))" };
            }
            if (activePinAt.x > width - est / 2 - 8) {
              return { left: "auto", right: 8, top, transform: "translateY(-100%)", maxWidth: "min(240px, calc(100% - 16px))" };
            }
            return { left: activePinAt.x, top, transform: "translate(-50%,-100%)", maxWidth: "min(240px, calc(100% - 16px))" };
          })()}
        >
          <p className="text-sm font-semibold tabular-nums">{pinTip.title}</p>
          {pinTip.lines.map((line, i) => (
            <p key={i} className="text-xs leading-snug text-muted">
              {line}
            </p>
          ))}
        </div>
      ) : activePoint && geometry ? (
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

      {/* Screen-reader access to the pins: the same labels hover shows, in a
          hidden list (hover and touch cannot reach an SVG <g> reliably). */}
      {pins.length > 0 && markerContent ? (
        <ul className="sr-only">
          {pins.map((p) => {
            const tip = markerContent(p.at);
            return (
              <li key={`pin-text-${p.at}`}>
                {tip ? `${tip.title}. ${tip.lines.join(". ")}` : shortDate(p.at)}
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* The visual tooltip is decorative; this is what a screen reader hears. */}
      <p aria-live="polite" className="sr-only">
        {pinTip
          ? `${pinTip.title}. ${pinTip.lines.join(". ")}`
          : activePoint
            ? `${weightLabel(activePoint.kg, unit)}, recorded ${formatDate(
                new Date(activePoint.at).toISOString()
              )}`
            : ""}
      </p>
    </div>
  );
}
