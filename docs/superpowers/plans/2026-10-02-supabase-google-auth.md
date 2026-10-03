# Supabase Google Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Google OAuth sign-in to Pepcal while preserving local demo mode, user-scoped data access, and existing RLS protections.

**Architecture:** Keep the current client-side repository abstraction and add one auth operation, `signInWithGoogle()`, to both repository implementations. The data provider owns Supabase auth-event subscription and hydration; the shell renders a dedicated sign-in card whenever Supabase is configured but no user session exists. Google OAuth credentials and provider activation remain external Supabase/Google Cloud configuration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@supabase/supabase-js`, Vitest, ESLint, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-10-02-supabase-google-auth-design.md`

## Global Constraints

- Demo mode remains the default when either Supabase environment variable is absent.
- Supabase mode is selected only when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.
- Google OAuth credentials are configured in Google Cloud and Supabase dashboards, never committed to the repository.
- No automatic migration of local demo data into a cloud account.
- Existing repository queries remain user-scoped and continue to rely on Supabase RLS as the authorization boundary.
- No access tokens, cookies, provider responses, OAuth codes, or health records are logged.
- The app continues to make no HIPAA-compliance claim.
- Do not add email/password authentication, magic links, SSR auth middleware, or a service-role key.

## Review Focus

- OAuth initiation fails or is rejected by Supabase: the sign-in card must show a safe concise error and re-enable the button.
- OAuth callback/session event arrives after the initial repository load: the provider must refresh the session and records without stale state or duplicate unmounted updates.
- Supabase is configured but no user exists: protected application content must not render and no record queries should expose data.
- A user signs out: in-memory health records must clear and the shell must return to the sign-in card.
- One Supabase environment variable is missing: demo mode must remain fully local and must not import or contact Supabase Auth.

---

### Task 1: Add the repository Google-auth contract

**Files:**
- Modify: `src/lib/data/repository.ts:83-122`
- Modify: `src/lib/data/local/localRepository.ts` repository object
- Modify: `src/lib/data/supabase/supabaseRepository.ts:189-210`
- Test: `src/lib/data/auth.test.ts`

**Interfaces:**
- Consumes: existing `Repository`, `getSupabase()`, `hasSupabaseEnv()`.
- Produces: `Repository.signInWithGoogle(): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create a focused auth contract test that verifies the Supabase implementation calls the browser OAuth API with Google and the current origin, and the local implementation rejects use with a clear configuration error. Mock the Supabase client module so no network request occurs.

```ts
import { describe, expect, it, vi } from "vitest";

