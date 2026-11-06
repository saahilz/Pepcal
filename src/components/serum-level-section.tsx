"use client";

/**
 * Dashboard section wrapping the serum chart: preset/custom half-life choice
 * (kept in this browser only — records are untouched by it, the same rule as
 * the kg/lb preference) and the "Est. Active" readout. Estimate from logged
 * doses + user-chosen half-life, badged as such.
 */

import { useState } from "react";
import { useData } from "@/components/app-provider";
import { Badge, Card, CardHeader, Segmented, Input } from "@/components/ui";
import { SerumLevelChart, serumAmountLabel } from "@/components/serum-level-chart";
import { HALF_LIFE_PRESETS, toSerumDoses, totalActiveMcg } from "@/lib/domain/half-life";
import { parseDecimal } from "@/lib/domain/calculator";
import { useSerumHalfLife } from "@/components/use-serum-half-life";

const PRESET_OPTIONS = [
  ...HALF_LIFE_PRESETS.map((p) => ({ value: String(p.hours), label: p.name })),
  { value: "custom", label: "Custom" },
];

/** `serum` comes from the page so the pill and this chart share one state. */
export function SerumLevelSection({
  serum,
  now,
}: {
  serum: ReturnType<typeof useSerumHalfLife>;
  /** One clock per render, passed down from the page. */
  now: number;
}) {
  const { injections } = useData();
  const { hours, setHours, custom, setCustom } = serum;
  const doses = toSerumDoses(injections);
  const current = doses.length ? serumAmountLabel(totalActiveMcg(doses, now, hours)) : null;

  // The control's own value: a preset's hours, or "custom". Seeded from the
  // stored half-life; typed hours only take effect once they parse (>0).
  const [selected, setSelected] = useState<string>(() =>
    HALF_LIFE_PRESETS.some((p) => p.hours === hours) ? String(hours) : "custom"
  );
  const setMode = (v: string) => {
    setSelected(v);
    if (v !== "custom") setHours(Number(v));
  };

  return (
    <Card>
      <CardHeader
        title="Estimated active level"
        aside={<Badge tone="info">Estimate · not a blood test</Badge>}
      />
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
        {doses.length === 0 ? (
          <p className="rounded-[1.1rem] border border-line/70 bg-surface-2/70 px-3.5 py-3 text-sm leading-relaxed text-muted">
            Nothing logged yet — once you record injections, this projects the
            decay of what remains from your doses.
          </p>
        ) : (
          <>
            <Segmented
              label="Half-life"
              value={selected}
              onChange={setMode}
              options={PRESET_OPTIONS}
              className="w-full sm:w-auto sm:max-w-full"
            />
            {selected === "custom" ? (
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="hl-custom">
                  Custom half-life in hours
                </label>
                <Input
                  id="hl-custom"
                  inputMode="decimal"
                  className="w-28"
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    const n = parseDecimal(e.target.value);
                    // Blank/garbage keeps the last valid curve rather than
                    // drawing a zero or NaN half-life.
                    if (n !== null && n > 0) setHours(n);
                  }}
                  placeholder="hours"
                />
                <span className="text-sm text-muted">hours</span>
              </div>
            ) : null}
            <p className="text-xs font-medium text-muted">Est. Active: {current}</p>
            <SerumLevelChart doses={doses} halfLifeHours={hours} now={now} />
            <p className="text-xs text-subtle">
              Modelled from your logged doses at a {hours}-hour half-life, which you chose.
              It is arithmetic on your records — not a serum measurement, and not advice.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
