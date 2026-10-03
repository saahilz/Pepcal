"use client";

/**
 * /weight — record body-weight readings and see them as a line over time.
 *
 * Record-keeping only. There is no goal, target, rate, or judgement anywhere on
 * this page: it shows what was entered, when, and how the readings relate to
 * each other. Direction is never coloured good or bad.
 */

import { useMemo, useState } from "react";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";
import { Badge, Card, CardHeader, EmptyState, Segmented, Spinner } from "@/components/ui";
import { EditIcon, TrashIcon } from "@/components/icons";
import { WeightChart } from "@/components/weight/weight-chart";
import { WeightForm } from "@/components/weight/weight-form";
import { useWeightUnit } from "@/components/weight/use-weight-unit";
import {
  fromKg,
  summarizeWeight,
  toWeightPoints,
  weightDeltaLabel,
  weightLabel,
  type WeightUnit,
} from "@/lib/domain/weight";
import { formatDate, formatTime, relativeDayLabel } from "@/lib/format";

const UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];

export default function WeightPage() {
  const { status, weights, deleteWeight } = useData();
  const { show } = useToast();
  const [unit, setUnit] = useWeightUnit();
  const [editingId, setEditingId] = useState<string | null>(null);

  const points = useMemo(() => toWeightPoints(weights), [weights]);
  const summary = useMemo(() => summarizeWeight(points), [points]);

  /* Previous reading per id, so every row can show its own step. */
  const previousKg = useMemo(() => {
    const map = new Map<string, number>();
    points.forEach((p, i) => {
      if (i > 0) map.set(p.id, points[i - 1].kg);
    });
    return map;
  }, [points]);

  /* Newest first — a records list reads top-down from now. */
  const rows = useMemo(
    () => [...weights].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [weights]
  );

  const editing = editingId ? (weights.find((w) => w.id === editingId) ?? null) : null;

  async function handleDelete(id: string, when: string) {
    if (!window.confirm(`Delete the reading from ${when}? This cannot be undone.`)) return;
    try {
      await deleteWeight(id);
      if (editingId === id) setEditingId(null);
      show("Reading deleted.");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete the reading.");
    }
  }

  if (status === "loading") return <Spinner label="Opening your records" />;

  const latest = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weight</h1>
          <p className="mt-1 text-sm text-muted">
            {points.length === 0
              ? "No readings recorded yet"
              : `${points.length} reading${points.length === 1 ? "" : "s"} recorded`}
          </p>
        </div>
        {/* One control row above the chart, where a range/filter belongs. */}
        <Segmented value={unit} onChange={setUnit} options={UNIT_OPTIONS} label="Display unit" />
      </div>

      {points.length === 0 ? (
        <EmptyState
          emoji="📈"
          title="No readings yet"
          body="Record a weight below and it appears here as a line over time. Pepcal stores only what you enter — it sets no goal and suggests no rate of change."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Latest"
              value={weightLabel(latest!.kg, unit)}
              sub={formatDate(new Date(latest!.at).toISOString())}
            />
            <Stat
              label="Since first"
              value={weightDeltaLabel(summary.changeKg, unit)}
              sub={
                summary.firstKg === null
                  ? "one reading"
                  : `from ${weightLabel(summary.firstKg, unit)}`
              }
            />
            <Stat
              label="Recorded"
              value={`${summary.count}`}
              sub={summary.count === 1 ? "reading" : "readings"}
            />
            <Stat
              label="Range"
              value={`${fromKg(summary.minKg!, unit).toFixed(1)} – ${fromKg(
                summary.maxKg!,
                unit
              ).toFixed(1)} ${unit}`}
              sub="lowest to highest"
            />
          </div>

          <Card className="pb-4">
            <CardHeader
              title="Weight over time"
              aside={
                <span className="text-xs text-subtle">
                  {unit === "kg" ? "kilograms" : "pounds"}
                </span>
              }
            />
            <div className="mt-3 px-2 sm:px-3">
              <WeightChart points={points} unit={unit} />
            </div>
            <p className="mt-2 px-4 text-xs text-subtle sm:px-5">
              Each dot is one recorded reading, spaced by when it was taken — not by how many
              there are. Hover, tap, or focus the chart and step through readings with the
              arrow keys.
            </p>
          </Card>
        </>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">
            {editing ? "Edit reading" : "Record a reading"}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-sm font-medium text-brand hover:underline"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <WeightForm
          /* Remount on a different record so the fields re-seed from it. */
          key={editing?.id ?? "new"}
          unit={unit}
          existing={editing ?? undefined}
          onDone={() => setEditingId(null)}
        />
      </div>

      {rows.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="All readings"
            aside={<span className="text-xs text-subtle">newest first</span>}
          />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Every recorded weight reading, newest first, with the change from the reading
                before it.
              </caption>
              <thead>
                <tr className="border-y border-line bg-surface-2/50 text-xs uppercase tracking-wide text-subtle">
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    Recorded
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Weight
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Change
                  </th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((w) => {
                  const prev = previousKg.get(w.id);
                  const isEditing = editingId === w.id;
                  return (
                    <tr key={w.id} className={isEditing ? "bg-brand-soft/40" : undefined}>
                      <td className="px-3 py-2.5 align-top sm:px-4">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {/* Deliberately wrappable: it reads on one line at
                              any real width, but the column can still shrink
                              rather than forcing the table to scroll. */}
                          <span className="font-medium">
                            {relativeDayLabel(w.recordedAt)}
                            <span className="font-normal text-subtle tabular-nums">
                              {" · "}
                              {formatTime(w.recordedAt)}
                            </span>
                          </span>
                          {w.demo ? <Badge tone="demo">Demo</Badge> : null}
                        </span>
                        {w.notes ? (
                          <span className="mt-0.5 block max-w-[15rem] truncate text-xs text-muted">
                            {w.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right align-top font-semibold tabular-nums">
                        {weightLabel(w.weightKg, unit)}
                      </td>
                      {/* Plain numbers, never colour-coded: this app records a
                          direction, it does not judge one. */}
                      <td className="whitespace-nowrap px-2 py-2.5 text-right align-top tabular-nums text-muted">
                        {prev === undefined ? "—" : weightDeltaLabel(w.weightKg - prev, unit)}
                      </td>
                      <td className="px-2 py-2.5 align-top sm:px-3">
                        <div className="flex items-end justify-end gap-1 sm:items-start">
                          <button
                            type="button"
                            aria-label={`Edit reading from ${relativeDayLabel(w.recordedAt)}`}
                            onClick={() => setEditingId(w.id)}
                            className="tap-slop flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                          >
                            <EditIcon className="h-4.5 w-4.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete reading from ${relativeDayLabel(w.recordedAt)}`}
                            onClick={() => handleDelete(w.id, relativeDayLabel(w.recordedAt))}
                            className="tap-slop flex h-10 w-10 items-center justify-center rounded-xl text-bad transition-colors hover:bg-bad-soft"
                          >
                            <TrashIcon className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        Pepcal records the weights you enter and nothing more. It does not set or suggest a
        target weight, a rate of change, or a treatment plan — take those questions to a
        qualified clinician.
      </p>
    </div>
  );
}

/* Deliberately no tabular figures here: these are display numbers read one at a
   time, not a column that has to line up. */
function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </Card>
  );
}
