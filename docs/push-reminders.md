# Fit74 push reminders

The original reminder used a page timer and a self-unregistering recovery worker. It had no PushManager subscription, background sender or server schedule. A granted Notification permission alone could not deliver a reminder with Fit74 closed.

## Operation

- Open the installed Home Screen app on iPhone, then Profile → Smart reminder → Connect notifications. This explicit tap creates the browser subscription and requests the system permission. Startup and preference saving do not request permission.
- Keep the reminder enabled and save its time. The existing preference time is retained; it is interpreted in Europe/Moscow (UTC+3), and the screen labels that explicitly. Use Check notification to send an immediate test to this device; tests are throttled to once per minute and do not consume the daily reminder.
- The persistent `sw.js` handles visible pushes and clicks. It removes obsolete Fit74 caches but does not intercept network requests, cache pages, unregister itself, or delete local storage. A notification opens today's check-in; authentication can finish first.
- `fit74-push` validates user tokens with Supabase Auth for subscription/status/unsubscribe/test operations. It ignores any client-supplied user ID. Push endpoint hosts are restricted to established Apple/Google/Mozilla/Microsoft push services; internal hosts and non-HTTPS endpoints are rejected.
- A database cron invokes the dispatcher every minute with a private random credential. The dispatcher claims only enabled devices whose owner enabled reminders, whose plan includes the Moscow date, and whose remote entry has neither 5 points nor a completed gentle day. Claims use row locks and a 90-second lease; failed attempts retry at most three times in a 30-minute delivery window. Successful reminders are recorded per device and date. Expired subscriptions (404/410) are disabled.
- The encrypted payload contains a generic check-in reminder; it does not include weight, notes, habits, scores or other personal fitness data. Delivery uses high urgency with a 30-minute TTL. OS Focus, connectivity and notification settings can still affect presentation.
- Signing keys are initialized once on the server. Signing material and the cron credential are in an RLS-protected runtime table with no client-role grants. Subscription records are also server-only; the authenticated Edge Function scopes every device operation to the verified user. Only `service_role` can execute the claim RPC. Runtime secrets, access tokens and device endpoints are never logged or returned by the public config route. No secrets appear in static files.
- Logout unsubscribes the local browser and disables its server registration. A reminder switch controls the account-wide daily schedule; the device's permission and subscription are separate, and the screen reports their actual state.

## Validation

`node tests/fit74-push.mjs` checks authentication, ownership, dispatch authorization, endpoint restrictions, test throttling, failed/expired delivery, visible fallback notifications, click routing and the explicit client subscription gesture. Run `tests/fit74-push-db.sql` through the database tool for actual SQL selection/lease/deduplication tests; its fixture changes roll back, including preference and entry edits. The test never sends a push.

The hosted Edge Function compiled and initialized its VAPID keys successfully. The real cron returned HTTP 200 and recorded heartbeats. Security checks confirm that anon/authenticated roles cannot read either push table or execute the claim function. A final phone permission and test are required: a cloud development session cannot grant permission on the user's iPhone. No production test user or device was created.

The advisor's two “RLS enabled, no policy” information notices are intentional for these server-only tables. The bundled non-relocatable `pg_net` extension records its extension namespace as public; its functions live in `net`, and inspection found no pg_net functions in public. Client-role access to its transient request/response tables is revoked. The existing leaked-password-protection warning is unrelated to reminder delivery and was not changed.

Sources: [Apple Web Push guide](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [WebKit Home Screen Web Push](https://webkit.org/blog/13878/), [declarative fallback](https://webkit.org/blog/16535/), [Supabase scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions).
