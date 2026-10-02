import { describe, expect, it, vi } from "vitest";
import { createSupabaseAuthHandler, subscribeToSupabaseAuth } from "./app-provider-auth";

describe("Supabase auth lifecycle", () => {
  it("refreshes an unauthenticated initial session before marking ready", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const markReady = vi.fn();
    const clearRecords = vi.fn();
    const setError = vi.fn();
    const handle = createSupabaseAuthHandler({
      isMounted: () => true,
      refresh,
      markReady,
      clearRecords,
      setError,
    });

    await handle("INITIAL_SESSION");

    expect(refresh).toHaveBeenCalledOnce();
    expect(markReady).toHaveBeenCalledOnce();
    expect(clearRecords).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
  });

  it("refreshes user-scoped data when a session arrives", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const markReady = vi.fn();
    const handle = createSupabaseAuthHandler({
      isMounted: () => true,
      refresh,
      markReady,
      clearRecords: vi.fn(),
      setError: vi.fn(),
    });

    await handle("SIGNED_IN");

    expect(refresh).toHaveBeenCalledOnce();
    expect(markReady).toHaveBeenCalledOnce();
  });

  it("clears in-memory records after sign-out", async () => {
    const clearRecords = vi.fn();
    const markReady = vi.fn();
    const handle = createSupabaseAuthHandler({
      isMounted: () => true,
      refresh: vi.fn(),
      markReady,
      clearRecords,
      setError: vi.fn(),
    });

    await handle("SIGNED_OUT");

    expect(clearRecords).toHaveBeenCalledOnce();
    expect(markReady).toHaveBeenCalledOnce();
  });

  it("does not apply a session refresh that finishes after sign-out", async () => {
    let resolveRefresh!: () => void;
    const refresh = vi.fn(() => new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    }));
    const clearRecords = vi.fn();
    const markReady = vi.fn();
    const handle = createSupabaseAuthHandler({
      isMounted: () => true,
      refresh,
      markReady,
      clearRecords,
      setError: vi.fn(),
    });

    const sessionRefresh = handle("SIGNED_IN");
    await handle("SIGNED_OUT");
    resolveRefresh();
    await sessionRefresh;

    expect(clearRecords).toHaveBeenCalledOnce();
    expect(markReady).toHaveBeenCalledOnce();
  });

  it("does not update state after unmount and unsubscribes auth events", () => {
    let mounted = true;
    const unsubscribe = vi.fn();
    const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe } } }));
    const handle = createSupabaseAuthHandler({
      isMounted: () => mounted,
      refresh: vi.fn(),
      markReady: vi.fn(),
      clearRecords: vi.fn(),
      setError: vi.fn(),
    });
    const stop = subscribeToSupabaseAuth({ auth: { onAuthStateChange } }, handle);

    mounted = false;
    void handle("SIGNED_IN");
    stop();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
