import { describe, expect, it } from "vitest";
import { shouldRedirectAuthenticatedLanding } from "./landing-state";

describe("landing route state", () => {
  it("redirects an authenticated Supabase visitor to the dashboard", () => {
    expect(
      shouldRedirectAuthenticatedLanding("supabase", { id: "user-1", name: "Account", isDemo: false }, "ready")
    ).toBe(true);
  });

  it("keeps demo and unauthenticated visitors on the landing page", () => {
    expect(shouldRedirectAuthenticatedLanding("demo", null, "ready")).toBe(false);
    expect(shouldRedirectAuthenticatedLanding("supabase", null, "loading")).toBe(false);
  });
});
