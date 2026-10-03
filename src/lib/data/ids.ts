/** Small id helper so browser and test environments share one code path. */

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Deterministic fallback (never used on modern browsers; exists for tests).
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
