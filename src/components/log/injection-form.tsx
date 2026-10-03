"use client";

/**
 * Log a completed injection (spec §6). Stores the actual administration time,
 * the amount, and snapshots of the vial name + concentration used, so the
 * record stays truthful even if the linked vial is edited later.
 *
 * The body map (tap-to-mark) lands in the next phase; this form provides the
 * accessible text-based location alternative now.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AmountUnit } from "@/lib/domain/units";
import { toMcg } from "@/lib/domain/units";
import { parseDecimal } from "@/lib/domain/calculator";
import type { InjectionInput, InjectionLog } from "@/lib/data/repository";
import { isoToLocalInputValue, localInputToIso, relativeDayLabel, trimNumber } from "@/lib/format";
import { Button, Card, Field, Input, Select, Segmented, Textarea } from "@/components/ui";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";

const UNITS: { value: AmountUnit; label: string }[] = [
  { value: "mg", label: "mg" },
  { value: "mcg", label: "mcg" },
];

export interface InjectionPrefill {
  amount: string;
  unit: AmountUnit;
  concMcg: string;
  concMg: string;
  vialId: string | null;
  name?: string;
}

export function InjectionForm({
  existing,
  prefill,
}: {
  existing?: InjectionLog;
  prefill?: InjectionPrefill;
}) {
  const router = useRouter();
  const { vials, injections, saveInjection } = useData();
  const { show } = useToast();

  const [vialId, setVialId] = useState<string>(existing?.vialId ?? prefill?.vialId ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : prefill?.amount ?? "");
  const [unit, setUnit] = useState<AmountUnit>(existing?.amountUnit ?? prefill?.unit ?? "mcg");
  const [concMcg, setConcMcg] = useState(
    existing?.concentrationMcgPerMl != null ? String(existing.concentrationMcgPerMl) : prefill?.concMcg ?? ""
  );
  const [adminLocal, setAdminLocal] = useState(
    existing?.administeredAt ? isoToLocalInputValue(existing.administeredAt) : localInputToIso(new Date().toISOString())
  );
  const [locationLabel, setLocationLabel] = useState(existing?.location?.label ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedVial = vials.find((v) => v.id === vialId);
  const amountNum = parseDecimal(amount);
  const concNum = parseDecimal(concMcg);

  const volumeMl = useMemo(() => {
    if (amountNum === null || amountNum <= 0 || concNum === null || concNum <= 0) return null;
    const mcg = toMcg(amountNum, unit);
    return mcg / concNum;
  }, [amountNum, concNum, unit]);

  const usedLabels = useMemo(() => {
    const map = new Map<string, string>(); // label -> most recent admin time
    for (const inj of injections) {
      const label = inj.location?.label;
      if (!label) continue;
      if (!map.has(label) || inj.administeredAt > map.get(label)!) map.set(label, inj.administeredAt);
    }
    return [...map.entries()].sort((a, b) => b[1].localeCompare(a[1]));
  }, [injections]);

  function pickVial(nextId: string) {
    setVialId(nextId);
    const v = vials.find((x) => x.id === nextId);
    if (v?.concentrationMcgPerMl != null) setConcMcg(String(v.concentrationMcgPerMl));
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (amountNum === null) errs.amount = amount.trim() === "" ? "Required." : "Enter a valid number.";
    else if (amountNum <= 0) errs.amount = "Must be greater than zero.";
    if (concMcg.trim() !== "") {
      if (concNum === null) errs.conc = "Enter a valid number.";
      else if (concNum <= 0) errs.conc = "Must be greater than zero.";
    }
    const adminIso = adminLocal ? localInputToIso(adminLocal) : "";
    if (!adminIso) errs.when = "Choose when it was administered.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const vial = vials.find((v) => v.id === vialId);
    const locationLabelTrim = locationLabel.trim();
    const input: InjectionInput & { id?: string } = {
      id: existing?.id,
      vialId: vialId || null,
      vialNameSnapshot: vial?.name ?? existing?.vialNameSnapshot ?? null,
      concentrationMcgPerMl: concNum !== null && concNum > 0 ? concNum : null,
      concentrationMgPerMl: concNum !== null && concNum > 0 ? concNum / 1000 : null,
      amount: amountNum!,
      amountUnit: unit,
      volumeMl,
      administeredAt: adminIso,
      scheduledTimeUtc: existing?.scheduledTimeUtc ?? null,
      scheduleId: existing?.scheduleId ?? null,
      location:
        locationLabelTrim === ""
          ? existing?.location?.label
            ? { view: existing.location.view, x: existing.location.x, y: existing.location.y, label: null }
            : null
          : { view: existing?.location?.view ?? null, x: existing?.location?.x ?? null, y: existing?.location?.y ?? null, label: locationLabelTrim },
      notes: notes.trim() === "" ? null : notes.trim(),
    };
    try {
      await saveInjection(input);
      show(existing ? "Injection updated." : "Injection logged.");
      router.push("/history");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save the injection.");
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {prefill ? (
        <p className="rounded-xl bg-info-soft px-3 py-2 text-xs font-medium text-info">
          Prefilled from the calculator result — check every value before saving.
        </p>
      ) : null}

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <Field
          label="Vial used (optional)"
          htmlFor="inj-vial"
          hint="Picking a vial fills in its recorded concentration; the record keeps a snapshot of it."
        >
          <Select id="inj-vial" value={vialId} onChange={(e) => pickVial(e.target.value)}>
            <option value="">No vial linked</option>
            {vials.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.concentrationMcgPerMl != null
                  ? ` · ${Number(v.concentrationMgPerMl?.toFixed(3))} mg/mL`
                  : " · not reconstituted"}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount administered" htmlFor="inj-amount" error={errors.amount}>
            <div className="flex gap-2">
              <Input
                id="inj-amount"
                inputMode="decimal"
                className="min-w-0 flex-1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 250"
              />
              <div className="shrink-0">
                <Segmented value={unit} onChange={setUnit} options={UNITS} />
              </div>
            </div>
          </Field>
          <Field
            label="Concentration used (mcg/mL)"
            htmlFor="inj-conc"
            hint="Auto-filled from the vial; adjust only if it truly differed."
            error={errors.conc}
          >
            <Input
              id="inj-conc"
              inputMode="decimal"
              value={concMcg}
              onChange={(e) => setConcMcg(e.target.value)}
              placeholder="e.g. 2500"
            />
          </Field>
        </div>

        {volumeMl !== null ? (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            Draw volume this implies:{" "}
            <span className="font-semibold tabular-nums">{trimNumber(volumeMl, 4)} mL</span>{" "}
            <span className="text-xs text-muted">
              ({selectedVial?.name ?? "vial snapshot"})
            </span>
          </p>
        ) : null}

        <Field
          label="Administered at"
          htmlFor="inj-when"
          error={errors.when}
          hint="Local date & time; stored in UTC. Pepcal never changes this silently."
        >
          <Input id="inj-when" type="datetime-local" value={adminLocal} onChange={(e) => setAdminLocal(e.target.value)} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <Field
          label="Where it went in (optional)"
          htmlFor="inj-loc"
          hint="Free text now; tap-to-mark on a body map is next. This is documentation only — no site is endorsed or recommended."
        >
          <Input
            id="inj-loc"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="e.g. Left abdomen"
            autoComplete="off"
          />
        </Field>

        {usedLabels.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Previously used locations</span>
            <div className="flex flex-wrap gap-1.5">
              {usedLabels.map(([label, last]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setLocationLabel(label)}
                  className="tap-slop-y rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2/60"
                >
                  {label}
                  <span className="ml-1.5 text-subtle">· {relativeDayLabel(last)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Field label="Notes" htmlFor="inj-notes">
          <Textarea
            id="inj-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reaction notes, batch, how it went…"
          />
        </Field>
      </Card>

      <div className="flex gap-2">
        <Button size="lg" onClick={handleSave} block>
          {existing ? "Save changes" : "Log injection"}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => router.push("/history")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
