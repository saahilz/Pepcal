export const GOOGLE_SIGN_IN_ERROR =
  "Google sign-in could not be started. Check the provider configuration and try again.";
export const EMAIL_AUTH_ERROR = "Email sign-in could not be completed. Check your details and try again.";
export const EMAIL_CONFIRMATION_MESSAGE = "Check your email to confirm your Pepcal account.";
export const EMAIL_PASSWORD_MIN_LENGTH = 8;

export type EmailAuthMode = "sign-in" | "register";

export type EmailAuthInput = {
  email: string;
  password: string;
  confirmPassword?: string;
};

export type EmailAuthErrors = Partial<Record<"email" | "password" | "confirmPassword", string>>;

export function validateEmailAuth(input: EmailAuthInput, mode: EmailAuthMode): EmailAuthErrors {
  const errors: EmailAuthErrors = {};
  const email = input.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email address.";
  if (input.password.length < EMAIL_PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${EMAIL_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (mode === "register" && input.password.length >= EMAIL_PASSWORD_MIN_LENGTH && input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

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

export async function submitEmailAuth(
  mode: EmailAuthMode,
  input: EmailAuthInput,
  signInWithEmail: (email: string, password: string) => Promise<void>,
  signUpWithEmail: (email: string, password: string) => Promise<"signed-in" | "confirmation-required">,
  setBusy: (busy: boolean) => void,
  setError: (error: string | null) => void,
  setConfirmation: (message: string | null) => void
): Promise<boolean> {
  setBusy(true);
  setError(null);
  setConfirmation(null);
  try {
    if (mode === "sign-in") {
      await signInWithEmail(input.email.trim(), input.password);
    } else {
      const result = await signUpWithEmail(input.email.trim(), input.password);
      if (result === "confirmation-required") setConfirmation(EMAIL_CONFIRMATION_MESSAGE);
    }
    return true;
  } catch {
    setError(EMAIL_AUTH_ERROR);
    return false;
  } finally {
    setBusy(false);
  }
}
