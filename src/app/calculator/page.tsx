"use client";

import { CalculatorWidget } from "@/components/calc/calculator-widget";
import { NOT_MEDICAL_ADVICE } from "@/lib/domain/disclaimer";

export default function CalculatorPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Reconstitution calculator</h1>
      <p className="mt-1 text-sm text-muted">
        Work out the concentration of a reconstituted vial and the volume that holds the
        amount you enter. Calculation and record-keeping only.
      </p>
      <p className="mt-2 text-xs text-subtle">{NOT_MEDICAL_ADVICE}</p>
      <div className="mt-5">
        <CalculatorWidget />
      </div>
    </div>
  );
}
