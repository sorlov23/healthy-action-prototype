(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const APP_KEY = 'healthy-action-v07';
  const icons = {
    left: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5.5 5 5.5"/></svg>`,
    right: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5.5-5 5.5"/></svg>`,
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    focus: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2.8v2.3M21.2 12h-2.3M12 21.2v-2.3M2.8 12h2.3"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 8.4A7 7 0 1 0 19 14"/><path d="M18.2 4.8v3.8h-3.8"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.3 3.4 3.4 7.7-8"/></svg>`,
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const readDb = (win) => {
    try { return JSON.parse(win.localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  };
  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const viewDay = (win) => win?.__haViewDay || localDayKey();

  const goalLabels = {
    weight_loss: 'Снижать вес устойчиво',
    nutrition: 'Наладить питание',
    movement: 'Больше двигаться',
    sleep: 'Лучше спать',
    energy: 'Больше энергии',
    nicotine: 'Меньше никотина',
  };
  const habitLabels = {
    vape: 'Без вейпа / сигарет',
    fastfood: 'Меньше фастфуда',
    water: 'Пить больше воды',
  };

  function totals(day) {
    return (day?.events || []).reduce((acc, event) => {
      if (event.type === 'food') {
        acc.cal += Number(event.cal || 0);
        acc.protein += Number(event.protein || 0);
      }
      return acc;
    }, { cal: 0, protein: 0 });
  }

  function targets(win, profile) {
    try {
      const value = win.targets?.();
      if (value) return value;
    } catch {}
    return {
      cal: Number(profile?.calorieTarget || 1900),
      protein: Number(profile?.proteinTargetG || 120),
      steps: Number(profile?.stepTarget || 8000),
    };
  }

  function primaryAction(day) {
    const actions = Array.isArray(day?.rinloActions) ? day.rinloActions : [];
    return actions.find((action) => ['suggested', 'accepted'].includes(action.status))
      || actions.find((action) => action.status === 'completed')
      || null;
  }

  function supportingAction(win, day, profile, primary) {
    const current = totals(day);
    const target = targets(win, profile);
    const candidates = [];
    if (
      primary?.kind !== 'nutrition'
      && current.protein > 0
      && Number(target.protein || 0) > 0
      && current.protein < Number(target.protein) * 0.55
    ) {
      candidates.push({
        kind: 'nutrition',
        title: 'Белковый приём пищи',
        text: `Сейчас около ${Math.round(current.protein)} из ${Math.round(target.protein)} г белка. Это поддержка, а не ещё одна обязательная задача.`,
        icon: icons.meal,
      });
    }
    if (
      primary?.kind !== 'movement'
      && Number(target.steps || 0) > 0
      && Number(day?.steps || 0) < Number(target.steps) * 0.5
    ) {
      candidates.push({
        kind: 'movement',
        title: 'Небольшая прогулка',
        text: 'Если будет удобно, немного движения поддержит сегодняшний ритм.',
        icon: icons.steps,
      });
    }
    if (primary?.kind !== 'hydration' && Number(day?.water || 0) < 750) {
      candidates.push({
        kind: 'hydration',
        title: 'Стакан воды',
        text: 'Можно добавить в удобный момент. Догонять норму сразу не нужно.',
        icon: icons.water,
      });
    }
    return candidates[0] || null;
  }

  function personalFocuses(profile, day) {
    const output = [];
    const seen = new Set();
    const add = (key, label, detail) => {
      if (!key || !label || seen.has(key) || output.length >= 2) return;
      seen.add(key);
      output.push({ key, label, detail });
    };

    for (const goal of profile?.secondaryGoals || []) {
      add(`goal:${goal}`, goalLabels[goal], 'Дополнительный фокус');
    }
    for (const habit of profile?.habits || profile?.focuses || []) {
      const done = Boolean(day?.habits?.[habit]);
      add(`habit:${habit}`, habitLabels[habit], done ? 'Отмечено сегодня' : 'Личный фокус');
    }
    return output;
  }

  function actionIcon(kind) {
    if (kind === 'movement') return icons.steps;
    if (kind === 'nutrition') return icons.meal;
    if (kind === 'hydration') return icons.water;
    return icons.spark;
  }

  function ensureStyles(doc) {
    doc.getElementById('rinlo-plan-v01-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-plan-v01-style';
    style.textContent = `
      #actions.rinlo-plan-v01{min-height:100vh!important;padding:max(16px,env(safe-area-inset-top)) 18px calc(116px + env(safe-area-inset-bottom))!important;background:radial-gradient(circle at 108% 0%,rgba(154,185,172,.12),transparent 28%),linear-gradient(180deg,#F8FAF9 0%,#F4F7F5 100%)!important;color:#172027;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important}
      #actions.rinlo-plan-v01 .rp-top{display:flex;align-items:center;justify-content:space-between;min-height:32px;margin-bottom:16px}
      #actions.rinlo-plan-v01 .rinlo-wordmark{position:relative;display:inline-block;padding-right:8px;font-size:26px;font-weight:600;line-height:1;letter-spacing:-.045em;color:#0F1720}
      #actions.rinlo-plan-v01 .rinlo-wordmark-dot{position:absolute;width:6px;height:6px;right:0;top:6px;border-radius:50%;background:#2E7D64}
      #actions.rinlo-plan-v01 .rp-kicker{font-size:10px;font-weight:600;color:#7C888B}
      #actions.rinlo-plan-v01 .rp-heading{margin-bottom:10px}
      #actions.rinlo-plan-v01 .rp-heading h1{margin:0 0 5px!important;font-size:25px!important;line-height:1.12!important;font-weight:600!important;letter-spacing:-.035em!important;color:#172027!important}
      #actions.rinlo-plan-v01 .rp-heading .sub{font-size:12.5px!important;line-height:1.43!important;color:#68757A!important;max-width:340px}
      #actions.rinlo-plan-v01 .rp-date{display:grid;grid-template-columns:28px 1fr 28px;align-items:center;margin:0 0 10px}
      #actions.rinlo-plan-v01 .rp-date button{width:28px;height:28px;border:0;border-radius:10px;background:transparent;color:#929B9E;display:grid;place-items:center;padding:0}
      #actions.rinlo-plan-v01 .rp-date svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      #actions.rinlo-plan-v01 #actionsDate{text-align:center;font-size:11px;font-weight:600;color:#596468}

      #actions.rinlo-plan-v01 #actionHero{position:relative;overflow:hidden;margin:0!important;border:0!important;border-radius:23px!important;padding:18px 16px 16px!important;color:#fff!important;background:radial-gradient(circle at 82% 18%,rgba(118,170,151,.32),transparent 18%),radial-gradient(circle at 106% 90%,rgba(76,142,120,.30),transparent 34%),linear-gradient(145deg,#122126 0%,#0F1B1F 48%,#173D35 100%)!important;box-shadow:0 10px 28px rgba(15,23,32,.075)!important}
      #actions.rinlo-plan-v01 #actionHero::before{content:'';position:absolute;width:250px;height:116px;right:-104px;top:50px;border-radius:50%;border:1px solid rgba(186,213,202,.15);transform:rotate(-24deg);pointer-events:none}
      #actions.rinlo-plan-v01 .rp-primary-kicker{position:relative;z-index:1;color:#B8D7CA;font-size:10px;font-weight:650;margin-bottom:7px;display:flex;align-items:center;gap:6px}
      #actions.rinlo-plan-v01 .rp-primary-kicker svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}
      #actions.rinlo-plan-v01 .rp-primary-title{position:relative;z-index:1;margin:0 0 7px;font-size:21px;line-height:1.16;font-weight:600;letter-spacing:-.028em;color:#fff}
      #actions.rinlo-plan-v01 .rp-primary-text{position:relative;z-index:1;max-width:310px;font-size:12px;line-height:1.46;color:rgba(255,255,255,.72)}
      #actions.rinlo-plan-v01 .rp-effort{position:relative;z-index:1;display:inline-flex;margin-top:10px;padding:5px 8px;border:1px solid rgba(255,255,255,.13);border-radius:999px;font-size:9.5px;color:#DCEBE5}
      #actions.rinlo-plan-v01 .rp-primary-actions{position:relative;z-index:1;display:flex;gap:7px;margin-top:13px}
      #actions.rinlo-plan-v01 .rp-primary-actions button{min-height:38px;border-radius:12px;padding:0 12px;font-size:10.5px;font-weight:650}
      #actions.rinlo-plan-v01 .rp-primary-done{border:0;background:#F1F8F4;color:#1D6048}
      #actions.rinlo-plan-v01 .rp-primary-alt{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#EEF7F3}
      #actions.rinlo-plan-v01 .rp-primary-status{position:relative;z-index:1;display:flex;align-items:center;gap:6px;margin-top:12px;font-size:10.5px;color:#CFE5DB}
      #actions.rinlo-plan-v01 .rp-primary-status svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}

      #actions.rinlo-plan-v01 .rp-section{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:18px 0 8px}
      #actions.rinlo-plan-v01 .rp-section h2{margin:0!important;font-size:14.5px!important;line-height:1.2!important;font-weight:600!important;color:#172027!important}
      #actions.rinlo-plan-v01 .rp-section span{font-size:9.2px;color:#818C90}
      #actions.rinlo-plan-v01 .rp-support{display:flex;align-items:flex-start;gap:11px;padding:13px;border:1px solid #E3E9E6;border-radius:17px;background:#fff}
      #actions.rinlo-plan-v01 .rp-support-icon{width:36px;height:36px;flex:0 0 36px;border-radius:12px;background:#EEF5F1;color:#2E7D64;display:grid;place-items:center}
      #actions.rinlo-plan-v01 .rp-support-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #actions.rinlo-plan-v01 .rp-support b{display:block;font-size:12px;font-weight:650;color:#172027}
      #actions.rinlo-plan-v01 .rp-support p{margin:3px 0 0;font-size:10px;line-height:1.4;color:#74807C}
      #actions.rinlo-plan-v01 .rp-empty{padding:13px;border:1px dashed #DCE4E0;border-radius:16px;background:rgba(255,255,255,.55);font-size:10.5px;line-height:1.45;color:#74807C}
      #actions.rinlo-plan-v01 .rp-focus-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #actions.rinlo-plan-v01 .rp-focus-card{min-width:0;padding:12px;border:1px solid #E3E9E6;border-radius:16px;background:#fff}
      #actions.rinlo-plan-v01 .rp-focus-icon{width:25px;height:25px;margin-bottom:8px;color:#2E7D64}
      #actions.rinlo-plan-v01 .rp-focus-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.75}
      #actions.rinlo-plan-v01 .rp-focus-card b{display:block;font-size:11px;line-height:1.25;color:#26312D}
      #actions.rinlo-plan-v01 .rp-focus-card small{display:block;margin-top:4px;font-size:9px;line-height:1.3;color:#7B8682}
      #actions.rinlo-plan-v01 .rp-insight{position:relative;margin-top:16px;padding:13px 13px 13px 42px;border:1px solid #DDE8E2;border-radius:17px;background:#F7FAF8}
      #actions.rinlo-plan-v01 .rp-insight-icon{position:absolute;left:13px;top:13px;width:21px;height:21px;color:#2E7D64}
      #actions.rinlo-plan-v01 .rp-insight-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.75}
      #actions.rinlo-plan-v01 .rp-insight b{font-size:10.5px;font-weight:650;color:#2F6654}
      #actions.rinlo-plan-v01 .rp-insight p{margin:3px 0 0;font-size:10.5px;line-height:1.42;color:#5F6D72}
      #actions.rinlo-plan-v01 .rp-adapt{width:100%;min-height:46px;margin-top:11px;border:1px solid #DDE5E1;border-radius:14px;background:#fff;color:#243036;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}
      #actions.rinlo-plan-v01 .rp-adapt svg{width:17px;height:17px;fill:none;stroke:#2E7D64;stroke-width:1.8}
      #actions.rinlo-plan-v01 .rp-finish{width:100%;min-height:44px;margin-top:8px;border:0;border-radius:14px;background:#EEF3F0;color:#586469;font-size:11px;font-weight:600}
      #actions.rinlo-plan-v01 .rp-legacy-anchor{display:none!important}
      @media(max-width:360px){#actions.rinlo-plan-v01{padding-left:14px!important;padding-right:14px!important}.rp-focus-grid{grid-template-columns:1fr!important}}
    `;
    doc.head.appendChild(style);
  }

  function build(doc) {
    const el = doc.getElementById('actions');
    if (!el) return;
    const wasActive = el.classList.contains('on');
    el.className = `screen rinlo-plan-v01${wasActive ? ' on' : ''}`;
    el.dataset.rinloPlan = 'core-v1';
    el.innerHTML = `
      <div class="rp-top"><div class="rinlo-wordmark">Rinlo<span class="rinlo-wordmark-dot"></span></div><div class="rp-kicker">План</div></div>
      <div class="rp-heading"><h1>Ваш план</h1><div class="sub">Один главный шаг. Остальное — только поддержка, если она сегодня пригодится.</div></div>
      <div class="rp-date"><button onclick="shiftDay(-1)" aria-label="Предыдущий день">${icons.left}</button><span id="actionsDate">сегодня</span><button onclick="shiftDay(1)" aria-label="Следующий день">${icons.right}</button></div>
      <div id="actionHero" class="card"></div>
      <div id="rinloPlanSupportSection"><div class="rp-section"><h2>Поддержка</h2><span>необязательно</span></div><div id="actionsList"></div></div>
      <div id="rinloPlanFocusSection"><div class="rp-section"><h2>Личные фокусы</h2><span>до двух</span></div><div id="rinloPlanFocuses" class="rp-focus-grid"></div></div>
      <div class="rp-insight"><span class="rp-insight-icon">${icons.spark}</span><b>Почему план такой</b><p id="actionsCoach"></p></div>
      <button class="rp-adapt" onclick="rinloAdaptPlan()">${icons.refresh}<span>Адаптировать план</span></button>
      <button class="rp-finish" onclick="finishDay()">Подвести спокойный итог дня</button>
      <div id="rinloWeekStats" class="rp-legacy-anchor"></div>
    `;
  }

  function primaryMarkup(action) {
    if (!action) {
      return `<div data-rinlo-plan-primary="empty"><div class="rp-primary-kicker">${icons.spark}<span>Главный шаг</span></div><div class="rp-primary-title">Rinlo подберёт один следующий шаг</div><div class="rp-primary-text">Ответьте на короткий check-in — или подберите действие без него, если сегодня не хочется ничего заполнять.</div><div class="rp-primary-actions"><button class="rp-primary-done" onclick="rinloCoreSkipCheckin()">Подобрать шаг</button></div></div>`;
    }
    const done = action.status === 'completed';
    const status = action.status === 'accepted' ? 'Принят на сегодня' : done ? 'Шаг выполнен' : 'Главный шаг';
    return `<div data-rinlo-plan-primary="${esc(action.id || action.serverId || action.kind || 'action')}">
      <div class="rp-primary-kicker">${actionIcon(action.kind)}<span>${esc(status)}</span></div>
      <div class="rp-primary-title">${esc(action.title || 'Небольшой следующий шаг')}</div>
      <div class="rp-primary-text">${esc(action.rationale || 'Rinlo выбрал один реалистичный шаг по текущему контексту.')}</div>
      ${action.effortMinutes ? `<span class="rp-effort">≈ ${Math.round(Number(action.effortMinutes))} мин</span>` : ''}
      ${done
        ? `<div class="rp-primary-status">${icons.check}<span>На сегодня достаточно</span></div>`
        : `<div class="rp-primary-actions"><button class="rp-primary-done" onclick="rinloCoreCompleteAction()">Сделано</button><button class="rp-primary-alt" onclick="rinloCoreReplaceAction()">Другой вариант</button></div>`}
    </div>`;
  }

  function contextCopy(primary, support) {
    const adaptation = primary?.context?.adaptation;
    if (adaptation?.effortReduced) return 'Вчера план ощущался перегруженным, поэтому сегодняшний главный шаг короче.';
    if (adaptation?.avoidedPreviousKind) return 'Rinlo не повторил тип действия, который в прошлый раз оказался не очень полезным.';
    if (support) return 'Главный шаг остаётся центром плана. Поддерживающее действие можно пропустить без ощущения, что день «не выполнен».';
    if (primary?.status === 'completed') return 'Главный шаг уже выполнен. Добавлять новые обязательства только ради заполненного списка не нужно.';
    return 'Rinlo держит план коротким и меняет его только когда новый контекст действительно важен.';
  }

  function renderPlan(doc) {
    const win = doc.defaultView;
    if (!win) return;
    const db = readDb(win);
    const key = viewDay(win);
    const day = db.days?.[key] || { events: [], water: 0, steps: 0, habits: {}, rinloActions: [] };
    const profile = db.profile || {};
    const primary = primaryAction(day);
    const support = supportingAction(win, day, profile, primary);
    const focuses = personalFocuses(profile, day);

    const date = doc.getElementById('actionsDate');
    if (date) date.textContent = key === localDayKey() ? 'сегодня' : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${key}T12:00:00`));

    const hero = doc.getElementById('actionHero');
    const primaryHtml = primaryMarkup(primary);
    if (hero && hero.innerHTML !== primaryHtml) hero.innerHTML = primaryHtml;

    const list = doc.getElementById('actionsList');
    const supportHtml = support
      ? `<div class="rp-support" data-rinlo-plan-support="${esc(support.kind)}"><div class="rp-support-icon">${support.icon}</div><div><b>${esc(support.title)}</b><p>${esc(support.text)}</p></div></div>`
      : `<div class="rp-empty" data-rinlo-plan-support="none">Дополнительного шага сейчас не требуется. Один главный action — уже полноценный план.</div>`;
    if (list && list.innerHTML !== supportHtml) list.innerHTML = supportHtml;

    const focusBox = doc.getElementById('rinloPlanFocuses');
    const focusHtml = focuses.map((focus) => `<div class="rp-focus-card"><div class="rp-focus-icon">${icons.focus}</div><b>${esc(focus.label)}</b><small>${esc(focus.detail)}</small></div>`).join('');
    if (focusBox && focusBox.innerHTML !== focusHtml) focusBox.innerHTML = focusHtml;
    const focusSection = doc.getElementById('rinloPlanFocusSection');
    if (focusSection) focusSection.style.display = focuses.length ? '' : 'none';

    const coach = doc.getElementById('actionsCoach');
    const copy = contextCopy(primary, support);
    if (coach && coach.textContent !== copy) coach.textContent = copy;

    const root = doc.getElementById('actions');
    if (root) root.dataset.rinloPlanSignature = JSON.stringify({
      key,
      primary: primary ? [primary.id, primary.status, primary.title, primary.effortMinutes, primary.context?.adaptation || null] : null,
      support: support?.kind || null,
      focuses: focuses.map((item) => [item.key, item.detail]),
    });
  }

  function installAdapt(win) {
    if (!win || win.__rinloPlanCoreAdapt === 'v1') return;
    win.__rinloPlanCoreAdapt = 'v1';
    win.rinloAdaptPlan = () => {
      if (typeof win.openSheet !== 'function') return;
      win.openSheet(`
        <h2>Адаптировать план</h2>
        <div class="sub">Главный шаг уже меняется по check-in, событиям дня и прошлому feedback. Здесь можно запросить другой вариант или изменить постоянные фокусы.</div>
        <button class="btn primary full" onclick="closeSheet();rinloCoreReplaceAction()">Другой главный шаг</button>
        <button class="btn secondary full" onclick="closeSheet();restartOnboarding()">Изменить параметры и фокусы</button>
      `);
    };
  }

  function observe(doc) {
    if (doc.__rinloPlanCoreObserver) return;
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      (doc.defaultView?.requestAnimationFrame || setTimeout)(() => {
        queued = false;
        renderPlan(doc);
      });
    };
    const observer = new MutationObserver(queue);
    const plan = doc.getElementById('actions');
    const today = doc.getElementById('today');
    if (plan) observer.observe(plan, { subtree: true, childList: true, characterData: true });
    if (today) observer.observe(today, { subtree: true, childList: true, characterData: true });
    doc.__rinloPlanCoreObserver = observer;
  }

  function apply() {
    const doc = frame.contentDocument;
    if (!doc) return;
    const actions = doc.getElementById('actions');
    if (!actions) return;
    if (actions.dataset.rinloPlan !== 'core-v1') {
      ensureStyles(doc);
      build(doc);
    }
    installAdapt(doc.defaultView);
    renderPlan(doc);
    observe(doc);
  }

  frame.addEventListener('load', () => setTimeout(apply, 0));
  setTimeout(apply, 0);
  setTimeout(apply, 250);
})();
