/**
 * Month-grid builder for the calendar view. Pure and locale-agnostic: weeks
 * start on Sunday and adjacent-month days are included (dimmed by the caller)
 * so the grid is always 6 rows × 7 columns.
 */

export interface CalendarCell {
  /** Local midnight of the day this cell represents. */
  date: Date;
  /** False for leading/trailing days borrowed from the adjacent months. */
  inMonth: boolean;
}

/** 0-indexed month, like Date: 0 = January. */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay()); // back up to Sunday
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date, inMonth: date.getMonth() === month };
  });
}

/** Shift a {year, month} cursor by whole months, rolling the year over. */
export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
