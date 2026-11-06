"use client";

/**
 * Tap where the injection went in. The pick is stored as the injection's
 * location label (plus front-view coords) — older free-text labels like
 * "Left abdomen" map to the same zones, so no new field or migration exists.
 *
 * Record-keeping only: "least recently used" reads the user's own log to keep
 * a rotation they already perform visible. Pepcal never recommends a site.
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
        <svg viewBox="0 0 120 200" className="block h-52 w-auto select-none" aria-hidden="true">
          <g fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={1.5}>
            <circle cx="60" cy="15" r="10" />
            <rect x="56" y="24" width="8" height="7" />
            <rect x="45" y="30" width="30" height="58" rx="12" />
            <rect x="27" y="34" width="12" height="50" rx="6" />
            <rect x="81" y="34" width="12" height="50" rx="6" />
            <rect x="45" y="92" width="13" height="98" rx="6" />
            <rect x="62" y="92" width="13" height="98" rx="6" />
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
              style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%` }}
              className={cn(
                "tap-slop absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-colors",
                isSel
                  ? "border-brand bg-brand"
                  : "border-dashed border-line-strong bg-surface/70 hover:bg-surface-2",
                isLast && "border-solid border-info ring-2 ring-info/50",
                isNext && "border-solid border-ok ring-2 ring-ok/50"
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
