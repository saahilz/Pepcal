import { describe, expect, it, vi } from "vitest";
import {
  EMAIL_AUTH_ERROR,
  EMAIL_CONFIRMATION_MESSAGE,
  EMAIL_PASSWORD_MIN_LENGTH,
  GOOGLE_SIGN_IN_ERROR,
  submitEmailAuth,
  startGoogleSignIn,
  validateEmailAuth,
} from "./sign-in-card-state";

describe("Google sign-in card", () => {
  it("uses the safe error copy when OAuth initiation fails", async () => {
    const setBusy = vi.fn();
    const setError = vi.fn();

    await startGoogleSignIn(
      async () => {
        throw new Error("provider internals must stay hidden");
      },
      setBusy,
      setError
    );

    expect(setBusy.mock.calls).toEqual([[true], [false]]);
    expect(setError.mock.calls).toEqual([[null], [GOOGLE_SIGN_IN_ERROR]]);
  });

  it("keeps the action busy until OAuth initiation resolves", async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    const setBusy = vi.fn();
    const setError = vi.fn();
    const action = startGoogleSignIn(() => pending, setBusy, setError);

    expect(setBusy).toHaveBeenCalledWith(true);
    expect(setError).toHaveBeenCalledWith(null);
    expect(setBusy).toHaveBeenCalledTimes(1);

    resolve();
    await action;

    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(setError).toHaveBeenCalledTimes(1);
  });

  it("validates email auth input before submission", () => {
    expect(validateEmailAuth({ email: "", password: "short", confirmPassword: "different" }, "register"))
      .toEqual({ email: "Enter your email address.", password: `Use at least ${EMAIL_PASSWORD_MIN_LENGTH} characters.` });
    expect(validateEmailAuth({ email: "not-an-email", password: "long enough", confirmPassword: "long enough" }, "register"))
      .toEqual({ email: "Enter a valid email address." });
    expect(validateEmailAuth({ email: "person@example.com", password: "long enough", confirmPassword: "different" }, "register"))
      .toEqual({ confirmPassword: "Passwords do not match." });
    expect(validateEmailAuth({ email: "person@example.com", password: "long enough" }, "sign-in"))
      .toEqual({});
  });

  it("submits trimmed credentials and returns safe error state", async () => {
    const signInWithEmail = vi.fn().mockRejectedValue(new Error("Supabase internal detail"));
    const setBusy = vi.fn();
    const setError = vi.fn();
    const result = await submitEmailAuth(
      "sign-in",
      { email: " person@example.com ", password: "long enough" },
      signInWithEmail,
      vi.fn(),
      setBusy,
      setError,
      vi.fn()
    );

    expect(result).toBe(false);
    expect(signInWithEmail).toHaveBeenCalledWith("person@example.com", "long enough");
    expect(setError).toHaveBeenLastCalledWith(EMAIL_AUTH_ERROR);
    expect(setError).not.toHaveBeenCalledWith("Supabase internal detail");
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it("shows the confirmation message when registration needs email confirmation", async () => {
    const setBusy = vi.fn();
    const setError = vi.fn();
    const setConfirmation = vi.fn();
    const result = await submitEmailAuth(
      "register",
      { email: "person@example.com", password: "long enough", confirmPassword: "long enough" },
      vi.fn(),
      vi.fn().mockResolvedValue("confirmation-required"),
      setBusy,
      setError,
      setConfirmation
    );

    expect(result).toBe(true);
    expect(setConfirmation).toHaveBeenCalledWith(EMAIL_CONFIRMATION_MESSAGE);
    expect(setError).toHaveBeenCalledWith(null);
  });
});
