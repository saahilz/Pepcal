"use client";

/**
 * Discretion mode: one browser-local switch that swaps peptide / vial /
 * schedule names for anonymous stand-ins across the UI (optionally blurring
 * dose numbers until tapped).
 *
 * Like kg/lb and the dose-marker toggle, this is a display choice — nothing
 * stored changes, and demo accounts are affected no differently. State reads
 * synchronously from localStorage in the initializer (same as use-dose-markers):
 * nothing name-shaped paints until the data provider reaches "ready", and that
 * is strictly after hydration, so there is no un-masked flash to guard.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { anonymousLabel, type DiscretionKind } from "@/lib/domain/discretion";

const ON_KEY = "pepcal.discretion.on";
const BLUR_KEY = "pepcal.discretion.blurDoses";

interface MaskOptions {
  /** Derive the stand-in from something else (e.g. a schedule id). */
  seed?: string;
  /** List position for the "Vial #N" style. */
  index?: number;
  /** Shown when the record has no name, both modes. */
  fallback?: string;
}

interface DiscretionValue {
  on: boolean;
  /** Extra step of the same switch: dose numbers blurred until tapped. */
  blurDoses: boolean;
  setOn: (next: boolean) => void;
  setBlurDoses: (next: boolean) => void;
  toggle: () => void;
  /** The name as it should appear right now — masked when on. */
  mask: (
    name: string | null | undefined,
    kind?: DiscretionKind,
    options?: MaskOptions
  ) => string;
}

const noop = () => {};
const DiscretionContext = createContext<DiscretionValue>({
  on: false,
  blurDoses: false,
  setOn: noop,
  setBlurDoses: noop,
  toggle: noop,
  mask: (name, _kind, options) => name?.trim() ? name : options?.fallback ?? "",
});

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "on";
  } catch {
    return false;
  }
}

function store(key: string, on: boolean) {
  try {
    window.localStorage.setItem(key, on ? "on" : "off");
  } catch {
    // Private mode / quota — the choice just won't survive a reload.
  }
}

export function DiscretionProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(() => (typeof window === "undefined" ? false : read(ON_KEY)));
  const [blurDoses, setBlurState] = useState(() =>
    typeof window === "undefined" ? false : read(BLUR_KEY)
  );

  const applyOn = useCallback((next: boolean) => {
    setOnState(next);
    store(ON_KEY, next);
  }, []);

  const applyBlur = useCallback((next: boolean) => {
    setBlurState(next);
    store(BLUR_KEY, next);
  }, []);

  const toggle = useCallback(() => applyOn(!on), [applyOn, on]);

  const mask = useCallback(
    (name: string | null | undefined, kind?: DiscretionKind, options?: MaskOptions): string => {
      // Only a real name gets replaced; blank records read the same either way.
      if (!on || !name?.trim()) return name?.trim() ? name : options?.fallback ?? "";
      return anonymousLabel(kind ?? "compound", options?.seed ?? name, options?.index ?? 0);
    },
    [on]
  );

  const value: DiscretionValue = {
    on,
    blurDoses,
    setOn: applyOn,
    setBlurDoses: applyBlur,
    toggle,
    mask,
  };

  return <DiscretionContext.Provider value={value}>{children}</DiscretionContext.Provider>;
}

export function useDiscretion() {
  return useContext(DiscretionContext);
}

/**
 * A dose figure that smudges (blur) — not hides: the glyphs stay in the DOM
 * in the accessible tree, which is shoulder-surfing cover, not access control.
 * Tap once to read it.
 */
export function BlurDose({ children }: { children: ReactNode }) {
  const { blurDoses, on } = useDiscretion();
  const [shown, setShown] = useState(false);
  if (!on || !blurDoses || shown) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      title="Tap to reveal"
      className="cursor-pointer tabular-nums blur-[5px] select-none transition-[filter] hover:blur-[2px]"
    >
      {children}
    </button>
  );
}
