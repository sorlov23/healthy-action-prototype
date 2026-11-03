# Fit74 startup recovery · 3 November 2026

## Observed incident

The Render static site was live on `9fc744a` and a guest could reach sign-in. The Supabase project `dllanxwrezqqufgzucuc` was `INACTIVE`; its Auth health endpoint returned HTTP 503. Restoring that existing project returned it to `ACTIVE_HEALTHY`. A read-only query confirmed the preferences, daily entries, and workout sessions were available. No account data, plan dates, or schema were edited.

The old client awaited Auth and data fetches without deadlines. A transient refresh failure also deleted the saved session. Startup removed its only loading panel before loading account data, and its final error handler tried to update that removed panel. These paths could leave the user without a useful recovery screen.

## Change

- Keep a visible loading panel until sign-in or the account screen is ready. An independent inline watchdog also offers a reload if the main script does not load.
- Bound each Auth/Data API request, including response-body parsing, to 12 seconds. Report connectivity/service failures and expose a retry link to the current entry.
- Preserve the saved session on network errors, timeouts and HTTP 5xx. Return to sign-in when the refresh token is explicitly rejected. Keep local daily drafts and all workout progress.
- Share concurrent token refreshes and retry late 401 responses with an already renewed access token.
- Support a recovery link even when the browser serves the older HTML loading panel. Register the existing cache-cleanup worker before requesting account data.
- Keep a failed sign-in/data attempt visible on the sign-in form; only reveal the account screen after its initial data has loaded.

## Verification

`tests/fit74-startup.mjs` exercises guest entry, a paused backend plus successful retry, history-load failure, transient refresh failure, invalid and valid refreshes, concurrent 401 responses, a hanging request, a blocked main script, and cached older HTML. It uses a mobile-sized browser and isolated fixtures for all account traffic. It checks that startup writes no history and preserves local drafts.

Existing plan-settings regressions cover custom dates, reload persistence, pending saves, retained approaches, and the unchanged shift anchor. The live Supabase project and Auth endpoint are checked after restoration; no real user login or exercise completion is performed for testing.

For manual QA, the existing isolated preview supports `/app/?date=2026-11-03&service=unavailable`. Its retry link opens the normal fixture with the service available. This switch exists only in the preview script, outside the production publish directory.
