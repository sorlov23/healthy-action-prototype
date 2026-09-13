(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  let observer = null;

  function apply(doc) {
    if (!doc?.head) return false;

    let style = doc.getElementById('rinlo-ui-fixes-v1-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'rinlo-ui-fixes-v1-style';
      doc.head.appendChild(style);
    }

    style.textContent = `
      .rc-calorie-toggle {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        align-items: center !important;
        column-gap: 18px !important;
        padding: 14px 16px !important;
        min-height: 76px !important;
      }

      .rc-calorie-toggle > div {
        min-width: 0 !important;
      }

      .rc-calorie-toggle b {
        font-size: 13px !important;
        line-height: 1.25 !important;
      }

      .rc-calorie-toggle span {
        max-width: 280px !important;
        margin-top: 5px !important;
        font-size: 10.5px !important;
        line-height: 1.38 !important;
      }

      .rc-switch {
        box-sizing: border-box !important;
        position: relative !important;
        display: block !important;
        flex: 0 0 auto !important;
        width: 50px !important;
        min-width: 50px !important;
        max-width: 50px !important;
        height: 30px !important;
        min-height: 30px !important;
        margin: 0 !important;
        padding: 2px !important;
        border: 0 !important;
        border-radius: 999px !important;
        overflow: hidden !important;
        background: #CAD5D0 !important;
        appearance: none !important;
        -webkit-appearance: none !important;
        box-shadow: inset 0 0 0 1px rgba(17,27,24,.03) !important;
        transition: background-color .18s ease !important;
      }

      .rc-switch i {
        box-sizing: border-box !important;
        display: block !important;
        width: 26px !important;
        height: 26px !important;
        margin: 0 !important;
        border-radius: 50% !important;
        background: #fff !important;
        box-shadow: 0 1px 3px rgba(17,27,24,.18) !important;
        transform: translateX(0) !important;
        transition: transform .18s ease !important;
        pointer-events: none !important;
      }

      .rc-switch.on {
        background: var(--rc-green, #249765) !important;
      }

      .rc-switch.on i {
        transform: translateX(20px) !important;
      }

      .rc-switch:focus-visible {
        outline: 3px solid rgba(36,151,101,.18) !important;
        outline-offset: 3px !important;
      }

      @media (max-width: 370px) {
        .rc-calorie-toggle {
          column-gap: 12px !important;
          padding: 13px 14px !important;
        }
        .rc-calorie-toggle span {
          font-size: 10px !important;
        }
      }
    `;

    const syncSwitch = () => {
      const button = doc.getElementById('rcCalToggle');
      if (!button) return;
      button.setAttribute('role', 'switch');
      button.setAttribute('aria-label', 'Показывать калории');
      button.setAttribute('aria-checked', button.classList.contains('on') ? 'true' : 'false');
    };

    syncSwitch();
    observer?.disconnect();
    observer = new MutationObserver(syncSwitch);
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return true;
  }

  function install(attempt = 0) {
    const doc = frame.contentDocument;
    if (!apply(doc) && attempt < 60) setTimeout(() => install(attempt + 1), 50);
  }

  frame.addEventListener('load', () => setTimeout(() => install(), 0));
  setTimeout(() => install(), 0);
  setTimeout(() => install(), 250);
})();
