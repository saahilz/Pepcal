# Supabase Google Authentication Design

## Goal

Add Supabase authentication with Google single sign-on to Pepcal without changing the existing local demo mode, health-data repository methods, or row-level-security model.

## Scope and constraints

- Demo mode remains the default when either Supabase environment variable is absent.
- Supabase mode is selected only when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.
- Google OAuth credentials are configured in Google Cloud and Supabase dashboards, never committed to the repository.
- No automatic migration of local demo data into a cloud account.
- Existing repository queries remain user-scoped and continue to rely on Supabase RLS as the authorization boundary.
- The app continues to make no HIPAA-compliance claim.

## User experience

### Unauthenticated Supabase mode

The shell displays a centered sign-in card instead of application data. The card explains that the connected backend requires an account and offers a `Continue with Google` action. While the OAuth redirect is being initiated, the action is disabled and communicates progress. Authentication errors are shown in the card without exposing tokens or provider secrets.

### Google callback

The browser OAuth flow redirects to Google and returns to the current app origin. Supabase's configured client detects the callback session in the URL. The app then observes the signed-in user, loads their settings and records, and renders the normal shell. The callback URL is derived from `window.location.origin`; no hardcoded production hostname is required.

### Authenticated account

Settings displays the authenticated account's display name or email and retains the existing sign-out action. Signing out clears the in-memory record state and returns to the sign-in card. The existing delete-all-data flow remains unchanged, including its sign-out behavior for Supabase accounts.

### Demo mode

When Supabase is not configured, the current local repository, fictional seed data, demo banner, reset-demo action, and local sign-out no-op remain unchanged. The Google sign-in action is not shown in demo mode.

## Architecture

### Repository auth operations

Extend the `Repository` interface with a `signInWithGoogle()` method. The Supabase implementation calls the browser client's `auth.signInWithOAuth` with provider `google` and a redirect target of `window.location.origin`. The local implementation throws a clear configuration error if called; the UI does not call it in demo mode. This keeps auth operations structurally interchangeable without implying that demo mode can create a cloud session.

Keep `currentUser()` as the source of the domain-level `UserRef`. The Supabase mapper continues to prefer the provider display name, then email, then a generic account label.

### Reactive session lifecycle

The data provider remains responsible for repository selection and data hydration. In Supabase mode it subscribes to `auth.onAuthStateChange` after the repository is loaded. Auth events update the current user and refresh user-scoped records. The subscription is removed on unmount. Initial loading is not marked ready until the repository and current session have been evaluated, so unauthenticated Supabase mode reaches the sign-in card rather than briefly rendering protected pages.

The callback must avoid starting a second overlapping refresh from a stale event. The implementation should use the existing repository reference and cancellation guard, and must not log session contents.

### Shell gate

The existing `repoKind === "supabase" && !user` gate becomes a sign-in component. It remains outside the authenticated navigation and record content, so no protected record page is rendered for an unauthenticated session. The sign-in card calls the provider's auth action and renders the returned error locally.

## Configuration and documentation

Update `.env.example` to keep the two public Supabase variables and clarify that they select authenticated mode. Update the README with:

1. Supabase project setup and migration execution.
2. Google provider setup in Supabase Authentication settings.
3. Google Cloud OAuth client configuration and authorized redirect URI format.
4. Supabase Site URL and redirect allow-list entries for localhost/loopback development and production HTTPS.
5. The fact that only the Supabase anon key belongs in `NEXT_PUBLIC_*`; service-role keys and Google client secrets must never be exposed to the browser or committed.

No real credentials are added to `.env.local`, and no dashboard API calls are part of this implementation.

## Error handling and security

- OAuth initiation failures appear as a concise sign-in error.
- Auth event and data hydration failures continue through the existing provider error state.
- Access to health data remains impossible through the UI before a Supabase user exists.
- All database operations continue to filter by the authenticated user ID and remain protected by RLS.
- No access tokens, cookies, provider responses, OAuth codes, or health records are logged.
- Sign-out clears in-memory arrays before navigation; persisted Supabase session state is removed by Supabase Auth.

## Testing and verification

- Add focused tests for the auth action contract and demo-mode preservation where the existing test setup can mock the Supabase client.
- Run the full Vitest suite, ESLint, and production build.
- Run the app with no Supabase variables and confirm demo mode still opens with fictional records.
- Run with placeholder Supabase configuration only as far as safe, confirming the unauthenticated gate renders without attempting to access protected records.
- Smoke-test the sign-in button's disabled/loading and error states with a mocked OAuth call; do not perform a real Google login or store real credentials in the repository.
- Verify settings sign-out behavior and that the existing RLS migration remains unchanged.

## Out of scope

- Email/password authentication.
- Magic links.
- Account deletion at the Supabase Auth identity level beyond the existing record deletion flow.
- Local-to-cloud data migration.
- Server-side session middleware or SSR auth helpers; the current app is client-rendered and uses the browser Supabase client.
- Google provider or Google Cloud project creation.
