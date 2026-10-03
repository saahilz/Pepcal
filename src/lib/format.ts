/**
 * Display helpers. Pure and browser-safe. All *instant* inputs are UTC ISO;
 * every render here converts to the user's local time zone for display unless
 * a timeZone is passed (settings may override later).
 */

/** Trim trailing zeros without losing the integer form: 2.5, 250, 0.1. */
export function trimNumber(n: number, maxDecimals = 6): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(maxDecimals));
  return String(rounded);
}

export function amountLabel(amount: number, unit: "mg" | "mcg"): string {
  return `${trimNumber(amount)} ${unit}`;
}

export function volumeLabel(mL: number): string {
  return `${trimNumber(mL, 4)} mL`;
}

export function concentrationLabel(mcgPerMl: number): string {
  return `${trimNumber(mcgPerMl, 4)} mcg/mL`;
}

/* ------------------------------ dates ------------------------------- */

function fmt(opts: Intl.DateTimeFormatOptions, iso: string | Date, timeZone?: string) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone, ...opts }).format(date);
  } catch {
    // Fall back to local time if the named zone is unavailable.
    return new Intl.DateTimeFormat(undefined, opts).format(date);
  }
}

export function formatDate(iso: string, timeZone?: string): string {
  return fmt({ year: "numeric", month: "short", day: "numeric" }, iso, timeZone);
}

export function formatTime(iso: string, timeZone?: string): string {
  return fmt({ hour: "numeric", minute: "2-digit" }, iso, timeZone);
}

export function formatDateTime(iso: string, timeZone?: string): string {
  return `${formatDate(iso, timeZone)} · ${formatTime(iso, timeZone)}`;
}

/**
 * Human day-relative label for lists: "Today", "Yesterday", or a short date.
 * `now` is injected so tests can pin it.
 */
export function relativeDayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDay) / 86_400_000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return formatDate(iso);
}

/* ------------------- <input type="datetime-local"> ------------------ */
/* These inputs work in the browser's local zone and must be converted to/from
   UTC ISO when persisted. */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC ISO → value for a local datetime-local input ("YYYY-MM-DDTHH:mm"). */
export function isoToLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local datetime-local input value → UTC ISO. */
export function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Today's date as "yyyy-mm-dd" in the local zone (for date inputs). */
export function localTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
