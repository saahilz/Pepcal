export const GOOGLE_SIGN_IN_ERROR =
  "Google sign-in could not be started. Check the provider configuration and try again.";

export async function startGoogleSignIn(
  signInWithGoogle: () => Promise<void>,
  setBusy: (busy: boolean) => void,
  setError: (error: string | null) => void
): Promise<void> {
  setBusy(true);
  setError(null);
  try {
    await signInWithGoogle();
  } catch {
    setError(GOOGLE_SIGN_IN_ERROR);
  } finally {
    setBusy(false);
  }
}
