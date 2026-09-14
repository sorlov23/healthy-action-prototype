(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const VERSION = 'v1';
  const KEY = 'healthy-action-v07';
  let mountedDoc = null;
  let previousRenderToday = null;

  const svg = {
    food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v7M9 4v7M4.5 7.5h6M7.5 11v9M15 4v7.2c0 1.4.8 2.3 2 2.3h1V20M18 4v9.5"/></svg>',
    water: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.2 6 5.2 10.2a5.2 5.2 0 0 1-10.4 0C6.8 9.5 12 3.5 12 3.5Z"/></svg>',
    steps: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 4.5c1.5 0 2.4 1.5 2 3l-.8 3.2c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.1-1.4-3.4l1.7-3.1c.4-.6 1.1-.9 2.1-.9Zm7.7 7.1c1.4-.2 2.6.9 2.7 2.3l.2 3.5c.1 1.5-1.2 2.7-2.6 2.5l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.3c.2-1.3.9-2.2 2.1-2.4Z"/></svg>',
    weight: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M9 10.5a3 3 0 0 1 6 0M12 10.5l1.6-1.6"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.4 3.5 3.4L18 7.4"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h11.5l-3-3M19 16H7.5l3 3"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.3 14.5c.4 1.4 1.2 2.2 2.6 2.6-1.4.4-2.2 1.2-2.6 2.6-.4-1.4-1.2-2.2-2.6-2.6 1.4-.4 2.2-1.2 2.6-2.6Z"/></svg>',
    today: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10.5 12 5l7 5.5V19a1 1 0 0 1-1 1h-4v-5h-4v5H6a1 1 0 0 1-1-1v-8.5Z"/></svg>',
    plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10M7 12h10M7 19h7"/><circle cx="4" cy="5" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="19" r="1"/></svg>',
    progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18 9 13l3 3 7-8"/><path d="M15 8h4v4"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 15.2A7.6 7.6 0 0 1 8.8 5a7.6 7.6 0 1 0 10.2 10.2Z"/></svg>'
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const readDb = (win) => { try { return JSON.parse(win.localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const localKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const viewKey = (win) => win.__haViewDay || localKey();
  const totals = (day) => (day?.events || []).reduce((acc, event) => {
    if (event?.type === 'food') { acc.cal += Number(event.cal || 0); acc.protein += Number(event.protein || 0); }
    if (event?.type === 'weight') acc.weight = Number(event.weight || 0);
    return acc;
  }, { cal:0, protein:0, weight:null });
  const activeAction = (day) => (day?.rinloActions || []).find((x) => ['suggested','accepted'].includes(x.status)) || (day?.rinloActions || []).find((x) => x.status === 'completed') || null;
  const targetFor = (profile = {}) => {
    const weight = Number(profile.weight || 75), height = Number(profile.height || 170), age = Number(profile.age || 35);
    const sexConstant = profile.sex === 'female' ? -161 : profile.sex === 'male' ? 5 : -78;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexConstant;
    const mult = profile.activity === 'high' ? 1.6 : profile.activity === 'medium' ? 1.4 : 1.22;
    const maintenance = Math.max(1300, bmr * mult);
    const cal = profile.primaryGoal === 'weight_loss' ? Math.max(1400, maintenance * .85) : maintenance;
    return {
      cal: Math.round(cal / 50) * 50,
      protein: Math.round(Math.max(75, weight * (['weight_loss','nutrition'].includes(profile.primaryGoal) ? 1.6 : 1.25)) / 5) * 5,
      steps: profile.activity === 'low' ? 8000 : 10000,
      water: 2000,
    };
  };
  const pct = (value, goal) => Math.max(0, Math.min(100, goal ? Number(value || 0) / goal * 100 : 0));
  const goalLabel = (code) => ({weight_loss:'Снижение веса',nutrition:'Питание',movement:'Движение',sleep:'Сон',energy:'Энергия',nicotine:'Меньше никотина'})[code] || 'Здоровье';

  function installStyle(doc) {
    doc.getElementById('rinlo-product-ui-v1-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-product-ui-v1-style';
    style.textContent = `
      :root{--rx-bg:#F6F6F2;--rx-surface:#FFFFFF;--rx-ink:#151A17;--rx-muted:#737B76;--rx-faint:#959D98;--rx-line:#E6E8E4;--rx-accent:#2F7D62;--rx-accent-2:#DDEDE6;--rx-accent-3:#F0F7F3;--rx-dark:#19231F;--rx-danger:#A45050;--rx-shadow:0 18px 50px rgba(29,42,35,.09)}
      html,body{background:var(--rx-bg)!important;color:var(--rx-ink)!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif!important;-webkit-font-smoothing:antialiased}
      body{overscroll-behavior-y:none}.app{background:var(--rx-bg)!important;max-width:430px!important}.screen{padding:calc(18px + env(safe-area-inset-top)) 18px calc(106px + env(safe-area-inset-bottom))!important;background:var(--rx-bg)!important}
      button,input,select,textarea{font-family:inherit!important}.fab{display:none!important}
      .rx-logo{display:block;width:91px;height:auto}.rx-top{display:flex;align-items:center;justify-content:space-between;min-height:32px}.rx-date-chip{padding:7px 10px;border:1px solid var(--rx-line);border-radius:999px;background:rgba(255,255,255,.7);font-size:10px;font-weight:650;color:var(--rx-muted)}
      .rx-greeting{margin-top:24px}.rx-greeting h1{margin:0!important;font-size:36px!important;line-height:1.02!important;letter-spacing:-.055em!important;font-weight:650!important;color:var(--rx-ink)!important}.rx-greeting p{margin:7px 0 0;font-size:12px;line-height:1.45;color:var(--rx-muted)}
      .rx-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:22px 0 9px}.rx-section-head h2{margin:0!important;font-size:15px!important;line-height:1.2!important;font-weight:650!important;letter-spacing:-.02em!important;color:var(--rx-ink)!important}.rx-section-head span{font-size:9.5px;color:var(--rx-faint)}
      .rx-checkin{margin-top:18px;padding:14px;border:1px solid var(--rx-line);border-radius:20px;background:var(--rx-surface)}.rx-checkin-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.rx-checkin-top b{font-size:12.5px;font-weight:650}.rx-checkin-top span{font-size:9px;color:var(--rx-faint)}.rx-moods{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:11px}.rx-mood{min-height:39px;border:1px solid var(--rx-line);border-radius:13px;background:#FAFBF9;color:#66706A;font-size:10.5px;font-weight:650}.rx-mood.sel{border-color:#AACFBE;background:var(--rx-accent-3);color:var(--rx-accent)}
      .rx-action{position:relative;overflow:hidden;margin-top:12px;padding:20px;border:0;border-radius:27px;background:linear-gradient(145deg,#17221E 0%,#213B31 58%,#2E735B 145%);color:#fff;box-shadow:0 16px 36px rgba(25,42,34,.14)}.rx-action:after{content:'';position:absolute;width:190px;height:190px;right:-90px;top:-110px;border:1px solid rgba(255,255,255,.1);border-radius:50%}.rx-action-kicker{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:650;color:#A9D2C0}.rx-action-kicker svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}.rx-action h2{position:relative;z-index:1;max-width:320px;margin:12px 0 7px!important;font-size:25px!important;line-height:1.08!important;letter-spacing:-.04em!important;font-weight:650!important;color:#fff!important}.rx-action p{position:relative;z-index:1;max-width:330px;margin:0;font-size:12px;line-height:1.48;color:rgba(255,255,255,.72)}.rx-effort{display:inline-flex;margin-top:13px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.09);font-size:9.5px;color:rgba(255,255,255,.78)}.rx-action-buttons{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:18px}.rx-action-buttons button{min-height:46px;border-radius:14px;font-size:11px;font-weight:650}.rx-done{border:0;background:#F6FBF8;color:#1E5D47;padding:0 18px}.rx-alt{width:48px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;display:grid;place-items:center}.rx-alt svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.rx-action-note{margin-top:10px}.rx-action-note summary{cursor:pointer;list-style:none;font-size:9.5px;color:rgba(255,255,255,.58)}.rx-action-note summary::-webkit-details-marker{display:none}.rx-action-note div{margin-top:7px;font-size:10.5px;line-height:1.4;color:rgba(255,255,255,.64)}.rx-action-complete{margin-top:16px;padding-top:13px;border-top:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:space-between;gap:12px}.rx-action-complete span{font-size:10.5px;color:rgba(255,255,255,.7)}.rx-feedback{display:flex;gap:6px}.rx-feedback button{min-width:40px;height:32px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(255,255,255,.07);color:#fff;font-size:10px}
      .rx-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.rx-quick button{min-width:0;min-height:82px;border:1px solid var(--rx-line);border-radius:19px;background:var(--rx-surface);padding:11px 7px 9px;color:var(--rx-ink);text-align:left}.rx-quick-icon{width:32px;height:32px;border-radius:11px;background:var(--rx-accent-3);color:var(--rx-accent);display:grid;place-items:center}.rx-quick-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.rx-quick b{display:block;margin-top:9px;font-size:10.5px;line-height:1.1;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rx-quick small{display:block;margin-top:3px;font-size:8.4px;color:var(--rx-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rx-overview{padding:15px;border:1px solid var(--rx-line);border-radius:21px;background:var(--rx-surface)}.rx-overview-row{display:grid;grid-template-columns:84px 1fr auto;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #F0F1EE}.rx-overview-row:last-child{border-bottom:0}.rx-overview-label{font-size:10px;color:var(--rx-muted)}.rx-overview-track{height:6px;border-radius:999px;background:#EDF0EC;overflow:hidden}.rx-overview-track i{display:block;height:100%;border-radius:inherit;background:var(--rx-accent)}.rx-overview-value{min-width:62px;text-align:right;font-size:10px;font-weight:650;color:#39423D}.rx-overview-value small{font-size:8.5px;font-weight:500;color:var(--rx-faint)}
      .rx-timeline{border-top:1px solid var(--rx-line)}.rx-event{position:relative;display:grid;grid-template-columns:42px 1fr auto;gap:9px;padding:14px 0;border-bottom:1px solid var(--rx-line)}.rx-event-time{font-size:9px;color:var(--rx-faint);padding-top:2px}.rx-event-copy b{display:block;font-size:11.5px;line-height:1.25;font-weight:600}.rx-event-copy span{display:block;margin-top:3px;font-size:9.2px;color:var(--rx-muted)}.rx-event-del{width:28px;height:28px;border:0;border-radius:10px;background:#EFF1EE;color:#89918C}.rx-empty{padding:18px 0 4px;font-size:11px;line-height:1.5;color:var(--rx-muted)}
      .rx-evening{margin-top:18px;padding:14px 14px 14px 15px;border:1px solid #DDE5E0;border-radius:19px;background:#F1F5F2;display:flex;align-items:center;gap:12px}.rx-evening-icon{width:34px;height:34px;flex:0 0 34px;border-radius:12px;background:#fff;color:#52635A;display:grid;place-items:center}.rx-evening-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8}.rx-evening-copy{min-width:0;flex:1}.rx-evening-copy b{display:block;font-size:11px;font-weight:650}.rx-evening-copy span{display:block;margin-top:3px;font-size:9px;line-height:1.35;color:var(--rx-muted)}.rx-evening button{height:36px;padding:0 11px;border:0;border-radius:11px;background:var(--rx-dark);color:#fff;font-size:9.5px;font-weight:650}
      .nav{left:50%!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;width:min(398px,calc(100vw - 28px))!important;height:68px!important;padding:6px!important;border:1px solid rgba(226,229,225,.95)!important;border-radius:22px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 14px 38px rgba(31,43,36,.12)!important;backdrop-filter:none!important}.nav button{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:16px!important;color:#939A96!important;font-size:8.5px!important;font-weight:600!important}.nav button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nav button b{display:none!important}.nav button.active{background:#F0F6F2!important;color:var(--rx-accent)!important}
      .overlay{background:rgba(18,24,21,.34)!important;backdrop-filter:blur(2px)}.sheet{width:min(430px,100vw)!important;max-height:88vh!important;border-radius:30px 30px 0 0!important;padding:10px 18px calc(24px + env(safe-area-inset-bottom))!important;background:#FBFCFA!important;box-shadow:0 -20px 60px rgba(16,25,20,.18)!important}.handle{width:36px!important;height:4px!important;background:#D5DAD6!important;margin:2px auto 18px!important}.sheet h2{font-size:24px!important;line-height:1.1!important;letter-spacing:-.04em!important;font-weight:650!important}.sheet .sub{font-size:11px!important;line-height:1.45!important;color:var(--rx-muted)!important}.sheet .field label{font-size:9.5px!important;color:var(--rx-muted)!important}.sheet input,.sheet textarea,.sheet select{border:1px solid var(--rx-line)!important;border-radius:15px!important;background:#fff!important;box-shadow:none!important}.sheet .btn,.sheet button.rsf-primary{border-radius:15px!important;min-height:48px!important}.sheet .primary,.rsf-primary{background:var(--rx-dark)!important;color:#fff!important}
      .rsf-head h2{font-size:24px!important}.rsf-kicker{color:var(--rx-accent)!important}.rsf-modes{gap:7px!important}.rsf-mode{border-color:var(--rx-line)!important;border-radius:17px!important;background:#fff!important}.rsf-mode.active{border-color:#B6D5C7!important;background:var(--rx-accent-3)!important}.rsf-input{border-color:var(--rx-line)!important;background:#fff!important}.rsf-chip{background:var(--rx-accent-3)!important;color:var(--rx-accent)!important}.rsf-portion button.active{border-color:#A9CFBD!important;background:var(--rx-accent-3)!important;color:var(--rx-accent)!important}
      .rer-option{border-color:var(--rx-line)!important;border-radius:14px!important;font-weight:600!important}.rer-option.sel{border-color:#AACFBE!important;background:var(--rx-accent-3)!important;color:var(--rx-accent)!important}.rer-note{color:var(--rx-muted)!important}
      #onboarding.rpr-onboarding{background:var(--rx-bg)!important;padding:max(20px,env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))!important}.rpr-logo{width:90px!important}.rpr-stage{padding-top:42px!important}.rpr-eyebrow{font-size:10px!important;color:var(--rx-accent)!important}.rpr-title{font-size:38px!important;line-height:1.01!important;letter-spacing:-.055em!important;font-weight:650!important;color:var(--rx-ink)!important}.rpr-title span{color:var(--rx-accent)!important}.rpr-lead{font-size:13px!important;line-height:1.5!important;color:var(--rx-muted)!important}.rpr-value{gap:8px!important}.rpr-value-row,.rpr-goal{border-color:var(--rx-line)!important;border-radius:19px!important;background:#fff!important;box-shadow:none!important}.rpr-value-icon,.rpr-goal-icon{background:var(--rx-accent-3)!important;color:var(--rx-accent)!important}.rpr-goal.sel{border-color:#AACFBE!important;background:#F7FAF8!important}.rpr-primary{background:var(--rx-dark)!important;border-radius:16px!important}.rpr-option{border-color:var(--rx-line)!important;border-radius:14px!important;background:#fff!important}.rpr-option.sel{border-color:#AACFBE!important;background:var(--rx-accent-3)!important;color:var(--rx-accent)!important}.rpr-magic{border-color:#D9E6DF!important;border-radius:24px!important;background:#EEF6F2!important}.rpr-keep{background:var(--rx-dark)!important}.rpr-other{border-color:var(--rx-line)!important;color:#415149!important}
      #actions.rinlo-plan-v01,#progress.rinlo-insights-v01,#profile.rinlo-profile-v01{background:var(--rx-bg)!important;padding:calc(18px + env(safe-area-inset-top)) 18px calc(106px + env(safe-area-inset-bottom))!important}.rinlo-wordmark{font-size:0!important;width:90px!important;height:28px!important;background:url('./rinlo-logo.svg?rev=31') left center/contain no-repeat!important}.rinlo-wordmark-dot{display:none!important}.rp-kicker,.ri-kicker,.rpf-kicker{font-size:9px!important;color:var(--rx-faint)!important}.rp-heading h1,.ri-heading h1,.rpf-heading h1{font-size:30px!important;letter-spacing:-.045em!important;font-weight:650!important;color:var(--rx-ink)!important}.rp-heading .sub,.ri-heading .sub,.rpf-heading .sub{font-size:11px!important;line-height:1.45!important;color:var(--rx-muted)!important}.rp-date{margin-top:14px!important}.rp-date button{background:#fff!important;border:1px solid var(--rx-line)!important;border-radius:10px!important}.rp-section h2,.ri-section h2,.rpf-section h2{font-size:14px!important;font-weight:650!important}.rp-section span,.ri-section span,.rpf-section span{font-size:9px!important;color:var(--rx-faint)!important}
      #actions.rinlo-plan-v01 #actionHero,.ri-hero{border-radius:25px!important;background:linear-gradient(145deg,#17221E 0%,#213B31 58%,#2E735B 145%)!important;box-shadow:0 16px 36px rgba(25,42,34,.12)!important}.ri-hero h2,#actions.rinlo-plan-v01 #actionHero .heroTitle{font-size:22px!important;font-weight:650!important}.rp-week-card,.ri-stat,.ri-weight,.rpf-context,.rpf-card,.rpf-action{border-color:var(--rx-line)!important;border-radius:17px!important;background:#fff!important}.rp-insight,.ri-insight,.rpf-sync{border-color:#DDE5E0!important;border-radius:17px!important;background:#F1F5F2!important}.rpf-prototype{display:none!important}.rpf-footer{color:#A1A7A3!important}
      .toast{top:calc(12px + env(safe-area-inset-top))!important;background:#1A211D!important;border-radius:14px!important;font-size:11px!important;box-shadow:0 14px 30px rgba(20,28,23,.18)!important}
      @media(max-width:360px){.screen{padding-left:14px!important;padding-right:14px!important}.rx-greeting h1{font-size:33px!important}.rx-action h2{font-size:23px!important}.rx-quick{gap:6px}.nav{width:calc(100vw - 20px)!important}}
    `;
    doc.head.appendChild(style);
  }

  function installNav(doc, win) {
    const nav = doc.getElementById('nav');
    if (!nav) return;
    const items = [
      ['today','Сегодня',svg.today],['actions','План',svg.plan],['progress','Прогресс',svg.progress],['profile','Профиль',svg.profile],
    ];
    nav.innerHTML = items.map(([id,label,icon],index) => `<button type="button" data-rinlo-nav="${id}" class="${index===0?'active':''}" onclick="rinloUiGo('${id}',this)">${icon}<span>${label}</span></button>`).join('');
    win.rinloUiGo = (id, button) => {
      win.show?.(id);
      nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === button || b.dataset.rinloNav === id));
      win.render?.();
      if (id === 'today') win.renderToday?.();
    };
  }

  function renderToday(doc, win) {
    const root = doc.getElementById('today');
    if (!root) return;
    const db = readDb(win);
    const key = viewKey(win);
    const day = db.days?.[key] || {events:[],water:0,steps:0,rinloActions:[]};
    const profile = db.profile || {};
    const sum = totals(day);
    const targets = targetFor(profile);
    const action = activeAction(day);
    const checkin = day.rinloCheckin || null;
    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';
    const date = new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${key}T12:00:00`));
    const events = [...(day.events || [])].sort((a,b) => String(b.time).localeCompare(String(a.time))).slice(0,5);
    const isToday = key === localKey();
    const detailsComplete = profile?.detailsComplete === true;
    const calorieTracking = detailsComplete && profile.calorieTrackingEnabled !== false;

    const checkinHtml = `<section class="rx-checkin" data-testid="today-checkin"><div class="rx-checkin-top"><b>Как ты сегодня?</b><span>${checkin ? 'можно изменить' : 'один быстрый ответ'}</span></div><div class="rx-moods"><button class="rx-mood ${checkin?.wellbeing==='poor'?'sel':''}" onclick="rinloCoreCheckin('poor')">Мало сил</button><button class="rx-mood ${checkin?.wellbeing==='okay'?'sel':''}" onclick="rinloCoreCheckin('okay')">Нормально</button><button class="rx-mood ${['good','great'].includes(checkin?.wellbeing)?'sel':''}" onclick="rinloCoreCheckin('good')">Хорошо</button></div></section>`;

    let actionHtml = '';
    if (action) {
      const completed = action.status === 'completed';
      actionHtml = `<section class="rx-action" data-testid="today-primary-action"><div class="rx-action-kicker">${svg.spark}<span>${completed?'Готово на сегодня':'Один шаг на сегодня'}</span></div><h2>${esc(action.title)}</h2><p>${esc(action.rationale || 'Небольшой шаг, который подходит текущему дню.')}</p>${action.effortMinutes?`<span class="rx-effort">≈ ${Number(action.effortMinutes)} мин</span>`:''}${completed?`<div class="rx-action-complete"><span>Этот шаг помог?</span><div class="rx-feedback"><button onclick="rinloCoreActionFeedback(true)">Да</button><button onclick="rinloCoreActionFeedback(false)">Нет</button></div></div>`:`<div class="rx-action-buttons"><button class="rx-done" data-testid="complete-action" onclick="rinloCoreCompleteAction()">Готово</button><button class="rx-alt" aria-label="Другой вариант" onclick="rinloCoreReplaceAction()">${svg.swap}</button></div><details class="rx-action-note"><summary>Почему именно это</summary><div>${esc(action.rationale || '')}</div></details>`}</section>`;
    } else {
      actionHtml = `<section class="rx-action" data-testid="today-primary-action"><div class="rx-action-kicker">${svg.spark}<span>На сегодня</span></div><h2>${checkin?'Подбираем подходящий шаг':'Сначала отметь самочувствие'}</h2><p>${checkin?'Контекст уже есть. Нужен только один небольшой шаг, а не новый список задач.':'Это займёт один тап и поможет не предлагать лишнего.'}</p>${checkin?'':`<div class="rx-action-buttons"><button class="rx-done" onclick="rinloCoreSkipCheckin()">Продолжить без ответа</button></div>`}</section>`;
    }

    const quick = `<div class="rx-section-head"><h2>Быстро добавить</h2><span>в пару касаний</span></div><div class="rx-quick" data-testid="quick-actions"><button data-testid="quick-food" onclick="openFood()"><span class="rx-quick-icon">${svg.food}</span><b>Еда</b><small>${sum.cal?`${Math.round(sum.cal)} ккал`:'добавить'}</small></button><button data-testid="quick-water" onclick="addWater(250)"><span class="rx-quick-icon">${svg.water}</span><b>Вода</b><small>${Number(day.water||0)} мл</small></button><button data-testid="quick-steps" onclick="addSteps(1000)"><span class="rx-quick-icon">${svg.steps}</span><b>Шаги</b><small>${Number(day.steps||0).toLocaleString('ru-RU')}</small></button><button data-testid="quick-weight" onclick="openWeight()"><span class="rx-quick-icon">${svg.weight}</span><b>Вес</b><small>${sum.weight?`${sum.weight} кг`:'добавить'}</small></button></div>`;

    const overviewRows = [
      ...(calorieTracking ? [['Калории',sum.cal,targets.cal,'ккал']] : []),
      ['Белок',sum.protein,targets.protein,'г'],['Шаги',day.steps||0,targets.steps,''],['Вода',day.water||0,targets.water,'мл']
    ].map(([label,value,goal,unit]) => `<div class="rx-overview-row"><span class="rx-overview-label">${label}</span><span class="rx-overview-track"><i style="width:${pct(value,goal)}%"></i></span><span class="rx-overview-value">${Math.round(Number(value||0)).toLocaleString('ru-RU')} <small>${unit}${goal?` / ${Math.round(goal).toLocaleString('ru-RU')}`:''}</small></span></div>`).join('');
    const overview = detailsComplete ? `<div class="rx-section-head"><h2>Ориентиры</h2><span>просто контекст</span></div><div class="rx-overview" data-testid="today-overview">${overviewRows}</div>` : `<div class="rx-section-head"><h2>Ориентиры</h2><span>необязательно</span></div><div class="rx-evening"><div class="rx-evening-icon">${svg.spark}</div><div class="rx-evening-copy"><b>Можно настроить точнее</b><span>Вес, рост и другие параметры нужны только для персональных ориентиров.</span></div><button onclick="rinloProductOpenPrecision()">Настроить</button></div>`;

    const timeline = `<div class="rx-section-head"><h2>За сегодня</h2><span>${events.length?`${events.length} последних`:'пока пусто'}</span></div><div class="rx-timeline" data-testid="today-timeline">${events.length?events.map((e)=>`<div class="rx-event"><span class="rx-event-time">${new Date(e.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span><div class="rx-event-copy"><b>${e.type==='food'?esc(e.text):'Вес'}</b><span>${e.type==='food'?`≈ ${Math.round(e.cal||0)} ккал · ${Math.round(e.protein||0)} г белка`:`${e.weight} кг`}</span></div><button class="rx-event-del" aria-label="Удалить" onclick="delEvent(${Number(e.id)})">×</button></div>`).join(''):`<div class="rx-empty">Здесь появятся только полезные записи дня. Ничего заполнять «для галочки» не нужно.</div>`}</div>`;

    const evening = isToday ? `<div class="rx-evening"><div class="rx-evening-icon">${svg.moon}</div><div class="rx-evening-copy"><b>${day.closed?'День завершён':'Вечером — короткий итог'}</b><span>${day.closed?'Ответы сохранены и помогут следующему дню.':'Два ответа, чтобы завтра план был точнее.'}</span></div>${day.closed?'':`<button onclick="rinloUiGo('actions',document.querySelector('[data-rinlo-nav=actions]'))">Позже</button>`}</div>` : '';

    root.className = 'screen on rx-today';
    root.dataset.rinloProductUi = VERSION;
    root.innerHTML = `<div class="rx-top"><img class="rx-logo" src="./rinlo-logo.svg?rev=31" alt="Rinlo"><span class="rx-date-chip">${isToday?'Сегодня':'История'}</span></div><div class="rx-greeting"><h1>${greeting}</h1><p>${esc(date)} · ${goalLabel(profile.primaryGoal)}</p></div>${checkinHtml}${actionHtml}${quick}${overview}${timeline}${evening}`;
  }

  function hookRenderToday(doc, win) {
    if (win.__rinloProductUiRenderHook === VERSION || typeof win.renderToday !== 'function') return;
    previousRenderToday = win.renderToday.bind(win);
    win.renderToday = (...args) => {
      const result = previousRenderToday(...args);
      renderToday(doc, win);
      return result;
    };
    win.__rinloProductUiRenderHook = VERSION;
  }

  function normalizeOtherScreens(doc) {
    const actions = doc.getElementById('actions');
    const progress = doc.getElementById('progress');
    const profile = doc.getElementById('profile');
    if (actions) actions.dataset.rinloProductUi = VERSION;
    if (progress) progress.dataset.rinloProductUi = VERSION;
    if (profile) profile.dataset.rinloProductUi = VERSION;
  }

  function mount(attempt = 0) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.body || !win || typeof win.renderToday !== 'function' || !doc.getElementById('nav')) {
      if (attempt < 100) setTimeout(() => mount(attempt + 1), 70);
      return;
    }
    if (mountedDoc !== doc) {
      mountedDoc = doc;
      installStyle(doc);
      installNav(doc, win);
      hookRenderToday(doc, win);
      normalizeOtherScreens(doc);
      win.__rinloProductUi = VERSION;
    }
    win.renderToday();
  }

  frame.addEventListener('load', () => setTimeout(() => mount(), 0));
  setTimeout(() => mount(), 0);
  setTimeout(() => mount(), 350);
  setTimeout(() => mount(), 900);
})();