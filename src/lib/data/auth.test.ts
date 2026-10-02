import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.hoisted(() => vi.fn());

vi.mock("./supabase/client", () => ({
  getSupabase: () => ({ auth: { signInWithOAuth } }),
}));

describe("repository authentication", () => {
  afterEach(() => {
    signInWithOAuth.mockReset();
    vi.unstubAllGlobals();
  });

  it("starts Google OAuth at the current origin", async () => {
    signInWithOAuth.mockResolvedValue({ data: null, error: null });
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });

    const { supabaseRepository } = await import("./supabase/supabaseRepository");
    await supabaseRepository.signInWithGoogle();

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  });

  it("does not provide a fake cloud login in demo mode", async () => {
    const { localDemoRepository } = await import("./local/localRepository");

    await expect(localDemoRepository.signInWithGoogle()).rejects.toThrow(
      "Google sign-in is only available when Supabase is configured."
    );
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});
