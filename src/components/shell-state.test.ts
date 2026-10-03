import { describe, expect, it } from "vitest";
import { isPublicRoute, shouldShowSupabaseSignInGate } from "./shell-state";

describe("Supabase shell gate", () => {
  it("does not replace a hydration error with the sign-in card", () => {
    expect(shouldShowSupabaseSignInGate("supabase", null, "error")).toBe(false);
  });

  it("shows the sign-in card while an unauthenticated session is loading", () => {
    expect(shouldShowSupabaseSignInGate("supabase", null, "loading")).toBe(true);
  });

  it("does not gate demo mode or authenticated users", () => {
    expect(shouldShowSupabaseSignInGate("demo", null, "ready")).toBe(false);
    expect(shouldShowSupabaseSignInGate("supabase", { id: "user-1", name: "Account", isDemo: false }, "ready")).toBe(false);
  });

  it("recognizes only the landing and auth routes as public", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/register")).toBe(true);
    expect(isPublicRoute("/dashboard")).toBe(false);
  });
});
