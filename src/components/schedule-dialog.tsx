"use client";

import { useState } from "react";
import { useData } from "@/components/app-provider";
import { useDiscretion } from "@/components/discretion";
import { Button, Card, Field, Input, Segmented } from "@/components/ui";
import { amountLabel } from "@/lib/format";
import { previewOccurrences, repeatPattern } from "@/lib/domain/schedule";
import type { AmountUnit } from "@/lib/domain/units";
import type { ScheduleInput } from "@/lib/data/repository";

type Repeat = "weekly" | "biweekly" | "daily" | "every 2 days" | "every 3 days";

const WEEKDAY_FMT = new Intl.DateTimeFormat(undefined, { weekday: "long" });

const PREVIEW_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const UNITS: { value: AmountUnit; label: string }[] = [
  { value: "mcg", label: "mcg" },
  { value: "mg", label: "mg" },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextSlotLocal(): string {
  const d = new Date();
  const rounded = Math.ceil(d.getMinutes() / 5) * 5;
  if (rounded >= 60) {
    // roll into the next hour; keep HH:MM shape
    const next = new Date(d.getTime() + 3600000);
    return `${String(next.getHours()).padStart(2, "0")}:00`;
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(rounded).padStart(2, "0")}`;
}

function userTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Create-schedule dialog. The dose is prefilled from what the user actually
 * took most recently on that vial (never invented); editing is their call.
 */
export function ScheduleDialog({
  onClose,
  onCreated,
  onError,
  defaultStartDate,
}: {
  onClose: () => void;
  onCreated: (label: string) => void;
  onError: (message: string) => void;
  defaultStartDate?: string;
}) {
  const { vials, injections, saveSchedule } = useData();
  const { mask } = useDiscretion();

  /** Dose prefill = what was last taken from this vial; never invented. */
  function doseDefault(id: string): { amount: string; unit: AmountUnit } {
    const last = [...injections].toReversed().find((i) => i.vialId === id);
    const v = vials.find((x) => x.id === id);
    if (last) return { amount: String(last.amount), unit: last.amountUnit };
    return { amount: "", unit: v?.vialUnit ?? "mcg" };
  }

  const [vialId, setVialId] = useState(vials[0]?.id ?? "");
  const [timeLocal, setTimeLocal] = useState(nextSlotLocal);
  const [repeat, setRepeat] = useState<Repeat>("weekly");
  const [startDate, setStartDate] = useState(defaultStartDate ?? todayIso);
  const [amount, setAmount] = useState(() => doseDefault(vials[0]?.id ?? "").amount);
  const [unit, setUnit] = useState<AmountUnit>(() => doseDefault(vials[0]?.id ?? "").unit);
  const [saving, setSaving] = useState(false);

  const vial = vials.find((x) => x.id === vialId);
  const lastUse = [...injections].toReversed().find((i) => i.vialId === vialId);

  function onVialChange(nextId: string) {
    setVialId(nextId);
    const d = doseDefault(nextId);
    setAmount(d.amount);
    setUnit(d.unit);
  }

  const input: ScheduleInput | null =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{2}:\d{2}$/.test(timeLocal) &&
    Number(amount) > 0 &&
    !!vial
      ? {
          vialId: vial.id,
          vialNameSnapshot: vial.name,
          amount: Number(amount),
          amountUnit: unit,
          pattern: repeatPattern(repeat, startDate, timeLocal),
          startDate,
          endDate: null,
          timeZone: userTimeZone(),
          travel: "homeTimeZone",
          enabled: true,
        }
      : null;

  const preview = input ? previewOccurrences(input, new Date(), 2) : [];

  async function handleCreate() {
    if (!input) return;
    setSaving(true);
    try {
      await saveSchedule(input);
      onCreated(
        `${mask(vial!.name)} · ${amountLabel(input.amount, input.amountUnit)} · ${
          repeat === "weekly"
            ? "weekly on " + WEEKDAY_FMT.format(new Date(`${startDate}T12:00:00`))
            : repeat === "biweekly"
              ? "every 2 weeks"
              : repeat === "daily"
                ? "daily"
                : repeat === "every 2 days"
                  ? "every 2 days"
                  : "every 3 days"
        }`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save the schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Schedule an injection</h2>
          <p className="mt-0.5 text-xs text-muted">
            Repeating doses appear on the calendar grid and in the dashboard countdown.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {vials.length === 0 ? (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
            Add a vial first — a schedule needs a vial to draw from.
          </p>
        ) : null}

        <Field label="Vial" htmlFor="sched-vial">
          <select
            id="sched-vial"
            className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-sm"
            value={vialId}
            onChange={(e) => onVialChange(e.target.value)}
          >
            {vials.map((x, i) => (
              <option key={x.id} value={x.id}>
                {mask(x.name, "vial", { index: i })}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" htmlFor="sched-start">
            <Input id="sched-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Time" htmlFor="sched-time" hint="Your local time">
            <Input
              id="sched-time"
              type="time"
              step={300}
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
            />
          </Field>
        </div>

        <Segmented
          label="Repeat"
          value={repeat}
          onChange={setRepeat}
          options={[
            {
              value: "weekly",
              label: `Weekly · ${WEEKDAY_FMT.format(new Date(`${startDate || todayIso()}T12:00:00`))}`,
            },
            { value: "biweekly", label: "Every 2 weeks" },
            { value: "daily", label: "Daily" },
            { value: "every 2 days", label: "Every 2 days" },
            { value: "every 3 days", label: "Every 3 days" },
          ]}
        />

        <div className="grid grid-cols-[1fr,auto] items-end gap-3">
          <Field label="Dose amount" htmlFor="sched-amount" hint={lastUse ? "Prefilled from your last log on this vial" : undefined}>
            <Input
              id="sched-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Segmented value={unit} onChange={setUnit} options={UNITS} />
        </div>

        {preview.length > 0 ? (
          <p className="rounded-xl bg-surface-2/70 px-3 py-2 text-xs leading-relaxed text-muted">
            First doses: {preview.map((d) => PREVIEW_FMT.format(d)).join("  ·  ")}
          </p>
        ) : (
          <p className="text-xs text-subtle">Set a valid date, time and dose to preview.</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="lg" onClick={handleCreate} disabled={!input || saving} block>
            {saving ? "Saving…" : "Create schedule"}
          </Button>
          <Button size="lg" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
