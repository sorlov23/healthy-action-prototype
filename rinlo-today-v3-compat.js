(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const apply = () => {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;
    if (win.__rinloTodayV3 === 'v3') win.__rinloTodayV2 = 'v1';
    const today = doc.getElementById('today');
    if (today?.classList.contains('rinlo-today-v3')) today.classList.add('rtv2');
    today?.querySelector('.r3-hero')?.classList.add('rc-action');
    today?.querySelector('.r3-quick')?.classList.add('rc-quick');
  };

  const hook = () => {
    const win = frame.contentWindow;
    if (!win) return;
    if (!win.__rinloTodayV3CompatHooked && typeof win.renderToday === 'function') {
      const previous = win.renderToday;
      win.renderToday = function(...args) {
        const result = previous.apply(this, args);
        queueMicrotask(apply);
        return result;
      };
      win.__rinloTodayV3CompatHooked = true;
    }
    apply();
  };

  // Transitional bridge for legacy E2E selectors only. It does not recreate
  // legacy UI; it reapplies old selector aliases after every real Today render.
  frame.addEventListener('load', () => {
    setTimeout(hook, 0);
    setTimeout(hook, 260);
  });
  setTimeout(hook, 0);
  setTimeout(hook, 320);
})();