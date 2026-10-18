# Fit74 Impulse assets

UI assets for the user-selected «Импульс» direction. The runtime is buildless; fonts and icons are self-hosted.

- `fonts/`: Inter variable, Cyrillic and Latin subsets, from `@fontsource-variable/inter`. License included.
- `icons/`: Phosphor regular/fill icons from `@phosphor-icons/core`. License included. No custom illustrations are drawn with these SVGs.
- `a.webp`, `b.webp`, `glutes.webp`, `cardio.webp`, `light.webp`: crops of the existing approved exercise atlas. Reproducible with `node scripts/build-fit74-ui-assets.mjs` and sharp.
- `hero-v2.webp`: transparent start-pose artwork used on the home and recommendation cards.
- `squat-seat-v2.webp`: transparent squat position master.
- `goblet-start-v2.webp`, `goblet-squat-v2.webp`: trimmed transparent cutouts for the squat's two technique frames. Other exercises retain their source-card atlas images.

The two clean masters were made with the built-in image-generation tool, not an external image API. Generated originals remain intact. WebP conversion preserves alpha. No health-data headers from the uploaded cards were used.

Start-pose prompt:

> Use case: background-extraction. Edit target: supplied cropped Fit74 exercise illustration. Create a clean, high quality transparent cutout of this EXACT male exercise demonstrator and the chair. Remove ALL existing background, colored blue banner, pastel card borders and white rectangles. Keep the same standing goblet squat START pose, blue fitted T-shirt, dark shorts, dark training shoes, dark short hair and beard, dumbbell held vertically at chest with both hands, and the complete sturdy gray upholstered chair behind him with four intact wooden legs. Preserve anatomy, face, angle and clothing. Clean edges, fully visible feet and chair legs, soft natural tiny contact shadow only. Athletic but approachable man, same realistic instructional illustration style. Center the complete man plus chair in a square image with narrow transparent margins, suitable as a crisp app UI asset. No text, no logos, no extra equipment, no gradients, no colored background. Actual transparent alpha background.

Squat-pose prompt:

> Use case: background-extraction / identity-preserve. Asset type: Fit74 exercise technique cutout on real transparent alpha. Image 1 is the pose edit target: preserve EXACT seated goblet squat bottom position with dumbbell at chest, both feet flat, knees tracking toes, man lightly touching gray chair seat. Image 2 is supporting character/style identity: use this same man in blue fitted T shirt, dark shorts, short dark hair and beard and trainers, and same sturdy gray upholstered four-legged wooden chair. Output one single complete man plus complete chair in the seated squat pose from Image 1. Remove ALL background, blue header strip, white rectangles and colored card borders. High resolution realistic instructional illustration, clean edges, accurate natural anatomy, full feet and all visible wooden chair legs intact. Straight neutral spine, chest facing forward and up as in source. Complete subject fully visible with narrow transparent margins, no cropping. No labels, no text, no arrows, no floor backdrop. Keep body pose and equipment faithful to Image 1. Transparent background.
