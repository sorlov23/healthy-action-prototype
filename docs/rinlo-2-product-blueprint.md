# Rinlo 2.0 — Product Blueprint

Status: product reset / concept specification
Direction: **Decision-first**

## 1. Product thesis

Rinlo helps a person make a better food decision **before** the choice is already made.

The core user question is not “What did I eat?” but:

> **What should I choose right now so I can still move toward my weight goal without turning food into accounting?**

Rinlo should reduce decision friction, not add tracking work.

## 2. Core promise

**Better food decisions without living in a calorie tracker.**

Rinlo gives a concise answer in context:
- whether a choice fits the day and the user’s goal;
- what can be adjusted if it does not;
- what alternative is meaningfully better;
- what happens if the user keeps the original choice anyway.

The product must be useful even if the user never logs every meal.

## 3. Product character

Rinlo is:
- sharp;
- practical;
- non-judgmental;
- fast;
- calm;
- evidence-aware;
- visually premium.

Rinlo is **not**:
- a habit coach;
- a motivational wellness companion;
- a gamified calorie diary;
- a “good/bad food” moralizer;
- an endless AI chat;
- a dashboard that requires maintenance.

## 4. Primary user

Initial MVP user:
- wants to lose weight;
- understands the broad idea of eating better but struggles at concrete moments of choice;
- dislikes detailed calorie logging or cannot sustain it;
- wants useful guidance for normal life: cafes, delivery, fast food, home meals, alcohol, snacks;
- wants freedom to choose, not a rigid meal plan.

The MVP is not designed for clinical nutrition management, eating-disorder treatment, insulin dosing, pregnancy nutrition, or disease-specific diet management.

## 5. Jobs to be done

### Primary job
“When I am about to choose food and I am unsure what makes sense, help me decide quickly in the context of my goal.”

### Secondary jobs
- “Show me an easier alternative without making me start over.”
- “Remember the choices I have already made so I do not have to reconstruct my day.”
- “Show me whether my overall direction is working.”
- “Help me learn which substitutions work for me personally.”

## 6. North-star experience

A successful Rinlo session can be under 20 seconds:

1. Open Rinlo.
2. Photograph food/menu or type/say a question.
3. Rinlo understands the intended choice.
4. Rinlo gives one direct verdict.
5. User accepts the choice, adjusts it, or opens alternatives.
6. Rinlo remembers the decision automatically.
7. User leaves the app.

The application should not demand a second workflow after the decision.

## 7. Core decision model

Every analysis should produce a structured decision, not free-form advice only.

### Decision states
- **Fits well** — the choice is reasonable in current context.
- **Fits with adjustment** — keep the idea, change portion/composition/drink/side.
- **Better alternative available** — another option clearly fits the goal better.
- **Not enough information** — Rinlo should ask one useful follow-up, not hallucinate precision.

Avoid moral labels such as “bad”, “cheat”, “forbidden”, “clean”.

### Decision answer anatomy

1. **Verdict** — one sentence.
2. **Why** — maximum 2–3 concise reasons.
3. **Best action** — what to do now.
4. **Alternative** — only when useful.
5. **Optional details** — calories/macros/context behind disclosure, never the first thing the user sees.

Example:

> **Можно брать.**
> Лучше без большой картошки: сам бургер нормально впишется, а комбо уже сильно увеличит калорийность.
>
> **Сделать так** · **Показать варианты**

## 8. Inputs

MVP supports three ways to ask:

### Photo
User photographs:
- a prepared meal;
- menu page;
- packaged food;
- delivery order/screenshot where feasible later.

### Text
Examples:
- “Можно сегодня роллы?”
- “Что лучше: шаурма или бургер?”
- “Хочу пиццу и пиво, как лучше сделать?”

### Voice
Same semantic flow as text. Voice is an input convenience, not a separate conversational mode.

## 9. Information architecture

Only four persistent product areas.

### 1. Главная
Purpose: make a decision now.

Contains:
- lightweight progress/status summary;
- dominant prompt **“Что собираешься съесть?”**;
- photo / text / voice entry;
- recent decisions.

No daily checklist, mood check-in, water widget, habits or “step of the day”.

### 2. История
Purpose: remember previous decisions.

