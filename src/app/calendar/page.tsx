"use client";

import { useState } from "react";
import { useData } from "@/components/app-provider";
import { Button, Card, CardHeader } from "@/components/ui";
import { ChevronRightIcon } from "@/components/icons";
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

export default function CalendarPage() {
  const { injections, schedules } = useData();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const grid = buildMonthGrid(cursor.year, cursor.month);
  const title = MONTH_TITLE.format(new Date(cursor.year, cursor.month, 1));

  // Markers + hover notes: logged injections (solid dot) and scheduled
  // upcoming occurrences (ring). Each day maps to "time · vial · dose" lines
  // shown as a native title tooltip. Schedules stay read-only here.
  const loggedByDay = new Map<string, string[]>();
  for (const i of injections) {
    const key = dayKey(new Date(i.administeredAt));
    const lines = loggedByDay.get(key) ?? [];
    lines.push(
      `${formatTime(i.administeredAt)} · ${i.vialNameSnapshot ?? "No linked vial"} · ${amountLabel(i.amount, i.amountUnit)}`
    );
    loggedByDay.set(key, lines);
  }
  // Only future occurrences count as "upcoming" — browsing back in time must
  // not relabel past days. The window starts at the later of month start/now.
  const monthStart = new Date(cursor.year, cursor.month, 1);
  const scheduledByDay = new Map<string, string[]>();
  for (const o of occurrencesWithin(
    schedules.filter((s) => s.enabled),
    new Date(Math.max(monthStart.getTime(), now.getTime())),
    new Date(cursor.year, cursor.month + 2, 0)
  )) {
    const key = dayKey(o.at);
    const lines = scheduledByDay.get(key) ?? [];
    lines.push(
      `${formatTime(o.at.toISOString())} · ${o.schedule.vialNameSnapshot ?? "Scheduled"} · ${amountLabel(o.schedule.amount, o.schedule.amountUnit)}`
    );
    scheduledByDay.set(key, lines);
  }

  const isToday = (d: Date) =>
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
      <p className="mt-1 text-sm text-muted">
        Month view of your records and upcoming schedules. Reminders arrive in the
        next phase.
      </p>

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
          <div className="grid grid-cols-7 gap-1" role="rowgroup">
            {grid.map(({ date, inMonth }) => {
              const today = isToday(date);
              const key = dayKey(date);
              const logged = inMonth ? (loggedByDay.get(key) ?? null) : null;
              const scheduled = inMonth ? (scheduledByDay.get(key) ?? null) : null;
              const hoverTitle = [
                ...(logged ? [logged.map((l) => `Injected · ${l}`).join("\n")] : []),
                ...(scheduled ? [scheduled.map((l) => `Scheduled · ${l}`).join("\n")] : []),
              ].join("\n") || undefined;
              return (
                <div
                  key={date.getTime()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition-colors sm:rounded-2xl"
                  title={hoverTitle}
                  {...(today ? { "aria-current": "date" } : {})}
                >
                  <span
                    className={
                      today
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand"
                        : inMonth
                          ? "tabular-nums"
                          : "tabular-nums text-subtle/70"
                    }
                  >
                    {date.getDate()}
                  </span>
                  {scheduled ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full ring-2 ring-info ring-offset-surface"
                    />
                  ) : null}
                  {logged ? (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                  ) : null}
                </div>
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
