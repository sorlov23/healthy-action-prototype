(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  function patch(win) {
    if (!win?.MutationObserver || win.__rinloVisualObserverGuard === true) return;
    const NativeMutationObserver = win.MutationObserver;

    win.MutationObserver = class RinloGuardedMutationObserver extends NativeMutationObserver {
      constructor(callback) {
        super((mutations, observer) => {
          const relevant = mutations.filter((mutation) => {
            const target = mutation.target;
            if (!target) return true;
            if (target.id === 'rinlo-visual-system-v2-style') return false;
            if (target.parentElement?.id === 'rinlo-visual-system-v2-style') return false;
            return true;
          });
          if (relevant.length) callback(relevant, observer);
        });
      }
    };

    win.__rinloVisualObserverGuard = true;
  }

  const apply = () => {
    try { patch(frame.contentWindow); } catch {}
  };

  frame.addEventListener('load', apply);
  apply();
})();