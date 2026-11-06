"use client";

/**
 * Tap where the injection went in. The pick is stored as the injection's
 * location label (plus front-view coords) — older free-text labels like
 * "Left abdomen" map to the same zones, so no new field or migration exists.
 *
 * Record-keeping only: "least recently used" reads the user's own log to keep
 * a rotation they already perform visible. Pepcal never recommends a site.
 *
 * Outstretched "Vitruvian" pose: arms raised wide and legs in an athletic
 * stance so all six zones (site.ts coords) stay visually separate AND their
 * 44px tap areas don't overlap at the smallest render size.
 */

import { ClockIcon } from "@/components/icons";
import {
  INJECTION_ZONES,
  lastUsedZone,
  recommendedZone,
  zoneForLabel,
  type InjectionZone,
} from "@/lib/domain/site";
import { cn } from "@/lib/ui/cn";

export function BodySitePicker({
  label,
  injections,
  onSelect,
}: {
  label: string;
  injections: { administeredAt: string; location?: { label?: string | null } | null }[];
  onSelect: (zone: InjectionZone) => void;
}) {
  const selected = zoneForLabel(label.trim());
  const last = lastUsedZone(injections);
  const next = recommendedZone(injections);

  return (
    <div role="group" aria-label="Injection site" className="flex flex-col items-center gap-2">
      <div className="relative inline-flex">
        {/* Neutral front silhouette; zone coords (site.ts) are fractions of this box. */}
        <svg
          viewBox="0 0 250 200"
          className="block h-52 w-auto max-w-full select-none"
          aria-hidden="true"
        >
          <g fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={1.5}>
            {/* Head + neck */}
            <circle cx="125" cy="16" r="11" />
            <path d="M118 26 h14 v7 h-14 Z" />
            {/* Torso: chest tapering to hips; the midline divides L/R abdomen */}
            <path d="M125 33 C112 33 96 39 93 52 L99 72 L104 104 C110 110 116 112 125 112 C134 112 140 110 146 104 L151 72 L157 52 C154 39 138 33 125 33 Z" />
            {/* Navel — the midline landmark between the abdomen zones */}
            <circle cx="125" cy="88" r="2" fill="var(--line-strong)" stroke="none" />
            {/* Arms outstretched up and out, fully clear of the torso */}
            <path d="M96 42 L34 12 L26 20 L92 56 Z" />
            <path d="M154 42 L216 12 L224 20 L158 56 Z" />
            {/* Hands */}
            <circle cx="28" cy="14" r="7" />
            <circle cx="222" cy="14" r="7" />
            {/* Legs spread in an athletic stance */}
            <path d="M104 112 L86 190 L100 192 L120 116 Z" />
            <path d="M146 112 L164 190 L150 192 L130 116 Z" />
            {/* Feet */}
            <path d="M82 188 L102 190 L100 197 L78 195 Z" />
            <path d="M168 188 L148 190 L150 197 L172 195 Z" />
          </g>
        </svg>
        {INJECTION_ZONES.map((z) => {
          const isSel = selected?.id === z.id;
          const isLast = last?.id === z.id && !isSel;
          const isNext = next.id === z.id && !isSel && !isLast;
          const tags = [
            z.label,
            isSel && "selected",
            isLast && "last used",
            isNext && "least recently used",
          ]
            .filter(Boolean)
            .join(" — ");
          return (
            <button
              key={z.id}
              type="button"
              title={z.label}
              aria-label={tags}
              aria-pressed={isSel}
              onClick={() => onSelect(z)}
              style={{ left: `${(z.x * 250)}px`, top: `${(z.y * 200)}px` }}
              className={cn(
                "tap-slop absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-colors",
                isSel
                  ? "border-brand bg-brand"
                  : "border-dashed border-line-strong bg-surface/70 hover:bg-surface-2",
                isLast && "border-solid border-info ring-2 ring-info/50",
                isNext && "site-pulse border-solid border-ok ring-2 ring-ok/50"
              )}
            >
              <span
                aria-hidden
                className={cn("h-2 w-2 rounded-full", isSel ? "bg-white" : "bg-subtle")}
              />
              {isLast ? (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-info text-white shadow"
                >
                  <ClockIcon className="h-3 w-3" />
                </span>
              ) : null}
              {isNext ? (
                <span
                  aria-hidden
                  className="absolute -left-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-ok text-[9px] font-bold text-white shadow"
                >
                  ↻
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-subtle">
        {selected ? `Selected: ${selected.label}` : "Tap the zone where it went in"} · 🕘 last used:{" "}
        {last?.label ?? "—"} · ↻ least recently used: {next.label}
      </p>
      <p className="text-center text-xs text-muted">
        This records the spot you chose. Pepcal never recommends an injection site.
      </p>
    </div>
  );
}
