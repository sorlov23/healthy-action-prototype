(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const KEY = 'healthy-action-v07';
  let mounted = false;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const num = (v, fallback = 0) => {
    const n = Number.parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  };
  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  function readDb(win) {
    try { return JSON.parse(win.localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function writeDb(win, db) { win.localStorage.setItem(KEY, JSON.stringify(db)); }
  function syncBase(win) {
    try { win.eval('db = load()'); }
    catch (error) { console.warn('Rinlo legacy state sync skipped', error); }
  }
  function currentKey(win) { return win.__haViewDay || localDayKey(); }
  function currentDay(win) {
    const db = readDb(win);
    db.days ||= {};
    const key = currentKey(win);
    db.days[key] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    return { db, day: db.days[key], key };
  }
  function refresh(win) {
    try {
      syncBase(win);
      win.render?.();
    } catch (error) { console.warn('Rinlo functional refresh', error); }
  }

  function ensureStyles(doc) {
    if (doc.getElementById('rinlo-functional-v1-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-functional-v1-style';
    style.textContent = `
      .rf-help{margin-top:8px;font-size:11px;line-height:1.4;color:#7B8682}
      .rf-result{margin-top:12px;padding:13px;border:1px solid #E2E9E5;border-radius:16px;background:#F7FAF8}
      .rf-result b{font-size:13px}.rf-result p{margin:4px 0 0;font-size:11px;line-height:1.4;color:#71807A}
      .rf-inline{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .rf-edit{position:absolute;right:42px;top:9px;width:auto!important;min-width:30px;padding:0 8px!important;font-size:10px!important;color:#47715F!important}
      .rf-plan-click{cursor:pointer}.rf-plan-click:active{transform:scale(.995)}
      .rf-plan-hint{font-size:9px!important;color:#7C8782!important}
      .rf-review{display:grid;gap:8px;margin-top:12px}
      .rf-review button{width:100%;min-height:48px;border:1px solid #E0E7E3;border-radius:15px;background:#fff;color:#24312C;font-weight:650}
      .rf-review button:active{background:#F4F8F6}
    `;
    doc.head.appendChild(style);
  }

  function installCoreFlows(win, doc) {
    const originalRestart = typeof win.restartOnboarding === 'function' ? win.restartOnboarding.bind(win) : null;
    if (originalRestart && !win.__rinloFunctionalRestartWrapped) {
      win.__rinloFunctionalRestartWrapped = true;
      win.restartOnboarding = () => {
        syncBase(win);
        originalRestart();
        for (let i = 0; i < 4; i++) win.rinloCoreOnboardingBack?.();
        doc.querySelector('#onboarding')?.scrollTo?.({ top: 0, behavior: 'instant' });
      };
    }

    const originalLoadDemo = typeof win.loadDemo === 'function' ? win.loadDemo.bind(win) : null;
    if (originalLoadDemo && !win.__rinloFunctionalDemoWrapped) {
      win.__rinloFunctionalDemoWrapped = true;
      win.loadDemo = (...args) => {
        syncBase(win);
        const result = originalLoadDemo(...args);
        syncBase(win);
        return result;
      };
    }

    win.openFood = () => {
      win.openSheet?.(`
        <h2>Добавить приём пищи</h2>
        <div class="sub">Опишите еду обычным языком. Перед сохранением оценку можно поправить.</div>
        <div class="field"><label>Что вы съели?</label><textarea id="rfFoodText" placeholder="Например: омлет из двух яиц и кофе"></textarea></div>
        <button class="btn secondary full" onclick="rinloPreviewFood()">Получить оценку</button>
        <div id="rfFoodResult"></div>
      `);
    };

    win.rinloPreviewFood = () => {
      const text = doc.getElementById('rfFoodText')?.value?.trim();
      if (!text) return win.toast?.('Напишите, что вы съели');
      const estimate = typeof win.estimateFood === 'function' ? win.estimateFood(text) : { cal: 450, protein: 20 };
      const box = doc.getElementById('rfFoodResult');
      if (!box) return;
      box.innerHTML = `
        <div class="rf-result"><b>Результат от Rinlo</b><p>Это ориентировочная оценка. Измените значения, если знаете точнее.</p></div>
        <div class="rf-inline">
          <div class="field"><label>Ккал</label><input id="rfFoodCal" inputmode="numeric" value="${Math.round(estimate.cal || 0)}"></div>
          <div class="field"><label>Белок, г</label><input id="rfFoodProtein" inputmode="numeric" value="${Math.round(estimate.protein || 0)}"></div>
        </div>
        <button class="btn primary full" onclick="rinloSaveFood()">Добавить в дневник</button>`;
    };

    win.rinloSaveFood = () => {
      const text = doc.getElementById('rfFoodText')?.value?.trim();
      if (!text) return win.toast?.('Добавьте описание еды');
      const cal = Math.max(0, num(doc.getElementById('rfFoodCal')?.value, 0));
      const protein = Math.max(0, num(doc.getElementById('rfFoodProtein')?.value, 0));
      const state = currentDay(win);
      state.day.events ||= [];
      state.day.events.push({ id: Date.now(), type: 'food', time: new Date().toISOString(), text, cal, protein });
      writeDb(win, state.db);
      win.closeSheet?.();
      refresh(win);
      win.toast?.('Приём пищи добавлен');
    };

    win.openWeight = () => {
      const state = currentDay(win);
      const last = [...(state.day.events || [])].reverse().find((e) => e.type === 'weight');
      win.openSheet?.(`
        <h2>Записать вес</h2>
        <div class="sub">Одного измерения недостаточно для вывода — Rinlo смотрит на тренд.</div>
        <div class="field"><label>Вес, кг</label><input id="rfWeight" inputmode="decimal" value="${last?.weight ?? ''}" placeholder="Например, 84.2"></div>
        <button class="btn primary full" onclick="rinloSaveWeight()">Сохранить</button>`);
    };

    win.rinloSaveWeight = () => {
      const weight = num(doc.getElementById('rfWeight')?.value, NaN);
      if (!Number.isFinite(weight) || weight < 30 || weight > 300) return win.toast?.('Проверьте значение веса');
      const state = currentDay(win);
      state.day.events ||= [];
      state.day.events.push({ id: Date.now(), type: 'weight', time: new Date().toISOString(), weight });
      writeDb(win, state.db);
      win.closeSheet?.();
      refresh(win);
      win.toast?.('Вес сохранён');
    };

    win.addWater = (value = 250) => {
      const v = Math.max(0, Math.round(Number(value || 0)));
      if (!v) return;
      const state = currentDay(win);
      state.day.water = Math.max(0, Number(state.day.water || 0) + v);
      writeDb(win, state.db);
      refresh(win);
      win.toast?.(`+${v} мл воды`);
    };

    win.rinloOpenSteps = () => {
      win.openSheet?.(`
        <h2>Добавить шаги</h2>
        <div class="sub">Для прототипа шаги пока можно добавить вручную.</div>
        <div class="rc-chip-row"><button class="rc-chip" onclick="rinloSaveSteps(500)">+500</button><button class="rc-chip" onclick="rinloSaveSteps(1000)">+1000</button><button class="rc-chip" onclick="rinloSaveSteps(2500)">+2500</button></div>
        <div class="field"><label>Или своё значение</label><input id="rfSteps" inputmode="numeric" placeholder="Например, 1800"></div>
        <button class="btn primary full" onclick="rinloSaveSteps()">Добавить</button>`);
    };

    win.rinloSaveSteps = (preset) => {
      const value = Math.round(preset ?? num(doc.getElementById('rfSteps')?.value, 0));
      if (!Number.isFinite(value) || value <= 0 || value > 100000) return win.toast?.('Проверьте количество шагов');
      const state = currentDay(win);
      state.day.steps = Math.max(0, Number(state.day.steps || 0) + value);
      writeDb(win, state.db);
      win.closeSheet?.();
      refresh(win);
      win.toast?.(`+${value.toLocaleString('ru-RU')} шагов`);
    };
    win.addSteps = (value = 1000) => win.rinloSaveSteps(Math.round(Number(value || 0)));

    win.toggleHabit = (habit) => {
      const state = currentDay(win);
      state.day.habits ||= {};
      state.day.habits[habit] = !state.day.habits[habit];
      writeDb(win, state.db);
      refresh(win);
    };

    win.delEvent = (id) => {
      const state = currentDay(win);
      const before = (state.day.events || []).length;
      state.day.events = (state.day.events || []).filter((event) => String(event.id) !== String(id));
      if (state.day.events.length === before) return;
      writeDb(win, state.db);
      refresh(win);
      win.toast?.('Запись удалена');
    };

    win.rinloEditEvent = (id) => {
      const state = currentDay(win);
      const event = (state.day.events || []).find((e) => String(e.id) === String(id));
      if (!event) return win.toast?.('Запись не найдена');
      if (event.type === 'food') {
        win.openSheet?.(`
          <h2>Изменить приём пищи</h2>
          <div class="field"><label>Описание</label><textarea id="rfEditText">${esc(event.text || '')}</textarea></div>
          <div class="rf-inline"><div class="field"><label>Ккал</label><input id="rfEditCal" inputmode="numeric" value="${Math.round(event.cal || 0)}"></div><div class="field"><label>Белок, г</label><input id="rfEditProtein" inputmode="numeric" value="${Math.round(event.protein || 0)}"></div></div>
          <button class="btn primary full" onclick="rinloSaveEventEdit('${esc(event.id)}')">Сохранить изменения</button>`);
      } else if (event.type === 'weight') {
        win.openSheet?.(`<h2>Изменить вес</h2><div class="field"><label>Вес, кг</label><input id="rfEditWeight" inputmode="decimal" value="${event.weight}"></div><button class="btn primary full" onclick="rinloSaveEventEdit('${esc(event.id)}')">Сохранить изменения</button>`);
      }
    };

    win.rinloSaveEventEdit = (id) => {
      const state = currentDay(win);
      const event = (state.day.events || []).find((e) => String(e.id) === String(id));
      if (!event) return;
      if (event.type === 'food') {
        const text = doc.getElementById('rfEditText')?.value?.trim();
        if (!text) return win.toast?.('Описание не может быть пустым');
        event.text = text;
        event.cal = Math.max(0, num(doc.getElementById('rfEditCal')?.value, 0));
        event.protein = Math.max(0, num(doc.getElementById('rfEditProtein')?.value, 0));
      } else if (event.type === 'weight') {
        const weight = num(doc.getElementById('rfEditWeight')?.value, NaN);
        if (!Number.isFinite(weight) || weight < 30 || weight > 300) return win.toast?.('Проверьте значение веса');
        event.weight = weight;
      }
      event.updatedAt = new Date().toISOString();
      writeDb(win, state.db);
      win.closeSheet?.();
      refresh(win);
      win.toast?.('Изменения сохранены');
    };

    win.finishDay = () => {
      const state = currentDay(win);
      const existing = state.day.eveningReview?.difficulty;
      win.openSheet?.(`
        <h2>Как ощущался сегодняшний план?</h2>
        <div class="sub">Это помогает Rinlo подбирать следующий шаг реалистичнее.</div>
        <div class="rf-review">
          <button onclick="rinloSaveEveningReview('easy')">Легко${existing === 'easy' ? ' ✓' : ''}</button>
          <button onclick="rinloSaveEveningReview('right')">В самый раз${existing === 'right' ? ' ✓' : ''}</button>
          <button onclick="rinloSaveEveningReview('too_much')">Слишком много${existing === 'too_much' ? ' ✓' : ''}</button>
        </div>`);
    };

    win.rinloSaveEveningReview = (difficulty) => {
      if (!['easy','right','too_much'].includes(difficulty)) return;
      const state = currentDay(win);
      state.day.closed = true;
      state.day.eveningReview = { difficulty, at: new Date().toISOString() };
      writeDb(win, state.db);
      win.closeSheet?.();
      refresh(win);
      win.toast?.('Спасибо — Rinlo учтёт это дальше');
    };

    win.rinloAdaptPlan = async () => {
      win.openSheet?.(`
        <h2>Адаптировать план</h2>
        <div class="sub">Rinlo пересчитает приоритет по тому, что уже произошло сегодня.</div>
        <button class="btn primary full" onclick="rinloAdaptPlanNow()">Пересчитать следующий шаг</button>
        <button class="btn secondary full" onclick="closeSheet();restartOnboarding()">Изменить постоянные параметры</button>`);
    };
    win.rinloAdaptPlanNow = async () => {
      win.closeSheet?.();
      if (typeof win.rinloCoreReplaceAction === 'function') await win.rinloCoreReplaceAction();
      else if (typeof win.rinloCoreSkipCheckin === 'function') await win.rinloCoreSkipCheckin();
      refresh(win);
      win.toast?.('План обновлён по данным дня');
    };
  }

  function enhanceRenderedUi(win, doc) {
    doc.querySelectorAll('#rcTimeline .rc-event').forEach((card) => {
      if (card.dataset.rfEdit === '1') return;
      const del = card.querySelector('button[onclick^="delEvent"]');
      const match = del?.getAttribute('onclick')?.match(/delEvent\(([^)]+)\)/);
      if (!match) return;
      const id = match[1].replace(/["']/g, '');
      const edit = doc.createElement('button');
      edit.type = 'button';
      edit.className = 'rf-edit';
      edit.textContent = 'Изм.';
      edit.setAttribute('onclick', `rinloEditEvent('${id}')`);
      card.appendChild(edit);
      card.dataset.rfEdit = '1';
    });

    doc.querySelectorAll('#actionsList .item:not(.rp-hide)').forEach((item) => {
      if (item.dataset.rfPlan === '1') return;
      const label = item.querySelector('.main b')?.textContent?.toLowerCase() || '';
      const hasHabitButton = !!item.querySelector('button.check');
      if (hasHabitButton) {
        item.classList.add('rf-plan-click');
        item.addEventListener('click', (event) => {
          if (event.target.closest('button')) return;
          item.querySelector('button.check')?.click();
        });
      } else if (label.includes('белков')) {
        item.classList.add('rf-plan-click');
        item.addEventListener('click', () => win.openFood?.());
        item.querySelector('.main small')?.classList.add('rf-plan-hint');
      } else if (label.includes('прогул')) {
        item.classList.add('rf-plan-click');
        item.addEventListener('click', () => win.rinloOpenSteps?.());
        item.querySelector('.main small')?.classList.add('rf-plan-hint');
      }
      item.dataset.rfPlan = '1';
    });
  }

  function patchFrame() {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.head || !win) return;
    ensureStyles(doc);
    syncBase(win);
    installCoreFlows(win, doc);

    if (!win.__rinloFunctionalRenderWrapped && typeof win.render === 'function') {
      win.__rinloFunctionalRenderWrapped = true;
      const originalRender = win.render.bind(win);
      win.render = function(...args) {
        syncBase(win);
        const result = originalRender(...args);
        queueMicrotask(() => enhanceRenderedUi(win, doc));
        return result;
      };
    }
    if (!win.__rinloFunctionalTodayWrapped && typeof win.renderToday === 'function') {
      win.__rinloFunctionalTodayWrapped = true;
      const originalToday = win.renderToday.bind(win);
      win.renderToday = function(...args) {
        const result = originalToday(...args);
        queueMicrotask(() => enhanceRenderedUi(win, doc));
        return result;
      };
    }

    win.__rinloFunctionalMvp = 'v1';
    enhanceRenderedUi(win, doc);
    refresh(win);
    mounted = true;
  }

  frame.addEventListener('load', () => {
    setTimeout(patchFrame, 0);
    setTimeout(patchFrame, 160);
  });
  setTimeout(patchFrame, 0);
  setTimeout(() => { if (!mounted) patchFrame(); }, 240);
})();