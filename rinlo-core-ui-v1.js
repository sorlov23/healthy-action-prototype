(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame) return;

  const CORE_KEY = 'healthy-action-v07';
  const SESSION_KEY = 'ha_api_session_v1';
  const goalCopy = {
    weight_loss: ['Снизить вес', 'Калории, питание, движение и восстановление — без жёстких ограничений.'],
    nutrition: ['Наладить питание', 'Более регулярное и понятное питание без стремления к идеальному рациону.'],
    movement: ['Больше двигаться', 'Небольшие порции движения, которые реально вписываются в день.'],
    sleep: ['Лучше спать', 'Спокойнее выстроить вечер и восстановление.'],
    energy: ['Больше энергии', 'Учитывать сон, нагрузку и самочувствие, а не только цифры.'],
    nicotine: ['Меньше никотина', 'Снижать автоматичность привычки небольшими шагами.'],
  };
  const wellbeingCopy = {
    poor: ['Плохо', 'Сегодня лучше снизить нагрузку.'],
    okay: ['Нормально', 'Можно оставить план простым.'],
    good: ['Хорошо', 'Есть ресурс для небольшого шага.'],
    great: ['Отлично', 'Можно использовать хороший запас энергии.'],
  };
  const reasonCopy = {
    no_time: 'Нет времени', low_energy: 'Мало сил', inconvenient_now: 'Неудобно сейчас',
    dont_want: 'Не хочется', already_did_similar: 'Уже делал похожее', other: 'Другая причина',
  };

  const icons = {
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.3 14.5c.4 1.4 1.2 2.2 2.6 2.6-1.4.4-2.2 1.2-2.6 2.6-.4-1.4-1.2-2.2-2.6-2.6 1.4-.4 2.2-1.2 2.6-2.6Z"/></svg>`,
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    weight: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M9 10.5a3 3 0 0 1 6 0M12 10.5l1.5-1.5"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>`,
    back: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5.5 5 5.5"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.4 3.4 3.3 7.7-8"/></svg>`,
  };

  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (v, fallback = 0) => {
    const n = Number.parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  };
  const readDb = (win) => {
    try { return JSON.parse(win.localStorage.getItem(CORE_KEY) || '{}'); }
    catch { return {}; }
  };
  const writeDb = (win, db) => win.localStorage.setItem(CORE_KEY, JSON.stringify(db));
  const dayState = (win, key) => {
    const db = readDb(win);
    db.days ||= {};
    db.days[key] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    return { db, day: db.days[key] };
  };
  const viewDay = (win) => win.__haViewDay || localDayKey();

  function profileGoal(profile) {
    if (profile?.primaryGoal) return profile.primaryGoal;
    if (Number(profile?.goal) > 0 && Number(profile?.weight) > Number(profile?.goal)) return 'weight_loss';
    return 'energy';
  }

  function calculateTargets(profile, draft = {}) {
    const weight = num(profile?.weight ?? profile?.startWeightKg ?? draft.weight, 75);
    const height = num(profile?.height ?? profile?.heightCm ?? draft.height, 170);
    const age = num(profile?.age ?? profile?.ageYears ?? draft.age, 35);
    const sex = profile?.sex || draft.sex || 'other';
    const activity = profile?.activity || draft.activity || 'low';
    const primaryGoal = profile?.primaryGoal || draft.primaryGoal || profileGoal(profile);
    const sexConstant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexConstant;
    const multiplier = activity === 'high' ? 1.6 : activity === 'medium' ? 1.4 : 1.22;
    const maintenance = Math.max(1300, bmr * multiplier);
    const calories = primaryGoal === 'weight_loss' ? Math.max(1400, maintenance * 0.85) : maintenance;
    const proteinFactor = primaryGoal === 'weight_loss' || primaryGoal === 'nutrition' ? 1.6 : 1.25;
    return {
      cal: Math.round(calories / 50) * 50,
      protein: Math.round(Math.max(75, weight * proteinFactor) / 5) * 5,
      steps: activity === 'low' ? 8000 : 10000,
    };
  }

  async function authorizedJson(path, options = {}, retry = true) {
    if (!api?.enabled || !api.base || typeof api.ensureSession !== 'function') return null;
    const session = await api.ensureSession();
    if (!session?.token) return null;
    const controller = new AbortController();
    const timeoutMs = Math.max(800, Number(window.HEALTHY_ACTION_CONFIG?.apiTimeoutMs || 3000));
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${api.base}${path}`, {
        ...options,
        cache: 'no-store', signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
          Authorization: `Bearer ${session.token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 && retry) {
        localStorage.removeItem(SESSION_KEY);
        return authorizedJson(path, options, false);
      }
      if (!response.ok) throw new Error(data.error || `api_${response.status}`);
      return data;
    } finally { clearTimeout(timer); }
  }

  if (api) {
    api.getRinloCheckin = (day) => authorizedJson(`/api/v1/checkins/${encodeURIComponent(day)}`);
    api.saveRinloCheckin = (day, payload) => authorizedJson(`/api/v1/checkins/${encodeURIComponent(day)}`, {
      method: 'PUT', body: JSON.stringify(payload),
    });
    api.suggestRinloAction = (day) => authorizedJson('/api/v1/actions/suggest', {
      method: 'POST',
      body: JSON.stringify({ day, timezoneOffsetMinutes: new Date().getTimezoneOffset(), localHour: new Date().getHours() }),
    });
    api.addRinloActionEvent = (id, payload) => authorizedJson(`/api/v1/actions/${encodeURIComponent(id)}/events`, {
      method: 'POST', body: JSON.stringify(payload),
    });
  }

  function ensureStyles(doc) {
    if (doc.getElementById('rinlo-core-ui-v1-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-core-ui-v1-style';
    style.textContent = `
      :root{--rc-green:#249765;--rc-green-dark:#1D7852;--rc-mint:#EAF7F0;--rc-mint-2:#F3FAF6;--rc-text:#111B18;--rc-muted:#78827F;--rc-line:#E5EBE8;--rc-bg:#F7F9F8;--rc-card:#fff;--rc-dark:#101A18}
      #onboarding.rinlo-core-onboarding,#today.rinlo-core-today{font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important;background:var(--rc-bg)!important;color:var(--rc-text)!important}
      #onboarding.rinlo-core-onboarding{min-height:100vh!important;padding:max(20px,env(safe-area-inset-top)) 20px calc(26px + env(safe-area-inset-bottom))!important}
      .rc-wordmark{display:inline-flex;align-items:flex-start;position:relative;padding-right:9px;font-size:31px;font-weight:650;letter-spacing:-.05em;line-height:1;color:var(--rc-green)}.rc-wordmark i{position:absolute;right:0;top:6px;width:6px;height:6px;border-radius:50%;background:var(--rc-green)}
      .rc-on-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}.rc-on-step{font-size:11px;color:#8A9491;font-weight:600}.rc-on-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 28px}.rc-on-progress span{height:4px;border-radius:99px;background:#E2E8E5}.rc-on-progress span.on{background:var(--rc-green)}
      .rc-on-screen{display:none;animation:rcIn .2s ease both}.rc-on-screen.on{display:block}@keyframes rcIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      .rc-eyebrow{font-size:11px;font-weight:650;color:var(--rc-green);margin-bottom:9px}.rc-on-screen h1{font-size:34px!important;line-height:1.04!important;letter-spacing:-.045em!important;font-weight:650!important;margin:0 0 10px!important;color:var(--rc-text)!important}.rc-lead{max-width:355px;font-size:14px;line-height:1.48;color:var(--rc-muted);margin-bottom:22px}
      .rc-goals{display:grid;gap:9px}.rc-goal{width:100%;min-height:74px;border:1px solid var(--rc-line);border-radius:20px;background:#fff;padding:14px 15px;text-align:left;display:flex;align-items:center;gap:12px;color:var(--rc-text)}.rc-goal.sel{border-color:#95CEB6;background:var(--rc-mint-2);box-shadow:0 0 0 2px rgba(36,151,101,.05)}.rc-goal-dot{width:34px;height:34px;flex:0 0 34px;border-radius:12px;background:var(--rc-mint);display:grid;place-items:center;color:var(--rc-green);font-size:13px;font-weight:700}.rc-goal-copy{flex:1}.rc-goal-copy b{display:block;font-size:14px;font-weight:650}.rc-goal-copy span{display:block;margin-top:3px;font-size:11px;line-height:1.35;color:var(--rc-muted)}.rc-check{width:24px;height:24px;border:1.5px solid #CBD6D1;border-radius:50%;display:grid;place-items:center;color:transparent}.rc-goal.sel .rc-check{background:var(--rc-green);border-color:var(--rc-green);color:#fff}.rc-check svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
      .rc-card{border:1px solid var(--rc-line);border-radius:22px;background:#fff;padding:16px}.rc-card+.rc-card{margin-top:10px}.rc-card-title{font-size:13px;font-weight:650;margin-bottom:13px}.rc-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rc-field{margin-top:11px}.rc-field.full{grid-column:1/-1}.rc-field label{display:block;margin-bottom:6px;font-size:10.5px;font-weight:600;color:#7D8884}.rc-field input,.rc-field select{width:100%;height:50px;border:1px solid var(--rc-line);border-radius:15px;background:#FBFCFC;padding:0 13px;outline:none;color:var(--rc-text);font-size:15px}.rc-field input:focus,.rc-field select:focus{border-color:#8BC8AE;box-shadow:0 0 0 4px rgba(36,151,101,.07)}
      .rc-calorie-toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:14px;padding:12px 13px;border-radius:16px;background:var(--rc-mint-2)}.rc-calorie-toggle b{display:block;font-size:12.5px}.rc-calorie-toggle span{display:block;margin-top:3px;font-size:10px;line-height:1.35;color:var(--rc-muted)}.rc-switch{width:46px;height:27px;border:0;border-radius:99px;background:#CAD5D0;padding:3px;transition:.2s}.rc-switch i{display:block;width:21px;height:21px;border-radius:50%;background:#fff;transition:.2s}.rc-switch.on{background:var(--rc-green)}.rc-switch.on i{transform:translateX(19px)}
      .rc-secondary{display:grid;grid-template-columns:1fr 1fr;gap:9px}.rc-secondary .rc-goal{min-height:92px;display:block}.rc-secondary .rc-goal-dot{margin-bottom:9px}.rc-secondary .rc-check{position:absolute;right:12px;top:12px}.rc-secondary .rc-goal{position:relative}.rc-secondary .rc-goal-copy span{font-size:10px}.rc-counter{font-size:11px;color:var(--rc-muted);margin-bottom:10px}
      .rc-ready{padding:22px;border-radius:25px;background:linear-gradient(145deg,#173E31,#225D48);color:#fff;position:relative;overflow:hidden}.rc-ready:after{content:'';position:absolute;width:180px;height:180px;right:-85px;bottom:-100px;border-radius:50%;background:rgba(120,201,166,.12)}.rc-ready-dot{width:10px;height:10px;border-radius:50%;background:#72C8A0;box-shadow:0 0 0 8px rgba(114,200,160,.10);margin-bottom:20px}.rc-ready h2{font-size:28px!important;line-height:1.08!important;letter-spacing:-.035em!important;margin:0 0 9px!important;color:#fff!important}.rc-ready p{position:relative;z-index:1;font-size:13px;line-height:1.48;color:rgba(255,255,255,.72);margin:0}.rc-summary{display:grid;gap:8px;margin-top:12px}.rc-summary-row{display:flex;align-items:center;justify-content:space-between;padding:12px 13px;border:1px solid var(--rc-line);border-radius:16px;background:#fff}.rc-summary-row span{font-size:10.5px;color:var(--rc-muted)}.rc-summary-row b{font-size:11.5px;font-weight:650;text-align:right}
      .rc-on-footer{position:sticky;bottom:calc(10px + env(safe-area-inset-bottom));display:flex;gap:9px;margin-top:22px;padding-top:16px;background:linear-gradient(180deg,rgba(247,249,248,0),rgba(247,249,248,.97) 35%)}.rc-back{width:50px;height:50px;border:1px solid var(--rc-line);border-radius:15px;background:#fff;color:#62706A;display:grid;place-items:center}.rc-back[hidden]{display:none}.rc-back svg,.rc-next svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.rc-next{height:50px;flex:1;border:0;border-radius:15px;background:var(--rc-dark);color:#fff;font-weight:650;display:flex;align-items:center;justify-content:center;gap:8px}.rc-next.start{background:var(--rc-green)}
      #today.rinlo-core-today{min-height:100vh!important;padding:max(18px,env(safe-area-inset-top)) 18px calc(106px + env(safe-area-inset-bottom))!important}.rc-today-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:19px}.rc-day-label{font-size:10.5px;color:#88928F;font-weight:600}.rc-greeting h1{font-size:29px!important;line-height:1.07!important;letter-spacing:-.045em!important;font-weight:650!important;margin:0 0 5px!important}.rc-greeting p{margin:0;font-size:11px;color:var(--rc-muted)}
      .rc-checkin{margin-top:17px;padding:15px;border:1px solid var(--rc-line);border-radius:21px;background:#fff}.rc-checkin-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.rc-checkin-head b{font-size:13px}.rc-checkin-head button{border:0;background:transparent;color:var(--rc-green);font-size:10.5px;font-weight:650}.rc-moods{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.rc-mood{min-width:0;height:42px;border:1px solid var(--rc-line);border-radius:13px;background:#FBFCFC;color:#66716D;font-size:10.5px;font-weight:600}.rc-mood.sel{border-color:#9BCDB8;background:var(--rc-mint);color:var(--rc-green-dark)}.rc-checkin-note{margin-top:8px;font-size:10.5px;color:var(--rc-muted)}
      .rc-action{position:relative;margin-top:13px;padding:19px 18px;border-radius:24px;border:1px solid #DDEBE4;background:linear-gradient(145deg,#F4FBF7,#EAF7F0);overflow:hidden}.rc-action-kicker{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:650;color:var(--rc-green-dark);margin-bottom:10px}.rc-action-kicker svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.rc-action h2{font-size:24px!important;line-height:1.12!important;letter-spacing:-.035em!important;font-weight:650!important;margin:0 0 8px!important;color:var(--rc-text)!important}.rc-action p{max-width:340px;margin:0;font-size:12.5px;line-height:1.48;color:#66736E}.rc-effort{display:inline-flex;margin-top:11px;padding:5px 8px;border-radius:999px;background:rgba(36,151,101,.08);font-size:9.5px;color:var(--rc-green-dark);font-weight:600}.rc-action-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.rc-action-buttons button{height:45px;border-radius:14px;font-size:11px;font-weight:650}.rc-done{border:0;background:var(--rc-green);color:#fff}.rc-alt{border:1px solid #CCE0D6;background:#fff;color:var(--rc-green-dark)}.rc-not-fit{width:100%;margin-top:7px;border:0;background:transparent;color:#7B8582;font-size:10.5px;height:34px}.rc-action.completed{background:#F4F8F6;border-color:var(--rc-line)}.rc-action.completed .rc-action-kicker{color:#557067}.rc-feedback{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding-top:11px;border-top:1px solid #DDE8E3}.rc-feedback span{font-size:10.5px;color:#71807A}.rc-feedback button{height:30px;min-width:48px;border:1px solid #D8E4DE;border-radius:10px;background:#fff;color:#4F675D;font-size:10px}
      .rc-placeholder{margin-top:13px;padding:18px;border-radius:24px;border:1px dashed #CADBD3;background:#F8FBF9}.rc-placeholder b{font-size:15px}.rc-placeholder p{margin:5px 0 0;font-size:11.5px;line-height:1.45;color:var(--rc-muted)}.rc-placeholder button{margin-top:12px;height:40px;border:1px solid #D5E2DC;border-radius:13px;background:#fff;color:var(--rc-green-dark);font-size:10.5px;font-weight:650;padding:0 14px}
      .rc-section{display:flex;align-items:baseline;justify-content:space-between;margin:19px 0 9px}.rc-section h2{font-size:15px!important;font-weight:650!important;margin:0!important}.rc-section span{font-size:9.5px;color:#8B9491}.rc-calories{padding:16px;border-radius:21px;border:1px solid var(--rc-line);background:#fff}.rc-cal-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.rc-cal-top b{font-size:25px;letter-spacing:-.035em}.rc-cal-top span{font-size:10.5px;color:var(--rc-muted)}.rc-bar{height:8px;margin-top:10px;border-radius:99px;background:#EDF1EF;overflow:hidden}.rc-bar i{display:block;height:100%;border-radius:99px;background:var(--rc-green)}.rc-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}.rc-mini{padding:11px 10px;border:1px solid var(--rc-line);border-radius:16px;background:#fff}.rc-mini small{display:block;font-size:9px;color:var(--rc-muted)}.rc-mini b{display:block;margin-top:4px;font-size:14px;font-weight:650;white-space:nowrap}.rc-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.rc-quick button{min-width:0;height:68px;border:1px solid var(--rc-line);border-radius:17px;background:#fff;color:#59645F;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:9px}.rc-quick svg{width:19px;height:19px;fill:none;stroke:var(--rc-green);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.rc-timeline{display:grid;gap:7px}.rc-event{position:relative;padding:12px 38px 12px 13px;border:1px solid var(--rc-line);border-radius:16px;background:#fff}.rc-event small{display:block;font-size:9px;color:#919A97}.rc-event b{display:block;margin-top:3px;font-size:11.5px}.rc-event p{margin:3px 0 0;font-size:10px;color:var(--rc-muted)}.rc-event button{position:absolute;right:9px;top:9px;width:27px;height:27px;border:0;border-radius:9px;background:#F3F5F4;color:#8A9390}.rc-empty{padding:14px;border:1px dashed #D6E0DB;border-radius:16px;color:var(--rc-muted);font-size:10.5px;line-height:1.4}
      .rc-sheet-options{display:grid;gap:8px;margin-top:12px}.rc-sheet-option{width:100%;min-height:49px;border:1px solid var(--rc-line);border-radius:15px;background:#fff;padding:0 13px;text-align:left;color:var(--rc-text);font-size:12px}.rc-chip-row{display:flex;gap:6px;flex-wrap:wrap}.rc-chip{min-width:42px;height:38px;border:1px solid var(--rc-line);border-radius:12px;background:#fff;color:#66716D}.rc-chip.sel{background:var(--rc-mint);border-color:#9BCDB8;color:var(--rc-green-dark)}
      @media(max-width:360px){#onboarding.rinlo-core-onboarding,#today.rinlo-core-today{padding-left:14px!important;padding-right:14px!important}.rc-on-screen h1{font-size:31px!important}.rc-action h2{font-size:22px!important}.rc-mini-grid{gap:5px}.rc-quick{gap:5px}}
    `;
    doc.head.appendChild(style);
  }

  function patchFrame(attempt = 0) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;
    if (win.__rinloCoreUiV1) return;
    if (typeof win.render !== 'function' || typeof win.finishOnboarding !== 'function' || !doc.getElementById('today')) {
      if (attempt < 50) setTimeout(() => patchFrame(attempt + 1), 60);
      return;
    }
    win.__rinloCoreUiV1 = true;
    ensureStyles(doc);

    const previousFinishOnboarding = win.finishOnboarding.bind(win);
    const previousTargets = typeof win.targets === 'function' ? win.targets.bind(win) : null;
    const draft = {
      step: 1, primaryGoal: 'weight_loss', secondaryGoals: ['movement'], extraHabits: [],
      sex: 'male', calorieTrackingEnabled: true, energy: null, sleepQuality: null,
    };

    win.targets = function() {
      const db = readDb(win);
      if (!db.profile && previousTargets) return previousTargets();
      return calculateTargets(db.profile || {}, draft);
    };

    function selectedGoalLabel(code) { return goalCopy[code]?.[0] || 'Здоровье'; }
    function setStep(step) {
      draft.step = Math.max(1, Math.min(4, Number(step) || 1));
      doc.querySelectorAll('.rc-on-screen').forEach((el, i) => el.classList.toggle('on', i === draft.step - 1));
      doc.querySelectorAll('.rc-on-progress span').forEach((el, i) => el.classList.toggle('on', i < draft.step));
      const count = doc.getElementById('rcOnStep'); if (count) count.textContent = `${draft.step} из 4`;
      const back = doc.getElementById('rcOnBack'); if (back) back.hidden = draft.step === 1;
      const next = doc.getElementById('rcOnNext');
      if (next) {
        next.classList.toggle('start', draft.step === 4);
        next.innerHTML = draft.step === 4 ? `Начать` : `Продолжить ${icons.arrow}`;
      }
      if (draft.step === 2) updateWeightGoalVisibility();
      if (draft.step === 3) renderSecondaryChoices();
      if (draft.step === 4) renderSummary();
    }

    function buildOnboarding() {
      const ob = doc.getElementById('onboarding');
      if (!ob) return;
      const saved = readDb(win).profile || {};
      draft.primaryGoal = saved.primaryGoal || profileGoal(saved) || 'weight_loss';
      draft.secondaryGoals = Array.isArray(saved.secondaryGoals) ? saved.secondaryGoals.slice(0, 2) : ['movement'];
      draft.sex = saved.sex || 'male';
      draft.calorieTrackingEnabled = saved.calorieTrackingEnabled ?? (draft.primaryGoal === 'weight_loss');
      ob.className = 'screen rinlo-core-onboarding';
      ob.innerHTML = `
        <div class="rc-on-top"><div class="rc-wordmark">Rinlo<i></i></div><span id="rcOnStep" class="rc-on-step">1 из 4</span></div>
        <div class="rc-on-progress"><span class="on"></span><span></span><span></span><span></span></div>
        <section class="rc-on-screen on">
          <div class="rc-eyebrow">Начнём с главного</div><h1>Что сейчас хочется улучшить?</h1><div class="rc-lead">Rinlo будет менять рекомендации и даже приоритеты интерфейса в зависимости от вашей цели.</div>
          <div class="rc-goals">${Object.entries(goalCopy).map(([code, copy]) => `<button type="button" class="rc-goal ${code === draft.primaryGoal ? 'sel' : ''}" data-primary-goal="${code}" onclick="rinloSelectPrimaryGoal('${code}')"><span class="rc-goal-dot">${code === 'weight_loss' ? '−kg' : code === 'nutrition' ? 'N' : code === 'movement' ? '→' : code === 'sleep' ? 'Zz' : code === 'energy' ? '⚡' : '○'}</span><span class="rc-goal-copy"><b>${copy[0]}</b><span>${copy[1]}</span></span><span class="rc-check">${icons.check}</span></button>`).join('')}</div>
        </section>
        <section class="rc-on-screen">
          <div class="rc-eyebrow">Немного контекста</div><h1>Чтобы ориентиры были вашими</h1><div class="rc-lead">Эти данные нужны для расчёта персональных ориентиров. Их можно изменить позже.</div>
          <div class="rc-card"><div class="rc-card-title">Параметры</div><div class="rc-fields">
            <div class="rc-field"><label>Текущий вес, кг</label><input id="obWeight" inputmode="decimal" value="${esc(saved.weight ?? 85)}"></div>
            <div class="rc-field" id="rcGoalWeightField"><label>Целевой вес, кг</label><input id="obGoal" inputmode="decimal" value="${esc(saved.goal ?? 75)}"></div>
            <div class="rc-field"><label>Рост, см</label><input id="obHeight" inputmode="numeric" value="${esc(saved.height ?? 176)}"></div>
            <div class="rc-field"><label>Возраст</label><input id="obAge" inputmode="numeric" value="${esc(saved.age ?? 37)}"></div>
            <div class="rc-field"><label>Активность</label><select id="obActivity"><option value="low" ${(saved.activity || 'low') === 'low' ? 'selected' : ''}>Низкая</option><option value="medium" ${saved.activity === 'medium' ? 'selected' : ''}>Средняя</option><option value="high" ${saved.activity === 'high' ? 'selected' : ''}>Высокая</option></select></div>
            <div class="rc-field"><label>Пол для расчёта</label><select id="rcSex"><option value="male" ${draft.sex === 'male' ? 'selected' : ''}>Мужской</option><option value="female" ${draft.sex === 'female' ? 'selected' : ''}>Женский</option><option value="other" ${draft.sex === 'other' ? 'selected' : ''}>Не указывать</option></select></div>
          </div>
          <div class="rc-calorie-toggle"><div><b>Показывать калории</b><span>Для снижения веса оставляем их важным ориентиром, но не превращаем в оценку дня.</span></div><button id="rcCalToggle" type="button" class="rc-switch ${draft.calorieTrackingEnabled ? 'on' : ''}" onclick="rinloToggleCalories()"><i></i></button></div>
          </div>
        </section>
        <section class="rc-on-screen">
          <div class="rc-eyebrow">Дополнительный контекст</div><h1>Что ещё для вас важно?</h1><div class="rc-lead">Выберите до двух дополнительных фокусов. Это не список обязательств — только контекст для Rinlo.</div>
          <div id="rcSecondaryCounter" class="rc-counter"></div><div id="rcSecondaryGoals" class="rc-secondary"></div>
        </section>
        <section class="rc-on-screen">
          <div class="rc-ready"><div class="rc-ready-dot"></div><h2>Rinlo готов</h2><p>Начнём с небольших действий и будем адаптировать рекомендации по мере того, как узнаём ваш обычный ритм.</p></div>
          <div id="rcOnSummary" class="rc-summary"></div>
        </section>
        <div class="rc-on-footer"><button id="rcOnBack" class="rc-back" type="button" onclick="rinloCoreOnboardingBack()" hidden>${icons.back}</button><button id="rcOnNext" class="rc-next" type="button" onclick="rinloCoreOnboardingNext()">Продолжить ${icons.arrow}</button></div>`;
      setStep(1);
    }

    function updateWeightGoalVisibility() {
      const f = doc.getElementById('rcGoalWeightField'); if (f) f.style.display = draft.primaryGoal === 'weight_loss' ? '' : 'none';
      if (draft.primaryGoal === 'weight_loss' && draft.calorieTrackingEnabled === false) draft.calorieTrackingEnabled = true;
      doc.getElementById('rcCalToggle')?.classList.toggle('on', draft.calorieTrackingEnabled);
    }

    function renderSecondaryChoices() {
      const box = doc.getElementById('rcSecondaryGoals'); if (!box) return;
      const choices = Object.entries(goalCopy).filter(([code]) => code !== draft.primaryGoal).map(([code, copy]) => ({ code, title: copy[0], text: copy[1] }));
      choices.push({ code: 'water', title: 'Пить больше воды', text: 'Мягко учитывать воду как дополнительный фокус.' });
      box.innerHTML = choices.map((item) => {
        const selected = item.code === 'water' ? draft.extraHabits.includes('water') : draft.secondaryGoals.includes(item.code);
        return `<button type="button" class="rc-goal ${selected ? 'sel' : ''}" onclick="rinloToggleSecondary('${item.code}')"><span class="rc-goal-dot">${item.code === 'water' ? 'H₂O' : '•'}</span><span class="rc-goal-copy"><b>${item.title}</b><span>${item.text}</span></span><span class="rc-check">${icons.check}</span></button>`;
      }).join('');
      const count = draft.secondaryGoals.length + draft.extraHabits.length;
      const counter = doc.getElementById('rcSecondaryCounter'); if (counter) counter.textContent = `Выбрано ${count} из 2`;
    }

    function renderSummary() {
      const box = doc.getElementById('rcOnSummary'); if (!box) return;
      const weight = num(doc.getElementById('obWeight')?.value, 85);
      const goal = num(doc.getElementById('obGoal')?.value, weight);
      const draftProfile = { weight, height: num(doc.getElementById('obHeight')?.value, 176), age: num(doc.getElementById('obAge')?.value, 37), activity: doc.getElementById('obActivity')?.value || 'low', sex: doc.getElementById('rcSex')?.value || draft.sex, primaryGoal: draft.primaryGoal };
      const targets = calculateTargets(draftProfile, draft);
      const extras = [...draft.secondaryGoals.map(selectedGoalLabel), ...(draft.extraHabits.includes('water') ? ['Пить больше воды'] : [])];
      box.innerHTML = `<div class="rc-summary-row"><span>Главная цель</span><b>${selectedGoalLabel(draft.primaryGoal)}</b></div>${draft.primaryGoal === 'weight_loss' ? `<div class="rc-summary-row"><span>Вес</span><b>${weight} → ${goal} кг</b></div>` : ''}<div class="rc-summary-row"><span>Дополнительно</span><b>${extras.length ? esc(extras.join(' · ')) : 'Без дополнительных фокусов'}</b></div>${draft.calorieTrackingEnabled ? `<div class="rc-summary-row"><span>Ориентир по калориям</span><b>≈ ${targets.cal} ккал</b></div>` : ''}`;
    }

    win.rinloSelectPrimaryGoal = (code) => {
      if (!goalCopy[code]) return;
      draft.primaryGoal = code;
      if (code === 'weight_loss') draft.calorieTrackingEnabled = true;
      draft.secondaryGoals = draft.secondaryGoals.filter((x) => x !== code);
      doc.querySelectorAll('[data-primary-goal]').forEach((b) => b.classList.toggle('sel', b.dataset.primaryGoal === code));
    };
    win.rinloToggleCalories = () => {
      draft.calorieTrackingEnabled = !draft.calorieTrackingEnabled;
      doc.getElementById('rcCalToggle')?.classList.toggle('on', draft.calorieTrackingEnabled);
    };
    win.rinloToggleSecondary = (code) => {
      const total = () => draft.secondaryGoals.length + draft.extraHabits.length;
      if (code === 'water') {
        if (draft.extraHabits.includes('water')) draft.extraHabits = [];
        else if (total() < 2) draft.extraHabits = ['water'];
        else return win.toast?.('Можно выбрать максимум два дополнительных фокуса');
      } else if (draft.secondaryGoals.includes(code)) draft.secondaryGoals = draft.secondaryGoals.filter((x) => x !== code);
      else if (total() < 2) draft.secondaryGoals.push(code);
      else return win.toast?.('Можно выбрать максимум два дополнительных фокуса');
      renderSecondaryChoices();
    };
    win.rinloCoreOnboardingBack = () => setStep(draft.step - 1);
    win.rinloCoreOnboardingNext = async () => {
      if (draft.step < 4) {
        if (draft.step === 2) {
          const weight = num(doc.getElementById('obWeight')?.value);
          const height = num(doc.getElementById('obHeight')?.value);
          const age = num(doc.getElementById('obAge')?.value);
          if (weight < 30 || weight > 300 || height < 120 || height > 230 || age < 14 || age > 100) return win.toast?.('Проверьте вес, рост и возраст');
          draft.sex = doc.getElementById('rcSex')?.value || 'other';
          if (draft.primaryGoal !== 'weight_loss') doc.getElementById('obGoal').value = String(weight);
        }
        return setStep(draft.step + 1);
      }
      draft.sex = doc.getElementById('rcSex')?.value || 'other';
      const weight = num(doc.getElementById('obWeight')?.value, 85);
      if (draft.primaryGoal !== 'weight_loss') doc.getElementById('obGoal').value = String(weight);
      previousFinishOnboarding();
      const db = readDb(win);
      db.profile ||= {};
      db.profile.sex = draft.sex;
      db.profile.primaryGoal = draft.primaryGoal;
      db.profile.secondaryGoals = [...draft.secondaryGoals];
      db.profile.calorieTrackingEnabled = Boolean(draft.calorieTrackingEnabled);
      db.profile.habits ||= [];
      if ((draft.primaryGoal === 'nicotine' || draft.secondaryGoals.includes('nicotine')) && !db.profile.habits.includes('vape')) db.profile.habits.push('vape');
      if (draft.extraHabits.includes('water') && !db.profile.habits.includes('water')) db.profile.habits.push('water');
      writeDb(win, db);
      const targets = calculateTargets(db.profile, draft);
      if (api?.enabled && typeof api.saveProfile === 'function') {
        const payload = {
          startWeightKg: Number(db.profile.weight), targetWeightKg: Number(db.profile.goal), heightCm: Number(db.profile.height), ageYears: Math.round(Number(db.profile.age)),
          sex: draft.sex, activity: db.profile.activity || 'low', focuses: (db.profile.habits || []).slice(0, 2), primaryGoal: draft.primaryGoal,
          secondaryGoals: [...draft.secondaryGoals], calorieTrackingEnabled: Boolean(draft.calorieTrackingEnabled), calorieTarget: targets.cal, proteinTargetG: targets.protein, stepTarget: targets.steps,
        };
        api.saveProfile(payload).catch((error) => console.warn('Rinlo Core profile sync failed', error));
      }
      win.render?.();
    };

    function totalsFor(day) {
      const events = Array.isArray(day?.events) ? day.events : [];
      return events.reduce((acc, event) => {
        if (event.type === 'food') { acc.cal += Number(event.cal || 0); acc.protein += Number(event.protein || 0); }
        if (event.type === 'weight') acc.weight = Number(event.weight || 0);
        return acc;
      }, { cal: 0, protein: 0, weight: null });
    }

    function localAction(win, key, excludeKind = null) {
      const { db, day } = dayState(win, key);
      const profile = db.profile || {};
      const checkin = day.rinloCheckin || null;
      const totals = totalsFor(day);
      const targets = calculateTargets(profile);
      const candidates = [];
      const lowRecovery = checkin && (checkin.wellbeing === 'poor' || Number(checkin.energy || 5) <= 2 || Number(checkin.sleepQuality || 5) <= 2);
      if (lowRecovery) candidates.push({ kind:'recovery', title:'Сделайте день чуть легче', rationale:'По сегодняшнему самочувствию полезнее снизить нагрузку, а не пытаться закрыть все ориентиры.', effortMinutes:10 });
      if (profileGoal(profile) === 'sleep' && new Date().getHours() >= 18) candidates.push({ kind:'sleep', title:'Оставьте 20 спокойных минут перед сном', rationale:'Сегодня ваш главный фокус — восстановление. Небольшой спокойный переход ко сну полезнее ещё одной задачи.', effortMinutes:20 });
      if (profileGoal(profile) === 'nicotine') candidates.push({ kind:'nicotine', title:'Отложите следующий никотиновый эпизод на 10 минут', rationale:'Небольшая пауза помогает сделать привычку менее автоматической без требования идеального дня.', effortMinutes:10 });
      if (['weight_loss','nutrition'].includes(profileGoal(profile)) && totals.protein > 0 && totals.protein < targets.protein * .55) candidates.push({ kind:'nutrition', title:'Добавьте белок в следующий приём пищи', rationale:`Сейчас зафиксировано около ${Math.round(totals.protein)} из ${targets.protein} г белка. Это более полезный ориентир, чем пытаться сделать питание идеальным.`, effortMinutes:5 });
      if (Number(day.steps || 0) < targets.steps * .5) candidates.push({ kind:'movement', title:'Пройдитесь 10 минут', rationale:`Сегодня движения пока немного. Небольшой прогулки достаточно — не нужно догонять весь дневной ориентир сразу.`, effortMinutes:10 });
      if (new Date().getHours() >= 12 && Number(day.water || 0) < 750) candidates.push({ kind:'hydration', title:'Выпейте стакан воды', rationale:'Воды сегодня пока немного. Один стакан — достаточный следующий шаг.', effortMinutes:2 });
      if (profile.calorieTrackingEnabled !== false && profileGoal(profile) === 'weight_loss' && totals.cal > targets.cal * 1.1) candidates.unshift({ kind:'nutrition', title:'Оставьте следующий приём пищи обычным', rationale:'Сегодня получилось выше калорийного ориентира. Компенсировать голоданием или лишней нагрузкой не нужно — просто вернитесь к обычному режиму.', effortMinutes:5 });
      let selected = candidates.find((x) => x.kind !== excludeKind) || candidates[0] || { kind:'general', title:'Сделайте один небольшой активный перерыв', rationale:'Сегодня нет сигнала, который требует жёсткого приоритета. Десяти спокойных минут достаточно, чтобы поддержать ритм.', effortMinutes:10 };
      const action = { id:`local-${Date.now()}`, day:key, status:'suggested', source:'local-rules', suggestedAt:new Date().toISOString(), ...selected };
      day.rinloActions ||= []; day.rinloActions.unshift(action); writeDb(win, db); return action;
    }

    function mergeLocalAction(win, key, action) {
      if (!action) return;
      const { db, day } = dayState(win, key); day.rinloActions ||= [];
      const index = day.rinloActions.findIndex((x) => x.id === action.id);
      if (index >= 0) day.rinloActions[index] = { ...day.rinloActions[index], ...action };
      else day.rinloActions.unshift(action);
      writeDb(win, db);
    }

    function activeAction(day) { return (day.rinloActions || []).find((x) => ['suggested','accepted'].includes(x.status)) || null; }
    const remoteInflight = new Map();
    async function ensureAction(key, force = false, excludeKind = null) {
      const { day } = dayState(win, key);
      if (!force && activeAction(day)) return activeAction(day);
      if (!api?.enabled) { const a = localAction(win, key, excludeKind); win.renderToday(); return a; }
      if (remoteInflight.has(key)) return remoteInflight.get(key);
      const promise = api.suggestRinloAction(key).then((data) => {
        if (data?.action) mergeLocalAction(win, key, data.action);
        win.renderToday(); return data?.action || null;
      }).catch((error) => {
        console.warn('Rinlo action suggestion fallback', error);
        const fallback = activeAction(day) || localAction(win, key, excludeKind); win.renderToday(); return fallback;
      }).finally(() => remoteInflight.delete(key));
      remoteInflight.set(key, promise); return promise;
    }

    async function hydrateDay(key) {
      if (!api?.enabled || key !== localDayKey()) return;
      try {
        const remote = await api.getRinloCheckin(key);
        if (remote?.checkin) { const state = dayState(win, key); state.day.rinloCheckin = remote.checkin; writeDb(win, state.db); win.renderToday(); }
        const current = dayState(win, key).day;
        if (current.rinloCheckin && !activeAction(current)) await ensureAction(key);
      } catch (error) { console.warn('Rinlo context hydrate deferred', error); }
    }

    function buildToday() {
      const el = doc.getElementById('today'); if (!el) return;
      el.className = 'screen rinlo-core-today';
      el.innerHTML = `<div class="rc-today-top"><div class="rc-wordmark">Rinlo<i></i></div><span class="rc-day-label">Сегодня</span></div><div class="rc-greeting"><h1 id="rcGreeting">Добрый день</h1><p id="rcDate"></p></div><div id="rcCheckin"></div><div id="rcAction"></div><div id="rcMetrics"></div><div class="rc-section"><h2>Быстрые действия</h2><span>1–2 касания</span></div><div class="rc-quick"><button onclick="openFood()">${icons.meal}<span>Еда</span></button><button onclick="openWeight()">${icons.weight}<span>Вес</span></button><button onclick="addWater(250)">${icons.water}<span>+250 мл</span></button><button onclick="addSteps(1000)">${icons.steps}<span>+1000</span></button></div><div class="rc-section"><h2>Лента дня</h2><span id="rcEventCount"></span></div><div id="rcTimeline" class="rc-timeline"></div>`;
    }

    function renderCheckin(key, day) {
      const box = doc.getElementById('rcCheckin'); if (!box) return;
      const checkin = day.rinloCheckin;
      box.innerHTML = `<div class="rc-checkin"><div class="rc-checkin-head"><b>Как вы себя чувствуете сегодня?</b>${checkin ? `<button onclick="rinloCoreCheckinDetails()">Добавить контекст</button>` : ''}</div><div class="rc-moods">${Object.entries(wellbeingCopy).map(([code, copy]) => `<button class="rc-mood ${checkin?.wellbeing === code ? 'sel' : ''}" onclick="rinloCoreCheckin('${code}')">${copy[0]}</button>`).join('')}</div>${checkin ? `<div class="rc-checkin-note">${esc(wellbeingCopy[checkin.wellbeing]?.[1] || '')}${checkin.sleepMinutes ? ` · сон ${Math.round(checkin.sleepMinutes / 6) / 10} ч` : ''}${checkin.energy ? ` · энергия ${checkin.energy}/5` : ''}</div>` : '<div class="rc-checkin-note">Одного ответа достаточно. Сон и энергию можно добавить по желанию.</div>'}</div>`;
    }

    function renderAction(key, day) {
      const box = doc.getElementById('rcAction'); if (!box) return;
      const action = activeAction(day) || (day.rinloActions || []).find((x) => x.status === 'completed');
      if (!day.rinloCheckin && !action) {
        box.innerHTML = `<div class="rc-placeholder"><b>Rinlo подберёт следующий шаг</b><p>Ответьте, как вы себя чувствуете, — или пропустите check-in, если сегодня не хочется ничего заполнять.</p><button onclick="rinloCoreSkipCheckin()">Подобрать без check-in</button></div>`; return;
      }
      if (!action) { box.innerHTML = `<div class="rc-placeholder"><b>Подбираем следующий шаг…</b><p>Немного контекста уже есть. Rinlo выбирает самое полезное действие на сейчас.</p></div>`; return; }
      const completed = action.status === 'completed';
      box.innerHTML = `<div class="rc-action ${completed ? 'completed' : ''}"><div class="rc-action-kicker">${icons.spark}${completed ? 'Шаг выполнен' : 'Ваш шаг на сегодня'}</div><h2>${esc(action.title)}</h2><p>${esc(action.rationale)}</p>${action.effortMinutes ? `<span class="rc-effort">≈ ${action.effortMinutes} мин</span>` : ''}${completed ? `<div class="rc-feedback"><span>Этот шаг был полезен?</span><div><button onclick="rinloCoreActionFeedback(true)">Да</button> <button onclick="rinloCoreActionFeedback(false)">Нет</button></div></div>` : `<div class="rc-action-buttons"><button class="rc-done" onclick="rinloCoreCompleteAction()">Сделано</button><button class="rc-alt" onclick="rinloCoreReplaceAction()">Другой вариант</button></div><button class="rc-not-fit" onclick="rinloCoreDismissAction()">Этот шаг мне не подходит</button>`}</div>`;
    }

    function renderMetrics(day, profile) {
      const box = doc.getElementById('rcMetrics'); if (!box) return;
      const totals = totalsFor(day), targets = calculateTargets(profile);
      const calorieTracking = profile?.calorieTrackingEnabled !== false && (profileGoal(profile) === 'weight_loss' || profile?.calorieTrackingEnabled === true);
      box.innerHTML = `<div class="rc-section"><h2>Сегодня</h2><span>контекст, не оценка</span></div>${calorieTracking ? `<div class="rc-calories"><div class="rc-cal-top"><div><span>Калории</span><br><b>${Math.round(totals.cal).toLocaleString('ru-RU')}</b></div><span>из ${targets.cal.toLocaleString('ru-RU')} ккал</span></div><div class="rc-bar"><i style="width:${Math.min(100, targets.cal ? totals.cal / targets.cal * 100 : 0)}%"></i></div></div>` : ''}<div class="rc-mini-grid"><div class="rc-mini"><small>Белок</small><b>${Math.round(totals.protein)} / ${targets.protein} г</b></div><div class="rc-mini"><small>Шаги</small><b>${Number(day.steps || 0).toLocaleString('ru-RU')}</b></div><div class="rc-mini"><small>Вода</small><b>${Number(day.water || 0).toLocaleString('ru-RU')} мл</b></div></div>`;
    }

    function renderTimeline(day) {
      const box = doc.getElementById('rcTimeline'); if (!box) return;
      const events = [...(day.events || [])].sort((a,b) => String(b.time).localeCompare(String(a.time)));
      const count = doc.getElementById('rcEventCount'); if (count) count.textContent = events.length ? `${events.length} записей` : 'пока пусто';
      box.innerHTML = events.length ? events.map((e) => `<div class="rc-event"><small>${new Date(e.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small><b>${e.type === 'food' ? esc(e.text) : 'Вес'}</b><p>${e.type === 'food' ? `≈ ${Math.round(e.cal || 0)} ккал · ${Math.round(e.protein || 0)} г белка` : `${e.weight} кг`}</p><button onclick="delEvent(${Number(e.id)})">×</button></div>`).join('') : `<div class="rc-empty">Записывайте только то, что действительно полезно Rinlo для контекста. Заполнять всё приложение не требуется.</div>`;
    }

    win.renderToday = function() {
      const key = viewDay(win), { db, day } = dayState(win, key), profile = db.profile || {};
      const h = new Date().getHours();
      const greeting = h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
      const g = doc.getElementById('rcGreeting'); if (g) g.textContent = greeting;
      const dt = doc.getElementById('rcDate'); if (dt) dt.textContent = new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${key}T12:00:00`));
      const label = doc.querySelector('.rc-day-label'); if (label) label.textContent = key === localDayKey() ? 'Сегодня' : 'История';
      renderCheckin(key, day); renderAction(key, day); renderMetrics(day, profile); renderTimeline(day);
    };

    win.rinloCoreCheckin = async (wellbeing) => {
      if (!wellbeingCopy[wellbeing]) return;
      const key = viewDay(win), state = dayState(win, key);
      state.day.rinloCheckin = { ...(state.day.rinloCheckin || {}), day:key, wellbeing, updatedAt:new Date().toISOString() };
      writeDb(win, state.db); win.renderToday();
      if (api?.enabled) {
        try {
          const current = state.day.rinloCheckin;
          const result = await api.saveRinloCheckin(key, { wellbeing, energy: current.energy ?? null, sleepQuality: current.sleepQuality ?? null, sleepMinutes: current.sleepMinutes ?? null, note: current.note ?? null });
          if (result?.checkin) { const fresh = dayState(win,key); fresh.day.rinloCheckin = result.checkin; writeDb(win,fresh.db); }
        } catch (error) { console.warn('Rinlo check-in sync deferred', error); }
      }
      const current = dayState(win,key).day; const active = activeAction(current);
      if (!active) await ensureAction(key); else if (active.source === 'local-rules') { active.status = 'replaced'; const fresh = dayState(win,key); writeDb(win, fresh.db); await ensureAction(key,true,active.kind); }
      win.renderToday();
    };

    win.rinloCoreCheckinDetails = () => {
      const key = viewDay(win), checkin = dayState(win,key).day.rinloCheckin || { wellbeing:'okay' };
      draft.energy = checkin.energy ?? null; draft.sleepQuality = checkin.sleepQuality ?? null;
      win.openSheet?.(`<h2>Добавить контекст</h2><div class="sub">Это необязательно. Достаточно того, что вы уже отметили самочувствие.</div><div class="field"><label>Энергия</label><div class="rc-chip-row">${[1,2,3,4,5].map(n => `<button type="button" class="rc-chip ${checkin.energy===n?'sel':''}" onclick="rinloPickEnergy(${n})">${n}</button>`).join('')}</div></div><div class="field"><label>Сон прошлой ночью, часов</label><input id="rcSleepHours" inputmode="decimal" value="${checkin.sleepMinutes != null ? Math.round(checkin.sleepMinutes/6)/10 : ''}" placeholder="Например, 7.5"></div><div class="field"><label>Качество сна</label><div class="rc-chip-row">${[1,2,3,4,5].map(n => `<button type="button" class="rc-chip ${checkin.sleepQuality===n?'sel':''}" onclick="rinloPickSleepQuality(${n})">${n}</button>`).join('')}</div></div><button class="btn primary full" onclick="rinloSaveCheckinDetails()">Сохранить</button>`);
    };
    win.rinloPickEnergy = (n) => { draft.energy = n; doc.querySelectorAll('.rc-chip-row')[0]?.querySelectorAll('.rc-chip').forEach((b,i)=>b.classList.toggle('sel',i===n-1)); };
    win.rinloPickSleepQuality = (n) => { draft.sleepQuality = n; const rows=doc.querySelectorAll('.rc-chip-row'); rows[1]?.querySelectorAll('.rc-chip').forEach((b,i)=>b.classList.toggle('sel',i===n-1)); };
    win.rinloSaveCheckinDetails = async () => {
      const key = viewDay(win), state = dayState(win,key), checkin = state.day.rinloCheckin || { wellbeing:'okay' };
      const hours = num(doc.getElementById('rcSleepHours')?.value, NaN);
      checkin.energy = draft.energy ?? checkin.energy ?? null; checkin.sleepQuality = draft.sleepQuality ?? checkin.sleepQuality ?? null;
      checkin.sleepMinutes = Number.isFinite(hours) ? Math.max(0, Math.min(1440, Math.round(hours*60))) : (checkin.sleepMinutes ?? null);
      state.day.rinloCheckin = checkin; writeDb(win,state.db); win.closeSheet?.(); win.renderToday();
      if (api?.enabled) api.saveRinloCheckin(key, { wellbeing:checkin.wellbeing, energy:checkin.energy, sleepQuality:checkin.sleepQuality, sleepMinutes:checkin.sleepMinutes, note:checkin.note ?? null }).catch((e)=>console.warn('Rinlo check-in details sync deferred',e));
    };
    win.rinloCoreSkipCheckin = () => ensureAction(viewDay(win));

    async function actionEvent(eventType, reasonCode = null, payload = {}) {
      const key = viewDay(win), state = dayState(win,key), action = activeAction(state.day);
      if (!action) return null;
      const nextStatus = eventType === 'completed' ? 'completed' : eventType === 'replaced' ? 'replaced' : eventType === 'dismissed' ? 'dismissed' : action.status;
      action.status = nextStatus; if (eventType === 'completed') action.completedAt = new Date().toISOString();
      writeDb(win,state.db); win.renderToday();
      if (api?.enabled && !String(action.id).startsWith('local-')) {
        try { const result = await api.addRinloActionEvent(action.id,{ eventType, reasonCode, payload }); if (result?.action) mergeLocalAction(win,key,result.action); }
        catch (error) { console.warn('Rinlo action event sync deferred', error); }
      }
      return action;
    }
    win.rinloCoreCompleteAction = async () => { await actionEvent('completed'); win.toast?.('Шаг отмечен'); win.renderToday(); };
    win.rinloCoreReplaceAction = async () => { const a=await actionEvent('replaced'); await ensureAction(viewDay(win),true,a?.kind); };
    win.rinloCoreDismissAction = () => win.openSheet?.(`<h2>Почему шаг не подходит?</h2><div class="sub">Это помогает Rinlo не повторять неудобные варианты.</div><div class="rc-sheet-options">${Object.entries(reasonCopy).map(([code,label])=>`<button class="rc-sheet-option" onclick="rinloCoreDismissReason('${code}')">${label}</button>`).join('')}</div>`);
    win.rinloCoreDismissReason = async (code) => { win.closeSheet?.(); const a=await actionEvent('dismissed',code); await ensureAction(viewDay(win),true,a?.kind); };
    win.rinloCoreActionFeedback = async (useful) => {
      const key=viewDay(win), state=dayState(win,key), action=(state.day.rinloActions||[]).find(x=>x.status==='completed'); if(!action)return;
      action.feedback={ useful:Boolean(useful), at:new Date().toISOString() }; writeDb(win,state.db); win.renderToday();
      if(api?.enabled&&!String(action.id).startsWith('local-')) api.addRinloActionEvent(action.id,{eventType:'feedback',payload:{useful:Boolean(useful)}}).catch((e)=>console.warn('Rinlo feedback sync deferred',e));
      win.toast?.(useful?'Учтём это дальше':'Поищем более подходящие шаги');
    };

    buildOnboarding(); buildToday();
    const hadProfile = Boolean(readDb(win).profile);
    win.render?.();
    if (hadProfile) setTimeout(() => hydrateDay(viewDay(win)), 80);
  }

  frame.addEventListener('load', () => patchFrame());
  try { if (frame.contentDocument?.readyState === 'complete') setTimeout(() => patchFrame(), 0); } catch {}
})();
