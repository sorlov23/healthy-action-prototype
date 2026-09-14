(() => {
  if (window.__rinloTodayV3NativeObserver) return;
  window.__rinloTodayV3NativeObserver = window.MutationObserver;
  window.MutationObserver = class RinloTodayV3NoopObserver {
    constructor() {}
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
})();