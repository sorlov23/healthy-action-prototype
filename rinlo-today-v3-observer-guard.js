(() => {
  // Today v3 is render-driven. Keep this tiny marker while the asset remains in
  // the PWA bundle so older installed previews do not fail asset resolution.
  window.__rinloTodayV3ObserverGuard = 'v3';
})();