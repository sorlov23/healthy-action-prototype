(() => {
  if (window.__rinloTodayV3ObserverGuard === 'v2') return;
  const NativeObserver = window.MutationObserver;
  if (typeof NativeObserver !== 'function') return;

  // Today v3 redraws from the existing renderToday lifecycle. Its own broad DOM
  // observer would react to that redraw and schedule another redraw forever.
  // Delegate every other observer to the browser unchanged (copy pass, Smart
  // Food, etc.) and no-op only observers constructed by rinlo-today-v3.js.
  class RinloTodayV3ScopedObserver {
    constructor(callback) {
      const stack = String(new Error().stack || '');
      if (stack.includes('rinlo-today-v3.js')) {
        return {
          observe() {},
          disconnect() {},
          takeRecords() { return []; },
        };
      }
      return new NativeObserver(callback);
    }
  }

  window.__rinloTodayV3NativeObserver = NativeObserver;
  window.__rinloTodayV3ObserverGuard = 'v2';
  window.MutationObserver = RinloTodayV3ScopedObserver;
})();