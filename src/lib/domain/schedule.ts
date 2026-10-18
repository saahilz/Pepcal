/**
 * Schedule occurrence math (spec §5, read side).
 *
 * Pure, timezone-correct computation of when a {@link Schedule} fires next.
 * Display layer only — no occurrence rows are written; that arrives with the
 * reminder/notification phase.
 *
 * shortcut: wall-time → instant resolution iterates the UTC-offset guess up
 * to 3 times. Within a DST transition hour it can pick the wrong side (like
 * Intl itself); fine for countdown display, upgrade when push notifications
 * must fire at the exact instant.
 */

import type { Schedule } from "@/lib/data/repository";

/** Local calendar day, from a UTC instant viewed in a time zone. */
interface Day {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

const dayKeyUTC = (day: Day) => Date.UTC(day.y, day.m - 1, day.d);
const parseYMD = (iso: string): Day => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
};

/** Wall-clock parts of an instant as seen in `tz`. Hour is normalized 0-23. */
function tzParts(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    y: get("year"),
    mo: get("month"),
    d: get("day"),
    h: get("hour") % 24,
    mi: get("minute"),
    s: get("second"),
  };
}

function dayInZone(instant: Date, tz: string): Day {
  const p = tzParts(instant, tz);
  return { y: p.y, m: p.mo, d: p.d };
}

function addDays(day: Day, n: number): Day {
  const d = new Date(dayKeyUTC(day) + n * 86400000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

/**
 * The UTC instant whose wall-clock in `tz` reads as the given components.
 * Resolves offset by iterating: assume UTC, measure what the zone actually
 * shows at that instant, correct, repeat until stable.
 */
function wallTimeToInstant(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const p = tzParts(new Date(guess), tz);
    const shown = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    const offset = shown - guess; // ms the zone is ahead of UTC at `guess`
    const next = wall - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

const weekdayOf = (day: Day) => new Date(dayKeyUTC(day)).getUTCDay();

function matchesDay(day: Day, pattern: Schedule["pattern"], startDate: Day): boolean {
  if (pattern.kind === "weekdays") return pattern.weekdays.includes(weekdayOf(day));
  const diffDays = Math.round((dayKeyUTC(day) - dayKeyUTC(startDate)) / 86400000);
  return diffDays >= 0 && diffDays % pattern.intervalDays === 0;
}

/** Next firing instant strictly after `from`, or null if the schedule is over. */
export function nextOccurrence(schedule: Schedule, from: Date = new Date()): Date | null {
  if (!schedule.enabled) return null;
  const { pattern, timeZone, startDate, endDate } = schedule;
  const [h, mi] = pattern.timeLocal.split(":").map(Number);
  const start = parseYMD(startDate);
  const end = endDate ? parseYMD(endDate) : null;

  let day = dayInZone(from, timeZone);
  if (dayKeyUTC(day) < dayKeyUTC(start)) day = start;

  for (let i = 0; i <= 366; i++) {
    if (end && dayKeyUTC(day) > dayKeyUTC(end)) return null;
    if (matchesDay(day, pattern, start)) {
      const instant = wallTimeToInstant(day.y, day.m, day.d, h, mi, timeZone);
      if (instant > from) return instant;
    }
    day = addDays(day, 1);
  }
  return null;
}

/** All firing instants in (from, until], soonest first, across schedules. */
export function occurrencesWithin(
  schedules: Schedule[],
  from: Date = new Date(),
  until: Date = new Date(from.getTime() + 45 * 86400000)
): { schedule: Schedule; at: Date }[] {
  const out: { schedule: Schedule; at: Date }[] = [];
  for (const s of schedules) {
    let t = nextOccurrence(s, from);
    while (t && t <= until) {
      out.push({ schedule: s, at: t });
      t = nextOccurrence(s, new Date(t.getTime() + 60000));
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Compact human countdown: "in 45m", "in 2h 15m", "in 3d 4h", "due now". */
export function formatCountdown(target: Date, now: Date = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "due now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const rem = mins % 60;
    return rem ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
  }
  return `in ${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

/** Heat band for an upcoming occurrence, by time remaining. */
export type InjectionUrgency = "far" | "soon" | "today" | "imminent" | "overdue";

/** overdue = past · imminent ≤3h · today = before local midnight · soon ≤48h · far beyond. */
export function injectionUrgency(target: Date, now: Date = new Date()): InjectionUrgency {
  const msLeft = target.getTime() - now.getTime();
  if (msLeft <= 0) return "overdue";
  if (msLeft <= 3 * 3600000) return "imminent";
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (target <= endOfToday) return "today";
  return msLeft / 3600000 <= 48 ? "soon" : "far";
}
