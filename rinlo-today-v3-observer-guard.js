(() => {
  if (window.__rinloTodayV3ObserverGuard === 'v2') return;
  const NativeObserver = window.MutationObserver;
  if (typeof NativeObserver !== 'function') return;

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