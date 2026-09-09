(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const KEY = 'healthy-action-v07';
  const icons = {
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    focus: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2.8v2.3M21.2 12h-2.3M12 21.2v-2.3M2.8 12h2.3"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.3 3.4 3.4 7.7-8"/></svg>`
  };

  const readDb = (win) => {
    try { return JSON.parse(win.localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  };
  const shiftKey = (key, amount) => {
    const date = new Date(`${key}T12:00:00`);
    date.setDate(date.getDate() + amount);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const localToday = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function iconFor(label) {
    const text = String(label || '').toLowerCase();
    if (text.includes('бел') || text.includes('ед')) return icons.meal;
    if (text.includes('шаг') || text.includes('движ') || text.includes('прогул')) return icons.steps;
    return icons.focus;
  }

  function stabilizeSheet(doc) {
    const body = doc.getElementById('sheetBody');
    if (!body || body.dataset.rinloStableSheet === '1') return;

    /* rinlo-system-v01 attached a characterData observer to this node and
       rewrote every text node even when the copy was already unchanged.
       Once a sheet opened that produced an endless MutationObserver microtask
       loop, making taps appear frozen. Replacing the empty observer target
       detaches that legacy observer without changing the public sheet API. */
    const replacement = body.cloneNode(true);
    replacement.dataset.rinloStableSheet = '1';
    body.replaceWith(replacement);

    const safeObserver = new MutationObserver(() => {
      const walker = doc.createTreeWalker(replacement, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const before = node.nodeValue || '';
        const after = before
          .replace(/Healthy Action/g, 'Rinlo')
          .replace(/AI Coach/g, 'Rinlo')
          .replace(/✦\s*Coach/g, 'Rinlo')
          .replace(/Coach/g, 'Rinlo');
        if (after !== before) node.nodeValue = after;
      }
    });
    safeObserver.observe(replacement, { childList: true, subtree: true, characterData: true });
    doc.__rinloStableSheetObserver = safeObserver;
  }

  function polishPlan(doc) {
    const root = doc.getElementById('actions');
    if (!root?.classList.contains('rinlo-plan-v01')) return;

    const hero = doc.getElementById('actionHero');
    if (hero) {
      const kicker = hero.querySelector('.k');
      const title = hero.querySelector('.heroTitle');
      const sub = hero.querySelector('.sub');
      setText(kicker, 'Фокус на сегодня');
      const value = title?.textContent || '';
      if (/Белок \+ движение/i.test(value)) setText(title, 'Сбалансировать день');
      else if (/Движение \+ вода/i.test(value)) setText(title, 'Немного движения');
      else if (/Поддержать ритм/i.test(value)) setText(title, 'Продолжать в своём ритме');
      setText(sub, 'Rinlo меняет приоритеты по мере того, как появляются реальные записи дня.');
    }

    let visible = 0;
    doc.querySelectorAll('#actionsList .item').forEach((item) => {
      const title = item.querySelector('.main b');
      const small = item.querySelector('.main small');
      const original = title?.textContent || '';
      const hide = /ккал/i.test(original) || visible >= 4;
      item.classList.toggle('rp-hide', hide);
      if (hide) return;
      visible += 1;

      if (/добрать\s*~?\d+\s*г\s*белка/i.test(original)) setText(title, 'Белковый приём пищи');
      else if (/ещё\s*\d+\s*шаг/i.test(original)) setText(title, 'Небольшая прогулка');
      if (small && /не отмечено/i.test(small.textContent || '')) setText(small, 'Можно отметить вечером');
      else if (small && /выполнено/i.test(small.textContent || '')) setText(small, 'Готово на сегодня');

      const left = item.querySelector('.left');
      const expected = iconFor(title?.textContent || original);
      if (left && left.innerHTML !== expected) left.innerHTML = expected;
    });

    const box = doc.getElementById('rinloWeekStats');
    if (box) {
      const db = readDb(doc.defaultView);
      const days = db.days || {};
      const today = localToday();
      let active = 0, movement = 0, focusDays = 0;
      for (let i = 6; i >= 0; i--) {
        const day = days[shiftKey(today, -i)];
        if (!day) continue;
        if ((day.events || []).length || Number(day.steps || 0) || Number(day.water || 0) || Object.values(day.habits || {}).some(Boolean)) active += 1;
        if (Number(day.steps || 0) > 0) movement += 1;
        if (Object.values(day.habits || {}).some(Boolean)) focusDays += 1;
      }
      const html = `<div class="rp-week-card"><div class="rp-week-icon">${icons.check}</div><strong>${active}</strong><small>дней с полезными действиями</small></div><div class="rp-week-card"><div class="rp-week-icon">${icons.steps}</div><strong>${movement}</strong><small>дней с движением</small></div><div class="rp-week-card"><div class="rp-week-icon">${icons.focus}</div><strong>${focusDays}</strong><small>дней с личными фокусами</small></div>`;
      if (box.innerHTML !== html) box.innerHTML = html;
    }
  }

  function install(doc, win) {
    stabilizeSheet(doc);

    const stopLegacyObserver = () => {
      if (doc.__rinloPlanObserver?.disconnect) doc.__rinloPlanObserver.disconnect();
      doc.__rinloPlanObserver = { disconnect() {} };
    };
    stopLegacyObserver();

    if (!win.__rinloStableRenderWrapped && typeof win.render === 'function') {
      win.__rinloStableRenderWrapped = true;
      const original = win.render.bind(win);
      win.render = function(...args) {
        const result = original(...args);
        stopLegacyObserver();
        stabilizeSheet(doc);
        polishPlan(doc);
        queueMicrotask(() => polishPlan(doc));
        return result;
      };
    }

    polishPlan(doc);
    win.__rinloStability = 'v1';
  }

  function mount() {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;
    install(doc, win);
  }

  frame.addEventListener('load', () => {
    setTimeout(mount, 80);
    setTimeout(mount, 220);
  });
  setTimeout(mount, 80);
  setTimeout(mount, 220);
})();