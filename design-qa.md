# Fit74 / Импульс — design QA

final result: passed

## Visual target and evidence

- Selected target: option 2, «Импульс».
- Source: `/workspace/scratch/b841cf51db81/generated_images/exec-71929bcf-2da4-46d4-91e5-fefe5076e820.png` (1536 × 1024).
- Local implementation: `http://terminal.local:4173/`, the existing Fit74 application in an isolated preview. Preview-only fetch fixtures never send account requests to Supabase. Render continues to serve only `fit74/`.
- Browser: Cloud Browser, Chrome; authored preview iframe viewport 390 × 844 CSS pixels. Screenshot clips use the measured iframe rectangle, without browser chrome or a phone bezel.
- Source crops: Today 441 × 931; Library 439 × 931; Player 442 × 931. Each is scaled proportionally to 390 pixels wide and placed at the top of a 390 × 844 canvas. The resulting 823–827 pixel heights leave 17–21 pixels of blank canvas. This device aspect-ratio difference is excluded from findings.
- State: 18 October 2026, before the 19 October start; empty history and daily score; next session A. Player: full A, step 7 of 17, first squat, no completed sets.
- Cloud Browser implementation screenshots: `/workspace/scratch/fit74-impulse-today-final.jpg`, `/workspace/scratch/fit74-impulse-library-final.jpg`, `/workspace/scratch/fit74-impulse-player-final.jpg` (each 390 × 844).
- Full-view paired comparisons, source left and implementation right: `/workspace/scratch/b841cf51db81/qa-impulse/today-comparison.png`, `library-comparison.png`, `player-comparison.png` (each 780 × 844). All three were opened and visually compared together, rather than judged from code.
- Focused comparison: `/workspace/scratch/b841cf51db81/qa-impulse/cta-detail.png`; enlarged source and implementation title, illustration, duration and action. Player pose scale, labels, cue and set controls were also inspected in the paired player comparison at readable resolution.
- Narrow-screen screenshot: `/workspace/scratch/fit74-impulse-player-320.jpg`, 320 × 844 CSS pixels. DOM measurements: document and body scroll width 320; fixed footer width 320.

## Comparison history

1. Initial implementation: P2 source-card blue strips and borders remained around the enlarged artwork; P2 home density put the third primary habit below the navigation. Evidence: `fit74-impulse-today-v1.jpg`, `fit74-impulse-today-v2.jpg`. Fixed with clean transparent illustration assets, shorter hero spacing, a compact shift label, and removal of the duplicate duration action from the home card. Short mode remains in the player. The final home capture shows all three primary habits above the navigation.
2. Initial library: P2 legacy green selected-day outline; P2 excessive cycle height put recovery below the fold; P2 logo was aligned to the wrong edge. Evidence: `fit74-impulse-library-v1.jpg`. Fixed the active orange state, single-line shift labels, 60-pixel date cells, header ordering and section spacing. The final library shows both strength rows and both recovery/cardio rows. Also routed legacy hub refreshes through the active v7 renderer to prevent unsupported old programs from reappearing.
3. Initial player: P2 low-resolution background fragments around the squat poses; P2 seated figure scaling obscured the lowering motion. Evidence: `fit74-impulse-player-v1.jpg`. Added clean transparent start and squat assets, aligned feet and scaled the lower position appropriately. The final paired player capture preserves the squat start/lower sequence and shows working set controls.
4. Final comparison: no actionable P0/P1/P2 findings. Functional follow-up also fixed an immediate-exit race by flushing the pending set save, with regression coverage.

## Required fidelity surfaces

- Typography: self-hosted Inter variable, Latin and Cyrillic, natural width and heavy display hierarchy. No font stretching. Headings retain the intended two-line composition; all instruction text and controls are real DOM text. Minor differences in generated lettering are P3.
- Spacing/layout: paper canvas, compact rounded white cards, dark challenge strip, orange full-width action, eight date cells and persistent four-tab navigation. Home, library and player match the target's major regions. The existing extra daily controls and detailed technique remain available by scrolling.
- Color/tokens: graphite `#191d20`, paper `#f8f8f6`, orange `#f56432`, peach `#fff0e8`. Removed the legacy mint selection state. Small white-on-orange actions use darker `#d34016` (contrast about 4.65:1); large primary action text is 18.67 px/750. Flat fills replace the mock's slight generated gradients intentionally.
- Image quality: actual male exercise artwork, source-card thumbnails and two clean generated cutouts. No CSS or hand-drawn SVG substitutes for people, equipment or illustrations. Both feet and chair remain visible; transparent assets retain alpha. The source mock's mismatched B/recovery thumbnails are intentionally replaced with the relevant split squat and light walking images. Icons use the licensed Phosphor set.
- Copy/content: the actual 8-day work-shift cycle and vacation/day-off exceptions drive recommendations. No fixed weekly schedule was copied from the concept. Program durations match the approved cards, including A at 40–50 minutes. Sleep copy accounts for shifts rather than promising a fixed sleep target. All eight daily scoring inputs, history, trends and settings are retained.

## Interactions and checks

- Cloud Browser: Today → Workouts → A → six Next actions → squat; mark a set; enlarge technique and close; resize to 320; inspect footer and horizontal bounds. The enlarged image does not mark a set.
- Automated regression: `tests/fit74-technique.mjs`, 57 steps across A, B, Cardio, Light and Glutes; all image assets load; set undo; dialog close/Escape; existing v7 glute progress migration; local data sentinel; 320/390 widths; four-tab navigation; trends; shift settings; correct 8-day cycle; daily score/pressed state; immediate exit and resume of the latest set.
- Account traffic in tests is intercepted; no production test records were created. Program identity remains v7; no schema changes or local-storage clearing.
- JavaScript syntax and `git diff --check`: pass.
- Cloud console: no application errors. An unrelated Chrome extension metadata error was excluded.

## Accepted differences / P3 polish

- The mock is a visual concept. Accurate shift labels, daily scoring, archive navigation, short mode and detailed instructions take precedence over its sample content.
- Existing source-card thumbnails retain their instructional illustration style; the new hero/start/squat cutouts are sharper and share the same blue-shirt art direction.
- The challenge ruler has 74 functional ticks, rather than copying an arbitrary generated tick count.
- Generated font details, exact chair appearance and minor illustration scale differ without changing content or use.

## Implementation checklist

- [x] Match selected style on Today, Workouts and exercise player.
- [x] Carry the palette through history, trends, profile, auth and image dialog.
- [x] Preserve approved exercises, shift cycle, scoring and saved progress.
- [x] Open source and browser output in paired comparisons; fix substantive differences.
- [x] Check narrow phone layout and primary interactions.
- [x] Pass functional regression and syntax checks.
- [x] final result: passed