it("starts Google OAuth at the current origin", async () => {
  const signInWithOAuth = vi.fn().mockResolvedValue({ data: null, error: null });
  vi.mock("@/lib/data/supabase/client", () => ({
    getSupabase: () => ({ auth: { signInWithOAuth } }),
  }));
  // Import the repository after the module mock is registered.
  const { supabaseRepository } = await import("@/lib/data/supabase/supabaseRepository");
  await supabaseRepository.signInWithGoogle();
  expect(signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
});

it("does not provide a fake cloud login in demo mode", async () => {
  const { localDemoRepository } = await import("@/lib/data/local/localRepository");
  await expect(localDemoRepository.signInWithGoogle()).rejects.toThrow(
    "Google sign-in is only available when Supabase is configured."
  );
});
```

Because Vitest module mocks are hoisted and module caches are shared, place the final test in a separate file or use the project’s existing Vitest setup pattern so the Supabase and local repository cases do not leak mocks into one another.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/lib/data/auth.test.ts`

Expected: FAIL because `signInWithGoogle` is absent from `Repository` and both implementations.

- [ ] **Step 3: Add the repository interface method**

In `src/lib/data/repository.ts`, add the auth operation beside `signOut`:

```ts
/** Start Google OAuth; resolves after Supabase accepts the redirect request. */
signInWithGoogle(): Promise<void>;
```

- [ ] **Step 4: Implement demo-mode behavior**

In the local repository object, add:

```ts
async signInWithGoogle(): Promise<void> {
  throw new Error("Google sign-in is only available when Supabase is configured.");
},
```

Do not touch localStorage data or add any network call.

- [ ] **Step 5: Implement Supabase Google OAuth**

In the Supabase repository object, add:

```ts
async signInWithGoogle(): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) errorOrThrow(error);
},
```

Keep OAuth initiation browser-only and do not log the returned data or error object.

- [ ] **Step 6: Run the focused test to verify it passes**

Run: `npm test -- src/lib/data/auth.test.ts`

Expected: PASS for both the Supabase OAuth request and demo-mode rejection cases.

- [ ] **Step 7: Run type and lint checks**

Run: `npm run lint`

Expected: PASS with no warnings or errors.

- [ ] **Step 8: Commit the repository auth contract**

```bash
git add src/lib/data/repository.ts src/lib/data/local/localRepository.ts src/lib/data/supabase/supabaseRepository.ts src/lib/data/auth.test.ts
git commit -m "feat: add Google auth repository contract" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Make the data provider react to Supabase sessions

**Files:**
- Modify: `src/components/app-provider.tsx:35-115,178-184`
- Modify: `src/lib/data/supabase/client.ts:23-40`
- Test: `src/components/app-provider.auth.test.tsx` or an equivalent provider-focused test file supported by the existing Vitest setup

**Interfaces:**
- Consumes: `Repository.signInWithGoogle()`, `getSupabase()`, existing `refresh()` and cancellation guard.
- Produces: `DataContextValue.signInWithGoogle(): Promise<void>` and session-aware `status`, `user`, and record state.

- [ ] **Step 1: Write the failing provider behavior tests**

Cover the five review-focus conditions:

```tsx
it("returns to ready state with no user for an unauthenticated Supabase session", async () => {
  // Mock loadRepository to return a Supabase repository whose currentUser is null.
  // Render DataProvider with a probe consuming useData().
  // Assert status becomes ready and user remains null without record data.
});

it("refreshes user and records when an auth event supplies a session", async () => {
  // Capture the onAuthStateChange callback, make currentUser return a signed-in user,
  // invoke the callback with SIGNED_IN, and assert the probe receives that user.
});

it("clears in-memory records after sign-out", async () => {
  // Start with populated data, call signOut through the probe, and assert all arrays
  // are empty and user is null.
});

it("ignores a late auth event after provider unmount", async () => {
  // Capture the callback, unmount, invoke it, and assert no state update warning or
  // state mutation occurs; verify the unsubscribe function is called.
});
```

Use mocked repository methods and an in-memory callback; never use a real Supabase URL, token, or browser OAuth redirect.

- [ ] **Step 2: Run the focused provider tests to verify they fail**

Run: `npm test -- src/components/app-provider.auth.test.tsx`

Expected: FAIL because there is no provider auth action or Supabase auth-event subscription.

- [ ] **Step 3: Expose the provider auth action**

Add this to `DataContextValue`:

```ts
signInWithGoogle: () => Promise<void>;
```

Implement it with the repository reference:

```ts
const signInWithGoogle = useCallback(async () => {
  setError(null);
  await repoRef.current!.signInWithGoogle();
}, []);
```

The action should allow errors to propagate to the sign-in card.

- [ ] **Step 4: Subscribe to Supabase auth events**

After `loadRepository()` resolves, set `repoRef.current` and `repoKind`. When `repo.kind === "supabase"`, call `getSupabase().auth.onAuthStateChange((event) => { ... })`. On `SIGNED_IN`, `INITIAL_SESSION`, `TOKEN_REFRESHED`, and `USER_UPDATED`, call `refresh()` and set `status` to ready when the provider is still mounted. On `SIGNED_OUT`, clear user and record arrays and set `status` to ready. Store the returned subscription and unsubscribe it in the effect cleanup.

Do not pass session objects into React state, do not log auth events, and use the existing `cancelled` guard before every state update.

- [ ] **Step 5: Ensure initial hydration reaches the correct gate**

Keep the initial `await refresh()` before `setStatus("ready")`, but ensure a Supabase repository with no session completes normally with `user === null`. Do not call protected record mutations or synthesize a demo identity in this path.

- [ ] **Step 6: Run focused provider tests to verify they pass**

Run: `npm test -- src/components/app-provider.auth.test.tsx`

Expected: PASS for initial unauthenticated state, sign-in refresh, sign-out clearing, and cleanup.

- [ ] **Step 7: Run the full unit suite**

Run: `npm test`

Expected: all existing tests plus provider/auth tests pass.

- [ ] **Step 8: Commit provider session lifecycle**

```bash
git add src/components/app-provider.tsx src/lib/data/supabase/client.ts src/components/app-provider.auth.test.tsx
git commit -m "feat: react to Supabase auth sessions" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Build the Google sign-in gate

**Files:**
- Create: `src/components/auth/sign-in-card.tsx`
- Modify: `src/components/shell.tsx:66-88`
- Modify: `src/components/ui.tsx` only if a shared loading-button variant is required; prefer existing `Button`
- Test: `src/components/auth/sign-in-card.test.tsx`

**Interfaces:**
- Consumes: `useData().signInWithGoogle`, `useData().repoKind`, and `useData().user`.
- Produces: an accessible sign-in card with Google action, local loading state, safe error copy, and no protected children when unauthenticated.

- [ ] **Step 1: Write failing component tests**

Test the user-visible states:

```tsx
it("renders Google sign-in only for the Supabase gate", () => {
  // Render SignInCard with a mocked signInWithGoogle action.
  // Assert heading, explanation, and Continue with Google button are present.
});

it("disables the button during OAuth initiation and shows an error on failure", async () => {
  // Make signInWithGoogle return a pending promise, click the button, and assert
  // disabled/loading text. Reject it, then assert safe error text and enabled button.
});
```

Do not assert provider error internals, tokens, or redirect URLs in the component test.

- [ ] **Step 2: Run the focused component test to verify it fails**

Run: `npm test -- src/components/auth/sign-in-card.test.tsx`

Expected: FAIL because the sign-in card component does not exist.

- [ ] **Step 3: Implement the sign-in card**

Create a client component with local `busy` and `error` state. On click:

```ts
setBusy(true);
setError(null);
try {
  await signInWithGoogle();
} catch {
  setError("Google sign-in could not be started. Check the provider configuration and try again.");
} finally {
  setBusy(false);
}
```

Render a centered `Card`, a short account/privacy explanation, a `Button` with `disabled={busy}`, and an inline error region with `role="alert"`. Keep the copy clear that this is the connected Supabase account and does not expose implementation details.

- [ ] **Step 4: Replace the shell placeholder**

In `Shell`, import `SignInCard` and replace the current placeholder branch with:

```tsx
if (repoKind === "supabase" && !user) {
  return <SignInCard />;
}
```

Keep the branch before the application header/navigation so protected UI never renders for an unauthenticated Supabase session. The demo path must continue through the existing shell unchanged.

- [ ] **Step 5: Run component tests to verify they pass**

Run: `npm test -- src/components/auth/sign-in-card.test.tsx`

Expected: PASS for rendering, disabled state, rejection state, and accessibility role.

- [ ] **Step 6: Run lint and build checks**

Run: `npm run lint && npm run build`

Expected: PASS. The build must not require Supabase environment variables because demo mode remains supported.

- [ ] **Step 7: Commit the sign-in gate**

```bash
git add src/components/auth/sign-in-card.tsx src/components/auth/sign-in-card.test.tsx src/components/shell.tsx
 git commit -m "feat: add Google sign-in gate" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Update Settings and configuration documentation

**Files:**
- Modify: `src/app/settings/page.tsx:67-90`
- Modify: `.env.example:1-11`
- Modify: `README.md:90-105,133-134`
- Test: extend `src/components/auth/sign-in-card.test.tsx` or add `src/app/settings/settings.auth.test.tsx` if the test harness supports page rendering

**Interfaces:**
- Consumes: authenticated `UserRef` and `signOut()` from `useData()`.
- Produces: account copy that identifies Google/Supabase-backed sessions and setup instructions that do not reveal secrets.

- [ ] **Step 1: Add the settings assertion**

Add a test or a manual component assertion that authenticated settings displays the account label and a sign-out action, while demo settings continues to show local-only wording and reset-demo controls.

- [ ] **Step 2: Update account copy**

Keep the existing Supabase account block but make the provider behavior explicit without assuming every account has a name:

```tsx
<p className="truncate text-sm font-medium">{user?.name ?? "Connected account"}</p>
<p className="text-xs text-muted">
  Connected with Supabase Auth. Data is scoped to this account with row-level security.
</p>
```

Preserve the existing sign-out handler and demo-mode branch.

- [ ] **Step 3: Document environment and provider setup**

In `.env.example`, state that both public variables are required to enable Supabase Auth and that service-role keys must never be placed in `NEXT_PUBLIC_*`.

In `README.md`, add explicit steps:

1. Enable Google under Supabase Authentication → Providers.
2. Create a Google OAuth Web client in Google Cloud.
3. Put the Google client ID and secret only in Supabase’s provider settings.
4. Set Supabase Site URL and redirect allow-list entries for `http://localhost:3000`, `http://127.0.0.1:3000`, and the production HTTPS origin.
5. Keep only the project URL and anon key in `.env.local`.
6. Restart the dev server after changing environment variables.

State that this repository does not contain credentials and that Google/Supabase dashboard configuration is required for a real login.

- [ ] **Step 4: Run documentation/config checks**

Run: `npm run lint && npm test && npm run build`

Expected: PASS, with no environment secrets required.

- [ ] **Step 5: Commit documentation and Settings updates**

```bash
git add src/app/settings/page.tsx .env.example README.md
git commit -m "docs: document Google SSO setup" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: End-to-end verification and security review

**Files:**
- Modify: none unless verification exposes a defect.
- Test artifacts: no committed credentials, sessions, screenshots, or `.env.local`.

**Interfaces:**
- Consumes: all prior tasks and the existing Supabase migration/RLS schema.
- Produces: verified demo mode, verified unauthenticated Supabase gate, and a documented external setup checklist.

- [ ] **Step 1: Verify no credentials are present**

Run:

```powershell
if (Test-Path .env.local) { Select-String -Path .env.local -Pattern "SUPABASE|GOOGLE" }
git status --short -- .env.local
```

Expected: no credential values are printed or staged. Do not paste any output containing secrets into logs or chat.

- [ ] **Step 2: Verify demo mode**

Temporarily run without Supabase variables and start the app. Navigate to `/`, `/settings`, and `/vials/new`. Confirm:

- Demo banner and fictional records appear.
- No Google sign-in card appears.
- Local data actions still work.
- The app does not make Supabase Auth requests.

- [ ] **Step 3: Verify unauthenticated Supabase mode safely**

Run with placeholder public URL/key values only if the client can safely initialize without a real project, or use mocked tests instead. Confirm:

- The sign-in gate renders.
- Protected navigation and records do not render.
- Clicking Google invokes the OAuth method and handles rejection safely.
- No service-role key, Google secret, token, or health data appears in browser console output.

Do not attempt a real Google login unless the user separately supplies configured provider access and explicitly requests that live test.

- [ ] **Step 4: Verify existing data boundaries**

Review `supabase/migrations/0001_init.sql` and confirm the implementation did not weaken `authenticated` policies or remove `user_id = auth.uid()` checks. Confirm repository methods continue to require the current user for writes and filter reads by user ID.

- [ ] **Step 5: Run the complete automated suite**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint passes, and the production build completes. The multiple-lockfile warning may remain and should be reported as a warning only.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git diff --check HEAD~5..HEAD
git status --short
```

Confirm only intended auth code, tests, documentation, and plan/spec commits are present; do not clean up unrelated pre-existing staged files.

- [ ] **Step 7: Commit any verification-only fix separately**

If verification requires a code correction, add a focused test first, then commit it separately:

```bash
git add <focused-files>
git commit -m "fix: address Google auth verification finding" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```
