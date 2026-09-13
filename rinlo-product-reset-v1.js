(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const APP_KEY = 'healthy-action-v07';
  const VERSION = 'v1';
  const goals = [
    ['weight_loss', 'Снизить вес', 'Без жёсткого плана — через небольшие решения в течение дня.', '−kg'],
    ['nutrition', 'Лучше питаться', 'Сделать питание понятнее без требования идеального рациона.', 'N'],
    ['movement', 'Больше двигаться', 'Находить короткие порции движения, которые реально случаются.', '→'],
    ['sleep', 'Лучше спать', 'Спокойнее выстроить вечер и восстановление.', 'Zz'],
    ['energy', 'Больше энергии', 'Подбирать нагрузку под реальное самочувствие.', '⚡'],
    ['nicotine', 'Меньше никотина', 'Снижать автоматичность привычки небольшими шагами.', '○'],
  ];
  const goalNames = Object.fromEntries(goals.map(([code, title]) => [code, title]));
  const draft = { step: 0, primaryGoal: null, energy: 'okay', timeBudgetMinutes: 5 };
  let observer = null;
  let mountedDocument = null;
  let reconcileTimer = null;

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const readDb = (win) => {
    try { return JSON.parse(win.localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  };
  const writeDb = (win, db) => win.localStorage.setItem(APP_KEY, JSON.stringify(db));
  const syncLegacyDb = (win) => { try { win.eval('db = load()'); } catch {} };
  const dayState = (db, day) => {
    db.days ||= {};
    db.days[day] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    return db.days[day];
  };
  const activeAction = (day) => (day?.rinloActions || []).find((action) => ['suggested', 'accepted'].includes(action.status)) || null;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };

  function ensureStyles(doc) {
    if (doc.getElementById('rinlo-product-reset-v1-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-product-reset-v1-style';
    style.textContent = `
      #onboarding.rpr-onboarding{min-height:100vh!important;padding:max(22px,env(safe-area-inset-top)) 20px calc(26px + env(safe-area-inset-bottom))!important;background:#F7F9F8!important;color:#111B18!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important}
      .rpr-shell{min-height:calc(100vh - 54px - env(safe-area-inset-top) - env(safe-area-inset-bottom));display:flex;flex-direction:column}.rpr-top{display:flex;align-items:center;justify-content:space-between;min-height:38px}.rpr-logo{width:104px;height:35px;object-fit:contain;object-position:left center}.rpr-step{font-size:11px;font-weight:600;color:#8A9491}
      .rpr-stage{flex:1;display:flex;flex-direction:column;padding-top:34px}.rpr-eyebrow{margin-bottom:11px;color:#2E8F68;font-size:12px;font-weight:650}.rpr-title{max-width:355px;margin:0!important;font-size:40px!important;line-height:1.01!important;letter-spacing:-.052em!important;font-weight:650!important;color:#111B18!important}.rpr-title span{color:#2E8F68}.rpr-lead{max-width:345px;margin:16px 0 0;font-size:15px;line-height:1.5;color:#75807D}
      .rpr-value{margin-top:30px;display:grid;gap:10px}.rpr-value-row{display:flex;gap:11px;align-items:flex-start;padding:13px 14px;border:1px solid #E3EAE6;border-radius:17px;background:#fff}.rpr-value-icon{width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:#EAF7F0;color:#277A59;display:grid;place-items:center;font-weight:700}.rpr-value-row b{display:block;font-size:12px}.rpr-value-row span{display:block;margin-top:3px;font-size:10.5px;line-height:1.42;color:#7B8682}
      .rpr-footer{position:sticky;bottom:calc(6px + env(safe-area-inset-bottom));display:flex;gap:9px;padding-top:22px;background:linear-gradient(180deg,rgba(247,249,248,0),#F7F9F8 30%)}.rpr-primary{min-height:54px;flex:1;border:0;border-radius:17px;background:#101A18;color:#fff;font-weight:650;font-size:14px}.rpr-back{width:54px;min-height:54px;border:1px solid #E1E8E4;border-radius:17px;background:#fff;color:#60706A;font-size:22px}
      .rpr-goals{display:grid;gap:9px;margin-top:24px}.rpr-goal{width:100%;min-height:76px;border:1px solid #E1E8E4;border-radius:20px;background:#fff;padding:13px 14px;display:flex;align-items:center;gap:12px;text-align:left;color:#111B18}.rpr-goal.sel{border-color:#91CDB2;background:#F2FAF6;box-shadow:0 0 0 2px rgba(46,143,104,.05)}.rpr-goal-icon{width:40px;height:40px;flex:0 0 40px;border-radius:13px;background:#EAF7F0;color:#2E8F68;display:grid;place-items:center;font-size:13px;font-weight:700}.rpr-goal-copy{min-width:0;flex:1}.rpr-goal-copy b{display:block;font-size:14px}.rpr-goal-copy span{display:block;margin-top:3px;font-size:10.5px;line-height:1.35;color:#7A8581}.rpr-radio{width:25px;height:25px;border:1.5px solid #CDD7D2;border-radius:50%;display:grid;place-items:center}.rpr-goal.sel .rpr-radio{border-color:#2E8F68}.rpr-goal.sel .rpr-radio:after{content:'';width:13px;height:13px;border-radius:50%;background:#2E8F68}
      .rpr-context-block{margin-top:25px}.rpr-context-block h2{margin:0 0 10px!important;font-size:15px!important;font-weight:650!important}.rpr-options{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rpr-option{min-width:0;min-height:58px;border:1px solid #E1E8E4;border-radius:16px;background:#fff;padding:8px 6px;color:#65716D;font-size:11px;font-weight:600}.rpr-option.sel{border-color:#8FC9AE;background:#EAF7F0;color:#216E50}.rpr-helper{margin:9px 0 0;font-size:10.5px;line-height:1.4;color:#87918E}
      .rpr-loading{margin-top:28px;padding:24px 20px;border:1px solid #E0EAE5;border-radius:24px;background:#fff}.rpr-loading-dot{width:10px;height:10px;border-radius:50%;background:#2E8F68;box-shadow:0 0 0 8px rgba(46,143,104,.08);animation:rprPulse 1s ease-in-out infinite}.rpr-loading p{margin:18px 0 0;font-size:12px;line-height:1.45;color:#74807B}@keyframes rprPulse{50%{transform:scale(.7);opacity:.55}}
      .rpr-magic{margin-top:28px;padding:22px 20px;border:1px solid #D9E9E1;border-radius:27px;background:linear-gradient(145deg,#F5FBF8,#EAF7F0)}.rpr-magic-kicker{font-size:11px;font-weight:650;color:#277A59}.rpr-magic h2{margin:10px 0 8px!important;font-size:28px!important;line-height:1.09!important;letter-spacing:-.04em!important;color:#111B18!important}.rpr-magic p{margin:0;font-size:13px;line-height:1.5;color:#65726D}.rpr-effort{display:inline-flex;margin-top:13px;padding:6px 9px;border-radius:999px;background:rgba(46,143,104,.09);color:#216E50;font-size:10px;font-weight:650}.rpr-magic-actions{display:grid;gap:8px;margin-top:17px}.rpr-magic-actions button{min-height:49px;border-radius:15px;font-weight:650}.rpr-keep{border:0;background:#249765;color:#fff}.rpr-other{border:1px solid #CFE1D8;background:#fff;color:#2C6B54}
      #today.rpr-today .rpr-day-promise{margin:-2px 0 15px;font-size:11px;line-height:1.42;color:#7C8783}#today.rpr-today .rc-action{margin-top:9px;box-shadow:0 10px 30px rgba(38,88,65,.05)}#today.rpr-today .rpr-why{margin:11px 0 4px;font-size:9.5px;font-weight:650;color:#2C7657;text-transform:uppercase;letter-spacing:.04em}#today.rpr-today .rpr-checkin-compact{margin-top:10px!important;padding:11px 13px!important}#today.rpr-today .rpr-checkin-compact .rc-checkin-head{margin-bottom:7px!important}#today.rpr-today .rpr-precision{margin-top:12px;padding:14px;border:1px dashed #C9DBD2;border-radius:18px;background:#FBFDFC}#today.rpr-today .rpr-precision b{font-size:12px}#today.rpr-today .rpr-precision p{margin:4px 0 10px;font-size:10.5px;line-height:1.42;color:#7B8682}#today.rpr-today .rpr-precision button{height:39px;border:1px solid #D6E3DD;border-radius:12px;background:#fff;color:#2D6E55;font-size:10.5px;font-weight:650;padding:0 12px}
      #profile .rpr-profile-note{margin:0 0 12px;padding:13px;border:1px solid #DCE8E2;border-radius:17px;background:#F5FAF7}#profile .rpr-profile-note b{display:block;font-size:11.5px;color:#245F49}#profile .rpr-profile-note p{margin:4px 0 0;font-size:9.8px;line-height:1.42;color:#708079}
      @media(max-width:360px){.rpr-title{font-size:36px!important}.rpr-goal{min-height:70px}.rpr-options{gap:5px}}
    `;
    doc.head.appendChild(style);
  }

  function minimalProfile(primaryGoal) {
    return {
      weight: '', goal: '', height: '', age: '', activity: 'low', habits: [],
      primaryGoal, secondaryGoals: [], calorieTrackingEnabled: false,
      detailsComplete: false, productResetVersion: VERSION, created: todayKey(),
    };
  }

  function renderWelcome() {
    return `<div class="rpr-stage" id="rprWelcome"><div class="rpr-eyebrow">Здоровье без перегруза</div><h1 class="rpr-title">Не идеальный план.<br><span>Следующий правильный шаг.</span></h1><p class="rpr-lead">Rinlo не просит следить за всем сразу. Он выбирает одно полезное действие под вашу цель и сегодняшний контекст.</p><div class="rpr-value"><div class="rpr-value-row"><div class="rpr-value-icon">1</div><div><b>Один шаг вместо списка задач</b><span>Сегодня важно только то, что реально можно сделать.</span></div></div><div class="rpr-value-row"><div class="rpr-value-icon">↻</div><div><b>Рекомендации меняются</b><span>Если шаг не подошёл или оказался слишком сложным, Rinlo учтёт это дальше.</span></div></div></div></div><div class="rpr-footer"><button class="rpr-primary" type="button" onclick="rinloProductStart()">Показать мой первый шаг →</button></div>`;
  }

  function renderGoals() {
    return `<div class="rpr-stage"><div class="rpr-eyebrow">Одна главная цель</div><h1 class="rpr-title">Что сейчас важнее всего?</h1><p class="rpr-lead">Не нужно настраивать всё здоровье сразу. Начнём с одного направления.</p><div class="rpr-goals">${goals.map(([code,title,desc,icon]) => `<button type="button" class="rpr-goal ${draft.primaryGoal===code?'sel':''}" data-primary-goal="${code}" onclick="rinloProductGoal('${code}')"><span class="rpr-goal-icon">${icon}</span><span class="rpr-goal-copy"><b>${title}</b><span>${desc}</span></span><span class="rpr-radio"></span></button>`).join('')}</div></div><div class="rpr-footer"><button class="rpr-back" type="button" onclick="rinloProductBack()">‹</button><button id="rprNext" class="rpr-primary" type="button" onclick="rinloProductNext()">Продолжить →</button></div>`;
  }

  function renderContext() {
    return `<div class="rpr-stage"><div class="rpr-eyebrow">Сегодняшний контекст</div><h1 class="rpr-title">А сегодня как?</h1><p class="rpr-lead">Два быстрых ответа нужны не для статистики — они меняют первый шаг прямо сейчас.</p><div class="rpr-context-block"><h2>Сколько сил?</h2><div class="rpr-options"><button class="rpr-option ${draft.energy==='low'?'sel':''}" onclick="rinloProductEnergy('low')">Мало сил</button><button class="rpr-option ${draft.energy==='okay'?'sel':''}" onclick="rinloProductEnergy('okay')">Нормально</button><button class="rpr-option ${draft.energy==='high'?'sel':''}" onclick="rinloProductEnergy('high')">Есть энергия</button></div></div><div class="rpr-context-block"><h2>Сколько времени реально есть?</h2><div class="rpr-options"><button class="rpr-option ${draft.timeBudgetMinutes===5?'sel':''}" onclick="rinloProductTime(5)">5 минут</button><button class="rpr-option ${draft.timeBudgetMinutes===15?'sel':''}" onclick="rinloProductTime(15)">15 минут</button><button class="rpr-option ${draft.timeBudgetMinutes===30?'sel':''}" onclick="rinloProductTime(30)">Есть время</button></div><p class="rpr-helper">Rinlo лучше предложит маленький шаг, который случится, чем идеальный план, который останется планом.</p></div></div><div class="rpr-footer"><button class="rpr-back" type="button" onclick="rinloProductBack()">‹</button><button id="rprCreate" class="rpr-primary" type="button" onclick="rinloProductCreateFirst()">Выбрать шаг →</button></div>`;
  }

  function renderMagic(win) {
    const db = readDb(win), action = activeAction(db.days?.[todayKey()]);
    if (!action) return `<div class="rpr-stage"><div class="rpr-eyebrow">Подбираем первый шаг</div><h1 class="rpr-title">Уже почти.</h1><div class="rpr-loading"><div class="rpr-loading-dot"></div><p>Сопоставляем вашу цель, сегодняшнее состояние и реальное время.</p></div></div>`;
    return `<div class="rpr-stage"><div class="rpr-eyebrow">Вот зачем нужен Rinlo</div><h1 class="rpr-title">Один шаг.<br><span>Прямо сейчас.</span></h1><div class="rpr-magic"><div class="rpr-magic-kicker">Сейчас лучше всего</div><h2>${esc(action.title)}</h2><p>${esc(action.rationale)}</p>${action.effortMinutes ? `<span class="rpr-effort">≈ ${Math.round(action.effortMinutes)} мин</span>` : ''}<div class="rpr-magic-actions"><button class="rpr-keep" type="button" onclick="rinloProductEnterApp()">Оставить этот шаг</button><button class="rpr-other" type="button" onclick="rinloProductAnother()">Показать другой вариант</button></div></div></div>`;
  }

  function renderOnboarding(doc, win) {
    const db = readDb(win);
    if (db.profile && draft.step !== 3) return;
    const el = doc.getElementById('onboarding');
    if (!el) return;
    el.className = 'screen on rpr-onboarding';
    const stepText = draft.step === 1 ? '1 из 2' : draft.step === 2 ? '2 из 2' : '';
    const body = draft.step === 0 ? renderWelcome() : draft.step === 1 ? renderGoals() : draft.step === 2 ? renderContext() : renderMagic(win);
    const nextHtml = `<div class="rpr-shell"><div class="rpr-top"><img class="rpr-logo" src="./rinlo-logo.svg?rev=31" alt="Rinlo"><span class="rpr-step">${stepText}</span></div>${body}</div>`;
    if (el.innerHTML !== nextHtml) el.innerHTML = nextHtml;
    doc.querySelectorAll('.screen').forEach((screen) => { if (screen !== el) screen.classList.remove('on'); });
    const nav = doc.getElementById('nav'); if (nav && nav.style.display !== 'none') nav.style.display = 'none';
    const fab = doc.getElementById('fab'); if (fab && fab.style.display !== 'none') fab.style.display = 'none';
  }

  function fitActiveActionToBudget(win) {
    const db = readDb(win), key = win.__haViewDay || todayKey(), day = dayState(db, key);
    const action = activeAction(day), budget = Number(day.rinloTimeBudgetMinutes || 0);
    if (!action || !budget || !Number.isFinite(Number(action.effortMinutes)) || Number(action.effortMinutes) <= budget) return false;
    action.effortMinutes = budget;
    if (budget <= 5) {
      const shortTitles = {
        movement: 'Пройдитесь 5 минут', recovery: 'Возьмите 5 минут без задач', sleep: 'Оставьте 5 спокойных минут перед сном',
        nicotine: 'Отложите следующий никотиновый эпизод на 5 минут', nutrition: 'Добавьте один простой источник белка',
      };
      if (shortTitles[action.kind]) action.title = shortTitles[action.kind];
    }
    const note = `У вас сейчас около ${budget} минут, поэтому Rinlo оставил шаг коротким.`;
    if (!String(action.rationale || '').includes('Rinlo оставил шаг коротким')) action.rationale = `${String(action.rationale || '').trim()} ${note}`.trim();
    action.context = { ...(action.context || {}), timeBudgetMinutes: budget };
    writeDb(win, db); syncLegacyDb(win);
    return true;
  }

  function installBudgetBridge(win) {
    if (win.__rinloProductResetBudget === VERSION) return;
    const wrap = (name) => {
      if (typeof win[name] !== 'function') return;
      const original = win[name].bind(win);
      win[name] = async (...args) => {
        const result = await original(...args);
        if (fitActiveActionToBudget(win)) win.renderToday?.();
        return result;
      };
    };
    wrap('rinloCoreCheckin');
    wrap('rinloCoreReplaceAction');
    wrap('rinloCoreDismissReason');
    win.__rinloProductResetBudget = VERSION;
  }

  function installProgressiveProfileBridge(win, doc) {
    if (win.__rinloProductResetProfileBridge === VERSION || typeof win.rinloCoreOnboardingNext !== 'function') return;
    const original = win.rinloCoreOnboardingNext.bind(win);
    win.rinloCoreOnboardingNext = async (...args) => {
      const finishingDetailedProfile = doc.getElementById('rcOnStep')?.textContent?.trim() === '4 из 4';
      const result = await original(...args);
      if (finishingDetailedProfile) {
        const db = readDb(win), profile = db.profile;
        const numeric = [profile?.weight, profile?.goal, profile?.height, profile?.age].map(Number);
        if (profile && numeric.every(Number.isFinite) && numeric.every((value) => value > 0)) {
          profile.detailsComplete = true;
          profile.productResetVersion = VERSION;
          writeDb(win, db); syncLegacyDb(win);
          win.renderToday?.();
        }
      }
      return result;
    };
    win.__rinloProductResetProfileBridge = VERSION;
  }

  function currentCheckin(win) {
    const db = readDb(win), key = win.__haViewDay || todayKey();
    return db.days?.[key]?.rinloCheckin || null;
  }

  function applyToday(doc, win) {
    const profile = readDb(win).profile;
    if (!profile) return;
    const today = doc.getElementById('today'); if (!today) return;
    today.classList.add('rpr-today');
    const greeting = today.querySelector('.rc-greeting');
    if (greeting && !today.querySelector('.rpr-day-promise')) greeting.insertAdjacentHTML('afterend', '<div class="rpr-day-promise">Один шаг, который лучше всего подходит сейчас. Остальное — только контекст.</div>');

    const checkin = doc.getElementById('rcCheckin');
    const action = doc.getElementById('rcAction');
    if (checkin && action && checkin.parentNode === action.parentNode) {
      if (currentCheckin(win)) {
        if (action.nextElementSibling !== checkin) checkin.parentNode.insertBefore(action, checkin);
        checkin.classList.add('rpr-checkin-compact');
      } else {
        if (checkin.nextElementSibling !== action) action.parentNode.insertBefore(checkin, action);
        checkin.classList.remove('rpr-checkin-compact');
      }
    }
    const actionCard = action?.querySelector('.rc-action');
    if (actionCard) {
      setText(actionCard.querySelector('.rc-action-kicker'), 'Сейчас лучше всего');
      const rationale = actionCard.querySelector('p');
      if (rationale && !actionCard.querySelector('.rpr-why')) rationale.insertAdjacentHTML('beforebegin', '<div class="rpr-why">Почему это сейчас</div>');
    }

    const quick = today.querySelector('.rc-quick');
    const quickSection = quick?.previousElementSibling;
    if (quickSection?.classList.contains('rc-section')) {
      setText(quickSection.querySelector('h2'), 'Добавить контекст');
      setText(quickSection.querySelector('span'), 'необязательно');
    }

    const metrics = doc.getElementById('rcMetrics');
    if (metrics) {
      const wanted = profile.detailsComplete === false ? 'none' : '';
      if (metrics.style.display !== wanted) metrics.style.display = wanted;
    }
    const precision = today.querySelector('.rpr-precision');
    if (profile.detailsComplete === false && quick && !precision) {
      quick.insertAdjacentHTML('afterend', '<div class="rpr-precision"><b>Хотите точнее?</b><p>Вес, рост и другие параметры можно добавить позже. Для первого полезного шага они не обязательны.</p><button type="button" onclick="rinloProductOpenPrecision()">Уточнить параметры</button></div>');
    } else if (profile.detailsComplete !== false && precision) precision.remove();
  }

  function applyProfile(doc, win) {
    const profile = readDb(win).profile;
    if (!profile || profile.detailsComplete !== false) return;
    const root = doc.getElementById('profile'); if (!root) return;
    const heading = root.querySelector('.rpf-heading');
    if (heading && !root.querySelector('.rpr-profile-note')) heading.insertAdjacentHTML('afterend', `<div class="rpr-profile-note"><b>Rinlo уже работает без анкеты</b><p>Сейчас используется ваша цель «${esc(goalNames[profile.primaryGoal] || 'Здоровье')}». Числовые параметры можно добавить только если захотите более точные ориентиры.</p></div>`);
    const grid = root.querySelector('.rpf-context-grid'); if (grid && grid.style.display !== 'none') grid.style.display = 'none';
    const contextCopy = root.querySelector('.rpf-context-copy');
    const copyHtml = '<b>Личный контекст</b><p>Подробные параметры пока не заполнены — и это нормально.</p>';
    if (contextCopy && contextCopy.innerHTML !== copyHtml) contextCopy.innerHTML = copyHtml;
    setText(root.querySelector('#pGoal'), goalNames[profile.primaryGoal] || 'Основная цель выбрана');
    setText(root.querySelector('#pTargets'), 'Добавьте параметры, если захотите видеть числовые ориентиры');
  }

  function wrapToday(win, doc) {
    if (win.__rinloProductResetToday === VERSION || typeof win.renderToday !== 'function') return;
    const original = win.renderToday.bind(win);
    win.renderToday = (...args) => {
      const result = original(...args);
      applyToday(doc, win);
      applyProfile(doc, win);
      return result;
    };
    win.__rinloProductResetToday = VERSION;
  }

  async function waitForAction(win, timeout = 3500) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const db = readDb(win), action = activeAction(db.days?.[todayKey()]);
      if (action) return action;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return null;
  }

  async function createFirstAction(win, doc) {
    const key = todayKey(), db = readDb(win);
    db.profile = minimalProfile(draft.primaryGoal);
    const day = dayState(db, key);
    day.rinloTimeBudgetMinutes = draft.timeBudgetMinutes;
    writeDb(win, db); syncLegacyDb(win);
    const wellbeing = draft.energy === 'low' ? 'poor' : draft.energy === 'high' ? 'good' : 'okay';
    try {
      await win.rinloCoreCheckin?.(wellbeing);
    } catch (error) {
      console.warn('Rinlo Product Reset check-in deferred', error);
    }
    const latest = readDb(win), latestDay = dayState(latest, key);
    latestDay.rinloCheckin = { ...(latestDay.rinloCheckin || {}), energy: draft.energy === 'low' ? 2 : draft.energy === 'high' ? 4 : 3 };
    writeDb(win, latest); syncLegacyDb(win);
    window.RinloServerSync?.enqueue?.({ kind:'checkin-upsert', day:key, payload:{ wellbeing, energy:latestDay.rinloCheckin.energy, sleepQuality:null, sleepMinutes:null, note:null } }, { replaceKey:`checkin:${key}` });
    await waitForAction(win);
    fitActiveActionToBudget(win);
    renderOnboarding(doc, win);
  }

  async function replaceMagicAction(win, doc) {
    try { await win.rinloCoreReplaceAction?.(); }
    catch (error) { console.warn('Rinlo Product Reset replacement deferred', error); }
    await waitForAction(win);
    fitActiveActionToBudget(win);
    renderOnboarding(doc, win);
  }

  function expose(win, doc) {
    win.rinloProductStart = () => { draft.step = 1; renderOnboarding(doc, win); };
    win.rinloProductGoal = (code) => { if (!goalNames[code]) return; draft.primaryGoal = code; renderOnboarding(doc, win); };
    win.rinloProductEnergy = (value) => { if (!['low','okay','high'].includes(value)) return; draft.energy = value; renderOnboarding(doc, win); };
    win.rinloProductTime = (value) => { const n = Number(value); if (![5,15,30].includes(n)) return; draft.timeBudgetMinutes = n; renderOnboarding(doc, win); };
    win.rinloProductBack = () => { draft.step = Math.max(0, draft.step - 1); renderOnboarding(doc, win); };
    win.rinloProductNext = () => { if (!draft.primaryGoal) return win.toast?.('Выберите одну главную цель'); draft.step = 2; renderOnboarding(doc, win); };
    win.rinloProductCreateFirst = () => {
      if (!draft.primaryGoal) return win.toast?.('Сначала выберите цель');
      draft.step = 3;
      renderOnboarding(doc, win);
      void createFirstAction(win, doc).catch((error) => {
        console.warn('Rinlo Product Reset action creation deferred', error);
        win.toast?.('Не удалось подобрать шаг. Попробуйте ещё раз.');
      });
    };
    win.rinloProductAnother = () => { void replaceMagicAction(win, doc); };
    win.rinloProductEnterApp = () => {
      draft.step = 4;
      syncLegacyDb(win);
      win.show?.('today');
      const nav = doc.getElementById('nav'); if (nav) nav.style.display = 'grid';
      const fab = doc.getElementById('fab'); if (fab) fab.style.display = 'block';
      win.renderToday?.(); applyToday(doc, win); applyProfile(doc, win);
    };
    win.rinloProductOpenPrecision = () => win.restartOnboarding?.();
    win.__rinloProductReset = VERSION;
  }

  function reconcile(win, doc) {
    const db = readDb(win);
    if (!db.profile || draft.step === 3) {
      if (!db.profile || !doc.querySelector('.rpr-magic') || !activeAction(db.days?.[todayKey()])) renderOnboarding(doc, win);
      return;
    }
    applyToday(doc, win);
    applyProfile(doc, win);
  }

  function scheduleReconcile(win, doc) {
    if (reconcileTimer) return;
    reconcileTimer = setTimeout(() => {
      reconcileTimer = null;
      reconcile(win, doc);
    }, 0);
  }

  function mount(attempt = 0) {
    const win = frame.contentWindow, doc = frame.contentDocument;
    if (!win || !doc?.head || typeof win.rinloCoreCheckin !== 'function' || typeof win.renderToday !== 'function') {
      if (attempt < 80) setTimeout(() => mount(attempt + 1), 75);
      return;
    }
    if (mountedDocument !== doc) {
      observer?.disconnect();
      mountedDocument = doc;
      ensureStyles(doc); expose(win, doc); installBudgetBridge(win); installProgressiveProfileBridge(win, doc); wrapToday(win, doc);
      observer = new MutationObserver(() => scheduleReconcile(win, doc));
      observer.observe(doc.documentElement, { childList:true, subtree:true });
    }
    ensureStyles(doc); expose(win, doc); installBudgetBridge(win); installProgressiveProfileBridge(win, doc); wrapToday(win, doc);
    reconcile(win, doc);
  }

  frame.addEventListener('load', () => setTimeout(() => mount(), 0));
  setTimeout(() => mount(), 0);
  setTimeout(() => mount(), 250);
})();