Contains:
- chronological decision history;
- food image/name;
- verdict;
- chosen outcome;
- search/filter;
- ability to reopen a decision.

History is not a calorie diary disguised as a new screen.

### 3. Прогресс
Purpose: answer “Is this working?”

Primary signal:
- weight trend over time.

Supporting signals:
- number/share of decisions that supported the user’s goal;
- repeated useful substitutions;
- weight pace/trend;
- later: relationships between choices and trend, only when data is sufficient.

Do not show meaningless engagement metrics.

### 4. Профиль
Purpose: define context for recommendations.

Contains:
- current weight;
- target weight;
- basic goal preferences;
- food preferences/restrictions;
- notification and privacy settings;
- account settings.

## 10. Key screens and states

### A. First launch
Goal: explain the value in seconds.

Message:
> **Лучшие решения о еде — без перегруза.**

Simple flow explanation:
**Сфотографируй → получи ответ → сделай выбор**.

Onboarding should ask only what materially affects decisions:
- main goal;
- current weight;
- target weight;
- optional height/sex/age if needed for estimation;
- relevant food restrictions/preferences.

No mood questionnaire, habits questionnaire, daily-time preference or long “personalization” ceremony.

### B. Home
Dominant action: ask about food.

The home screen must be understandable before scrolling.

Hierarchy:
1. brand/header;
2. compact goal/trend context;
3. **Что собираешься съесть?**;
4. photo/text/voice;
5. recent decisions.

### C. Capture / Ask
States:
- camera ready;
- photo selected;
- processing;
- text question;
- voice transcription;
- recognition uncertainty.

Processing must feel purposeful, not magical. Example:
“Разбираю блюдо и учитываю твой текущий контекст…”

### D. Decision result
This is the product’s most important screen.

It should answer immediately:
- what Rinlo recommends;
- why;
- what to do.

Primary CTA reflects the recommendation:
- **Выбрать этот вариант**;
- **Уменьшить порцию**;
- **Выбрать альтернативу**.

Secondary action always preserves agency:
- **Оставить как есть**;
- **Показать другие варианты**;
- **Уточнить**.

### E. Alternatives
Show at most 3 strong alternatives initially.

Each alternative must explain the trade-off, not just rank food:
- lighter;
- more protein;
- more filling;
- lower added sugar;
- easier to fit today.

Never imply that the original food is forbidden.

### F. Saved decision
After selection, saving should be near-instant and quiet.

Example:
> **Запомнил.**
> Бургер без большого комбо.

Do not force the user into another screen.

### G. History
Empty state:
> **Здесь появятся решения, которые ты принимаешь с Rinlo.**

No pressure to build a streak.

### H. Progress
Before enough data exists:
> **Пока рано искать тенденцию.**
> Нескольких решений и записей веса будет достаточно, чтобы появилась полезная картина.

The app must distinguish “no signal yet” from “bad progress”.

### I. Recognition uncertainty
If Rinlo is unsure what is in a photo:
> **Похоже на пасту с курицей, но я не уверен в соусе.**
> Какой здесь соус?

Ask one high-value clarification rather than displaying fake precision.

### J. No-network / analysis failure
The user should keep the photo/question and retry later.

No lost input.

## 11. Personalization model for MVP

Personalization should use only information that can change the recommendation:
- weight goal;
- current progress/trend;
- recent decisions when available;
- food restrictions/preferences;
- approximate context of the day if known from saved decisions;
- user corrections to recognition/results.

Do not claim precise personalization when data is insufficient.

## 12. Tone of voice

### Principles
- direct;
- human;
- concise;
- neutral about food;
- no guilt;
- no congratulatory spam;
- no AI self-promotion.

### Good
“Можно брать. Лучше взять одну порцию роллов без дополнительного соуса.”

“Сегодня уже было плотнее обычного. Если хочется пиццу, два куска + салат впишутся легче.”

“По фото не понимаю размер порции. Маленькая или большая?”

### Avoid
“Отличный выбор! Ты молодец!”

“Rinlo AI проанализировал твой рацион.”

“Этот продукт плохой для похудения.”

## 13. Visual direction

Locked direction: **Decision-first**.

Brand character:
- premium consumer utility;
- sharp, modern, confident;
- not wellness-cute;
- not medical;
- not futuristic for its own sake.

