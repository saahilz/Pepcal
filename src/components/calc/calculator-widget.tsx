"use client";

/**
 * Reconstitution calculator (spec §3). A calculation tool, not a prescriber:
 * nothing here picks a dose, diluent volume, storage condition, or beyond-use
 * date. All math lives in src/lib/domain (pure, unit-tested); this component
 * only wires form state to it and renders results transparently, formulas and
 * rounding included.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeReconstitution,
  parseDecimal,
  validateReconstitution,
  type CalcField,
  type CalcIssue,
  type ReconstitutionInput,
} from "@/lib/domain/calculator";
import { measureWithU100, type U100Syringe } from "@/lib/domain/syringe";
import type { AmountUnit } from "@/lib/domain/units";
import {
  CLINICAL_CONFIRM,
  THEORETICAL_DOSES_NOTE,
  U100_MEANING,
  VOLUME_ASSUMPTION,
} from "@/lib/domain/disclaimer";
import { trimNumber } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Field, Input, Segmented, Select, Toggle } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";

const U100_CAPACITIES = ["0.3", "0.5", "1"];
const U100_TICKS = [
  { value: "0.5", label: "½-unit" },
  { value: "1", label: "1-unit" },
  { value: "2", label: "2-unit" },
];

const UNIT_OPTIONS: { value: AmountUnit; label: string }[] = [
  { value: "mg", label: "mg" },
  { value: "mcg", label: "mcg" },
];

const pretty = (n: number) => trimNumber(n, 4);

function fieldProblem(raw: string): CalcIssue | null {
  if (raw.trim() === "")
    return { field: "vialAmount", code: "missing", message: "Required." };
  const n = parseDecimal(raw);
  if (n === null)
    return { field: "vialAmount", code: "nonnumeric", message: "Enter a valid number." };
  if (n <= 0)
    return { field: "vialAmount", code: "notPositive", message: "Must be greater than zero." };
  return null;
}

export function CalculatorWidget() {
  const router = useRouter();
  const { vials, saveVial } = useData();
  const { show } = useToast();

  const [name, setName] = useState("");
  const [vialAmount, setVialAmount] = useState("");
  const [vialUnit, setVialUnit] = useState<AmountUnit>("mg");
  const [diluentMl, setDiluentMl] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState<AmountUnit>("mcg");
  const [showU100, setShowU100] = useState(false);
  const [u100Capacity, setU100Capacity] = useState("1");
  const [u100Tick, setU100Tick] = useState("1");

  const parsed = useMemo(() => {
    const vialAmountNum = parseDecimal(vialAmount);
    const diluentMlNum = parseDecimal(diluentMl);
    const doseAmountNum = parseDecimal(doseAmount);
    return { vialAmountNum, diluentMlNum, doseAmountNum };
  }, [vialAmount, diluentMl, doseAmount]);

  /** Per-field raw-text problems, then semantic validation on the numbers. */
  const issues = useMemo<CalcIssue[]>(() => {
    const list: CalcIssue[] = [];
    const fields: { field: CalcField; raw: string }[] = [
      { field: "vialAmount", raw: vialAmount },
      { field: "diluentMl", raw: diluentMl },
      { field: "desiredAmount", raw: doseAmount },
    ];
    for (const f of fields) {
      const p = fieldProblem(f.raw);
      if (p) list.push({ ...p, field: f.field });
    }

    if (
      parsed.vialAmountNum !== null &&
      parsed.vialAmountNum > 0 &&
      parsed.diluentMlNum !== null &&
      parsed.diluentMlNum > 0 &&
      parsed.doseAmountNum !== null &&
      parsed.doseAmountNum > 0
    ) {
      const input: ReconstitutionInput = {
        vialAmount: parsed.vialAmountNum,
        vialUnit,
        diluentMl: parsed.diluentMlNum,
        desiredAmount: parsed.doseAmountNum,
        desiredUnit: doseUnit,
      };
      list.push(...validateReconstitution(input));
    }
    return list;
  }, [vialAmount, diluentMl, doseAmount, vialUnit, doseUnit, parsed]);

  const result = useMemo(() => {
    if (issues.length > 0) return null;
    const input: ReconstitutionInput = {
      vialAmount: parsed.vialAmountNum!,
      vialUnit,
      diluentMl: parsed.diluentMlNum!,
      desiredAmount: parsed.doseAmountNum!,
      desiredUnit: doseUnit,
    };
    return computeReconstitution(input);
  }, [issues, parsed, vialUnit, doseUnit]);

  const syringe = useMemo<U100Syringe | null>(
    () =>
      showU100
        ? { kind: "u100", capacityMl: Number(u100Capacity), tickUnits: Number(u100Tick) }
        : null,
    [showU100, u100Capacity, u100Tick]
  );

  const measurement = useMemo(() => {
    if (!syringe || !result) return null;
    return measureWithU100(syringe, result.injectionVolumeMl);
  }, [syringe, result]);

  const issueFor = (field: CalcField) => issues.find((i) => i.field === field);

  const duplicatesExisting = useMemo(() => {
    if (!result) return null;
    return (
      vials.find(
        (v) =>
          v.vialAmount === result.totalMg &&
          v.vialUnit === "mg" &&
          v.diluentMl === parsed.diluentMlNum &&
          v.concentrationMcgPerMl !== null
      ) ?? null
    );
  }, [result, vials, parsed.diluentMlNum]);

  /* ------------------------- actions ------------------------- */

  async function saveAsVial() {
    if (!result) return;
    try {
      const saved = await saveVial({
        name: name.trim() || `Reconstituted ${pretty(result.totalMg)} mg vial`,
        notes: name.trim() ? "Created from the calculator." : "Created from the calculator (unnamed at the time).",
        vialAmount: result.totalMg,
        vialUnit: "mg",
        diluentMl: parsed.diluentMlNum!,
        concentrationMcgPerMl: result.concentrationMcgPerMl,
        concentrationMgPerMl: result.concentrationMgPerMl,
        reconstitutedAt: new Date().toISOString(),
        beyondUseDate: null, // never auto-computed
      });
      show(`Saved “${saved.name}” as a vial record.`);
      router.push("/vials");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save the vial.");
    }
  }

  function logThisDose() {
    if (!result) return;
    const q = new URLSearchParams({
      amount: pretty(result.desiredMcg),
      unit: "mcg",
      concMcg: pretty(result.concentrationMcgPerMl),
      concMg: pretty(result.concentrationMgPerMl),
      volume: pretty(result.injectionVolumeMl),
    });
    router.push(`/log?${q.toString()}`);
  }

  const hasResult = result !== null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 sm:p-5">
        <h2 className="mb-4 text-base font-semibold">1 · The vial</h2>
        <div className="flex flex-col gap-4">
          <Field
            label="Peptide name"
            htmlFor="calc-name"
            hint="Entered manually — Pepcal keeps no product list. Optional until you save the result as a record."
          >
            <Input
              id="calc-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Peptide A"
            />
          </Field>
          <Field
            label="Total peptide amount in the vial"
            htmlFor="calc-vial"
            error={issueFor("vialAmount")?.message}
          >
            <div className="flex gap-2">
              <Input
                id="calc-vial"
                inputMode="decimal"
                autoComplete="off"
                className="flex-1"
                placeholder="e.g. 5"
                value={vialAmount}
                onChange={(e) => setVialAmount(e.target.value)}
              />
              <div className="shrink-0">
                <Segmented value={vialUnit} onChange={setVialUnit} options={UNIT_OPTIONS} />
              </div>
            </div>
          </Field>
          <Field
            label="Diluent volume added"
            htmlFor="calc-diluent"
            hint="The solvent volume you added to the powder."
            error={issueFor("diluentMl")?.message}
          >
            <div className="relative">
              <Input
                id="calc-diluent"
                inputMode="decimal"
                autoComplete="off"
                className="pr-12"
                placeholder="e.g. 2"
                value={diluentMl}
                onChange={(e) => setDiluentMl(e.target.value)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-subtle">mL</span>
            </div>
          </Field>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="mb-1 text-base font-semibold">2 · Amount per injection</h2>
        <p className="mb-4 text-xs text-muted">
          Enter a dose decided outside this app. Pepcal never selects or suggests one.
        </p>
        <Field
          label="Desired amount per injection"
          htmlFor="calc-dose"
          error={issueFor("desiredAmount")?.message}
        >
          <div className="flex gap-2">
            <Input
              id="calc-dose"
              inputMode="decimal"
              autoComplete="off"
              className="flex-1"
              placeholder="e.g. 250"
              value={doseAmount}
              onChange={(e) => setDoseAmount(e.target.value)}
            />
            <div className="shrink-0">
              <Segmented value={doseUnit} onChange={setDoseUnit} options={UNIT_OPTIONS} />
            </div>
          </div>
        </Field>

        <div className="mt-5 border-t border-line pt-4">
          <Toggle
            checked={showU100}
            onChange={setShowU100}
            label="Show U-100 insulin syringe scale"
            description="Only when you draw with that syringe type. The scale displays volume — not potency."
          />
        </div>

        {showU100 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-surface-2 p-3">
            <Field label="Syringe capacity">
              <Select value={u100Capacity} onChange={(e) => setU100Capacity(e.target.value)}>
                {U100_CAPACITIES.map((c) => (
                  <option key={c} value={c}>
                    {c} mL ({Number(c) * 100} units)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Graduations">
              <Select value={u100Tick} onChange={(e) => setU100Tick(e.target.value)}>
                {U100_TICKS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </Card>

      {/* -------------------- Result -------------------- */}
      <Card>
        <CardHeader
          title="3 · Result"
          aside={
            hasResult ? (
              <Badge tone="ok">
                <CheckIcon className="h-3.5 w-3.5" /> Ready
              </Badge>
            ) : undefined
          }
        />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {!hasResult ? (
            <p className="py-4 text-sm text-muted">
              {issues.length > 0
                ? "Fix the highlighted values to calculate."
                : "Fill in the fields above to see concentration and draw volume."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <ResultRow
                label="Concentration"
                primary={`${pretty(result.concentrationMgPerMl)} mg/mL`}
                note={`${pretty(result.concentrationMcgPerMl)} mcg/mL`}
                formula={`${pretty(result.totalMcg)} mcg ÷ ${pretty(parsed.diluentMlNum!)} mL = ${pretty(result.concentrationMcgPerMl)} mcg/mL`}
              />
              <ResultRow
                label="Volume to draw per injection"
                primary={`${pretty(result.injectionVolumeMl)} mL`}
                formula={`${pretty(result.desiredMcg)} mcg ÷ ${pretty(result.concentrationMcgPerMl)} mcg/mL = ${pretty(result.injectionVolumeMl)} mL`}
                strong
              />

              {syringe && measurement ? (
                <div className="rounded-xl border border-line bg-surface-2 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">
                      U-100 {syringe.capacityMl} mL syringe · {syringe.tickUnits}-unit marks
                    </p>
                    <p className="shrink-0 text-xl font-semibold tabular-nums">
                      {pretty(measurement.units)} units
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{U100_MEANING}</p>
                  {measurement.issues.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {measurement.issues.map((w, i) => (
                        <li key={i} className="rounded-lg bg-warn-soft px-2.5 py-1.5 text-xs font-medium text-warn">
                          {w.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-ok">Drawable on the {syringe.tickUnits}-unit graduations.</p>
                  )}
                </div>
              ) : null}

              <div className="rounded-xl border border-line p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">Theoretical full doses</p>
                  <p className="shrink-0 text-xl font-semibold tabular-nums">{result.fullDoses}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  ⌊{pretty(result.totalMcg)} ÷ {pretty(result.desiredMcg)}⌋ = {result.fullDoses} complete{" "}
                  {result.fullDoses === 1 ? "dose" : "doses"}
                  {result.remainderMcg > 0 ? `, leaving ${pretty(result.remainderMcg)} mcg` : ""}.{" "}
                  {THEORETICAL_DOSES_NOTE}
                </p>
              </div>

              <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
                Values are rounded for display only — calculations use full precision.{" "}
                {VOLUME_ASSUMPTION}
              </p>

              {duplicatesExisting ? (
                <p className="rounded-xl bg-info-soft px-3 py-2 text-xs font-medium text-info">
                  This matches the existing record “{duplicatesExisting.name}”. You can still save a
                  new one, or skip this and log against the existing vial.
                </p>
              ) : null}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button size="lg" block onClick={saveAsVial}>
                  Save as a vial record
                </Button>
                <Button size="lg" variant="secondary" block onClick={logThisDose}>
                  Log this dose as taken
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <p className="rounded-xl border border-warn bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
        {CLINICAL_CONFIRM}
      </p>
    </div>
  );
}

function ResultRow({
  label,
  primary,
  note,
  formula,
  strong,
}: {
  label: string;
  primary: string;
  note?: string;
  formula?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {formula ? (
          <p className="mt-0.5 truncate text-xs text-subtle" title={formula}>
            {formula}
          </p>
        ) : null}
        {note ? <p className="text-xs text-muted">{note}</p> : null}
      </div>
      <p
        className={
          strong
            ? "shrink-0 text-xl font-semibold tabular-nums sm:text-2xl"
            : "shrink-0 text-lg font-semibold tabular-nums"
        }
      >
        {primary}
      </p>
    </div>
  );
}
