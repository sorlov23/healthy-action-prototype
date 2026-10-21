# Editable plan period

The profile now has a **Период плана** card with start/end date inputs, a custom calendar, an inclusive day count, validation, and a dedicated save button. The existing general settings save also respects the chosen dates. The Fit74 brand remains unchanged; plan duration is no longer fixed at 74 days.

## Data and compatibility

- Reuse `fit74_preferences.start_date` and `end_date` and the existing `end_date >= start_date` database check. No schema migration or production account data edits are needed.
- Read preferences before loading date-bounded daily entries or workout sessions. `fit74/plan-period.js` is the shared date-only model and readiness/event boundary.
- After a successful preference response, refresh the visible range, inclusive day count, remaining days, calendar, milestones, reminders, sessions, and exception input bounds. Failed saves leave the previous active period and the form draft intact.
- Never delete or re-date existing daily entries, sessions, approaches, or shift overrides. Rows outside the active period are excluded from its statistics; expanding the period makes them visible again.
- Preserve in-flight daily saves under their original calendar date. Keep dirty local drafts until their own confirmed save; changing dates never clears local storage.
- **The plan start is not the shift anchor.** The 8-day work cycle retains `shift_anchor_date` (the existing day-8 anchor), its A/cardio/B-or-glutes mapping, and its B/glutes alternation. Date preference writes do not include shift-anchor fields.
- Keep workout progress version `7.0` and content revision `cards-2026-10`; a period change is not a program migration.
- Paginate range reads in 1,000-row pages. Render long history calendars in 84-day pages and bound the decorative progress ruler to 74 ticks, avoiding unbounded DOM growth. A one-day plan is valid. Future daily check-ins are read-only; the training catalog remains available.

## Verification

```sh
node tests/fit74-plan-period.mjs
node tests/fit74-shift-cycle.mjs
node tests/fit74-plan-settings.mjs
node tests/fit74-technique.mjs
```

The browser tests use isolated fixture accounts and intercept all Supabase traffic. Set `FIT74_CHROMIUM_PATH` if a local Chromium executable is required.

Verified custom stored dates on startup, inclusive counts, leap years, year boundaries, a single day, invalid/reversed dates, custom-calendar selection and Escape, reload persistence, exception bounds, unchanged shift anchors and approaches, restored history after expansion, a pending daily save while changing dates, failed-save recovery, general settings compatibility, and phone width 320px. Existing five-program / 57-step technique regressions pass with no missing assets or application errors.

Cloud Browser independently confirmed a saved 105-day demo period after reload and an unchanged 20 October first daytime shift. `scripts/preview-fit74.mjs` persists only its isolated preview fixture, never production account data.