Core palette direction:
- Graphite / near black;
- Soft White;
- Cool Gray;
- Electric Lime as signal/action accent.

Electric Lime means:
- primary action;
- selected decision;
- clear positive signal.

It should not flood every surface.

The geometric two-part mark represents:
- two options;
- a decision point;
- a change of trajectory.

Logo and app icon require a proper vector refinement before production use; generated visual concepts are references, not final assets.

## 14. MVP scope

### Must have
- focused onboarding;
- profile with weight goal/context;
- text food question;
- photo food question;
- structured decision result;
- alternatives;
- save selected decision;
- decision history;
- manual weight entry;
- simple weight progress;
- account/data persistence;
- offline-safe queued save/retry where existing infrastructure permits;
- analytics events for the core funnel.

### Nice to have after core works
- voice input;
- menu OCR / screenshot understanding;
- richer restaurant/delivery context;
- automatic Apple Health weight/activity context;
- preference learning from repeated choices;
- personalized substitution patterns;
- proactive suggestions.

### Explicitly out of MVP
- mood check-in;
- daily “main action”;
- habit tracker;
- water tracker as a first-class feature;
- generic step goals;
- evening review;
- daily plan screen;
- gamified streaks;
- community/social features;
- complex macro dashboard;
- medical recommendations.

## 15. Core funnel

Measure:
1. user opens decision entry;
2. submits photo/text/voice;
3. receives usable result;
4. selects original/adjusted/alternative option;
5. decision saved;
6. returns for another decision.

Primary early product metric:
**% of decision sessions that end in an explicit useful choice.**

Useful secondary metrics:
- time to decision;
- clarification rate;
- result correction rate;
- alternative-open rate;
- return rate for another decision;
- weight entries over time.

Do not optimize for session length.

## 16. Product safety and trust

Rinlo should communicate estimates as estimates.

Requirements:
- no invented calorie precision from ambiguous photos;
- clearly separate recognized facts from estimates;
- offer correction when recognition is wrong;
- avoid medical claims;
- provide appropriate escalation when a user asks a clinical/high-risk nutrition question;
- never present one food choice as moral success/failure.

Trust is part of the product, not legal copy hidden in Settings.

## 17. Technical reuse from the current prototype

Potentially reusable foundations:
- Supabase/auth work;
- persistence and sync/outbox patterns;
- server restore concepts;
- food catalog/parsing work;
- Smart Food recognition pipeline pieces;
- weight storage;
- testing/CI infrastructure.

Do **not** reuse the old product architecture merely because code exists.

Old Today/Plan/Daily Loop/Evening Review modules are legacy product experiments unless a specific technical primitive is extracted deliberately.

## 18. Build strategy

Do not rewrite the current frontend in place.

Build Rinlo 2.0 as a clean product surface on a separate branch / entrypoint while reusing only validated infrastructure underneath.

Recommended implementation slices:

### Slice 1 — static product shell
- new branding tokens;
- new logo placeholder/vector draft;
- onboarding shell;
- Home;
- History;
- Progress;
- Profile;
- responsive/mobile geometry tests.

### Slice 2 — decision flow
- text input;
- structured decision schema;
- result screen;
- alternative selection;
- save to history.

### Slice 3 — photo flow
- photo capture/upload;
- recognition;
- clarification state;
- structured decision result.

### Slice 4 — persistence and progress
- sync decision history;
- weight entries;
- progress trend;
- restore/reload lifecycle.

### Slice 5 — refinement
- voice;
- richer context;
- preference learning;
- accessibility;
- performance;
- production QA.

## 19. Acceptance criteria for Rinlo 2.0 MVP

The concept is working when a new user can:

1. understand what Rinlo does within the first screen;
2. complete onboarding without irrelevant questions;
3. ask “Можно сегодня бургер и колу?”;
4. get a clear recommendation in seconds;
5. understand *why* without reading a long answer;
6. choose an adjustment or alternative;
7. see the saved decision in History;
8. record weight and see a simple trend;
9. return later and make another decision without re-learning the app.

And importantly:

> A user should be able to get value from Rinlo without becoming a diligent tracker.

## 20. Product rule for future features

Before adding any feature, ask:

> **Does this make a food decision easier, smarter, or more personally relevant?**

If the answer is no, it probably does not belong in Rinlo 2.0.
