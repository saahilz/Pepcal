"use client";

/**
 * The half-life the serum estimate is drawn at.
 *
 * Browser-local like the kg/lb preference (`useWeightUnit`): it only changes
 * how records are plotted, never the records themselves, so it needs no
 * repository column or migration.
 */

import { useCallback, useState } from "react";

const HOURS_KEY = "pepcal.serum.halfLifeHours";
const CUSTOM_KEY = "pepcal.serum.halfLifeCustom";

export function useSerumHalfLife(): {
  hours: number;
  setHours: (n: number) => void;
  custom: string;
  setCustom: (text: string) => void;
} {
  const [hours, setHoursState] = useState<number>(() => {
    if (typeof window === "undefined") return 168; // SSR default; replaced on first client render
    const n = Number(window.localStorage.getItem(HOURS_KEY));
    return Number.isFinite(n) && n > 0 ? n : 168;
  });
  const [custom, setCustomState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(CUSTOM_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const setHours = useCallback((n: number) => {
    setHoursState(n);
    try {
      window.localStorage.setItem(HOURS_KEY, String(n));
    } catch {
      // Private mode / quota — the choice just won't survive a reload.
    }
  }, []);

  const setCustom = useCallback((text: string) => {
    setCustomState(text);
    try {
      window.localStorage.setItem(CUSTOM_KEY, text);
    } catch {
      // ignore
    }
  }, []);

  return { hours, setHours, custom, setCustom };
}
