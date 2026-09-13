(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const VERSION = 'v1';

  function install() {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc?.body || win.__rinloSmartFood !== 'v1') return false;

    if ((!Array.isArray(win.HEALTHY_FOOD_CATALOG) || !win.HEALTHY_FOOD_CATALOG.length)
      && Array.isArray(window.HEALTHY_FOOD_CATALOG)
      && window.HEALTHY_FOOD_CATALOG.length) {
      win.HEALTHY_FOOD_CATALOG = window.HEALTHY_FOOD_CATALOG.map((row) => Array.isArray(row) ? [...row] : row);
    }

    if (doc.__rinloSmartFoodEventsV1) {
      win.__rinloSmartFoodEvents = VERSION;
      return true;
    }

    doc.__rinloSmartFoodEventsV1 = true;
    doc.addEventListener('input', (event) => {
      if (event.target?.id === 'rsfText') win.rinloSmartFoodSuggest?.();
    }, true);

    win.__rinloSmartFoodEvents = VERSION;
    return true;
  }

  function mount() {
    if (install()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries >= 40) clearInterval(timer);
    }, 100);
  }

  frame.addEventListener('load', () => setTimeout(mount, 0));
  setTimeout(mount, 0);
})();
