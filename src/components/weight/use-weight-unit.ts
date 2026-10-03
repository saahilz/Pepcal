"use client";

/**
 * The kg/lb display preference for weight screens.
 *
 * Stored in this browser rather than on the account: `user_settings` has no
 * unit column, and adding one would mean a migration plus a schema/repository
 * change for a purely cosmetic choice. Readings themselves are always stored in
 * kilograms, so switching this never rewrites a record.
 */

import { useCallback, useState } from "react";
import type { WeightUnit } from "@/lib/domain/weight";

const KEY = "pepcal.weight.unit";

export function useWeightUnit(): [WeightUnit, (next: WeightUnit) => void] {
  const [unit, setUnit] = useState<WeightUnit>(() => {
    if (typeof window === "undefined") return "kg";
    try {
      return window.localStorage.getItem(KEY) === "lb" ? "lb" : "kg";
    } catch {
      return "kg";
    }
  });

  const update = useCallback((next: WeightUnit) => {
    setUnit(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Private mode / quota — the choice just won't survive a reload.
    }
  }, []);

  return [unit, update];
}
