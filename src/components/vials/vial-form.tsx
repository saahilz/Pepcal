"use client";

/** Create/edit form for a vial (peptide record). Shared by /vials/new and
 *  /vials/[id]/edit. Pure record-keeping: the beyond-use date is only ever
 *  what the user types — never computed. */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AmountUnit } from "@/lib/domain/units";
import { toMcg } from "@/lib/domain/units";
import type { Vial, VialInput } from "@/lib/data/repository";
import { parseDecimal } from "@/lib/domain/calculator";
import { COMMON_PEPTIDES } from "@/lib/domain/peptides";
import { isoToLocalInputValue, localTodayDate, trimNumber } from "@/lib/format";
import { Button, Card, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";

const UNITS: { value: AmountUnit; label: string }[] = [
  { value: "mg", label: "mg" },
  { value: "mcg", label: "mcg" },
];

const pretty = (n: number) => trimNumber(n, 4);
const CUSTOM_PEPTIDE = "__custom__";

function isCommonPeptide(value: string): boolean {
  return (COMMON_PEPTIDES as readonly string[]).includes(value);
}

export function VialForm({ existing }: { existing?: Vial }) {
  const router = useRouter();
  const { saveVial } = useData();
  const { show } = useToast();

  const [name, setName] = useState(existing?.name ?? "");
  const [peptideChoice, setPeptideChoice] = useState(() => {
    if (!existing?.name) return "";
    return isCommonPeptide(existing.name) ? existing.name : CUSTOM_PEPTIDE;
  });
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.vialAmount) : "");
  const [unit, setUnit] = useState<AmountUnit>(existing?.vialUnit ?? "mg");
  const [diluent, setDiluent] = useState(existing?.diluentMl != null ? String(existing.diluentMl) : "");
  const [reconLocal, setReconLocal] = useState(
    existing?.reconstitutedAt ? isoToLocalInputValue(existing.reconstitutedAt) : ""
  );
  const [bud, setBud] = useState(existing?.beyondUseDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amountNum = parseDecimal(amount);
  const diluentNum = parseDecimal(diluent);

  const concentration = useMemo(() => {
    if (amountNum === null || amountNum <= 0 || diluentNum === null || diluentNum <= 0) return null;
    const mcg = toMcg(amountNum, unit);
    return { mcgPerMl: mcg / diluentNum, mgPerMl: mcg / diluentNum / 1000 };
  }, [amountNum, diluentNum, unit]);

  const today = localTodayDate();
  const budInPast = bud !== "" && bud < today;

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (name.trim() === "") errs.name = "Give this vial a name.";
    if (amountNum === null) errs.amount = amount.trim() === "" ? "Required." : "Enter a valid number.";
    else if (amountNum <= 0) errs.amount = "Must be greater than zero.";
    if (diluent.trim() !== "") {
      if (diluentNum === null) errs.diluent = "Enter a valid number of mL.";
      else if (diluentNum <= 0) errs.diluent = "Must be greater than zero.";
    }
    if (bud !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(bud)) errs.bud = "Pick a date.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const diluentMl = diluentNum !== null && diluentNum > 0 ? diluentNum : null;
    const input: VialInput & { id?: string } = {
      id: existing?.id,
      name: name.trim(),
      notes: notes.trim() === "" ? null : notes.trim(),
      vialAmount: amountNum!,
      vialUnit: unit,
      diluentMl,
      concentrationMcgPerMl: concentration?.mcgPerMl ?? null,
      concentrationMgPerMl: concentration?.mgPerMl ?? null,
      reconstitutedAt:
        reconLocal !== "" ? new Date(reconLocal).toISOString() : diluentMl !== null ? new Date().toISOString() : existing?.reconstitutedAt ?? null,
      beyondUseDate: bud === "" ? null : bud,
    };
    try {
      const saved = await saveVial(input);
      show(existing ? "Vial updated." : `Added “${saved.name}”.`);
      router.push("/vials");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save the vial.");
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <Field
          label="Name"
          htmlFor={peptideChoice === CUSTOM_PEPTIDE ? "v-name-custom" : "v-name"}
          error={errors.name}
          hint="Choose a common peptide name, or select Custom peptide… at the bottom to enter your own."
        >
          <Select
            id="v-name"
            value={peptideChoice}
            onChange={(e) => {
              const next = e.target.value;
              setPeptideChoice(next);
              setName(next === CUSTOM_PEPTIDE ? "" : next);
              if (errors.name) setErrors((current) => ({ ...current, name: "" }));
            }}
          >
            <option value="">Choose a peptide</option>
            {COMMON_PEPTIDES.map((peptide) => (
              <option key={peptide} value={peptide}>
                {peptide}
              </option>
            ))}
            <option value={CUSTOM_PEPTIDE}>Custom peptide…</option>
          </Select>
          {peptideChoice === CUSTOM_PEPTIDE ? (
            <Input
              id="v-name-custom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a custom peptide name"
              autoFocus
            />
          ) : null}
        </Field>

        <Field label="Total peptide amount in the vial" htmlFor="v-amount" error={errors.amount}>
          <div className="flex gap-2">
            <Input
              id="v-amount"
              inputMode="decimal"
              className="flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5"
            />
            <div className="shrink-0">
              <Segmented value={unit} onChange={setUnit} options={UNITS} />
            </div>
          </div>
        </Field>

        <Field
          label="Diluent volume added (mL)"
          htmlFor="v-diluent"
          error={errors.diluent}
          hint={
            diluent.trim() === ""
              ? "Leave blank if not yet reconstituted. Concentration can be saved later from the calculator."
              : "Final volume is assumed equal to the diluent added."
          }
        >
          <Input
            id="v-diluent"
            inputMode="decimal"
            value={diluent}
            onChange={(e) => setDiluent(e.target.value)}
            placeholder="e.g. 2"
          />
        </Field>

        {concentration ? (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            Concentration:{" "}
            <span className="font-semibold tabular-nums">
              {pretty(concentration.mgPerMl)} mg/mL
            </span>{" "}
            <span className="text-muted">= {pretty(concentration.mcgPerMl)} mcg/mL</span>
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Reconstitution date & time"
            htmlFor="v-recon"
            hint="Used as recorded. Leave blank to timestamp now when a diluent volume is set."
          >
            <Input
              id="v-recon"
              type="datetime-local"
              value={reconLocal}
              onChange={(e) => setReconLocal(e.target.value)}
            />
          </Field>
          <Field
            label="Beyond-use date"
            htmlFor="v-bud"
            hint="Enter from verified product or pharmacy instructions. Pepcal never computes one."
            error={errors.bud}
          >
            <Input id="v-bud" type="date" value={bud} onChange={(e) => setBud(e.target.value)} />
          </Field>
        </div>

        {budInPast ? (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
            This beyond-use date is in the past — confirm it before using the vial.
          </p>
        ) : null}

        <Field label="Notes" htmlFor="v-notes">
          <Textarea
            id="v-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional. Product source, batch, your own observations…"
          />
        </Field>
      </Card>

      <div className="flex gap-2">
        <Button size="lg" onClick={handleSave} block>
          {existing ? "Save changes" : "Add vial"}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => router.push("/vials")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
