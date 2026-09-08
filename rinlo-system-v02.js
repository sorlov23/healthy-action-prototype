(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const stateIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`;

  function ensureStyles(doc) {
    doc.getElementById('rinlo-system-v02-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-system-v02-style';
    style.textContent = `
      :where(button,a,input,select,textarea):focus-visible{
        outline:2px solid #2E7D64!important;
        outline-offset:2px!important;
      }
      .rinlo-state.rinlo-state-compact{
        min-height:132px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        padding:16px 12px;
        border-style:solid;
      }
      .rinlo-state.rinlo-state-compact .rinlo-state-icon{width:30px;height:30px;margin-bottom:7px}
      .rinlo-state.rinlo-state-compact .rinlo-state-icon svg{width:16px;height:16px}
      .rinlo-state.rinlo-state-compact p{max-width:240px}
      .overlay.on .sheet{animation:rinlo-sheet-in .22s cubic-bezier(.2,.8,.2,1)}
      @keyframes rinlo-sheet-in{from{transform:translateY(18px);opacity:.72}to{transform:translateY(0);opacity:1}}
      @media(prefers-reduced-motion:reduce){
        *,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
      }
    `;
    doc.head.appendChild(style);
  }

  function stateMarkup(title, text, compact = false) {
    return `<div class="rinlo-state${compact ? ' rinlo-state-compact' : ''}"><div class="rinlo-state-icon">${stateIcon}</div><b>${title}</b><p>${text}</p></div>`;
  }

  function enhanceEmptyStates(doc) {
    const timeline = doc.getElementById('timeline');
    if (timeline && /Пока записей нет/.test(timeline.textContent || '')) {
      timeline.innerHTML = stateMarkup('Здесь появятся записи дня', 'Добавляйте только то, что действительно произошло — Rinlo не требует заполнять всё.', false);
    }

    const chart = doc.getElementById('weightChart');
    if (chart && /Добавь хотя бы две записи веса|Добавьте хотя бы две записи веса/.test(chart.textContent || '')) {
      chart.innerHTML = stateMarkup('Пока мало данных для тренда', 'Двух измерений уже достаточно, чтобы Rinlo начал показывать направление.', true);
    }

    const eventCount = doc.getElementById('eventCount');
    if (eventCount && (eventCount.textContent || '').trim() === 'пусто') eventCount.textContent = 'без записей';
  }

  function wireLabels(doc) {
    let seq = 0;
    doc.querySelectorAll('.field').forEach(field => {
      const label = field.querySelector(':scope > label');
      const control = field.querySelector(':scope > input, :scope > select, :scope > textarea');
      if (!label || !control) return;
      if (!control.id) control.id = `rinlo-field-${++seq}`;
      if (!label.htmlFor) label.htmlFor = control.id;
    });
  }

  function syncNavA11y(doc) {
    const nav = doc.querySelector('.nav');
    if (!nav) return;
    nav.setAttribute('aria-label', 'Основная навигация');
    nav.querySelectorAll('button').forEach(button => {
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function enhanceA11y(doc, win) {
    const toast = doc.getElementById('toast');
    const nav = doc.querySelector('.nav');
    if (toast) {
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.setAttribute('aria-atomic', 'true');
    }

    const fab = doc.querySelector('.fab');
    if (fab && !fab.getAttribute('aria-label')) fab.setAttribute('aria-label', 'Добавить запись');

    const overlay = doc.getElementById('overlay');
    const sheet = doc.querySelector('.sheet');
    if (overlay) overlay.setAttribute('aria-hidden', overlay.classList.contains('on') ? 'false' : 'true');
    if (sheet) {
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-label', 'Rinlo');
    }

    wireLabels(doc);
    syncNavA11y(doc);

    if (!win.__rinloA11yKeyHandler) {
      win.__rinloA11yKeyHandler = true;
      doc.addEventListener('keydown', event => {
        if (event.key === 'Escape' && overlay?.classList.contains('on') && typeof win.closeSheet === 'function') win.closeSheet();
      });
    }

    if (overlay && !overlay.dataset.rinloA11yObserved) {
      overlay.dataset.rinloA11yObserved = '1';
      new MutationObserver(() => overlay.setAttribute('aria-hidden', overlay.classList.contains('on') ? 'false' : 'true'))
        .observe(overlay, {attributes:true, attributeFilter:['class']});
    }

    if (nav && !nav.dataset.rinloA11yObserved) {
      nav.dataset.rinloA11yObserved = '1';
      new MutationObserver(() => syncNavA11y(doc)).observe(nav, {subtree:true, attributes:true, attributeFilter:['class']});
    }
  }

  function observeDynamicStates(doc) {
    if (doc.documentElement.dataset.rinloStatesObserved === '1') return;
    doc.documentElement.dataset.rinloStatesObserved = '1';
    let scheduled = false;
    const run = () => {
      scheduled = false;
      enhanceEmptyStates(doc);
      wireLabels(doc);
      syncNavA11y(doc);
    };
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(run, 0);
    }).observe(doc.body, {childList:true, subtree:true});
  }

  function apply() {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;
    ensureStyles(doc);
    enhanceEmptyStates(doc);
    enhanceA11y(doc, win);
    observeDynamicStates(doc);
  }

  frame.addEventListener('load', () => {
    try { setTimeout(apply, 90); }
    catch (error) { console.error('Rinlo system pass v0.2', error); }
  });

  try { if (frame.contentDocument?.readyState === 'complete') setTimeout(apply, 90); }
  catch {}
})();
