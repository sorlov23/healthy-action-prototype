(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const VERSION = 'v2';
  const KEY = 'healthy-action-v07';
  let mountedDocument = null;

  const icon = {
    food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v7M9 4v7M4.5 7.5h6M7.5 11v9M15 4v7.2c0 1.4.8 2.3 2 2.3h1V20M18 4v9.5"/></svg>',
    water: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.2 6 5.2 10.2a5.2 5.2 0 0 1-10.4 0C6.8 9.5 12 3.5 12 3.5Z"/></svg>',
    steps: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 4.5c1.5 0 2.4 1.5 2 3l-.8 3.2c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.1-1.4-3.4l1.7-3.1c.4-.6 1.1-.9 2.1-.9Zm7.7 7.1c1.4-.2 2.6.9 2.7 2.3l.2 3.5c.1 1.5-1.2 2.7-2.6 2.5l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.3c.2-1.3.9-2.2 2.1-2.4Z"/></svg>',
    weight: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M9 10.5a3 3 0 0 1 6 0M12 10.5l1.6-1.6"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.3 14.5c.4 1.4 1.2 2.2 2.6 2.6-1.4.4-2.2 1.2-2.6 2.6-.4-1.4-1.2-2.2-2.6-2.6 1.4-.4 2.2-1.2 2.6-2.6Z"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h11.5l-3-3M19 16H7.5l3 3"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10.5 12 5l7 5.5V19a1 1 0 0 1-1 1h-4v-5h-4v5H6a1 1 0 0 1-1-1v-8.5Z"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10M7 12h10M7 19h7"/><circle cx="4" cy="5" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="19" r="1"/></svg>',
    trend: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18 9 13l3 3 7-8"/><path d="M15 8h4v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 15.2A7.6 7.6 0 0 1 8.8 5a7.6 7.6 0 1 0 10.2 10.2Z"/></svg>'
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const readDb = (win) => { try { return JSON.parse(win.localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const localDayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const currentDayKey = (win) => win.__haViewDay || localDayKey();
  const activeAction = (day) => (day?.rinloActions || []).find((a) => ['suggested','accepted'].includes(a.status)) || (day?.rinloActions || []).find((a) => a.status === 'completed') || null;
  const totals = (day) => (day?.events || []).reduce((out, event) => {
    if (event?.type === 'food') { out.cal += Number(event.cal || 0); out.protein += Number(event.protein || 0); }
    if (event?.type === 'weight') out.weight = Number(event.weight || 0);
    return out;
  }, { cal:0, protein:0, weight:null });
  const targets = (profile = {}) => {
    const weight = Number(profile.weight || 75);
    const height = Number(profile.height || 170);
    const age = Number(profile.age || 35);
    const sexConst = profile.sex === 'female' ? -161 : profile.sex === 'male' ? 5 : -78;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexConst;
    const mult = profile.activity === 'high' ? 1.6 : profile.activity === 'medium' ? 1.4 : 1.22;
    const maintenance = Math.max(1300, bmr * mult);
    const calories = profile.primaryGoal === 'weight_loss' ? Math.max(1400, maintenance * .85) : maintenance;
    return {
      cal: Math.round(calories / 50) * 50,
      protein: Math.round(Math.max(75, weight * (['weight_loss','nutrition'].includes(profile.primaryGoal) ? 1.6 : 1.25)) / 5) * 5,
      steps: profile.activity === 'low' ? 8000 : 10000,
      water: 2000,
    };
  };
  const percentage = (value, goal) => Math.max(0, Math.min(100, goal ? Number(value || 0) / goal * 100 : 0));
  const goalName = (code) => ({ weight_loss:'Снижение веса', nutrition:'Питание', movement:'Движение', sleep:'Сон', energy:'Энергия', nicotine:'Меньше никотина' }[code] || 'Здоровье');

  function installStyles(doc) {
    doc.getElementById('rinlo-product-ui-v2-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-product-ui-v2-style';
    style.textContent = `
      :root{--r-bg:#F5F5F0;--r-surface:#FFFFFF;--r-ink:#141916;--r-muted:#717A74;--r-faint:#9AA19C;--r-line:#E5E7E2;--r-green:#2E7A60;--r-green-soft:#EFF6F2;--r-dark:#18221E;--r-danger:#A45656}
      html,body{background:var(--r-bg)!important;color:var(--r-ink)!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif!important;-webkit-font-smoothing:antialiased}.app{max-width:430px!important;background:var(--r-bg)!important}.screen{padding:calc(18px + env(safe-area-inset-top)) 18px calc(106px + env(safe-area-inset-bottom))!important;background:var(--r-bg)!important}.fab{display:none!important}button,input,select,textarea{font-family:inherit!important}
      .r2-top{display:flex;align-items:center;justify-content:space-between;min-height:32px}.r2-logo{display:block;width:90px;height:auto}.r2-day{padding:7px 10px;border:1px solid var(--r-line);border-radius:999px;background:#FCFCF9;font-size:9.5px;font-weight:650;color:var(--r-muted)}
      .r2-greeting{margin-top:23px}.r2-greeting h1{margin:0!important;font-size:35px!important;line-height:1.02!important;letter-spacing:-.055em!important;font-weight:650!important;color:var(--r-ink)!important}.r2-greeting p{margin:7px 0 0;font-size:11.5px;line-height:1.45;color:var(--r-muted)}
      .r2-section{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:22px 0 9px}.r2-section h2{margin:0!important;font-size:15px!important;font-weight:650!important;letter-spacing:-.02em!important;color:var(--r-ink)!important}.r2-section span{font-size:9px;color:var(--r-faint)}
      .r2-action{position:relative;overflow:hidden;margin-top:17px;padding:20px;border-radius:26px;background:linear-gradient(145deg,#17221E,#223C32 62%,#2D735A 145%);color:#fff;box-shadow:0 16px 34px rgba(24,38,31,.13)}.r2-action:after{content:'';position:absolute;width:180px;height:180px;border:1px solid rgba(255,255,255,.09);border-radius:50%;right:-88px;top:-105px}.r2-action-kicker{position:relative;z-index:1;display:flex;align-items:center;gap:7px;font-size:9.5px;font-weight:650;color:#ADD1C1}.r2-action-kicker svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}.r2-action h2{position:relative;z-index:1;margin:12px 0 7px!important;max-width:315px;font-size:25px!important;line-height:1.08!important;letter-spacing:-.042em!important;font-weight:650!important;color:#fff!important}.r2-action p{position:relative;z-index:1;margin:0;max-width:325px;font-size:11.5px;line-height:1.5;color:rgba(255,255,255,.72)}.r2-effort{position:relative;z-index:1;display:inline-flex;margin-top:13px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.09);font-size:9px;color:rgba(255,255,255,.8)}.r2-action-buttons{position:relative;z-index:1;display:grid;grid-template-columns:1fr 48px;gap:8px;margin-top:18px}.r2-action-buttons button{height:46px;border-radius:14px;font-size:10.5px;font-weight:650}.r2-complete{border:0;background:#F7FBF8;color:#1E6048}.r2-replace{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;display:grid;place-items:center}.r2-replace svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.r2-why{position:relative;z-index:1;margin-top:10px}.r2-why summary{list-style:none;cursor:pointer;font-size:9px;color:rgba(255,255,255,.56)}.r2-why summary::-webkit-details-marker{display:none}.r2-why div{margin-top:7px;font-size:10px;line-height:1.45;color:rgba(255,255,255,.64)}.r2-feedback{position:relative;z-index:1;margin-top:16px;padding-top:13px;border-top:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:space-between;gap:12px}.r2-feedback span{font-size:10px;color:rgba(255,255,255,.72)}.r2-feedback div{display:flex;gap:6px}.r2-feedback button{height:32px;min-width:40px;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:rgba(255,255,255,.07);color:#fff;font-size:9.5px}
      .r2-checkin{margin-top:11px;padding:13px 14px;border:1px solid var(--r-line);border-radius:19px;background:var(--r-surface)}.r2-checkin-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.r2-checkin-head b{font-size:11.5px;font-weight:650}.r2-checkin-head span{font-size:8.5px;color:var(--r-faint)}.r2-moods{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.r2-mood{height:38px;border:1px solid var(--r-line);border-radius:12px;background:#FAFBF9;color:#68716C;font-size:10px;font-weight:650}.r2-mood.sel{border-color:#ADD0BF;background:var(--r-green-soft);color:var(--r-green)}
      .r2-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.r2-quick button{min-width:0;height:82px;padding:10px 7px;border:1px solid var(--r-line);border-radius:18px;background:var(--r-surface);color:var(--r-ink);text-align:left}.r2-quick-icon{width:31px;height:31px;border-radius:10px;background:var(--r-green-soft);color:var(--r-green);display:grid;place-items:center}.r2-quick-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.r2-quick b{display:block;margin-top:8px;font-size:10px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.r2-quick small{display:block;margin-top:2px;font-size:8px;color:var(--r-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .r2-overview{padding:14px;border:1px solid var(--r-line);border-radius:20px;background:var(--r-surface)}.r2-stat{display:grid;grid-template-columns:70px 1fr auto;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F0F1ED}.r2-stat:last-child{border-bottom:0}.r2-stat-label{font-size:9.5px;color:var(--r-muted)}.r2-track{height:6px;border-radius:999px;background:#EEF0EC;overflow:hidden}.r2-track i{display:block;height:100%;border-radius:inherit;background:var(--r-green)}.r2-stat-value{min-width:72px;text-align:right;font-size:9.5px;font-weight:650;color:#3B443F}.r2-stat-value small{font-size:8px;font-weight:500;color:var(--r-faint)}
      .r2-timeline{border-top:1px solid var(--r-line)}.r2-event{display:grid;grid-template-columns:40px 1fr 28px;gap:9px;padding:13px 0;border-bottom:1px solid var(--r-line)}.r2-event-time{padding-top:2px;font-size:8.5px;color:var(--r-faint)}.r2-event-copy b{display:block;font-size:11px;line-height:1.25;font-weight:600}.r2-event-copy span{display:block;margin-top:3px;font-size:8.8px;color:var(--r-muted)}.r2-event-delete{width:28px;height:28px;border:0;border-radius:9px;background:#EDEFEA;color:#8A928D}.r2-empty{padding:17px 0 4px;font-size:10.5px;line-height:1.5;color:var(--r-muted)}
      .r2-soft{margin-top:18px;padding:13px 14px;border:1px solid #DDE4DF;border-radius:18px;background:#F0F4F1;display:flex;align-items:center;gap:11px}.r2-soft-icon{width:33px;height:33px;flex:0 0 33px;border-radius:11px;background:#fff;color:#53645B;display:grid;place-items:center}.r2-soft-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.r2-soft-copy{min-width:0;flex:1}.r2-soft-copy b{display:block;font-size:10.5px;font-weight:650}.r2-soft-copy span{display:block;margin-top:3px;font-size:8.8px;line-height:1.35;color:var(--r-muted)}.r2-soft button{height:35px;padding:0 10px;border:0;border-radius:10px;background:var(--r-dark);color:#fff;font-size:9px;font-weight:650}
      .nav{left:50%!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;width:min(398px,calc(100vw - 28px))!important;height:68px!important;padding:6px!important;border:1px solid var(--r-line)!important;border-radius:22px!important;background:#FFF!important;box-shadow:0 14px 36px rgba(31,43,36,.11)!important}.nav button{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:16px!important;color:#959C98!important;font-size:8px!important;font-weight:600!important}.nav button b{display:none!important}.nav button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nav button.active{background:var(--r-green-soft)!important;color:var(--r-green)!important}
      .overlay{background:rgba(18,24,21,.34)!important;backdrop-filter:blur(2px)}.sheet{width:min(430px,100vw)!important;max-height:88vh!important;border-radius:29px 29px 0 0!important;padding:10px 18px calc(24px + env(safe-area-inset-bottom))!important;background:#FBFCFA!important;box-shadow:0 -20px 60px rgba(16,25,20,.18)!important}.handle{width:36px!important;height:4px!important;background:#D5DAD6!important;margin:2px auto 18px!important}.sheet h2{font-size:24px!important;line-height:1.1!important;letter-spacing:-.04em!important;font-weight:650!important}.sheet .sub{font-size:11px!important;line-height:1.45!important;color:var(--r-muted)!important}.sheet .field label{font-size:9.5px!important;color:var(--r-muted)!important}.sheet input,.sheet textarea,.sheet select{border:1px solid var(--r-line)!important;border-radius:15px!important;background:#fff!important;box-shadow:none!important}.sheet .btn,.sheet button.rsf-primary{min-height:48px!important;border-radius:15px!important}.sheet .primary,.rsf-primary{background:var(--r-dark)!important;color:#fff!important}
      .rsf-head h2{font-size:24px!important}.rsf-kicker{color:var(--r-green)!important}.rsf-mode{border-color:var(--r-line)!important;border-radius:17px!important;background:#fff!important}.rsf-mode.active{border-color:#B3D2C3!important;background:var(--r-green-soft)!important}.rsf-input{border-color:var(--r-line)!important;background:#fff!important}.rsf-chip{background:var(--r-green-soft)!important;color:var(--r-green)!important}.rsf-portion button.active{border-color:#A9CDBB!important;background:var(--r-green-soft)!important;color:var(--r-green)!important}.rer-option{border-color:var(--r-line)!important;border-radius:14px!important;font-weight:600!important}.rer-option.sel{border-color:#A9CDBB!important;background:var(--r-green-soft)!important;color:var(--r-green)!important}
      #onboarding.rpr-onboarding{background:var(--r-bg)!important;padding:max(20px,env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))!important}.rpr-logo{width:90px!important}.rpr-stage{padding-top:40px!important}.rpr-eyebrow{font-size:10px!important;color:var(--r-green)!important}.rpr-title{font-size:38px!important;line-height:1.01!important;letter-spacing:-.055em!important;font-weight:650!important;color:var(--r-ink)!important}.rpr-title span{color:var(--r-green)!important}.rpr-lead{font-size:13px!important;line-height:1.5!important;color:var(--r-muted)!important}.rpr-value-row,.rpr-goal{border-color:var(--r-line)!important;border-radius:19px!important;background:#fff!important;box-shadow:none!important}.rpr-value-icon,.rpr-goal-icon{background:var(--r-green-soft)!important;color:var(--r-green)!important}.rpr-goal.sel{border-color:#A9CDBB!important;background:#F8FAF8!important}.rpr-primary{background:var(--r-dark)!important;border-radius:16px!important}.rpr-option{border-color:var(--r-line)!important;border-radius:14px!important}.rpr-option.sel{border-color:#A9CDBB!important;background:var(--r-green-soft)!important;color:var(--r-green)!important}.rpr-magic{border-color:#D9E4DE!important;border-radius:24px!important;background:#EDF5F1!important}.rpr-keep{background:var(--r-dark)!important}.rpr-other{border-color:var(--r-line)!important;color:#435149!important}
      #actions.rinlo-plan-v01,#progress.rinlo-insights-v01,#profile.rinlo-profile-v01{background:var(--r-bg)!important;padding:calc(18px + env(safe-area-inset-top)) 18px calc(106px + env(safe-area-inset-bottom))!important}.rinlo-wordmark{font-size:0!important;width:90px!important;height:28px!important;background:url('./rinlo-logo.svg?rev=31') left center/contain no-repeat!important}.rinlo-wordmark-dot{display:none!important}.rp-kicker,.ri-kicker,.rpf-kicker{font-size:9px!important;color:var(--r-faint)!important}.rp-heading h1,.ri-heading h1,.rpf-heading h1{font-size:30px!important;line-height:1.05!important;letter-spacing:-.045em!important;font-weight:650!important;color:var(--r-ink)!important}.rp-heading .sub,.ri-heading .sub,.rpf-heading .sub{font-size:11px!important;line-height:1.45!important;color:var(--r-muted)!important}.rp-date button{background:#fff!important;border:1px solid var(--r-line)!important;border-radius:10px!important}.rp-section h2,.ri-section h2,.rpf-section h2{font-size:14px!important;font-weight:650!important}.rp-section span,.ri-section span,.rpf-section span{font-size:9px!important;color:var(--r-faint)!important}#actions.rinlo-plan-v01 #actionHero,.ri-hero{border-radius:25px!important;background:linear-gradient(145deg,#17221E,#223C32 62%,#2D735A 145%)!important;box-shadow:0 16px 34px rgba(24,38,31,.12)!important}.rp-week-card,.ri-stat,.ri-weight,.rpf-context,.rpf-card,.rpf-action{border-color:var(--r-line)!important;border-radius:17px!important;background:#fff!important}.rp-insight,.ri-insight,.rpf-sync{border-color:#DDE4DF!important;border-radius:17px!important;background:#F0F4F1!important}.rpf-prototype{display:none!important}
      @media(max-width:360px){.screen{padding-left:14px!important;padding-right:14px!important}.r2-greeting h1{font-size:32px!important}.r2-action h2{font-size:23px!important}.r2-quick{gap:6px}.nav{width:calc(100vw - 20px)!important}}
    `;
    doc.head.appendChild(style);
  }

  function installNavigation(doc, win) {
    const nav = doc.getElementById('nav');
    if (!nav) return;
    const tabs = [ ['today','Сегодня',icon.home], ['actions','План',icon.list], ['progress','Прогресс',icon.trend], ['profile','Профиль',icon.user] ];
    nav.innerHTML = tabs.map(([id,label,svg],i) => `<button type="button" data-rinlo-nav="${id}" class="${i===0?'active':''}" onclick="rinloProductGo('${id}')">${svg}<span>${label}</span></button>`).join('');
    win.rinloProductGo = (id) => {
      win.show?.(id);
      nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.rinloNav === id));
      win.render?.();
      doc.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('on', screen.id === id));
      if (id === 'today') renderToday(doc, win);
    };
  }

  function renderAction(action, checkin) {
    if (!action) return `<section class="r2-action" data-testid="today-primary-action"><div class="r2-action-kicker">${icon.spark}<span>На сегодня</span></div><h2>${checkin?'Подбираем подходящий шаг':'Сначала отметь самочувствие'}</h2><p>${checkin?'Нужен только один небольшой шаг, а не новый список задач.':'Это займёт один тап и поможет не предлагать лишнего.'}</p>${checkin?'':`<div class="r2-action-buttons"><button class="r2-complete" onclick="rinloCoreSkipCheckin()">Продолжить без ответа</button></div>`}</section>`;
    const completed = action.status === 'completed';
    return `<section class="r2-action" data-testid="today-primary-action"><div class="r2-action-kicker">${icon.spark}<span>${completed?'Готово на сегодня':'Один шаг на сегодня'}</span></div><h2>${esc(action.title)}</h2><p>${esc(action.rationale || 'Небольшой шаг, который подходит текущему дню.')}</p>${action.effortMinutes?`<span class="r2-effort">≈ ${Number(action.effortMinutes)} мин</span>`:''}${completed?`<div class="r2-feedback"><span>Этот шаг помог?</span><div><button onclick="rinloCoreActionFeedback(true)">Да</button><button onclick="rinloCoreActionFeedback(false)">Нет</button></div></div>`:`<div class="r2-action-buttons"><button class="r2-complete" data-testid="complete-action" onclick="rinloCoreCompleteAction()">Готово</button><button class="r2-replace" aria-label="Другой вариант" onclick="rinloCoreReplaceAction()">${icon.swap}</button></div><details class="r2-why"><summary>Почему именно это</summary><div>${esc(action.rationale || '')}</div></details>`}</section>`;
  }

  function renderCheckin(checkin) {
    return `<section class="r2-checkin" data-testid="today-checkin"><div class="r2-checkin-head"><b>Как ты сегодня?</b><span>${checkin?'можно изменить':'один быстрый ответ'}</span></div><div class="r2-moods"><button class="r2-mood ${checkin?.wellbeing==='poor'?'sel':''}" onclick="rinloCoreCheckin('poor')">Мало сил</button><button class="r2-mood ${checkin?.wellbeing==='okay'?'sel':''}" onclick="rinloCoreCheckin('okay')">Нормально</button><button class="r2-mood ${['good','great'].includes(checkin?.wellbeing)?'sel':''}" onclick="rinloCoreCheckin('good')">Хорошо</button></div></section>`;
  }

  function renderToday(doc, win) {
    const root = doc.getElementById('today');
    if (!root) return;
    const wasVisible = root.classList.contains('on');
    const db = readDb(win);
    const key = currentDayKey(win);
    const day = db.days?.[key] || { events:[], water:0, steps:0, rinloActions:[] };
    const profile = db.profile || {};
    const sum = totals(day);
    const goal = targets(profile);
    const action = activeAction(day);
    const checkin = day.rinloCheckin || null;
    const isToday = key === localDayKey();
    const date = new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${key}T12:00:00`));
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    const events = [...(day.events || [])].sort((a,b) => String(b.time).localeCompare(String(a.time))).slice(0,5);
    const detailsComplete = profile.detailsComplete === true;
    const actionHtml = renderAction(action, checkin);
    const checkinHtml = renderCheckin(checkin);
    const primaryFlow = checkin ? `${actionHtml}${checkinHtml}` : `${checkinHtml}${actionHtml}`;

    const quick = `<div class="r2-section"><h2>Быстро добавить</h2><span>в пару касаний</span></div><div class="r2-quick" data-testid="quick-actions"><button data-testid="quick-food" onclick="openFood()"><span class="r2-quick-icon">${icon.food}</span><b>Еда</b><small>${sum.cal?`${Math.round(sum.cal)} ккал`:'добавить'}</small></button><button data-testid="quick-water" onclick="addWater(250)"><span class="r2-quick-icon">${icon.water}</span><b>Вода</b><small>${Number(day.water||0)} мл</small></button><button data-testid="quick-steps" onclick="addSteps(1000)"><span class="r2-quick-icon">${icon.steps}</span><b>Шаги</b><small>${Number(day.steps||0).toLocaleString('ru-RU')}</small></button><button data-testid="quick-weight" onclick="openWeight()"><span class="r2-quick-icon">${icon.weight}</span><b>Вес</b><small>${sum.weight?`${sum.weight} кг`:'добавить'}</small></button></div>`;

    const rows = [
      ...(detailsComplete && profile.calorieTrackingEnabled !== false ? [['Калории',sum.cal,goal.cal,'ккал']] : []),
      ['Белок',sum.protein,goal.protein,'г'], ['Шаги',day.steps||0,goal.steps,''], ['Вода',day.water||0,goal.water,'мл']
    ].map(([label,value,target,unit]) => `<div class="r2-stat"><span class="r2-stat-label">${label}</span><span class="r2-track"><i style="width:${percentage(value,target)}%"></i></span><span class="r2-stat-value">${Math.round(Number(value||0)).toLocaleString('ru-RU')} <small>${unit}${target?` / ${Math.round(target).toLocaleString('ru-RU')}`:''}</small></span></div>`).join('');
    const overview = detailsComplete ? `<div class="r2-section"><h2>Ориентиры</h2><span>просто контекст</span></div><div class="r2-overview" data-testid="today-overview">${rows}</div>` : `<div class="r2-section"><h2>Ориентиры</h2><span>необязательно</span></div><div class="r2-soft"><div class="r2-soft-icon">${icon.spark}</div><div class="r2-soft-copy"><b>Можно настроить точнее</b><span>Параметры нужны только для персональных ориентиров.</span></div><button onclick="rinloProductOpenPrecision()">Настроить</button></div>`;

    const timeline = `<div class="r2-section"><h2>За сегодня</h2><span>${events.length?`${events.length} последних`:'пока пусто'}</span></div><div class="r2-timeline" data-testid="today-timeline">${events.length?events.map((event)=>`<div class="r2-event"><span class="r2-event-time">${new Date(event.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span><div class="r2-event-copy"><b>${event.type==='food'?esc(event.text):'Вес'}</b><span>${event.type==='food'?`≈ ${Math.round(event.cal||0)} ккал · ${Math.round(event.protein||0)} г белка`:`${event.weight} кг`}</span></div><button class="r2-event-delete" aria-label="Удалить" onclick="delEvent(${Number(event.id)})">×</button></div>`).join(''):`<div class="r2-empty">Здесь появятся только полезные записи дня. Ничего заполнять «для галочки» не нужно.</div>`}</div>`;

    const evening = isToday ? `<div class="r2-soft"><div class="r2-soft-icon">${icon.moon}</div><div class="r2-soft-copy"><b>${day.closed?'День завершён':'Вечером — короткий итог'}</b><span>${day.closed?'Ответы сохранены и помогут следующему дню.':'Два ответа, чтобы завтра план был точнее.'}</span></div>${day.closed?'':`<button onclick="rinloProductGo('actions')">Позже</button>`}</div>` : '';

    root.className = `screen r2-today${wasVisible?' on':''}`;
    root.dataset.rinloProductUi = VERSION;
    root.innerHTML = `<div class="r2-top"><img class="r2-logo" src="./rinlo-logo.svg?rev=31" alt="Rinlo"><span class="r2-day">${isToday?'Сегодня':'История'}</span></div><div class="r2-greeting"><h1>${greeting}</h1><p>${esc(date)} · ${goalName(profile.primaryGoal)}</p></div>${primaryFlow}${quick}${overview}${timeline}${evening}`;
  }

  function wrapToday(doc, win) {
    if (win.__rinloProductUiTodayHook === VERSION || typeof win.renderToday !== 'function') return;
    const original = win.renderToday.bind(win);
    win.renderToday = (...args) => {
      const result = original(...args);
      renderToday(doc, win);
      return result;
    };
    win.__rinloProductUiTodayHook = VERSION;
  }

  function markOtherScreens(doc) {
    ['actions','progress','profile'].forEach((id) => {
      const el = doc.getElementById(id);
      if (el) el.dataset.rinloProductUi = VERSION;
    });
  }

  function mount(attempt = 0) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.body || !win || typeof win.renderToday !== 'function' || !doc.getElementById('nav')) {
      if (attempt < 100) setTimeout(() => mount(attempt + 1), 70);
      return;
    }
    if (mountedDocument !== doc) {
      mountedDocument = doc;
      installStyles(doc);
      installNavigation(doc, win);
      wrapToday(doc, win);
      markOtherScreens(doc);
      win.__rinloProductUi = VERSION;
    }
    renderToday(doc, win);
  }

  frame.addEventListener('load', () => setTimeout(() => mount(), 0));
  setTimeout(() => mount(), 0);
  setTimeout(() => mount(), 300);
  setTimeout(() => mount(), 900);
})();