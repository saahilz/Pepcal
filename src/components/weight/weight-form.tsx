"use client";

/**
 * Record a body-weight reading.
 *
 * The field is filled in whatever unit the user reads off their scale; the
 * value is converted to kilograms before it is stored, so changing the display
 * unit later never rewrites or rescales the record.
 *
 * Record-keeping only — no goal, target, or rate is asked for or implied.
 */

import { useState } from "react";
import type { WeightEntry, WeightInput } from "@/lib/data/repository";
import { toKg, type WeightUnit } from "@/lib/domain/weight";
import { parseDecimal } from "@/lib/domain/calculator";
import { isoToLocalInputValue, localInputToIso } from "@/lib/format";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";

/** Well outside any plausible reading, so it only ever catches a typo. */
const MIN_KG = 1;
const MAX_KG = 650;

function nowLocalInput(): string {
  return isoToLocalInputValue(new Date().toISOString());
}

export function WeightForm({
  unit,
  existing,
  onDone,
}: {
  unit: WeightUnit;
  existing?: WeightEntry;
  onDone?: () => void;
}) {
  const { saveWeight } = useData();
  const { show } = useToast();

  const [value, setValue] = useState(
    existing ? String(Number((existing.weightKg / (unit === "kg" ? 1 : 0.45359237)).toFixed(2))) : ""
  );
  const [when, setWhen] = useState(
    existing ? isoToLocalInputValue(existing.recordedAt) : nowLocalInput()
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const errs: Record<string, string> = {};
    const parsed = parseDecimal(value);
    if (parsed === null) errs.value = value.trim() === "" ? "Required." : "Enter a valid number.";
    else if (parsed <= 0) errs.value = "Must be greater than zero.";

    const kg = parsed === null ? null : toKg(parsed, unit);
    if (kg !== null && parsed! > 0 && (kg < MIN_KG || kg > MAX_KG)) {
      errs.value = `Check the number and the unit — that reads as ${kg.toFixed(1)} kg.`;
    }

    const iso = when ? localInputToIso(when) : "";
    if (!iso) errs.when = "Choose when the reading was taken.";

    setErrors(errs);
    if (Object.keys(errs).length > 0 || kg === null) return;

    const input: WeightInput & { id?: string } = {
      id: existing?.id,
      weightKg: kg,
      recordedAt: iso,
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    setSaving(true);
    try {
      await saveWeight(input);
      show(existing ? "Reading updated." : "Reading recorded.");
      if (existing) onDone?.();
      else {
        setValue("");
        setNotes("");
        setWhen(nowLocalInput());
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save the reading.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Weight"
          htmlFor="wt-value"
          error={errors.value}
          hint={`Entered in ${unit}; stored in kilograms.`}
        >
          <div className="flex items-center gap-2">
            <Input
              id="wt-value"
              inputMode="decimal"
              className="min-w-0 flex-1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={unit === "kg" ? "e.g. 82.4" : "e.g. 181.6"}
            />
            <span className="shrink-0 text-sm font-medium text-muted">{unit}</span>
          </div>
        </Field>

        <Field
          label="Recorded at"
          htmlFor="wt-when"
          error={errors.when}
          hint="Local date & time; stored in UTC."
        >
          <Input
            id="wt-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Notes (optional)" htmlFor="wt-notes">
        <Textarea
          id="wt-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Time of day, scale used, anything worth remembering…"
        />
      </Field>

      <div className="flex gap-2">
        <Button size="lg" onClick={handleSave} disabled={saving} block>
          {existing ? "Save changes" : "Record reading"}
        </Button>
        {existing ? (
          <Button size="lg" variant="ghost" onClick={() => onDone?.()}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
