# iPhone foreground rendering investigation — 5 November

The supplied 158-second recording shows long white views, then a rendered Fit74 Home around 01:00–01:01, followed by white views again after app switching. The loaded Home shows 5 November, day 2 of 33 and the expected first daytime shift. This rules out an entirely missing installation; it does not identify a JavaScript exception or prove a particular native iOS bug.

The sequence is consistent with a foreground/compositor failure. WebKit has documented a similar native WKWebView race in commit 870c656abd058a0c01d59d592813ad47029760c0 (bug 316741). That report is supporting context, not proof of the cause on this phone or evidence about the installed iOS patch level.

Mitigation: closed quick-check-in and workout full-screen layers now use display:none instead of remaining opacity-zero composited surfaces. Removed backdrop filters from the bottom navigation, player footer and quick-check-in overlay; retained their colors and layout. Push initialization cannot turn a successful startup into a fatal boot failure. The startup error panel now reattaches after completion if a later fatal error occurs, rather than hiding both app views with no panel.

These are bounded rendering/recovery safeguards; they cannot restart an iOS-suspended WebContent process when JavaScript itself is not running. No forced reload loop, storage clearing, auth reset or push unsubscription is introduced. Phone confirmation remains necessary because the available browser QA runs Chrome, not the user's standalone iPhone WebKit.

Validation: recovery-panel regression, existing push unit tests, source syntax and browser opening/closing of check-in/workout overlays. The video is kept out of the public repository because it contains unrelated personal app screens.
