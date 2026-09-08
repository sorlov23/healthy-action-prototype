# Rinlo Core v1

## Product thesis

Rinlo is not primarily a tracker. It is a personal health companion that uses the user's current state, recent context and goals to suggest one realistic next action, then learns from the user's response.

Core loop:

1. Context — how the user feels today, recent sleep/recovery, movement, nutrition, weight trend and personal focuses.
2. Decision — one main action that makes sense now.
3. Feedback — completed, replace, not suitable, and optional reason.
4. Learning — Rinlo remembers which actions fit the user and which do not.
5. Insights — patterns are shown only when there is enough evidence.

## Product principles

- Action first. Metrics second.
- One useful action beats ten metrics.
- No score such as 72/100 and no judgment of a day as good/bad.
- No streak pressure, punishment or compensation language.
- Calories remain important when the user chooses weight loss or nutrition tracking, but they are context for decisions rather than a grade.
- Rinlo should be useful even when the user does not log everything.
- Recommendations must be explainable in plain language.

## Goals

Onboarding starts with the user's goal rather than anthropometrics.

Supported primary goals for Core v1:

- `weight_loss` — reduce weight sustainably;
- `nutrition` — improve eating habits;
- `movement` — move more;
- `sleep` — improve sleep and recovery;
- `energy` — feel more energetic;
- `nicotine` — reduce/stop nicotine use.

A user may have a primary goal and optional secondary goals.

### Calories

For `weight_loss`, calorie tracking is a first-class feature:

- daily calorie target;
- consumed / remaining;
- protein target;
- optional fats/carbs later;
- average intake and weight trend;
- no punitive messaging after exceeding the target.

For other goals calorie data may remain available, but it should not dominate Today unless the user explicitly enables it.

## Daily check-in

The check-in must be lightweight and skippable.

Required Core v1 signal:

- wellbeing: `poor | okay | good | great`.

Optional signals:

- energy 1–5;
- sleep quality 1–5;
- sleep duration in minutes;
- short note.

Rinlo may ask one contextual follow-up when it changes the recommendation. It should not turn into a daily questionnaire.

## Action model

A Rinlo Action is a persisted product entity, not text calculated only during render.

Suggested kinds:

- `movement`
- `nutrition`
- `recovery`
- `hydration`
- `sleep`
- `nicotine`
- `general`

Action lifecycle:

- `suggested`
- `accepted`
- `completed`
- `replaced`
- `dismissed`

Each action stores:

- title;
- rationale / why this now;
- optional effort in minutes;
- source (`rules`, later `ai`, or `manual`);
- structured context used to make the decision;
- timestamps.

User-facing controls:

- `Сделано`
- `Другой вариант`
- `Не подходит`

Optional reason codes when replacing/dismissing:

- `no_time`
- `low_energy`
- `inconvenient_now`
- `dont_want`
- `already_did_similar`
- `other`

The reason is feedback for future ranking, not a failure state.

## Recommendation engine v1

The first engine should be deterministic and testable. LLM output is not required for the decision itself.

Inputs:

- primary/secondary goals;
- today's check-in;
- current day state;
- recent 7-day context;
- current weight trend if available;
- calorie/protein state when relevant;
- previous action feedback.

High-level priority:

1. Recovery/safety of effort when wellbeing, sleep or energy are low.
2. A goal-relevant small action that is still useful today.
3. Avoid repeating action types the user repeatedly replaces/dismisses.
4. Prefer actions previously completed with low friction.
5. Never suggest compensation for food or a missed day.

The engine must return one primary action and may return alternatives.

## Evening feedback

`Подвести итог дня` should become a short learning loop instead of a metric recap.

Core questions:

- How did today's plan feel? `easy | right | too_much`
- Was the main action useful? `yes | no | skipped`

Metrics can be shown as context, but the purpose is adaptation.

## Today screen

Order of importance:

1. Greeting / day context.
2. Optional daily check-in.
3. Main `Rinlo Suggestion` card.
4. `Сделано` + `Другой вариант`.
5. Compact context metrics.
6. Quick logging.

For weight-loss users the compact metrics should prominently include calories and protein, e.g. `1420 / 1850 kcal` and `92 / 130 g protein`, while the action remains the visual center.

## Plan

Plan is not a long checklist.

Core v1:

- one primary action;
- one optional supporting action;
- up to two personal focuses.

## Insights

Insights should prioritize patterns over raw dashboards.

Examples:

- movement is easier on days with better sleep;
- the user tends to accept walks in the evening rather than morning;
- weight trend is stable while calorie intake is within the selected range.

Do not present causal claims from sparse data.

## Food

Keep food as a strong module, not the identity of the whole product.

Core direction:

- text / photo / voice entry modes;
- recognized foods shown explicitly;
- portions editable before save;
- quantity parser before Vision dependence (`2 яйца`, `200 г курицы`, `стакан молока`);
- Vision later populates the same review contract.

## Health data integrations

Planned after Core v1 data model is stable:

- iOS HealthKit;
- Android Health Connect.

Priority signals: steps, workouts/activity, sleep and weight when the user grants permission.

## Sync requirements (P0)

Before relying on server state:

- bootstrap must hydrate/reconcile local and server state;
- persistent outbox/retry queue;
- idempotency IDs must be enforced by write endpoints;
- edit/delete must sync both directions;
- local day handling must not mix UTC date keys with local calendar dates.

## Visual direction

Keep the existing Calm Tech identity and Rinlo brand system, while moving toward a softer consumer-mobile feel:

- more whitespace;
- larger typography;
- softer white / pale-green surfaces;
- restrained shadows;
- line icons;
- recommendation as the visual center;
- no health score;
- calories visible for relevant goals without turning the whole product into a calorie scoreboard;
- `Ask Rinlo` is a supporting conversational layer, not the only way to use the app.

## Implementation order

### P0 — data integrity

1. local/server reconciliation;
2. persistent outbox + idempotency;
3. edit/delete sync;
4. local-date unification.

### P1 — Rinlo Core loop

1. goals in profile;
2. daily check-in;
3. persisted Action entity + action events;
4. deterministic recommendation engine v1;
5. completion/replacement/not-suitable feedback;
6. evening feedback;
7. Today/Plan redesign around the primary action.

### P2

1. HealthKit / Health Connect;
2. quantity parser for food;
3. Vision;
4. account recovery / Sign in with Apple;
5. cross-signal insights;
6. conversational `Ask Rinlo` layer.
