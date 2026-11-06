"use client";

/**
 * Dashboard companion tracker: today's protein and fluid against the targets
 * the user set in Settings (defaults 100 g / 2,500 mL, per the app — they are
 * editable, and nothing here recommends an intake amount).
 *
 * One upsert per calendar day via the normal repo contract, so demo mode and
 * Supabase behave identically. Quick buttons add; the record is replaced with
 * the new total, the same way a reading is saved anywhere else in the app.
 */

import { useMemo, useState } from "react";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";
import { Badge, Card, CardHeader, Input } from "@/components/ui";
import { intakeFraction, intakeLabel, resolveTargets } from "@/lib/domain/intake";
import { parseDecimal } from "@/lib/domain/calculator";
import { localTodayDate } from "@/lib/format";

export function ProteinWaterWidget() {
  const { intakes, settings, saveIntake } = useData();
  const { show } = useToast();
  const targets = resolveTargets(settings);
  const today = localTodayDate();
  const day = useMemo(() => intakes.find((i) => i.day === today) ?? null, [intakes, today]);
  const protein = day?.proteinGrams ?? 0;
  const water = day?.waterMl ?? 0;
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState("");

  /* Clamp both so a stray negative can never stick in the record. */
  async function add(deltaProtein: number, deltaWater: number) {
    if (busy) return;
    const next = {
      day: today,
      proteinGrams: Math.max(0, protein + deltaProtein),
      waterMl: Math.max(0, water + deltaWater),
    };
    if (next.proteinGrams === protein && next.waterMl === water) return;
    setBusy(true);
    try {
      await saveIntake(next);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save today's log.");
    } finally {
      setBusy(false);
    }
  }

  function addCustom() {
    const n = parseDecimal(custom);
    if (n === null || n <= 0) return;
    setCustom("");
    void add(n, 0);
  }

  return (
    <Card>
      <CardHeader
        title="Protein & water today"
        aside={
          day?.demo ? (
            <Badge tone="demo">Demo</Badge>
          ) : (
            <span className="text-xs text-subtle">targets set in Settings</span>
          )
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-3 sm:px-5 sm:pb-4">
        <Gauge
          label="Protein"
          fraction={intakeFraction(protein, targets.proteinG)}
          valueText={intakeLabel(protein, targets.proteinG, "g")}
          color="var(--brand)"
        >
          <Chip onClick={() => void add(25, 0)}>+25 g shake</Chip>
          <Chip onClick={() => void add(30, 0)}>+30 g meal</Chip>
          <span className="flex items-center gap-1.5">
            <label className="sr-only" htmlFor="pw-custom-protein">
              Custom protein in grams
            </label>
            <Input
              id="pw-custom-protein"
              inputMode="decimal"
              className="h-9 w-20 px-2.5 text-sm"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="grams"
            />
            <Chip onClick={addCustom}>add</Chip>
          </span>
        </Gauge>
        <Gauge
          label="Water"
          fraction={intakeFraction(water, targets.waterMl)}
          valueText={intakeLabel(water, targets.waterMl, "mL")}
          color="var(--info)"
        >
          <Chip onClick={() => void add(0, 250)}>+250 mL glass</Chip>
          <Chip onClick={() => void add(0, 500)}>+500 mL bottle</Chip>
        </Gauge>
      </div>
      <p className="px-4 pb-4 text-xs text-subtle sm:px-5">
        What you logged, against the targets you chose. Pepcal records it and recommends
        nothing — take intake questions to a qualified clinician.
      </p>
    </Card>
  );
}

function Gauge({
  label,
  fraction,
  valueText,
  color,
  children,
}: {
  label: string;
  fraction: number;
  valueText: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {/* The number is ink, never the series colour; the bar itself carries
            which gauge it belongs to. */}
        <span className="text-xs text-muted tabular-nums">{valueText}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} toward your target`}
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${fraction * 100}%`, background: color }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/** Same chip style the log form uses for quick picks. */
function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-slop-y rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2/60 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
