# Rinlo 2.0 → Neon migration (staged)

This folder describes a **staged migration, NOT a production cutover**.
The existing Supabase Rinlo project and Vercel preview stay unchanged.

## New target

- Neon project: `floral-darkness-44591643` (Rinlo)
- Region: AWS Frankfurt (`aws-eu-central-1`)
- PostgreSQL 17; database `rinlo`
- Default branch: `main`
- Neon Managed Better Auth: provisioned
- Neon Data API: provisioned, authenticated via Neon Auth
- User data schema: `migrations/001_rinlo_decision_core.sql`, validated on a *temporary Neon migration branch*
- No Gemini API key has been copied. No app traffic has been switched.
- **No Supabase user data has been imported.**

## Why the existing Supabase database cannot be copied yet

Supabase project `xhlbiaueiqcmgifmihur` currently reports `INACTIVE` and SQL queries fail with
`Database is possibly not accessible at the moment`. Free-plan slots are occupied by Axis
and Fit74; neither may be paused automatically.

Until the old Rinlo database can be temporarily brought online or a verified export is
provided, there is **no legitimate source for user records or Auth credentials**. Do not
fabricate migrations from client-side sample data or imply the new database contains history.

## Database migration order

1. Inspect and test `001_rinlo_decision_core.sql` on the temporary migration branch
   (tables, FK to `neon_auth."user"`, constraints, privileges, RLS).
2. Get explicit approval before applying the prepared migration to Neon `main`.
3. Recover a read-only export of the stopped Supabase project's four Rinlo 2.0 tables
   and its ownership identifiers. Also audit other legacy tables before dropping anything.
4. Implement authenticated identity-linking: prove the current Supabase identity **and**
   the new Neon identity on the server. Map old UUID → new UUID in a private
   migration staging table. Never accept client-provided old UUID as proof of ownership.
5. Import profile, decisions, corrections (including `revoked_at`), feedback, preserving
   `created_at`, `updated_at`, `client_decision_id`, and deduplication constraints.
6. Verify row counts, referential integrity, per-owner access, sync conflict behavior,
   and full restore on a second device before allowing production cutover.

## Authentication and product behavior

The existing app relies on *Supabase anonymous sessions* for a zero-registration first run,
followed by optional email protection and password recovery. Neon Managed Better Auth is not
a drop-in implementation of the Supabase anonymous signup API.

Do not simply replace `supabaseUrl` with a Neon URL:
- Neon Auth requires a separate UI/client adapter and session/JWT integration.
- Guests must remain local-first without silently creating fake email accounts.
- A secure, rate-limited guest AI gateway (without end-user account creation), or another
  supported anonymous identity provider, must be designed and verified to preserve the
  current zero-prompt experience.
- Neon Data API is PostgREST-compatible but requires the *Neon Auth-signed JWT* and
  corresponding RLS policies; old Supabase JWTs are not interchangeable.
- Legacy password hashes and Supabase sessions must not be treated as Neon credentials.
- Protected users may require a password reset and verified owner-to-owner mapping.

## Gemini migration

The complete decision engine is now **ported in source only** at
`functions/analyzefood.ts` and security-tested with a mocked JWKS server.
`npm run typecheck`, `npm run build` and `npm test` pass in the
`rinlo neon backend ci` workflow. The Neon function has **not** been deployed:
the Gemini key is unavailable from the inactive Supabase project and public
rate limiting / quota policy is not yet implemented. Do not use a private
credential from local browser storage or expose any key in runtime-config.js.

The 997-line `supabase/functions/analyze-food/index.ts` handles multiple modes:
food/photo/audio decisions, ingredient vision, and Cook, with strict response validation.
It must be ported as a separate, authenticated service (Neon Function or Vercel Function).
Never expose the Gemini key or DB credentials in browser code. Validate signed JWTs
cryptographically, not by merely decoding JWT claims. For guest support use an explicitly
rate-limited, abuse-protected endpoint and appropriate quotas.

## Release gates

- Database schema tests pass on Neon preview migration branch.
- Neon Auth login + email protection + recovery have live integration tests.
- Guest zero-prompt works **without mandatory registration**, or product change is approved.
- Neon RLS prevents cross-user reads/writes; unauthenticated read rejected.
- Real Gemini integration works for all modes; no mock data in release checks.
- All current Rinlo mobile, cloud sync, and decision E2E suites pass on Neon preview.
- Supabase export/import reconciled and old data retained.
- Only then update runtime configuration and release; keep rollback path.

Source: the current Rinlo 2.0 Supabase schema, Auth implementation, Edge Function,
and sync modules in the `rinlo-2-foundation` branch.
