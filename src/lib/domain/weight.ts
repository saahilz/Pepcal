/**
 * Body-weight record-keeping helpers.
 *
 * Pure and unit-testable. Scope note: this module records what the user enters.
 * It never sets a goal or target, never suggests a rate of change, and never
 * judges a value as good or bad — it only converts units, summarises a series,
 * and lays out a chart.
 *
 * Weight is stored canonically in kilograms; kg/lb is a display choice. The
 * pound is exact by definition (1 lb = 0.45359237 kg), so round-tripping a
 * lb-entered reading through kg loses nothing that matters at display precision.
 */

export type WeightUnit = "kg" | "lb";

/** Exact by definition (international avoirdupois pound). */
export const KG_PER_LB = 0.45359237;

export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

/** Convert between display units (goes via the canonical kg). */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  return from === to ? value : fromKg(toKg(value, from), to);
}

/* ----------------------------- display ------------------------------ */

/** A reading as a scale would show it: "82.1 kg", "181.0 lb". */
export function weightLabel(kg: number, unit: WeightUnit, decimals = 1): string {
  return `${fromKg(kg, unit).toFixed(decimals)} ${unit}`;
}

/**
 * The step between two readings, signed and in the display unit — "−6.3 kg",
 * "+1.2 lb", "0" when they match. Null (not yet two readings) renders as "—".
 *
 * The sign is information, not a verdict: this app never colours a direction
 * good or bad.
 */
export function weightDeltaLabel(kg: number | null, unit: WeightUnit): string {
  if (kg === null) return "—";
  const v = fromKg(kg, unit);
  if (Math.abs(v) < 0.05) return "0";
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} ${unit}`;
}

/* ------------------------------ series ------------------------------ */

/** A reading reduced to what the maths needs: an instant and a canonical weight. */
export interface WeightPoint {
  id: string;
  /** Epoch milliseconds of the reading. */
  at: number;
  kg: number;
}

/** Project stored entries (newest-first or not) into an ascending time series. */
export function toWeightPoints(
  entries: { id: string; recordedAt: string; weightKg: number }[]
): WeightPoint[] {
  return entries
    .map((e) => ({ id: e.id, at: new Date(e.recordedAt).getTime(), kg: e.weightKg }))
    .filter((p) => Number.isFinite(p.at) && Number.isFinite(p.kg))
    .sort((a, b) => a.at - b.at);
}

export interface WeightSummary {
  count: number;
  firstKg: number | null;
  latestKg: number | null;
  /** latest − first, in kg. Null until there are two readings to compare. */
  changeKg: number | null;
  minKg: number | null;
  maxKg: number | null;
}

export function summarizeWeight(points: WeightPoint[]): WeightSummary {
  if (points.length === 0) {
    return { count: 0, firstKg: null, latestKg: null, changeKg: null, minKg: null, maxKg: null };
  }
  const kgs = points.map((p) => p.kg);
  const first = kgs[0];
  const latest = kgs[kgs.length - 1];
  return {
    count: points.length,
    firstKg: first,
    latestKg: latest,
    changeKg: points.length > 1 ? latest - first : null,
    minKg: Math.min(...kgs),
    maxKg: Math.max(...kgs),
  };
}

/* ------------------------------ chart ------------------------------- */

/**
 * A "nice" axis step (1/2/5 × 10^n) covering `range` in roughly `count` steps.
 * Uses the standard 1.5/3/7 thresholds (Heckbert) so the tick count stays close
 * to the target instead of jumping between two and five ticks.
 */
export function niceStep(range: number, count: number): number {
  if (!(range > 0) || count < 1) return 1;
  const rough = range / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const step = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return step * magnitude;
}

export interface ChartBox {
  width: number;
  height: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
}

export interface ChartPoint extends WeightPoint {
  x: number;
  y: number;
}

export interface WeightChartGeometry {
  width: number;
  height: number;
  plot: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  points: ChartPoint[];
  linePath: string;
  /** Empty for a single reading — one dot has no area to fill. */
  areaPath: string;
  yTicks: { kg: number; y: number }[];
  xTicks: { at: number; x: number }[];
  minKg: number;
  maxKg: number;
}

/**
 * Lay a weight series out in pixel space. The x scale is proportional to real
 * time (not point index), so unevenly spaced readings are not misrepresented.
 * Returns null when there is nothing to draw.
 */
export function buildWeightChart(points: WeightPoint[], box: ChartBox): WeightChartGeometry | null {
  if (points.length === 0 || !(box.width > 0) || !(box.height > 0)) return null;

  const pad = { top: 18, right: 18, bottom: 30, left: 46, ...box.padding };
  const left = pad.left;
  const top = pad.top;
  const plotWidth = Math.max(1, box.width - pad.left - pad.right);
  const plotHeight = Math.max(1, box.height - pad.top - pad.bottom);
  const bottom = top + plotHeight;
  const right = left + plotWidth;

  const kgs = points.map((p) => p.kg);
  let minKg = Math.min(...kgs);
  let maxKg = Math.max(...kgs);
  // A perfectly flat series still needs a window to draw in.
  if (minKg === maxKg) {
    minKg -= 1;
    maxKg += 1;
  } else {
    const slack = (maxKg - minKg) * 0.08;
    minKg -= slack;
    maxKg += slack;
  }

  const yFor = (kg: number) => bottom - ((kg - minKg) / (maxKg - minKg)) * plotHeight;
  const yTicks: { kg: number; y: number }[] = [];
  const step = niceStep(maxKg - minKg, 4);
  const firstTick = Math.ceil(minKg / step) * step;
  for (let i = 0; firstTick + i * step <= maxKg + 1e-9; i++) {
    const kg = firstTick + i * step;
    yTicks.push({ kg, y: yFor(kg) });
  }

  const t0 = points[0].at;
  const t1 = points[points.length - 1].at;
  const tSpan = t1 - t0;
  const xFor = (at: number) => (tSpan === 0 ? left + plotWidth / 2 : left + ((at - t0) / tSpan) * plotWidth);

  const chartPoints: ChartPoint[] = points.map((p) => ({ ...p, x: xFor(p.at), y: yFor(p.kg) }));
  const linePath = chartPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    chartPoints.length > 1
      ? `${linePath} L${right.toFixed(2)} ${bottom.toFixed(2)} L${left.toFixed(2)} ${bottom.toFixed(2)} Z`
      : "";

  const xTicks: { at: number; x: number }[] = [];
  if (tSpan === 0) {
    xTicks.push({ at: t0, x: xFor(t0) });
  } else {
    const count = Math.min(4, Math.max(2, points.length));
    for (let i = 0; i < count; i++) {
      const at = t0 + tSpan * (i / (count - 1));
      xTicks.push({ at, x: xFor(at) });
    }
  }

  return {
    width: box.width,
    height: box.height,
    plot: { left, top, right, bottom, width: plotWidth, height: plotHeight },
    points: chartPoints,
    linePath,
    areaPath,
    yTicks,
    xTicks,
    minKg,
    maxKg,
  };
}

/** Nearest reading to a pixel x — the crosshair snaps to data, never to the gap. */
export function nearestPointIndex(points: { x: number }[], x: number): number {
  if (points.length === 0) return -1;
  let best = 0;
  let bestDistance = Math.abs(points[0].x - x);
  for (let i = 1; i < points.length; i++) {
    const distance = Math.abs(points[i].x - x);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}
