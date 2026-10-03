import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.hoisted(() => vi.fn());
const signInWithPassword = vi.hoisted(() => vi.fn());
const signUp = vi.hoisted(() => vi.fn());

vi.mock("./supabase/client", () => ({
  getSupabase: () => ({ auth: { signInWithOAuth, signInWithPassword, signUp } }),
}));

describe("repository authentication", () => {
  afterEach(() => {
    signInWithOAuth.mockReset();
    signInWithPassword.mockReset();
    signUp.mockReset();
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

  it("signs in with email and password through Supabase Auth", async () => {
    signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });

    const { supabaseRepository } = await import("./supabase/supabaseRepository");
    await supabaseRepository.signInWithEmail("person@example.com", "correct horse battery staple");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "correct horse battery staple",
    });
  });

  it("preserves a safe Supabase error message instead of rendering an object string", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "42P01", message: "The required data table is not available yet." },
    });
    const { supabaseRepository } = await import("./supabase/supabaseRepository");

    await expect(supabaseRepository.signInWithEmail("person@example.com", "password"))
      .rejects.toThrow("The required data table is not available yet.");
  });

  it("reports whether email registration needs confirmation", async () => {
    signUp.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const { supabaseRepository } = await import("./supabase/supabaseRepository");

    await expect(supabaseRepository.signUpWithEmail("person@example.com", "correct horse battery staple"))
      .resolves.toBe("signed-in");

    signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(supabaseRepository.signUpWithEmail("person@example.com", "correct horse battery staple"))
      .resolves.toBe("confirmation-required");

    expect(signUp).toHaveBeenNthCalledWith(1, {
      email: "person@example.com",
      password: "correct horse battery staple",
    });
  });

  it("does not provide fake email auth in demo mode", async () => {
    const { localDemoRepository } = await import("./local/localRepository");

    await expect(localDemoRepository.signInWithEmail("person@example.com", "password")).rejects.toThrow(
      "Email sign-in is only available when Supabase is configured."
    );
    await expect(localDemoRepository.signUpWithEmail("person@example.com", "password"))
      .rejects.toThrow("Email registration is only available when Supabase is configured.");
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("does not provide a fake cloud login in demo mode", async () => {
    const { localDemoRepository } = await import("./local/localRepository");

    await expect(localDemoRepository.signInWithGoogle()).rejects.toThrow(
      "Google sign-in is only available when Supabase is configured."
    );
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});
