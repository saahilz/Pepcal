"use client";

import { useState } from "react";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { bmiCategory, calculateBmi, type BmiCategory } from "@/lib/domain/bmi";
import { parseDecimal } from "@/lib/domain/calculator";

const bmiResultClasses: Record<BmiCategory, string> = {
  underweight: "border-warn/40 bg-warn-soft",
  normal: "border-ok/40 bg-ok-soft",
  overweight: "border-warn/40 bg-warn-soft",
  obese: "border-bad/40 bg-bad-soft",
};

const bmiCategoryClasses: Record<BmiCategory, string> = {
  underweight: "text-warn",
  normal: "text-ok",
  overweight: "text-warn",
  obese: "text-bad",
};

const bmiCategoryLabels: Record<BmiCategory, string> = {
  underweight: "Below normal range",
  normal: "Normal range",
  overweight: "Above normal range",
  obese: "Obese range",
};

export function BmiCalculator() {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const category = bmi === null ? null : bmiCategory(bmi);

  function handleCalculate() {
    const nextErrors: Record<string, string> = {};
    const heightCm = parseDecimal(height);
    const weightKg = parseDecimal(weight);

    if (heightCm === null) {
      nextErrors.height = height.trim() === "" ? "Required." : "Enter a valid number.";
    } else if (heightCm <= 0) {
      nextErrors.height = "Must be greater than zero.";
    }

    if (weightKg === null) {
      nextErrors.weight = weight.trim() === "" ? "Required." : "Enter a valid number.";
    } else if (weightKg <= 0) {
      nextErrors.weight = "Must be greater than zero.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || heightCm === null || weightKg === null) {
      setBmi(null);
      return;
    }

    setBmi(calculateBmi(weightKg, heightCm));
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="BMI calculator"
        aside={
          <Button
            size="sm"
            variant="secondary"
            aria-expanded={open}
            aria-controls="bmi-calculator-panel"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "Hide calculator" : "Calculate BMI"}
          </Button>
        }
      />
      <p className="px-4 pb-4 pt-1 text-sm text-muted sm:px-5">
        A quick reference using height in centimeters and weight in kilograms.
      </p>

      {open ? (
        <div id="bmi-calculator-panel" className="border-t border-line bg-surface-2/30 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Height" htmlFor="bmi-height" error={errors.height}>
              <div className="flex items-center gap-2">
                <Input
                  id="bmi-height"
                  inputMode="decimal"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  placeholder="e.g. 180"
                  invalid={Boolean(errors.height)}
                />
                <span className="shrink-0 text-sm font-medium text-muted">cm</span>
              </div>
            </Field>
            <Field label="Weight" htmlFor="bmi-weight" error={errors.weight}>
              <div className="flex items-center gap-2">
                <Input
                  id="bmi-weight"
                  inputMode="decimal"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  placeholder="e.g. 80"
                  invalid={Boolean(errors.weight)}
                />
                <span className="shrink-0 text-sm font-medium text-muted">kg</span>
              </div>
            </Field>
          </div>

          <Button className="mt-4" size="lg" onClick={handleCalculate} block>
            Calculate BMI
          </Button>

          {bmi !== null && category !== null ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 ${bmiResultClasses[category]}`}
              aria-live="polite"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">Your BMI</p>
              <output className="mt-1 block text-2xl font-semibold tracking-tight">
                {bmi.toFixed(1)}
              </output>
              <p className={`mt-1 text-sm font-semibold ${bmiCategoryClasses[category]}`}>
                {bmiCategoryLabels[category]}
              </p>
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-subtle">
            Calculation for general reference only — not a diagnosis or treatment recommendation.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
