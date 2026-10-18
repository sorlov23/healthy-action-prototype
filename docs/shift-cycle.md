# Fit74: corrected 8-day work cycle

The work schedule and training schedule share one pure date model in `fit74/shift-cycle.js`.

| Cycle day | Work | Automatic plan |
|---|---|---|
| 1 | First daytime shift, 09:00–21:00 | Rest / gentle mobility 10–15 min |
| 2 | Second daytime shift, 09:00–21:00 | Rest; optional easy cycling 15–20 min |
| 3 | First full day off | A |
| 4 | Second full day off | Cardio + core + mobility |
| 5 | First night shift, 21:00–09:00 | B in cycle 1, Glutes in cycle 2; repeat |
| 6 | Second night shift, 21:00–09:00 | Sleep first, recovery only |
| 7 | Second night ends at 09:00 | Sleep, rest and gentle mobility |
| 8 | Second day off after nights | Rest / walk / very easy cycling |

Day 8 is followed by day 1. There are exactly two automatic strength sessions per full cycle: A on day 3 and B OR Glutes on day 5. Glutes are never added as a third strength session. The day-5 cue says to finish 3–5 hours before 21:00, around RPE 6, without failure, matching the user-provided correction.

## Backward-compatible date anchor

The existing `shift_anchor_date` preference and `fit74_shift_anchor` local key mean the **second day off after nights**. This meaning is preserved; no preference migration or production data write is needed. Canonical day 1 is `anchor + 1 day`.

With the original anchor 2026-10-19:

- 19 October: day 8, rest.
- 20 October: day 1, daytime work.
- 22 October: day 3, A.
- 23 October: day 4, cardio.
- 24 October: day 5, B before the first night.
- 25 October: day 6, second night and recovery after sleep.
- 26 October: day 7, second night ends in the morning, recovery.
- 27 October: day 8, light activity / rest.
- 28 October: next day 1.
- 1 November: next day 5, Glutes instead of B.
- 9 November: following day 5, B again.

Changing the anchor shifts work dates and training dates together. Date-only UTC arithmetic avoids DST and local-midnight drift. UI start-state checks use the same local calendar day as the daily tracker, rather than mixing local dates with `toISOString()`.

Vacation removes automatic obligations; extra days off do not add a strength session. Neither exception resets the cycle index or alternation. Existing workout sessions, set progress and daily entries are not migrated, reset or deleted. The standalone recovery program remains available manually, without becoming an obligatory workout on days 6–8.

## UI and verification

- Home and catalog show the actual day number, plan and recovery/timing note.
- The date strip is explicitly **the next 8 dates**, not a Monday-to-Sunday week. It shows both shift and planned load. Tapping a rest date previews its recovery plan; opening a scheduled workout uses that date.
- Marathon day and work-cycle day have separate labels.
- Existing v7 program/progress identities are retained. Cache revision 12 loads the new shared model before the schedule.
- `node tests/fit74-shift-cycle.mjs`: eight complete cycles, exact dates, alternating B/Glutes, negative offsets, a shifted saved anchor and a year boundary.
- `FIT74_CHROMIUM_PATH=... node tests/fit74-technique.mjs`: 57 steps across five programs; next-date display; rest-date preview; correct future session date; no automatic LIGHT workout on a rest day; vacation/day-off persistence; score and navigation; existing set migration and quick-exit save; phone widths 320/390.
- Cloud Browser: 19 October day-8 recovery, 24 October B, 1 November Glutes replacing B, 23 October cardio; narrow viewport has no horizontal overflow. Recovery guidance fits inside its card without clipping. No application console errors.

All verification account requests use isolated fixtures; the production database is not used for tests.

Cloud Browser review screenshot: `docs/qa/cycle-correction.jpg` (390 × 844; demo data only).
