"use client";

/**
 * The "Show Dose Markers" toggle for the weight chart.
 *
 * A display choice, not a record — same rule as the kg/lb preference (see
 * use-weight-unit.ts): it lives in this browser, so nothing in the account or
 * the database changes when it is flipped.
 */

import { useCallback, useState } from "react";

const KEY = "pepcal.weight.doseMarkers";

export function useDoseMarkersOn(): [boolean, (next: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      // Default on: the markers annotate records the user already made.
      return window.localStorage.getItem(KEY) !== "off";
    } catch {
      return true;
    }
  });

  const update = useCallback((next: boolean) => {
    setOn(next);
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Private mode / quota — the choice just won't survive a reload.
    }
  }, []);

  return [on, update];
}
