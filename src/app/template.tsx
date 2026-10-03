"use client";

/**
 * Rendered once per route change (remounted by Next on navigation between
 * segments under this layout). Applies a short fade/rise so page switches feel
 * smooth. The animation is purely additive — it starts transparent but ends at
 * the element's natural state, so reduced-motion users just see content appear.
 */

import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
