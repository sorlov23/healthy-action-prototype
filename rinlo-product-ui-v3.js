(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const VERSION = 'v3';
  const KEY = 'healthy-action-v07';
  let mountedDocument = null;
  let currentTab = 'today';
  let rendering = false;
  let checkinExpanded = false;

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
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 15.2A7.6 7.6 0 0 1 8.8 5a7.6 7.6 0 1 0 10.2 10.2Z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.4 3.4 3.3 7.7-8"/></svg>',
    tune: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5h9m4 0h2M4.5 16.5h2m4 0h9"/><circle cx="15.5" cy="7.5" r="2"/><circle cx="8.5" cy="16.5" r="2"/></svg>',
    data: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>'
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const readDb = (win) => { try { return JSON.parse(win.localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const localDayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const currentDayKey = (win) => win.__haViewDay || localDayKey();
  const shiftKey = (key, amount) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + amount); return localDayKey(d); };
  const activeAction = (day) => (day?.rinloActions || []).find((a) => ['suggested','accepted'].includes(a.status)) || (day?.rinloActions || []).find((a) => a.status === 'completed') || null;
  const totals = (day) => (day?.events || []).reduce((out, event) => {
    if (event?.type === 'food') { out.cal += Number(event.cal || 0); out.protein += Number(event.protein || 0); out.meals += 1; }
    if (event?.type === 'weight') out.weight = Number(event.weight || 0);
    return out;
  }, { cal:0, protein:0, weight:null, meals:0 });
  const targets = (profile = {}) => {
    const weight = Number(profile.weight || 75), height = Number(profile.height || 170), age = Number(profile.age || 35);
    const sexConst = profile.sex === 'female' ? -161 : profile.sex === 'male' ? 5 : -78;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexConst;
    const mult = profile.activity === 'high' ? 1.6 : profile.activity === 'medium' ? 1.4 : 1.22;
    const maintenance = Math.max(1300, bmr * mult);
    const calories = profile.primaryGoal === 'weight_loss' ? Math.max(1400, maintenance * .85) : maintenance;
    return { cal:Math.round(calories/50)*50, protein:Math.round(Math.max(75,weight*(['weight_loss','nutrition'].includes(profile.primaryGoal)?1.6:1.25))/5)*5, steps:profile.activity==='low'?8000:10000, water:2000 };
  };
  const goalName = (code) => ({ weight_loss:'Снижение веса', nutrition:'Питание', movement:'Движение', sleep:'Сон', energy:'Энергия', nicotine:'Меньше никотина' }[code] || 'Здоровье');
  const wellbeingName = (code) => ({ poor:'Мало сил', okay:'Нормально', good:'Хорошо', great:'Отлично' }[code] || 'Не отмечено');
  const planFitName = (code) => ({ easy:'Было легко', right:'В самый раз', too_much:'Было многовато' }[code] || '');
  const usefulName = (code) => ({ yes:'Главный шаг помог', no:'Главный шаг не помог', skipped:'Главный шаг пропущен' }[code] || '');
  const compact = (value) => Number(value || 0) >= 1000 ? `${(Number(value)/1000).toFixed(Number(value)%1000?1:0).replace('.',',')} тыс.` : Math.round(Number(value||0)).toLocaleString('ru-RU');
  const plural = (value, one, few, many) => {
    const n = Math.abs(Number(value || 0)) % 100, digit = n % 10;
    if (n > 10 && n < 20) return many;
    if (digit === 1) return one;
    if (digit >= 2 && digit <= 4) return few;
    return many;
  };

  function installStyles(doc) {
    doc.getElementById('rinlo-product-ui-v3-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-product-ui-v3-style';
    style.textContent = `
      :root{--r-bg:#F5F5F0;--r-surface:#FFF;--r-ink:#151A17;--r-muted:#727A75;--r-faint:#9AA19C;--r-line:#E4E7E2;--r-green:#2F7B61;--r-green-soft:#EEF5F1;--r-dark:#19231F;--r-danger:#A45656;--r-shadow:0 16px 38px rgba(25,37,31,.10)}
      html,body{background:var(--r-bg)!important;color:var(--r-ink)!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif!important;-webkit-font-smoothing:antialiased}body{overscroll-behavior-y:none}.app{max-width:430px!important;background:var(--r-bg)!important}.screen{padding:calc(18px + env(safe-area-inset-top)) 18px calc(108px + env(safe-area-inset-bottom))!important;background:var(--r-bg)!important}.fab{display:none!important}button,input,select,textarea{font-family:inherit!important}
      .r3-top{display:flex;align-items:center;justify-content:space-between;min-height:32px}.r3-logo{display:block;width:90px;height:auto}.r3-chip{padding:7px 10px;border:1px solid var(--r-line);border-radius:999px;background:#FCFCF9;font-size:9.5px;font-weight:650;color:var(--r-muted)}
      .r3-head{margin-top:23px}.r3-head h1{margin:0!important;font-size:34px!important;line-height:1.02!important;letter-spacing:-.055em!important;font-weight:650!important;color:var(--r-ink)!important}.r3-head p{max-width:335px;margin:7px 0 0;font-size:11.5px;line-height:1.48;color:var(--r-muted)}
      .r3-section{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:22px 0 9px}.r3-section h2{margin:0!important;font-size:15px!important;line-height:1.2!important;letter-spacing:-.02em!important;font-weight:650!important;color:var(--r-ink)!important}.r3-section span{font-size:9px;color:var(--r-faint)}
      .r3-action{position:relative;overflow:hidden;margin-top:17px;padding:20px;border-radius:27px;background:linear-gradient(145deg,#17221E 0%,#223C32 63%,#2E735A 145%);color:#fff;box-shadow:0 16px 36px rgba(24,38,31,.14)}.r3-action:after{content:'';position:absolute;width:184px;height:184px;right:-90px;top:-108px;border:1px solid rgba(255,255,255,.09);border-radius:50%}.r3-action-kicker{position:relative;z-index:1;display:flex;align-items:center;gap:7px;font-size:9.5px;font-weight:650;color:#ADD1C1}.r3-action-kicker svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}.r3-action h2{position:relative;z-index:1;max-width:315px;margin:12px 0 0!important;font-size:25px!important;line-height:1.08!important;letter-spacing:-.042em!important;font-weight:650!important;color:#fff!important}.r3-effort{position:relative;z-index:1;display:inline-flex;margin-top:13px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.09);font-size:9px;color:rgba(255,255,255,.8)}.r3-action-buttons{position:relative;z-index:1;display:grid;grid-template-columns:1fr 48px;gap:8px;margin-top:18px}.r3-action-buttons button{height:46px;border-radius:14px;font-size:10.5px;font-weight:650}.r3-done{border:0;background:#F7FBF8;color:#1E6048}.r3-swap{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;display:grid;place-items:center}.r3-swap svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.r3-why{position:relative;z-index:1;margin-top:10px}.r3-why summary{list-style:none;cursor:pointer;font-size:9px;color:rgba(255,255,255,.58)}.r3-why summary::-webkit-details-marker{display:none}.r3-why div{margin-top:7px;font-size:10px;line-height:1.45;color:rgba(255,255,255,.66)}.r3-feedback{position:relative;z-index:1;margin-top:17px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:space-between;gap:12px}.r3-feedback span{font-size:10px;color:rgba(255,255,255,.72)}.r3-feedback div{display:flex;gap:6px}.r3-feedback button,.r3-more-step{min-height:34px;border:1px solid rgba(255,255,255,.16);border-radius:11px;background:rgba(255,255,255,.07);color:#fff;font-size:9.5px;padding:0 11px}.r3-settled p{position:relative;z-index:1;margin:8px 0 0;font-size:11px;line-height:1.45;color:rgba(255,255,255,.68)}
      .r3-checkin{margin-top:11px;padding:13px 14px;border:1px solid var(--r-line);border-radius:19px;background:var(--r-surface)}.r3-checkin-head,.r3-checkin-compact{display:flex;align-items:center;justify-content:space-between;gap:12px}.r3-checkin-head b,.r3-checkin-compact b{font-size:11.5px;font-weight:650}.r3-checkin-head span{font-size:8.5px;color:var(--r-faint)}.r3-moods{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.r3-mood{height:40px;border:1px solid var(--r-line);border-radius:12px;background:#FAFBF9;color:#68716C;font-size:10px;font-weight:650}.r3-mood.sel{border-color:#ADD0BF;background:var(--r-green-soft);color:var(--r-green)}.r3-checkin-compact span{display:flex;align-items:center;gap:7px;font-size:9.5px;color:var(--r-muted)}.r3-checkin-compact button{min-width:66px;height:38px;border:1px solid var(--r-line);border-radius:11px;background:#FAFBF9;color:var(--r-green);font-size:9px;font-weight:650}
      .r3-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.r3-quick button{min-width:0;height:82px;padding:10px 7px;border:1px solid var(--r-line);border-radius:18px;background:var(--r-surface);color:var(--r-ink);text-align:left}.r3-quick-icon{width:31px;height:31px;border-radius:10px;background:var(--r-green-soft);color:var(--r-green);display:grid;place-items:center}.r3-quick-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.r3-quick b{display:block;margin-top:8px;font-size:10px;font-weight:650}.r3-quick small{display:block;margin-top:2px;font-size:8px;color:var(--r-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .r3-glance{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.r3-glance-card{min-width:0;padding:11px 8px;border:1px solid var(--r-line);border-radius:16px;background:#fff}.r3-glance-card small{display:block;font-size:8px;color:var(--r-faint)}.r3-glance-card strong{display:block;margin-top:5px;font-size:14px;line-height:1;font-weight:650;color:#26302B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.r3-glance-card em{display:block;margin-top:4px;font-style:normal;font-size:7.5px;color:#A2A8A4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .r3-timeline{border-top:1px solid var(--r-line)}.r3-event{display:grid;grid-template-columns:40px 1fr 32px;gap:9px;padding:13px 0;border-bottom:1px solid var(--r-line)}.r3-event-time{padding-top:2px;font-size:8.5px;color:var(--r-faint)}.r3-event-copy b{display:block;font-size:11px;line-height:1.25;font-weight:600}.r3-event-copy span{display:block;margin-top:3px;font-size:8.8px;color:var(--r-muted)}.r3-event-delete{width:32px;height:32px;border:0;border-radius:10px;background:#ECEFEA;color:#89918C}.r3-empty{padding:17px 0 4px;font-size:10.5px;line-height:1.5;color:var(--r-muted)}
      .r3-soft{margin-top:18px;padding:13px 14px;border:1px solid #DCE4DF;border-radius:18px;background:#F0F4F1;display:flex;align-items:center;gap:11px}.r3-soft-icon{width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:#fff;color:#53645B;display:grid;place-items:center}.r3-soft-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.r3-soft-copy{min-width:0;flex:1}.r3-soft-copy b{display:block;font-size:10.5px;font-weight:650}.r3-soft-copy span{display:block;margin-top:3px;font-size:8.8px;line-height:1.35;color:var(--r-muted)}.r3-soft button{min-height:38px;padding:0 11px;border:0;border-radius:11px;background:var(--r-dark);color:#fff;font-size:9px;font-weight:650}
      .r3-card{padding:15px;border:1px solid var(--r-line);border-radius:20px;background:#fff}.r3-row{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid #F0F1EE}.r3-row:first-child{padding-top:0}.r3-row:last-child{padding-bottom:0;border-bottom:0}.r3-row-icon{width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:var(--r-green-soft);color:var(--r-green);display:grid;place-items:center}.r3-row-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.r3-row-copy{min-width:0;flex:1}.r3-row-copy b{display:block;font-size:11px;font-weight:650}.r3-row-copy span{display:block;margin-top:3px;font-size:9px;line-height:1.35;color:var(--r-muted)}.r3-row-value{font-size:10px;font-weight:650;color:#44504A;white-space:nowrap}
      .r3-plan-hero{margin-top:17px;padding:18px;border-radius:24px;background:#fff;border:1px solid var(--r-line)}.r3-plan-hero small{font-size:9px;font-weight:650;color:var(--r-green)}.r3-plan-hero h2{margin:8px 0 0!important;font-size:22px!important;line-height:1.1!important;letter-spacing:-.035em!important;font-weight:650!important;color:var(--r-ink)!important}.r3-plan-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}.r3-plan-meta span{padding:6px 8px;border-radius:999px;background:var(--r-green-soft);font-size:8.5px;color:#456A5A}.r3-plan-note{margin-top:11px;font-size:10px;line-height:1.45;color:var(--r-muted)}
      .r3-review{margin-top:18px;padding:16px;border-radius:20px;background:var(--r-dark);color:#fff}.r3-review small{font-size:9px;color:#A9C8BA}.r3-review h3{margin:7px 0 0;font-size:18px;line-height:1.15;letter-spacing:-.025em}.r3-review p{margin:6px 0 0;font-size:10px;line-height:1.45;color:rgba(255,255,255,.66)}.r3-review button{width:100%;height:46px;margin-top:14px;border:0;border-radius:14px;background:#F7FBF8;color:#1F5D47;font-size:10.5px;font-weight:650}
      .r3-insight{margin-top:17px;padding:19px;border-radius:24px;background:linear-gradient(145deg,#17221E,#223C32 65%,#2D735A 145%);color:#fff}.r3-insight small{font-size:9px;color:#ACD0C0}.r3-insight h2{margin:9px 0 0!important;font-size:22px!important;line-height:1.1!important;letter-spacing:-.035em!important;color:#fff!important}.r3-insight p{margin:7px 0 0;font-size:10.5px;line-height:1.48;color:rgba(255,255,255,.68)}.r3-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.r3-stat-card{padding:12px 10px;border:1px solid var(--r-line);border-radius:17px;background:#fff}.r3-stat-card small{display:block;font-size:8px;color:var(--r-faint)}.r3-stat-card strong{display:block;margin-top:6px;font-size:16px;line-height:1;font-weight:650}.r3-stat-card span{display:block;margin-top:4px;font-size:8px;line-height:1.3;color:var(--r-muted)}
      .r3-weight{padding:15px;border:1px solid var(--r-line);border-radius:20px;background:#fff}.r3-weight-top{display:flex;align-items:flex-end;justify-content:space-between}.r3-weight-top small{display:block;font-size:8px;color:var(--r-faint)}.r3-weight-top strong{display:block;margin-top:4px;font-size:20px;font-weight:650}.r3-weight-delta{font-size:10px;font-weight:650;color:var(--r-muted)}.r3-sparkline{height:78px;margin-top:12px}.r3-sparkline svg{width:100%;height:100%;overflow:visible}.r3-sparkline polyline{fill:none;stroke:var(--r-green);stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round}.r3-sparkline circle{fill:#fff;stroke:var(--r-green);stroke-width:2}
      .r3-profile-hero{margin-top:17px;padding:16px;border:1px solid var(--r-line);border-radius:22px;background:#fff}.r3-profile-hero small{font-size:9px;color:var(--r-faint)}.r3-profile-hero h2{margin:7px 0 0!important;font-size:22px!important;letter-spacing:-.035em!important}.r3-profile-hero p{margin:6px 0 0;font-size:10px;line-height:1.45;color:var(--r-muted)}.r3-profile-hero button,.r3-profile-action{width:100%;min-height:48px;margin-top:13px;border:0;border-radius:14px;background:var(--r-dark);color:#fff;font-size:10.5px;font-weight:650}.r3-profile-list{display:grid;gap:8px}.r3-profile-item{display:flex;align-items:center;gap:11px;padding:12px 13px;border:1px solid var(--r-line);border-radius:17px;background:#fff}.r3-profile-item .r3-row-icon{width:32px;height:32px;flex-basis:32px}.r3-profile-item-copy{min-width:0;flex:1}.r3-profile-item-copy small{display:block;font-size:8px;color:var(--r-faint)}.r3-profile-item-copy b{display:block;margin-top:3px;font-size:10.8px;font-weight:650}.r3-profile-item-copy span{display:block;margin-top:2px;font-size:8.7px;color:var(--r-muted)}
      .nav{left:50%!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;width:min(398px,calc(100vw - 28px))!important;height:68px!important;padding:6px!important;border:1px solid var(--r-line)!important;border-radius:22px!important;background:#FFF!important;box-shadow:0 14px 36px rgba(31,43,36,.11)!important}.nav button{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:16px!important;color:#959C98!important;font-size:8px!important;font-weight:600!important}.nav button b{display:none!important}.nav button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nav button.active{background:var(--r-green-soft)!important;color:var(--r-green)!important}
      .overlay{background:rgba(18,24,21,.34)!important;backdrop-filter:blur(2px)}.sheet{width:min(430px,100vw)!important;max-height:88vh!important;border-radius:29px 29px 0 0!important;padding:10px 18px calc(24px + env(safe-area-inset-bottom))!important;background:#FBFCFA!important;box-shadow:0 -20px 60px rgba(16,25,20,.18)!important}.handle{width:36px!important;height:4px!important;background:#D5DAD6!important;margin:2px auto 18px!important}.sheet h2{font-size:24px!important;line-height:1.1!important;letter-spacing:-.04em!important;font-weight:650!important}.sheet .sub{font-size:11px!important;line-height:1.45!important;color:var(--r-muted)!important}.sheet .field label{font-size:9.5px!important;color:var(--r-muted)!important}.sheet input,.sheet textarea,.sheet select{border:1px solid var(--r-line)!important;border-radius:15px!important;background:#fff!important;box-shadow:none!important}.sheet .btn,.sheet button.rsf-primary,.rpp-save{min-height:48px!important;border-radius:15px!important}.sheet .primary,.rsf-primary,.rpp-save{background:var(--r-dark)!important;color:#fff!important}
      .rsf-head h2{font-size:24px!important}.rsf-kicker{color:var(--r-green)!important}.rsf-mode{border-color:var(--r-line)!important;border-radius:17px!important;background:#fff!important}.rsf-mode.active{border-color:#B3D2C3!important;background:var(--r-green-soft)!important}.rsf-input{border-color:var(--r-line)!important;background:#fff!important}.rsf-chip{background:var(--r-green-soft)!important;color:var(--r-green)!important}.rsf-portion button.active{border-color:#A9CDBB!important;background:var(--r-green-soft)!important;color:var(--r-green)!important}.rer-option{border-color:var(--r-line)!important;border-radius:14px!important;font-weight:600!important}.rer-option.sel{border-color:#A9CDBB!important;background:var(--r-green-soft)!important;color:var(--r-green)!important}.rpp-kicker{color:var(--r-green)!important}
      #onboarding.rpr-onboarding{background:var(--r-bg)!important;padding:max(20px,env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))!important}.rpr-logo{width:90px!important}.rpr-stage{padding-top:40px!important}.rpr-eyebrow{font-size:10px!important;color:var(--r-green)!important}.rpr-title{font-size:38px!important;line-height:1.01!important;letter-spacing:-.055em!important;font-weight:650!important;color:var(--r-ink)!important}.rpr-title span{color:var(--r-green)!important}.rpr-lead{font-size:13px!important;line-height:1.5!important;color:var(--r-muted)!important}.rpr-value-row,.rpr-goal{border-color:var(--r-line)!important;border-radius:19px!important;background:#fff!important;box-shadow:none!important}.rpr-value-icon,.rpr-goal-icon{background:var(--r-green-soft)!important;color:var(--r-green)!important}.rpr-goal.sel{border-color:#A9CDBB!important;background:#F8FAF8!important}.rpr-primary{background:var(--r-dark)!important;border-radius:16px!important}.rpr-option{border-color:var(--r-line)!important;border-radius:14px!important}.rpr-option.sel{border-color:#A9CDBB!important;background:var(--r-green-soft)!important;color:var(--r-green)!important}.rpr-magic{border-color:#D9E4DE!important;border-radius:24px!important;background:#EDF5F1!important}.rpr-keep{background:var(--r-dark)!important}.rpr-other{border-color:var(--r-line)!important;color:#435149!important}
      @media(max-width:360px){.screen{padding-left:14px!important;padding-right:14px!important}.r3-head h1{font-size:32px!important}.r3-action h2{font-size:23px!important}.r3-quick{gap:6px}.r3-glance{gap:5px}.nav{width:calc(100vw - 20px)!important}}
    `;
    doc.head.appendChild(style);
  }

  function top(label) { return `<div class="r3-top"><img class="r3-logo" src="./rinlo-logo.svg?rev=31" alt="Rinlo"><span class="r3-chip">${label}</span></div>`; }

  function actionMarkup(action, checkin) {
    if (!action) return `<section class="r3-action" data-testid="today-primary-action"><div class="r3-action-kicker">${icon.spark}<span>На сегодня</span></div><h2>${checkin?'Подбираем подходящий шаг':'Как ты сегодня?'}</h2>${checkin?'':`<div class="r3-action-buttons"><button class="r3-done" onclick="rinloCoreSkipCheckin()">Продолжить без ответа</button></div>`}</section>`;
    const completed = action.status === 'completed';
    const feedback = action.feedback?.useful;
    if (completed && typeof feedback === 'boolean') return `<section class="r3-action r3-settled" data-testid="today-primary-action"><div class="r3-action-kicker">${icon.check}<span>Готово на сегодня</span></div><h2>Главное на сегодня сделано</h2><p>${esc(action.title)}</p><div class="r3-feedback"><span>${feedback?'Шаг оказался полезным':'Учтём, что шаг не подошёл'}</span><button class="r3-more-step" onclick="rinloCoreReplaceAction()">Ещё один шаг</button></div></section>`;
    return `<section class="r3-action" data-testid="today-primary-action"><div class="r3-action-kicker">${icon.spark}<span>${completed?'Готово на сегодня':'Один шаг на сегодня'}</span></div><h2>${esc(action.title)}</h2>${action.effortMinutes?`<span class="r3-effort">≈ ${Number(action.effortMinutes)} мин</span>`:''}${completed?`<div class="r3-feedback"><span>Этот шаг помог?</span><div><button onclick="rinloCoreActionFeedback(true)">Да</button><button onclick="rinloCoreActionFeedback(false)">Нет</button></div></div>`:`<div class="r3-action-buttons"><button class="r3-done" data-testid="complete-action" onclick="rinloCoreCompleteAction()">Готово</button><button class="r3-swap" aria-label="Другой вариант" onclick="rinloCoreReplaceAction()">${icon.swap}</button></div><details class="r3-why"><summary>Почему именно это</summary><div>${esc(action.rationale || 'Небольшой шаг, который подходит текущему дню.')}</div></details>`}</section>`;
  }

  function checkinMarkup(checkin) {
    if (checkin && !checkinExpanded) return `<section class="r3-checkin" data-testid="today-checkin"><div class="r3-checkin-compact"><span><b>Сегодня:</b> ${wellbeingName(checkin.wellbeing)}</span><button onclick="rinloProductEditCheckin()">Изменить</button></div></section>`;
    return `<section class="r3-checkin" data-testid="today-checkin"><div class="r3-checkin-head"><b>Как ты сегодня?</b><span>${checkin?'выбери заново':'один быстрый ответ'}</span></div><div class="r3-moods"><button class="r3-mood ${checkin?.wellbeing==='poor'?'sel':''}" onclick="rinloProductCheckin('poor')">Мало сил</button><button class="r3-mood ${checkin?.wellbeing==='okay'?'sel':''}" onclick="rinloProductCheckin('okay')">Нормально</button><button class="r3-mood ${['good','great'].includes(checkin?.wellbeing)?'sel':''}" onclick="rinloProductCheckin('good')">Хорошо</button></div></section>`;
  }

  function renderToday(doc, win) {
    const root = doc.getElementById('today'); if (!root) return;
    const db = readDb(win), key = currentDayKey(win), day = db.days?.[key] || {events:[],water:0,steps:0,rinloActions:[]}, profile = db.profile || {};
    const sum = totals(day), goal = targets(profile), action = activeAction(day), checkin = day.rinloCheckin || null;
    const isToday = key === localDayKey();
    const date = new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${key}T12:00:00`));
    const hour = new Date().getHours(), greeting = isToday ? (hour<12?'Доброе утро':hour<18?'Добрый день':'Добрый вечер') : 'История дня';
    const events = [...(day.events||[])].sort((a,b)=>String(b.time).localeCompare(String(a.time))).slice(0,5);
    const actionHtml = actionMarkup(action, checkin), checkinHtml = checkinMarkup(checkin), flow = checkin ? `${actionHtml}${checkinHtml}` : `${checkinHtml}${actionHtml}`;
    const quick = `<div class="r3-section"><h2>Добавить</h2><span>быстро</span></div><div class="r3-quick" data-testid="quick-actions"><button data-testid="quick-food" onclick="openFood()"><span class="r3-quick-icon">${icon.food}</span><b>Еда</b><small>${sum.meals?`${sum.meals} ${plural(sum.meals,'запись','записи','записей')}`:'добавить'}</small></button><button data-testid="quick-water" onclick="addWater(250)"><span class="r3-quick-icon">${icon.water}</span><b>Вода</b><small>${Number(day.water||0)} мл</small></button><button data-testid="quick-steps" onclick="addSteps(1000)"><span class="r3-quick-icon">${icon.steps}</span><b>Шаги</b><small>${compact(day.steps||0)}</small></button><button data-testid="quick-weight" onclick="openWeight()"><span class="r3-quick-icon">${icon.weight}</span><b>Вес</b><small>${sum.weight?`${sum.weight} кг`:'добавить'}</small></button></div>`;
    const glance = profile.detailsComplete === true ? `<div class="r3-section"><h2>Ориентиры</h2><span>без оценок</span></div><div class="r3-glance" data-testid="today-overview"><div class="r3-glance-card"><small>Калории</small><strong>${Math.round(sum.cal)}</strong><em>из ${goal.cal}</em></div><div class="r3-glance-card"><small>Белок</small><strong>${Math.round(sum.protein)} г</strong><em>из ${goal.protein} г</em></div><div class="r3-glance-card"><small>Вода</small><strong>${(Number(day.water||0)/1000).toFixed(1).replace('.',',')} л</strong><em>из 2 л</em></div><div class="r3-glance-card"><small>Шаги</small><strong>${compact(day.steps||0)}</strong><em>из ${compact(goal.steps)}</em></div></div>` : '';
    const timeline = `<div class="r3-section"><h2>За сегодня</h2><span>${events.length?`${events.length} ${plural(events.length,'запись','записи','записей')}`:'пока пусто'}</span></div><div class="r3-timeline" data-testid="today-timeline">${events.length?events.map((event)=>`<div class="r3-event"><span class="r3-event-time">${new Date(event.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span><div class="r3-event-copy"><b>${event.type==='food'?esc(event.text):'Вес'}</b><span>${event.type==='food'?`≈ ${Math.round(event.cal||0)} ккал · ${Math.round(event.protein||0)} г белка`:`${event.weight} кг`}</span></div><button class="r3-event-delete" aria-label="Удалить" onclick="delEvent(${Number(event.id)})">×</button></div>`).join(''):`<div class="r3-empty">Записи появятся здесь по ходу дня. Заполнять всё подряд не нужно.</div>`}</div>`;
    const showEvening = isToday && (day.closed || hour >= 18);
    const evening = showEvening ? `<div class="r3-soft"><div class="r3-soft-icon">${icon.moon}</div><div class="r3-soft-copy"><b>${day.closed?'День завершён':'Как прошёл день?'}</b><span>${day.closed?'Итог сохранён. Завтра начнём с нового шага.':'Два коротких ответа — и на сегодня всё.'}</span></div>${day.closed?'':`<button onclick="finishDay()">Подвести итог</button>`}</div>` : '';
    root.className = 'screen r3-today'; root.dataset.rinloProductUi = VERSION;
    root.innerHTML = `${top(isToday?'Сегодня':'История')}<div class="r3-head"><h1>${greeting}</h1><p>${esc(date)} · ${goalName(profile.primaryGoal)}</p></div>${flow}${quick}${glance}${timeline}${evening}`;
  }

  function renderPlan(doc, win) {
    const root = doc.getElementById('actions'); if (!root) return;
    const db = readDb(win), key = currentDayKey(win), day = db.days?.[key] || {}, profile = db.profile || {}, action = activeAction(day), sum = totals(day), review = day.rinloEveningReview || null;
    const actionTitle = action?.title || 'Главный шаг появится после отметки самочувствия';
    const actionMeta = `${day.rinloCheckin?wellbeingName(day.rinloCheckin.wellbeing):'Самочувствие не отмечено'}${action?.effortMinutes?` · ≈ ${action.effortMinutes} мин`:''}`;
    const foodText = sum.meals ? `${sum.meals} ${plural(sum.meals,'приём пищи','приёма пищи','приёмов пищи')}` : 'Пока без записей';
    const reviewBlock = day.closed ? `<div class="r3-review"><small>День завершён</small><h3>${planFitName(review?.planFit) || 'Итог сохранён'}</h3><p>${usefulName(review?.actionUseful) || 'Ответы учтём в следующем дне.'}</p></div>` : `<div class="r3-review"><small>Вечерний итог</small><h3>Как прошёл день?</h3><p>Два ответа помогут подстроить следующий день. Без оценок и компенсаций.</p><button onclick="finishDay()">Подвести итог дня</button></div>`;
    root.className = 'screen r3-plan'; root.dataset.rinloProductUi = VERSION;
    root.innerHTML = `${top('План')}<div class="r3-head"><h1>Сегодняшний план</h1><p>Один главный шаг. Остальное — ориентиры, а не список обязательств.</p></div><section class="r3-plan-hero" data-testid="plan-primary"><small>${action?.status==='completed'?'Главное сделано':'Главный шаг'}</small><h2>${esc(actionTitle)}</h2><div class="r3-plan-meta"><span>${esc(actionMeta)}</span><span>${goalName(profile.primaryGoal)}</span></div>${action?.rationale?`<div class="r3-plan-note">${esc(action.rationale)}</div>`:''}</section><div class="r3-section"><h2>За день</h2><span>что уже есть</span></div><div class="r3-card"><div class="r3-row"><span class="r3-row-icon">${icon.food}</span><div class="r3-row-copy"><b>Питание</b><span>Только то, что уже добавлено</span></div><span class="r3-row-value">${foodText}</span></div><div class="r3-row"><span class="r3-row-icon">${icon.water}</span><div class="r3-row-copy"><b>Вода</b><span>Столько, сколько уже добавлено</span></div><span class="r3-row-value">${Number(day.water||0)} мл</span></div><div class="r3-row"><span class="r3-row-icon">${icon.steps}</span><div class="r3-row-copy"><b>Движение</b><span>Как есть на текущий момент</span></div><span class="r3-row-value">${compact(day.steps||0)}</span></div></div>${reviewBlock}`;
  }

  function weekData(db) {
    const today = localDayKey();
    const rows = [];
    for (let i=6;i>=0;i--) { const key=shiftKey(today,-i), day=db.days?.[key]||null, sum=totals(day||{}); rows.push({key,day,sum,active:Boolean(day&&((day.events||[]).length||Number(day.water||0)||Number(day.steps||0)||day.rinloCheckin))}); }
    return rows;
  }

  function weightSpark(rows) {
    const points = rows.map((row,index)=>({ index, value:row.sum.weight })).filter((p)=>Number.isFinite(p.value));
    if (!points.length) return '';
    const values=points.map((p)=>p.value), min=Math.min(...values), max=Math.max(...values), span=Math.max(.4,max-min);
    const coords=points.map((p)=>{const x=8+(p.index/6)*304;const y=65-((p.value-min)/span)*48;return {x,y,value:p.value};});
    return `<div class="r3-sparkline"><svg viewBox="0 0 320 76" preserveAspectRatio="none"><polyline points="${coords.map((p)=>`${p.x},${p.y}`).join(' ')}"/>${coords.map((p)=>`<circle cx="${p.x}" cy="${p.y}" r="3"/>`).join('')}</svg></div>`;
  }

  function renderProgress(doc, win) {
    const root = doc.getElementById('progress'); if (!root) return;
    const db = readDb(win), profile=db.profile||{}, rows=weekData(db), active=rows.filter((r)=>r.active).length, meals=rows.reduce((n,r)=>n+r.sum.meals,0);
    const movementRows=rows.filter((r)=>Number(r.day?.steps||0)>0), avgSteps=movementRows.length?Math.round(movementRows.reduce((n,r)=>n+Number(r.day?.steps||0),0)/movementRows.length):0;
    const waterDays=rows.filter((r)=>Number(r.day?.water||0)>0).length, movementDays=movementRows.length, foodDays=rows.filter((r)=>r.sum.meals>0).length;
    const weights=rows.map((r)=>r.sum.weight).filter(Number.isFinite), latest=weights.at(-1), first=weights[0], delta=weights.length>1?Number((latest-first).toFixed(1)):0;
    const heroTitle = active>=4?'Ритм уже начинает проявляться':active>=2?'Появляются первые точки':'Пока просто собираем ритм';
    const heroText = active>=4?`Есть данные за ${active} из 7 дней. Смотрим на повторяющиеся вещи, а не на отдельный «идеальный» день.`:'Нескольких обычных дней достаточно. Не нужно специально заполнять приложение ради статистики.';
    const weightBlock = Number.isFinite(latest) ? `<div class="r3-section"><h2>Вес</h2><span>только тенденция</span></div><div class="r3-weight"><div class="r3-weight-top"><div><small>Последняя запись</small><strong>${latest} кг</strong></div><span class="r3-weight-delta">${weights.length>1?(delta>0?'+':'')+delta+' кг':'пока одна точка'}</span></div>${weightSpark(rows)}</div>` : '';
    root.className='screen r3-progress'; root.dataset.rinloProductUi=VERSION;
    root.innerHTML=`${top('Прогресс')}<div class="r3-head"><h1>Что меняется</h1><p>Не оцениваем отдельные дни. Смотрим, что повторяется со временем.</p></div><section class="r3-insight"><small>Последние 7 дней</small><h2>${heroTitle}</h2><p>${heroText}</p></section><div class="r3-section"><h2>Неделя</h2><span>без рейтинга</span></div><div class="r3-stats"><div class="r3-stat-card"><small>Дни с данными</small><strong>${active}/7</strong><span>любые полезные записи</span></div><div class="r3-stat-card"><small>Шаги в среднем</small><strong>${compact(avgSteps)}</strong><span>${movementDays?'в дни с данными':'пока нет данных'}</span></div><div class="r3-stat-card"><small>Питание</small><strong>${meals}</strong><span>записей за 7 дней</span></div></div>${weightBlock}<div class="r3-section"><h2>Что повторяется</h2><span>факты</span></div><div class="r3-card"><div class="r3-row"><span class="r3-row-icon">${icon.water}</span><div class="r3-row-copy"><b>Вода</b><span>Есть записи в ${waterDays} из 7 дней</span></div></div><div class="r3-row"><span class="r3-row-icon">${icon.steps}</span><div class="r3-row-copy"><b>Движение</b><span>Есть данные в ${movementDays} из 7 дней</span></div></div><div class="r3-row"><span class="r3-row-icon">${icon.food}</span><div class="r3-row-copy"><b>Питание</b><span>Есть записи в ${foodDays} из 7 дней</span></div></div></div>`;
  }

  function renderProfile(doc, win) {
    const root = doc.getElementById('profile'); if (!root) return;
    const db=readDb(win), profile=db.profile||{}, complete=profile.detailsComplete===true, goal=targets(profile);
    const hero = complete ? `<section class="r3-profile-hero"><small>Главная цель</small><h2>${goalName(profile.primaryGoal)}</h2><p>Параметры заполнены. Их можно менять в любой момент — история дня от этого не пропадёт.</p><button onclick="rinloProductOpenPrecision()">Настроить под себя</button></section>` : `<section class="r3-profile-hero"><small>Профиль можно заполнить позже</small><h2>Rinlo уже работает без анкеты</h2><p>Добавь параметры только если нужны более точные ориентиры по питанию и движению.</p><button onclick="rinloProductOpenPrecision()">Настроить под себя</button></section>`;
    const params = complete ? `${profile.weight||'—'} кг · ${profile.height||'—'} см · ${profile.age||'—'} лет` : 'Не заполнены';
    const calories = profile.calorieTrackingEnabled===false?'Скрыты':complete?`≈ ${goal.cal} ккал`:'Без ориентира';
    root.className='screen r3-profile'; root.dataset.rinloProductUi=VERSION;
    root.innerHTML=`${top('Профиль')}<div class="r3-head"><h1>Твои настройки</h1><p>Здесь только то, что влияет на рекомендации и расчёты.</p></div>${hero}<div class="r3-section"><h2>О тебе</h2><span>можно менять</span></div><div class="r3-profile-list"><div class="r3-profile-item"><span class="r3-row-icon">${icon.spark}</span><div class="r3-profile-item-copy"><small>Главная цель</small><b>${goalName(profile.primaryGoal)}</b><span>Определяет приоритет рекомендаций</span></div></div><div class="r3-profile-item"><span class="r3-row-icon">${icon.tune}</span><div class="r3-profile-item-copy"><small>Параметры</small><b>${params}</b><span>${complete?'Используются для персональных ориентиров':'Rinlo пока работает без них'}</span></div></div><div class="r3-profile-item"><span class="r3-row-icon">${icon.food}</span><div class="r3-profile-item-copy"><small>Калории</small><b>${calories}</b><span>Ориентир можно скрыть</span></div></div></div><div class="r3-section"><h2>Данные</h2><span>сохраняются автоматически</span></div><div class="r3-soft"><div class="r3-soft-icon">${icon.data}</div><div class="r3-soft-copy"><b>Записи остаются в истории</b><span>Еда, вода, шаги, вес и итог дня сохраняются автоматически.</span></div></div>`;
  }

  function activate(doc, id=currentTab) {
    const db = readDb(frame.contentWindow);
    const onboarding = doc.getElementById('onboarding');
    if (!db.profile || onboarding?.classList.contains('on')) return;
    currentTab = ['today','actions','progress','profile'].includes(id) ? id : 'today';
    doc.querySelectorAll('.screen').forEach((screen)=>screen.classList.toggle('on',screen.id===currentTab));
    doc.querySelectorAll('#nav button').forEach((button)=>button.classList.toggle('active',button.dataset.rinloNav===currentTab));
  }

  function renderAll(doc, win) {
    if (rendering) return;
    rendering = true;
    try { renderToday(doc,win); renderPlan(doc,win); renderProgress(doc,win); renderProfile(doc,win); activate(doc,currentTab); }
    finally { rendering = false; }
  }

  function installNavigation(doc, win) {
    const nav=doc.getElementById('nav'); if (!nav) return;
    const tabs=[['today','Сегодня',icon.home],['actions','План',icon.list],['progress','Прогресс',icon.trend],['profile','Профиль',icon.user]];
    nav.innerHTML=tabs.map(([id,label,svg])=>`<button type="button" data-rinlo-nav="${id}" onclick="rinloProductGo('${id}')">${svg}<span>${label}</span></button>`).join('');
    win.rinloProductGo=(id)=>{ currentTab=id; win.show?.(id); renderAll(doc,win); };
    win.rinloProductEditCheckin=()=>{ checkinExpanded=true; renderToday(doc,win); activate(doc,currentTab); };
    win.rinloProductCheckin=async(value)=>{ checkinExpanded=false; await win.rinloCoreCheckin?.(value); renderAll(doc,win); };
  }

  function wrapRender(doc, win) {
    if (win.__rinloProductUiRenderHook===VERSION) return;
    if (typeof win.render==='function') { const original=win.render.bind(win); win.render=(...args)=>{ const result=original(...args); renderAll(doc,win); return result; }; }
    if (typeof win.renderToday==='function') { const originalToday=win.renderToday.bind(win); win.renderToday=(...args)=>{ const result=originalToday(...args); renderAll(doc,win); return result; }; }
    win.__rinloProductUiRenderHook=VERSION;
  }

  function mount(attempt=0) {
    const doc=frame.contentDocument, win=frame.contentWindow;
    if (!doc?.body || !win || typeof win.renderToday!=='function' || !doc.getElementById('nav')) { if (attempt<100) setTimeout(()=>mount(attempt+1),70); return; }
    if (mountedDocument!==doc) {
      mountedDocument=doc;
      const active=[...doc.querySelectorAll('#today.on,#actions.on,#progress.on,#profile.on')][0]?.id;
      if (active) currentTab=active;
      installStyles(doc); installNavigation(doc,win); wrapRender(doc,win);
      win.__rinloProductUi=VERSION;
    }
    renderAll(doc,win);
  }

  frame.addEventListener('load',()=>setTimeout(()=>mount(),0));
  setTimeout(()=>mount(),0); setTimeout(()=>mount(),300); setTimeout(()=>mount(),900);
})();