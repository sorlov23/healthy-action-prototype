(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const icons = {
    left: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5.5 5 5.5"/></svg>`,
    right: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5.5-5 5.5"/></svg>`,
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    focus: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2.8v2.3M21.2 12h-2.3M12 21.2v-2.3M2.8 12h2.3"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 8.4A7 7 0 1 0 19 14"/><path d="M18.2 4.8v3.8h-3.8"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.3 3.4 3.4 7.7-8"/></svg>`
  };

  const readDb = win => {
    try { return JSON.parse(win.localStorage.getItem('healthy-action-v07') || '{}'); }
    catch { return {}; }
  };

  const shiftKey = (k,n) => {
    const d = new Date(k + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0,10);
  };

  function ensureStyles(doc) {
    doc.getElementById('rinlo-plan-v01-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-plan-v01-style';
    style.textContent = `
      #actions.rinlo-plan-v01{
        min-height:100vh!important;
        padding:max(16px,env(safe-area-inset-top)) 18px calc(104px + env(safe-area-inset-bottom))!important;
        background:radial-gradient(circle at 108% 0%,rgba(154,185,172,.12),transparent 28%),linear-gradient(180deg,#F8FAF9 0%,#F4F7F5 100%)!important;
        color:#172027;
        font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important;
      }
      #actions.rinlo-plan-v01 .rp-top{display:flex;align-items:center;justify-content:space-between;min-height:32px;margin-bottom:16px}
      #actions.rinlo-plan-v01 .rinlo-wordmark{position:relative;display:inline-block;padding-right:8px;font-size:26px;font-weight:600;line-height:1;letter-spacing:-.045em;color:#0F1720}
      #actions.rinlo-plan-v01 .rinlo-wordmark-dot{position:absolute;width:6px;height:6px;right:0;top:6px;border-radius:50%;background:#2E7D64}
      #actions.rinlo-plan-v01 .rp-kicker{font-size:10px;font-weight:600;color:#7C888B;letter-spacing:.01em}
      #actions.rinlo-plan-v01 .rp-heading{margin-bottom:10px}
      #actions.rinlo-plan-v01 .rp-heading h1{margin:0 0 5px!important;font-size:24px!important;line-height:1.13!important;font-weight:600!important;letter-spacing:-.035em!important;color:#172027!important}
      #actions.rinlo-plan-v01 .rp-heading .sub{font-size:12.5px!important;line-height:1.43!important;color:#68757A!important;max-width:330px}
      #actions.rinlo-plan-v01 .rp-date{display:grid;grid-template-columns:28px 1fr 28px;align-items:center;margin:0 0 9px}
      #actions.rinlo-plan-v01 .rp-date button{width:28px;height:28px;border:0;border-radius:10px;background:transparent;color:#929B9E;display:grid;place-items:center;padding:0}
      #actions.rinlo-plan-v01 .rp-date svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      #actions.rinlo-plan-v01 #actionsDate{text-align:center;font-size:11px;font-weight:600;color:#596468}

      #actions.rinlo-plan-v01 #actionHero{
        position:relative;overflow:hidden;margin:0!important;border:0!important;border-radius:22px!important;padding:17px 16px 15px!important;color:#fff!important;
        background:radial-gradient(circle at 82% 18%,rgba(118,170,151,.32),transparent 18%),radial-gradient(circle at 106% 90%,rgba(76,142,120,.30),transparent 34%),linear-gradient(145deg,#122126 0%,#0F1B1F 48%,#173D35 100%)!important;
        box-shadow:0 10px 28px rgba(15,23,32,.075)!important;
      }
      #actions.rinlo-plan-v01 #actionHero::before{content:'';position:absolute;width:250px;height:116px;right:-104px;top:50px;border-radius:50%;border:1px solid rgba(186,213,202,.15);transform:rotate(-24deg);pointer-events:none}
      #actions.rinlo-plan-v01 #actionHero .k{position:relative;z-index:1;color:#B8D7CA!important;font-size:10px!important;font-weight:600!important;letter-spacing:.01em!important;text-transform:none!important;margin-bottom:7px}
      #actions.rinlo-plan-v01 #actionHero .heroTitle{position:relative;z-index:1;margin:0 0 6px!important;max-width:294px;font-size:21px!important;line-height:1.16!important;font-weight:600!important;letter-spacing:-.028em!important;color:#fff!important}
      #actions.rinlo-plan-v01 #actionHero .sub{position:relative;z-index:1;max-width:296px;font-size:12px!important;line-height:1.46!important;color:rgba(255,255,255,.72)!important}

      #actions.rinlo-plan-v01 .rp-section{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:18px 0 8px}
      #actions.rinlo-plan-v01 .rp-section h2{margin:0!important;font-size:14.5px!important;line-height:1.2!important;font-weight:600!important;color:#172027!important}
      #actions.rinlo-plan-v01 .rp-section span{font-size:9.2px;color:#818C90}
      #actions.rinlo-plan-v01 #actionsList{display:grid;gap:7px!important}
      #actions.rinlo-plan-v01 #actionsList .item{min-height:62px!important;padding:10px 11px!important;gap:10px!important;border:1px solid #E4E9E6!important;border-radius:16px!important;background:#fff!important;box-shadow:none!important}
      #actions.rinlo-plan-v01 #actionsList .left{width:34px!important;height:34px!important;flex:0 0 34px!important;border-radius:11px!important;background:#EEF5F1!important;color:#2E7D64!important;display:grid!important;place-items:center!important;font-size:0!important}
      #actions.rinlo-plan-v01 #actionsList .left svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #actions.rinlo-plan-v01 #actionsList .main b{display:block;font-size:11.8px!important;line-height:1.2!important;font-weight:600!important;color:#172027!important}
      #actions.rinlo-plan-v01 #actionsList .main small{display:block;margin-top:2px;font-size:9.2px!important;line-height:1.3!important;color:#788388!important}
      #actions.rinlo-plan-v01 #actionsList .check{appearance:none;-webkit-appearance:none;width:28px!important;height:28px!important;min-width:28px!important;flex:0 0 28px!important;padding:0!important;border:0!important;background:transparent!important;border-radius:50%!important;position:relative;font-size:0!important}
      #actions.rinlo-plan-v01 #actionsList .check::after{content:'';position:absolute;inset:3px;border:1.5px solid #CAD4CF;border-radius:50%}
      #actions.rinlo-plan-v01 #actionsList .check.done::after{background:#2E7D64;border-color:#2E7D64}
      #actions.rinlo-plan-v01 #actionsList .check.done::before{content:'';position:absolute;z-index:1;left:8px;top:8px;width:10px;height:6px;border-left:1.8px solid #fff;border-bottom:1.8px solid #fff;transform:rotate(-45deg)}
      #actions.rinlo-plan-v01 #actionsList .rp-hide{display:none!important}

      #actions.rinlo-plan-v01 .rp-week-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      #actions.rinlo-plan-v01 .rp-week-card{min-width:0;padding:11px 10px 10px;border:1px solid #E4E9E6;border-radius:16px;background:#fff}
      #actions.rinlo-plan-v01 .rp-week-icon{width:23px;height:23px;margin-bottom:8px;color:#2E7D64}
      #actions.rinlo-plan-v01 .rp-week-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
      #actions.rinlo-plan-v01 .rp-week-card strong{display:block;font-size:15px;line-height:1.1;font-weight:600;color:#172027}
      #actions.rinlo-plan-v01 .rp-week-card small{display:block;margin-top:4px;font-size:8.9px;line-height:1.25;color:#7C878B}

      #actions.rinlo-plan-v01 .rp-insight{position:relative;margin-top:9px;padding:13px 13px 13px 42px;border:1px solid #DDE8E2;border-radius:17px;background:#F7FAF8}
      #actions.rinlo-plan-v01 .rp-insight-icon{position:absolute;left:13px;top:13px;width:21px;height:21px;color:#2E7D64}
      #actions.rinlo-plan-v01 .rp-insight-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
      #actions.rinlo-plan-v01 .rp-insight b{font-size:10.5px;font-weight:650;color:#2F6654}
      #actions.rinlo-plan-v01 .rp-insight p{margin:3px 0 0;font-size:10.5px;line-height:1.42;color:#5F6D72}
      #actions.rinlo-plan-v01 .rp-adapt{width:100%;min-height:46px;margin-top:11px;border:1px solid #DDE5E1;border-radius:14px;background:#fff;color:#243036;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}
      #actions.rinlo-plan-v01 .rp-adapt svg{width:17px;height:17px;fill:none;stroke:#2E7D64;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #actions.rinlo-plan-v01 .rp-finish{width:100%;min-height:44px;margin-top:8px;border:0;border-radius:14px;background:#EEF3F0;color:#586469;font-size:11px;font-weight:600}

      @media(max-width:360px){
        #actions.rinlo-plan-v01{padding-left:14px!important;padding-right:14px!important}
        #actions.rinlo-plan-v01 .rp-heading h1{font-size:23px!important}
        #actions.rinlo-plan-v01 #actionHero .heroTitle{font-size:20px!important}
        #actions.rinlo-plan-v01 .rp-week-grid{gap:5px}
      }
    `;
    doc.head.appendChild(style);
  }

  function build(doc) {
    const el = doc.getElementById('actions');
    if (!el) return;
    el.className = 'screen rinlo-plan-v01';
    el.dataset.rinloPlan = 'v01';
    el.innerHTML = `
      <div class="rp-top"><div class="rinlo-wordmark">Rinlo<span class="rinlo-wordmark-dot"></span></div><div class="rp-kicker">План</div></div>
      <div class="rp-heading"><h1>Ваш план</h1><div class="sub">Небольшой набор действий, который меняется вместе с вашим днём.</div></div>
      <div class="rp-date"><button onclick="shiftDay(-1)" aria-label="Предыдущий день">${icons.left}</button><span id="actionsDate">сегодня</span><button onclick="shiftDay(1)" aria-label="Следующий день">${icons.right}</button></div>
      <div id="actionHero" class="card"></div>
      <div class="rp-section"><h2>Сегодня</h2><span>до четырёх действий</span></div>
      <div id="actionsList" class="list"></div>
      <div class="rp-section"><h2>На этой неделе</h2><span>без серий и штрафов</span></div>
      <div id="rinloWeekStats" class="rp-week-grid"></div>
      <div class="rp-insight"><span class="rp-insight-icon">${icons.spark}</span><b>Rinlo заметил</b><p id="actionsCoach"></p></div>
      <button class="rp-adapt" onclick="rinloAdaptPlan()">${icons.refresh}<span>Адаптировать план</span></button>
      <button class="rp-finish" onclick="finishDay()">Подвести спокойный итог дня</button>
    `;
  }

  function iconFor(text) {
    const t = (text || '').toLowerCase();
    if (t.includes('шаг') || t.includes('движ')) return icons.steps;
    if (t.includes('вод')) return icons.water;
    if (t.includes('бел') || t.includes('ед')) return icons.meal;
    return icons.focus;
  }

  function softenActions(doc) {
    const items = [...doc.querySelectorAll('#actionsList .item')];
    let visible = 0;
    items.forEach(item => {
      const b = item.querySelector('.main b');
      const small = item.querySelector('.main small');
      const label = b?.textContent || '';
      if (/ккал/i.test(label)) {
        item.classList.add('rp-hide');
        return;
      }
      item.classList.remove('rp-hide');
      if (visible >= 4) {
        item.classList.add('rp-hide');
        return;
      }
      visible++;
      const left = item.querySelector('.left');
      const expectedIcon = iconFor(label);
      if (left && left.innerHTML !== expectedIcon) left.innerHTML = expectedIcon;

      if (b && /добрать\s*~?\d+\s*г\s*белка/i.test(label)) b.textContent = 'Белковый приём пищи';
      if (b && /ещё\s*\d+\s*шаг/i.test(label)) b.textContent = 'Небольшая прогулка';
      if (small && /не отмечено/i.test(small.textContent || '')) small.textContent = 'Можно отметить вечером';
      if (small && /выполнено/i.test(small.textContent || '')) small.textContent = 'Готово на сегодня';
    });
  }

  function softenHero(doc) {
    const hero = doc.getElementById('actionHero');
    if (!hero) return;
    const k = hero.querySelector('.k');
    const title = hero.querySelector('.heroTitle');
    const sub = hero.querySelector('.sub');
    if (k) k.textContent = 'Фокус на сегодня';
    if (title) {
      const t = title.textContent || '';
      if (/Белок \+ движение/i.test(t)) title.textContent = 'Сбалансировать день';
      else if (/Движение \+ вода/i.test(t)) title.textContent = 'Немного движения';
      else if (/Поддержать ритм/i.test(t)) title.textContent = 'Продолжать в своём ритме';
    }
    if (sub) sub.textContent = 'Rinlo меняет приоритеты по мере того, как появляются реальные записи дня.';
  }

  function renderWeek(doc) {
    const win = doc.defaultView;
    const box = doc.getElementById('rinloWeekStats');
    if (!box || !win) return;
    const db = readDb(win);
    const days = db.days || {};
    const today = new Date().toISOString().slice(0,10);
    let active = 0, movement = 0, focusDays = 0;
    for (let i = 6; i >= 0; i--) {
      const k = shiftKey(today,-i);
      const d = days[k];
      if (!d) continue;
      const hasAction = (d.events || []).length > 0 || (d.steps || 0) > 0 || (d.water || 0) > 0 || Object.values(d.habits || {}).some(Boolean);
      if (hasAction) active++;
      if ((d.steps || 0) > 0) movement++;
      if (Object.values(d.habits || {}).some(Boolean)) focusDays++;
    }
    box.innerHTML = `
      <div class="rp-week-card"><div class="rp-week-icon">${icons.check}</div><strong>${active}</strong><small>дней с полезными действиями</small></div>
      <div class="rp-week-card"><div class="rp-week-icon">${icons.steps}</div><strong>${movement}</strong><small>дней с движением</small></div>
      <div class="rp-week-card"><div class="rp-week-icon">${icons.focus}</div><strong>${focusDays}</strong><small>дней с личными фокусами</small></div>`;
  }

  function installAdapt(win) {
    if (!win || win.rinloAdaptPlan) return;
    win.rinloAdaptPlan = () => {
      if (typeof win.openSheet !== 'function') return;
      win.openSheet(`
        <h2>Адаптировать план</h2>
        <div class="sub">Rinlo уже пересчитывает приоритеты по фактическим данным дня. Здесь можно обновить текущий план или изменить постоянные фокусы.</div>
        <div class="card coach"><b>Без наказаний за отклонения</b><p>Если день пошёл иначе, план становится легче или меняет приоритет — ничего компенсировать не нужно.</p></div>
        <button class="btn primary full" onclick="render();closeSheet();toast('План обновлён по текущим данным')">Обновить по данным дня</button>
        <button class="btn secondary full" onclick="closeSheet();restartOnboarding()">Изменить параметры и фокусы</button>
      `);
    };
  }

  function sync(doc) {
    softenHero(doc);
    softenActions(doc);
    renderWeek(doc);
  }

  function observe(doc) {
    if (doc.__rinloPlanObserver) return;
    const el = doc.getElementById('actions');
    if (!el) return;
    let queued = false;
    let active = true;
    const observer = new MutationObserver(() => {
      if (!active || queued) return;
      queued = true;
      (doc.defaultView?.requestAnimationFrame || setTimeout)(() => {
        queued = false;
        if (!active || doc.__rinloPlanObserver !== observer) return;
        sync(doc);
      });
    });
    const nativeDisconnect = observer.disconnect.bind(observer);
    observer.disconnect = () => {
      active = false;
      nativeDisconnect();
    };
    doc.__rinloPlanObserver = observer;
    observer.observe(el,{subtree:true,childList:true,characterData:true});
  }

  function apply() {
    const doc = frame.contentDocument;
    if (!doc) return;
    const actions = doc.getElementById('actions');
    if (!actions || actions.dataset.rinloPlan === 'v01') return;
    ensureStyles(doc);
    build(doc);
    installAdapt(doc.defaultView);
    if (typeof doc.defaultView?.render === 'function') doc.defaultView.render();
    sync(doc);
    observe(doc);
  }

  frame.addEventListener('load',() => {
    try { setTimeout(apply,0); }
    catch (e) { console.error('Rinlo plan v0.1',e); }
  });
  try { if (frame.contentDocument?.readyState === 'complete') setTimeout(apply,0); }
  catch {}
})();