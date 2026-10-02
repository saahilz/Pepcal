import { describe, expect, it, vi } from "vitest";
import { GOOGLE_SIGN_IN_ERROR, startGoogleSignIn } from "./sign-in-card-state";

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
});
