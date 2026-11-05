"use client";

import { useEffect, useState, type ElementType } from "react";
import { useData } from "@/components/app-provider";
import { Button, Card, CardHeader } from "@/components/ui";
import { ChevronRightIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/ui/cn";
import { addMonths, buildMonthGrid } from "@/lib/domain/calendar";
import { occurrencesWithin } from "@/lib/domain/schedule";
import { amountLabel, formatTime } from "@/lib/format";

const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(new Date(2026, 9, 4 + i))
  // Oct 4 2026 is a Sunday, so i maps straight onto getDay().
);

const MONTH_TITLE = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

/** Local-time yyyy-mm-dd key for matching injections to grid days. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface InjectionRow {
  kind: "logged" | "scheduled";
  at: string;
  vial: string;
  dose: string;
}

export default function CalendarPage() {
  const { injections, schedules, deleteSchedule } = useData();
  const { show } = useToast();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [creating, setCreating] = useState(false);
  const [openSchedules, setOpenSchedules] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Tapped day (touch has no hover): pins its tooltip until tapped again or
  // dismissed via the backdrop.
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  // Escape closes a pinned tooltip (touch has no hover to un-pin with).
  useEffect(() => {
    if (!pinnedKey) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinnedKey(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinnedKey]);

  const grid = buildMonthGrid(cursor.year, cursor.month);
  const title = MONTH_TITLE.format(new Date(cursor.year, cursor.month, 1));

  // Markers + tooltip rows: logged injections (solid dot) and scheduled
  // upcoming occurrences (ring). Schedules are read-only here.
  const rowsByDay = new Map<string, InjectionRow[]>();
  for (const i of injections) {
    const key = dayKey(new Date(i.administeredAt));
    rowsByDay.set(key, [
      ...(rowsByDay.get(key) ?? []),
      {
        kind: "logged" as const,
        at: formatTime(i.administeredAt),
        vial: i.vialNameSnapshot ?? "No linked vial",
        dose: amountLabel(i.amount, i.amountUnit),
      },
    ]);
  }
  // Only future occurrences count as "upcoming" — browsing back in time must
  // not relabel past days. The window starts at the later of month start/now.
  const monthStart = new Date(cursor.year, cursor.month, 1);
  for (const o of occurrencesWithin(
    schedules.filter((s) => s.enabled),
    new Date(Math.max(monthStart.getTime(), now.getTime())),
    new Date(cursor.year, cursor.month + 2, 0)
  )) {
    const key = dayKey(o.at);
    rowsByDay.set(key, [
      ...(rowsByDay.get(key) ?? []),
      {
        kind: "scheduled" as const,
        at: formatTime(o.at.toISOString()),
        vial: o.schedule.vialNameSnapshot ?? "Scheduled",
        dose: amountLabel(o.schedule.amount, o.schedule.amountUnit),
      },
    ]);
  }

  const isToday = (d: Date) =>
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted">
            Month view of your records and upcoming schedules. Hover or tap a marked
            day for details. Reminders arrive in the next phase.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpenSchedules((v) => !v)}
            aria-expanded={openSchedules}
          >
            {schedules.length} scheduled
          </Button>
          <Button size="sm" onClick={() => setCreating((v) => !v)} aria-expanded={creating}>
            <span className="flex items-center gap-1.5">
              <PlusIcon className="h-4 w-4" />
              Schedule
            </span>
          </Button>
        </div>
      </div>

      {creating ? (
        <ScheduleDialog
          onClose={() => setCreating(false)}
          onCreated={(label) => {
            setCreating(false);
            setSelectedDay(null);
            show(`Schedule created — ${label}`);
          }}
          onError={(message) => show(message)}
          defaultStartDate={selectedDay ?? undefined}
        />
      ) : null}

      {openSchedules ? (
        <Card className="mt-4">
          <CardHeader title="Your schedules" />
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            {schedules.length === 0 ? (
              <p className="text-sm text-muted">
                No schedules yet. Use <strong>Schedule</strong> above, or tick
                “repeat” when logging an injection.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {schedules.map((s) => {
                  const label = s.pattern.kind === "weekdays"
                    ? "Weekly"
                    : s.pattern.intervalDays === 1
                      ? "Daily"
                      : s.pattern.intervalDays === 14
                        ? "Every 2 weeks"
                        : `Every ${s.pattern.intervalDays} days`;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {s.vialNameSnapshot ?? "Schedule"} · {amountLabel(s.amount, s.amountUnit)}
                        </span>
                        <span className="block text-xs text-muted">
                          {label} · from {s.startDate.split("-").reverse().join("/")}
                          {s.enabled ? "" : " · paused"}
                          {s.demo ? " · Demo" : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await deleteSchedule(s.id).catch(() => show("Could not remove it."));
                            show("Schedule removed.");
                          }}
                          aria-label={`Remove schedule for ${s.vialNameSnapshot ?? "dose"}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader
          title={title}
          aside={
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                aria-label="Previous month"
                onClick={() => setCursor((c) => addMonths(c.year, c.month, -1))}
                className="px-2.5"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
              >
                Today
              </Button>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Next month"
                onClick={() => setCursor((c) => addMonths(c.year, c.month, 1))}
                className="px-2.5"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          }
        />
        <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-7" role="row">
            {WEEKDAYS.map((wd, i) => (
              <span
                key={i}
                role="columnheader"
                className="pb-2 text-center text-xs font-semibold text-subtle"
              >
                {wd}
              </span>
            ))}
          </div>
          {pinnedKey ? (
            // Tap-outside target for pinned (touch) tooltips; rendered outside
            // the grid so it can't consume a day cell.
            <button
              type="button"
              aria-label="Close injection details"
              onClick={() => setPinnedKey(null)}
              className="fixed inset-0 z-20 cursor-default"
            />
          ) : null}
          <div className="grid grid-cols-7 gap-1" role="rowgroup">
            {grid.map(({ date, inMonth }, idx) => {
              const today = isToday(date);
              const key = dayKey(date);
              const rows = inMonth ? (rowsByDay.get(key) ?? null) : null;
              const pinned = pinnedKey === key;
              const Tag: ElementType = inMonth ? "button" : "div";
              const col = idx % 7;
              const row = Math.floor(idx / 7);
              return (
                <Tag
                  key={date.getTime()}
                  type={inMonth ? "button" : undefined}
                  onClick={
                    rows
                      ? () => setPinnedKey(pinned ? null : key)
                      : inMonth
                        ? () => {
                            setSelectedDay(key);
                            setCreating(true);
                          }
                        : undefined
                  }
                  aria-label={
                    rows
                      ? rows.map((r) => `${r.at} ${r.kind}: ${r.vial}, ${r.dose}`).join("; ")
                      : inMonth
                        ? `Schedule for ${date.toDateString()}`
                        : undefined
                  }
                  className={cn(
                    "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm sm:rounded-2xl",
                    inMonth && "cursor-pointer hover:bg-surface-2/60 active:bg-surface-2"
                  )}
                  {...(today ? { "aria-current": "date" as const } : {})}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full tabular-nums",
                      today
                        ? "bg-brand-soft font-semibold text-brand"
                        : inMonth
                          ? "text-foreground"
                          : "text-subtle/70"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {rows?.some((r) => r.kind === "scheduled") ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full ring-2 ring-info ring-offset-surface"
                    />
                  ) : null}
                  {rows?.some((r) => r.kind === "logged") ? (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                  ) : null}
                  {rows ? (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none invisible absolute z-30 w-44 rounded-xl border border-line bg-surface p-2.5 text-left shadow-pop group-hover:visible group-focus-within:visible",
                        pinned && "visible",
                        // Edge-aware: first row opens below, top-edge days stay
                        // inside the card; side columns align to their edges.
                        row === 0 ? "top-full mt-1.5" : "bottom-full mb-1.5",
                        col === 0 ? "left-0" : col === 6 ? "right-0" : "left-1/2 -translate-x-1/2"
                      )}
                    >
                      {rows.map((r, i) => (
                        <span key={i} className="flex items-start gap-2 py-0.5">
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                              r.kind === "logged" ? "bg-brand" : "ring-2 ring-info ring-offset-surface"
                            )}
                          />
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold">
                              {r.at} · {r.kind === "logged" ? "Logged" : "Scheduled"}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {r.vial} · {r.dose}
                            </span>
                          </span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Tag>
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-subtle">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
              Day with a logged injection
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full ring-2 ring-info ring-offset-surface" />
              Scheduled upcoming injection
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
}
