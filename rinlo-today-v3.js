(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const APP_KEY = 'healthy-action-v07';
  const VERSION = 'v3';
  let observer = null;
  let timer = null;
  let patchedWindow = null;

  const heroImage = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=84';
  const moodCopy = { poor: 'Плохо', okay: 'Нормально', good: 'Хорошо', great: 'Отлично' };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const dayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const readDb = (win) => {
    try { return JSON.parse(win.localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  };

  const viewDay = (win) => win.__haViewDay || dayKey();
  const dayState = (win) => {
    const db = readDb(win);
    const key = viewDay(win);
    const day = db.days?.[key] || { events: [], water: 0, steps: 0, habits: {}, closed: false };
    return { db, key, day, profile: db.profile || {} };
  };

  function profileGoal(profile) {
    if (profile?.primaryGoal) return profile.primaryGoal;
    if (Number(profile?.goal) > 0 && Number(profile?.weight) > Number(profile?.goal)) return 'weight_loss';
    return 'energy';
  }

  function targets(profile) {
    const weight = Number(profile?.weight ?? profile?.startWeightKg ?? 75) || 75;
    const height = Number(profile?.height ?? profile?.heightCm ?? 170) || 170;
    const age = Number(profile?.age ?? profile?.ageYears ?? 35) || 35;
    const sex = profile?.sex || 'other';
    const activity = profile?.activity || 'low';
    const goal = profileGoal(profile);
    const sexConstant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexConstant;
    const multiplier = activity === 'high' ? 1.6 : activity === 'medium' ? 1.4 : 1.22;
    const maintenance = Math.max(1300, bmr * multiplier);
    const calories = goal === 'weight_loss' ? Math.max(1400, maintenance * 0.85) : maintenance;
    const proteinFactor = goal === 'weight_loss' || goal === 'nutrition' ? 1.6 : 1.25;
    return {
      calories: Math.round(calories / 50) * 50,
      protein: Math.round(Math.max(75, weight * proteinFactor) / 5) * 5,
      steps: activity === 'low' ? 8000 : 10000,
      water: 2000,
    };
  }

  function totals(day) {
    return (day.events || []).reduce((acc, event) => {
      if (event.type === 'food') {
        acc.calories += Number(event.cal || 0);
        acc.protein += Number(event.protein || 0);
      }
      return acc;
    }, { calories: 0, protein: 0 });
  }

  function activeAction(day) {
    return (day.rinloActions || []).find((item) => ['suggested', 'accepted'].includes(item.status))
      || (day.rinloActions || []).find((item) => item.status === 'completed')
      || null;
  }

  function formatDate(key) {
    try {
      return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));
    } catch { return key; }
  }

  function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  }

  function ensureStyles(doc) {
    if (doc.getElementById('rinlo-today-v3-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-today-v3-style';
    style.textContent = `
      :root{
        --r3-bg:#eef3f1;--r3-text:#132039;--r3-muted:#75818e;--r3-green:#09603f;--r3-green2:#1b8b62;
        --r3-line:rgba(29,52,45,.08);--r3-glass:rgba(255,255,255,.68);--r3-shadow:0 16px 44px rgba(30,49,43,.08);
      }
      html,body{background:var(--r3-bg)!important}
      body{font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif!important}
      .app{background:linear-gradient(180deg,#f7faf9 0%,#edf2f0 48%,#f7f9f8 100%)!important}
      #today.rinlo-today-v3{display:none;min-height:100vh;padding:max(16px,env(safe-area-inset-top)) 15px calc(104px + env(safe-area-inset-bottom));background:
        radial-gradient(circle at 90% 0%,rgba(176,207,198,.23),transparent 26%),
        radial-gradient(circle at -12% 45%,rgba(198,213,232,.25),transparent 30%),
        linear-gradient(180deg,#f7faf9,#eef3f1 52%,#f7f9f8);color:var(--r3-text)!important}
      #today.rinlo-today-v3.on{display:block!important}
      #today.rinlo-today-v3 *{box-sizing:border-box}
      #today.rinlo-today-v3 button{font:inherit;-webkit-tap-highlight-color:transparent}
      #today.rinlo-today-v3 button:active{transform:scale(.985)}

      .r3-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:13px}
      .r3-brand{min-width:96px;height:35px;display:flex;align-items:center}
      .r3-brand.rc-wordmark{font-size:0!important;color:transparent!important}
      .r3-brand.rc-wordmark img{width:96px!important;height:auto!important;display:block!important}
      .r3-bell{width:38px;height:38px;border:1px solid rgba(255,255,255,.82);border-radius:50%;background:rgba(255,255,255,.62);display:grid;place-items:center;box-shadow:0 7px 20px rgba(32,52,45,.06);color:#30404d}
      .r3-bell:after{content:'';position:absolute;width:7px;height:7px;margin:-21px -20px 0 0;border-radius:50%;background:#55c47f;border:2px solid #f7faf9}
      .r3-intro{position:relative;margin-bottom:14px;padding-right:112px}
      .r3-intro h1{margin:0!important;font-size:35px!important;line-height:1.02!important;letter-spacing:-.052em!important;font-weight:750!important;color:var(--r3-text)!important}
      .r3-intro p{margin:2px 0 0;font-size:13px;color:#84909c}
      .r3-mantra{position:absolute;right:0;top:3px;width:100px;font-size:10px;line-height:1.38;color:#7e8992}
      .r3-mantra:after{content:'';display:inline-block;width:28px;height:1px;margin-left:7px;vertical-align:middle;background:#a0aaa8}

      .r3-hero{position:relative;min-height:310px;padding:23px 18px 18px;border:1px solid rgba(255,255,255,.88);border-radius:31px;overflow:hidden;background:
        linear-gradient(90deg,rgba(244,248,247,.98) 0%,rgba(244,248,247,.93) 43%,rgba(244,248,247,.26) 69%,rgba(244,248,247,.08) 100%),
        url('${heroImage}') center/cover no-repeat;box-shadow:0 22px 55px rgba(29,50,43,.13),inset 0 1px 0 rgba(255,255,255,.95)}
      .r3-hero:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(226,239,235,.16))}
      .r3-hero>*{position:relative;z-index:1}
      .r3-eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;font-weight:650;color:#7b8990}
      .r3-hero h2{max-width:238px;margin:12px 0 8px!important;font-size:39px!important;line-height:.96!important;letter-spacing:-.055em!important;font-weight:770!important;color:var(--r3-text)!important}
      .r3-hero-copy{max-width:220px;margin:0;font-size:13px;line-height:1.38;color:#6e7d88}
      .r3-effort{display:flex;align-items:center;gap:7px;margin-top:15px;font-size:11px;font-weight:620;color:#294c41}
      .r3-effort i{width:18px;height:18px;border:1.5px solid currentColor;border-radius:50%;display:inline-block;position:relative}
      .r3-effort i:after{content:'';position:absolute;left:8px;top:3px;width:1px;height:6px;background:currentColor;transform-origin:bottom;transform:rotate(-25deg)}
      .r3-hero-note{position:absolute;right:18px;top:20px;width:78px;text-align:right;font-size:8px;line-height:1.45;letter-spacing:.20em;text-transform:uppercase;color:rgba(44,67,61,.47)}
      .r3-actions{display:grid;grid-template-columns:1.07fr .93fr;gap:8px;max-width:322px;margin-top:17px}
      .r3-actions button,.r3-single-action{height:48px;border-radius:999px;font-size:11.5px;font-weight:650}
      .r3-primary{border:0;background:linear-gradient(135deg,#1d8e64,#07563a);color:#fff;box-shadow:0 10px 23px rgba(8,86,57,.18)}
      .r3-secondary{border:1px solid rgba(255,255,255,.92);background:rgba(255,255,255,.72);color:#24333d;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .r3-why{margin-top:11px;border:0;background:transparent;color:#255e4f;font-size:10.5px;font-weight:600;text-decoration:underline;text-underline-offset:3px;padding:0}
      .r3-why:after{content:' →';text-decoration:none}
      .r3-rationale{display:none;max-width:280px;margin-top:10px;padding:10px 11px;border:1px solid rgba(255,255,255,.82);border-radius:15px;background:rgba(255,255,255,.70);font-size:10.5px;line-height:1.4;color:#60706f;backdrop-filter:blur(12px)}
      .r3-hero.rationale-open .r3-rationale{display:block}
      .r3-feedback{display:flex;align-items:center;gap:7px;margin-top:16px}
      .r3-feedback span{font-size:10.5px;color:#64716f;margin-right:2px}
      .r3-feedback button{height:34px;min-width:52px;border:1px solid rgba(255,255,255,.90);border-radius:999px;background:rgba(255,255,255,.74);color:#294039;font-size:10.5px}

      .r3-checkin{margin-top:11px;border:1px solid rgba(255,255,255,.84);border-radius:20px;background:rgba(255,255,255,.68);box-shadow:0 8px 22px rgba(36,56,49,.055),inset 0 1px 0 rgba(255,255,255,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);overflow:hidden}
      .r3-checkin-summary{min-height:56px;padding:0 13px;display:flex;align-items:center;gap:10px}
      .r3-checkin-icon{width:31px;height:31px;flex:0 0 31px;border-radius:50%;display:grid;place-items:center;background:#e0f3e9;color:#1b7755;font-size:13px;font-weight:700}
      .r3-checkin-copy{min-width:0;flex:1;font-size:11.5px;color:#43505b}.r3-checkin-copy b{color:var(--r3-text);font-weight:670}
      .r3-checkin-change{border:0;background:transparent;color:#26614f;font-size:10.5px;font-weight:620}
      .r3-moods{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 10px 10px}
      .r3-moods[hidden]{display:none}
      .r3-moods button{height:36px;border:1px solid rgba(40,62,54,.09);border-radius:12px;background:rgba(255,255,255,.64);color:#64717a;font-size:9.5px;font-weight:600}
      .r3-moods button.sel{background:#dff3e9;color:#126745;border-color:rgba(18,103,69,.15)}

      .r3-section{margin-top:19px}.r3-section-head{display:flex;align-items:baseline;justify-content:space-between;margin:0 2px 9px}
      .r3-section-head h3{margin:0;font-size:18px;line-height:1.1;letter-spacing:-.025em;color:var(--r3-text);font-weight:710}
      .r3-section-head button,.r3-section-head span{border:0;background:transparent;padding:0;color:#60726d;font-size:10px}
      .r3-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      .r3-quick button{height:80px;border:1px solid rgba(255,255,255,.78);border-radius:19px;background:rgba(255,255,255,.60);box-shadow:0 8px 22px rgba(31,51,44,.05),inset 0 1px 0 rgba(255,255,255,.9);color:#253442;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font-size:10.5px;backdrop-filter:blur(16px)}
      .r3-quick-icon{width:25px;height:25px;display:grid;place-items:center;font-size:20px;line-height:1}.r3-quick button:nth-child(2) .r3-quick-icon{color:#3c84c5}.r3-quick button:nth-child(4) .r3-quick-icon{color:#9a7444}

      .r3-targets{display:grid;grid-template-columns:repeat(4,1fr);padding:12px 7px;border:1px solid rgba(255,255,255,.79);border-radius:20px;background:rgba(255,255,255,.61);box-shadow:0 8px 22px rgba(31,51,44,.05),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(18px)}
      .r3-target{min-width:0;padding:0 7px;text-align:center;border-right:1px solid rgba(38,58,52,.08)}.r3-target:last-child{border-right:0}
      .r3-target small{display:block;font-size:8.5px;color:#87919a;margin-bottom:3px;white-space:nowrap}.r3-target b{display:block;font-size:13px;line-height:1.05;color:var(--r3-text);font-weight:690;white-space:nowrap}

      .r3-feed{position:relative;display:grid;gap:6px;padding-left:18px}.r3-feed:before{content:'';position:absolute;left:6px;top:15px;bottom:15px;width:1px;background:rgba(45,65,59,.10)}
      .r3-event{position:relative;min-height:50px;padding:10px 40px 10px 13px;border:1px solid rgba(255,255,255,.78);border-radius:17px;background:rgba(255,255,255,.58);box-shadow:0 5px 15px rgba(31,49,43,.035);backdrop-filter:blur(14px)}
      .r3-event:before{content:'';position:absolute;left:-16px;top:19px;width:8px;height:8px;border-radius:50%;background:#66c88e;box-shadow:0 0 0 4px rgba(102,200,142,.10)}
      .r3-event.blue:before{background:#92bafd;box-shadow:0 0 0 4px rgba(146,186,253,.10)}
      .r3-event small{display:block;font-size:8.5px;color:#919ba4}.r3-event b{display:block;margin-top:2px;font-size:11.5px;color:var(--r3-text);font-weight:610}.r3-event p{margin:2px 0 0;font-size:9.5px;color:#7e8992}
      .r3-event time{position:absolute;right:12px;top:16px;font-size:9.5px;color:#87919a}
      .r3-empty{padding:15px;border:1px dashed rgba(48,70,62,.14);border-radius:18px;color:#7e8991;font-size:10.5px;line-height:1.4;background:rgba(255,255,255,.35)}

      .r3-evening{position:relative;display:flex;align-items:center;gap:12px;margin-top:18px;min-height:92px;padding:14px 14px 14px 78px;border:1px solid rgba(255,255,255,.84);border-radius:23px;background:linear-gradient(100deg,rgba(222,247,236,.88),rgba(255,255,255,.69));box-shadow:0 10px 28px rgba(29,51,43,.07),inset 0 1px 0 rgba(255,255,255,.94);overflow:hidden}
      .r3-orb{position:absolute;left:17px;top:18px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,rgba(151,239,201,.66) 28%,rgba(49,180,128,.23) 63%,rgba(255,255,255,.35));box-shadow:0 0 30px rgba(62,193,139,.23),inset 0 0 14px rgba(255,255,255,.92)}
      .r3-evening-copy{min-width:0;flex:1}.r3-evening-copy b{display:block;font-size:15px;color:var(--r3-text);font-weight:720}.r3-evening-copy span{display:block;margin-top:4px;max-width:190px;font-size:9.5px;line-height:1.35;color:#76838d}
      .r3-evening button{flex:0 0 auto;height:45px;padding:0 16px;border:0;border-radius:999px;background:linear-gradient(135deg,#1c8b62,#07563a);color:#fff;font-size:10.5px;font-weight:650}
      .r3-evening.done button{display:none}.r3-evening.done{padding-right:16px}

      .r3-compat{display:none!important}

      .nav{left:50%!important;bottom:calc(9px + env(safe-area-inset-bottom))!important;width:min(402px,calc(100vw - 24px))!important;height:72px!important;padding:6px 8px!important;border:1px solid rgba(255,255,255,.82)!important;border-radius:24px!important;background:rgba(249,251,250,.80)!important;box-shadow:0 18px 46px rgba(29,49,43,.14),inset 0 1px 0 rgba(255,255,255,.94)!important;backdrop-filter:blur(24px) saturate(1.15)!important;-webkit-backdrop-filter:blur(24px) saturate(1.15)!important}
      .nav button{border-radius:16px!important;color:#7a8590!important;font-size:10px!important;font-weight:540!important}.nav button b{font-size:18px!important;margin-bottom:3px!important;color:inherit!important}.nav button.active,.nav .active{color:var(--r3-green)!important;background:rgba(218,239,229,.62)!important}.fab{display:none!important}
      .overlay{background:rgba(19,28,26,.25)!important;backdrop-filter:blur(7px)!important}.sheet{background:rgba(250,252,251,.95)!important;border:1px solid rgba(255,255,255,.86)!important;border-radius:30px 30px 0 0!important;box-shadow:0 -22px 70px rgba(18,31,27,.17)!important;backdrop-filter:blur(25px)!important}

      @media(max-width:370px){.r3-intro{padding-right:92px}.r3-mantra{width:82px;font-size:9px}.r3-hero{min-height:296px;padding:21px 15px 16px}.r3-hero h2{font-size:35px;max-width:210px}.r3-hero-copy{max-width:195px}.r3-evening{padding-left:70px}.r3-evening button{padding:0 12px}}
    `;
    doc.head.appendChild(style);
  }

  function actionMarkup(day) {
    const action = activeAction(day);
    if (!action && !day.rinloCheckin) {
      return `<section class="r3-hero"><div class="r3-eyebrow">НА СЕГОДНЯ</div><div class="r3-hero-note">один шаг<br>в своём ритме</div><h2>Начнём с малого</h2><p class="r3-hero-copy">Отметь, как ты сегодня, или сразу попроси Rinlo подобрать небольшой шаг.</p><button class="r3-single-action r3-primary" style="margin-top:20px;padding:0 22px" onclick="rinloCoreSkipCheckin()">Подобрать шаг</button></section>`;
    }
    if (!action) {
      return `<section class="r3-hero"><div class="r3-eyebrow">НА СЕГОДНЯ</div><div class="r3-hero-note">подбираем<br>под твой день</div><h2>Секунду</h2><p class="r3-hero-copy">Смотрим, какой шаг лучше подойдёт прямо сейчас.</p></section>`;
    }
    const completed = action.status === 'completed';
    const reviewed = completed && typeof action.feedback?.useful === 'boolean';
    const buttons = !completed
      ? `<div class="r3-actions"><button class="r3-primary" onclick="rinloCoreCompleteAction()">✓&nbsp;&nbsp;Сделано</button><button class="r3-secondary" onclick="rinloCoreReplaceAction()">Другой вариант</button></div><button class="r3-why" type="button" onclick="this.closest('.r3-hero').classList.toggle('rationale-open')">Почему этот шаг?</button><div class="r3-rationale">${esc(action.rationale || 'Подбираем шаг с учётом сегодняшнего контекста.')}</div>`
      : reviewed
        ? `<p class="r3-hero-copy" style="margin-top:12px">На сегодня главное сделано. Дальше можно просто продолжать день.</p><button class="r3-why" onclick="rinloCoreSkipCheckin()">Хочу ещё один шаг</button>`
        : `<div class="r3-feedback"><span>Этот шаг помог?</span><button onclick="rinloCoreActionFeedback(true)">Да</button><button onclick="rinloCoreActionFeedback(false)">Нет</button></div>`;
    return `<section class="r3-hero ${completed ? 'completed' : ''}"><div class="r3-eyebrow">${reviewed ? 'ГОТОВО' : 'НА СЕГОДНЯ'}</div><div class="r3-hero-note">маленькое<br>движение<br>считается</div><h2>${esc(action.title)}</h2>${!reviewed ? `<p class="r3-hero-copy">${esc(action.rationale || '')}</p>` : ''}${action.effortMinutes && !reviewed ? `<div class="r3-effort"><i></i>≈ ${Number(action.effortMinutes)} мин</div>` : ''}${buttons}</section>`;
  }

  function checkinMarkup(day) {
    const checkin = day.rinloCheckin;
    if (!checkin) {
      return `<section class="r3-checkin open"><div class="r3-checkin-summary"><div class="r3-checkin-icon">◔</div><div class="r3-checkin-copy"><b>Как ты сегодня?</b><br>Одного ответа достаточно</div></div><div class="r3-moods">${Object.entries(moodCopy).map(([code,label]) => `<button onclick="rinloCoreCheckin('${code}')">${label}</button>`).join('')}</div></section>`;
    }
    const detail = checkin.energy ? ` · энергия ${checkin.energy}/5` : checkin.sleepMinutes ? ` · сон ${Math.round(checkin.sleepMinutes / 6) / 10} ч` : '';
    return `<section class="r3-checkin"><div class="r3-checkin-summary"><div class="r3-checkin-icon">▥</div><div class="r3-checkin-copy">Сегодня: <b>${esc(moodCopy[checkin.wellbeing] || 'Отмечено')}</b>${esc(detail)}</div><button class="r3-checkin-change" onclick="const m=this.closest('.r3-checkin').querySelector('.r3-moods');m.hidden=!m.hidden">Изменить</button></div><div class="r3-moods" hidden>${Object.entries(moodCopy).map(([code,label]) => `<button class="${checkin.wellbeing === code ? 'sel' : ''}" onclick="rinloCoreCheckin('${code}')">${label}</button>`).join('')}</div></section>`;
  }

  function quickMarkup() {
    return `<section class="r3-section"><div class="r3-section-head"><h3>Добавить</h3></div><div class="r3-quick"><button onclick="openFood()"><span class="r3-quick-icon">♨</span><span>Еда</span></button><button onclick="addWater(250)"><span class="r3-quick-icon">◯</span><span>Вода</span></button><button onclick="addSteps(1000)"><span class="r3-quick-icon">⌁</span><span>Шаги</span></button><button onclick="openWeight()"><span class="r3-quick-icon">▣</span><span>Вес</span></button></div></section>`;
  }

  function targetsMarkup(day, profile) {
    const t = targets(profile);
    const sum = totals(day);
    const items = [
      ['ккал', Math.round(sum.calories).toLocaleString('ru-RU')],
      ['белок', `${Math.round(sum.protein)} г`],
      ['вода', `${Number(day.water || 0).toLocaleString('ru-RU')} мл`],
      ['шаги', Number(day.steps || 0).toLocaleString('ru-RU')],
    ];
    return `<section class="r3-section"><div class="r3-section-head"><h3>Ориентиры</h3><span>${Math.round(t.calories).toLocaleString('ru-RU')} ккал · ${t.steps.toLocaleString('ru-RU')} шагов</span></div><div class="r3-targets">${items.map(([label,value]) => `<div class="r3-target"><small>${label}</small><b>${value}</b></div>`).join('')}</div></section>`;
  }

  function feedItems(day) {
    const events = [...(day.events || [])].sort((a,b) => String(b.time).localeCompare(String(a.time))).slice(0,3).map((event) => ({
      cls: event.type === 'food' ? '' : 'blue',
      title: event.type === 'food' ? (event.text || 'Приём пищи') : event.type === 'weight' ? `${event.weight} кг` : 'Запись',
      detail: event.type === 'food' ? `≈ ${Math.round(event.cal || 0)} ккал · ${Math.round(event.protein || 0)} г белка` : 'Вес',
      time: event.time ? new Date(event.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}) : '',
    }));
    if (events.length < 3 && Number(day.water || 0) > 0) events.push({ cls:'blue', title:`${Number(day.water).toLocaleString('ru-RU')} мл воды`, detail:'За сегодня', time:'' });
    if (events.length < 3 && Number(day.steps || 0) > 0) events.push({ cls:'', title:`${Number(day.steps).toLocaleString('ru-RU')} шагов`, detail:'За сегодня', time:'' });
    return events.slice(0,3);
  }

  function feedMarkup(day) {
    const items = feedItems(day);
    return `<section class="r3-section"><div class="r3-section-head"><h3>За сегодня</h3><span>${(day.events || []).length ? 'Последние записи' : ''}</span></div>${items.length ? `<div class="r3-feed">${items.map((item) => `<div class="r3-event ${item.cls}"><small>${esc(item.detail)}</small><b>${esc(item.title)}</b>${item.time ? `<time>${esc(item.time)}</time>` : ''}</div>`).join('')}</div>` : `<div class="r3-empty">Здесь появится то, что ты добавляешь в течение дня.</div>`}</section>`;
  }

  function eveningMarkup(day) {
    const closed = Boolean(day.rinloEveningReview || day.closed);
    return `<section class="r3-evening ${closed ? 'done' : ''}"><div class="r3-orb"></div><div class="r3-evening-copy"><b>${closed ? 'На сегодня всё' : 'Как прошёл день?'}</b><span>${closed ? 'Итог сохранён. Завтра продолжим с нового небольшого шага.' : 'Пара вопросов — и закончим на сегодня.'}</span></div>${closed ? '' : `<button onclick="finishDay()">Подвести итог →</button>`}</section>`;
  }

  function compatMarkup() {
    return `<div class="r3-compat" aria-hidden="true"><span class="rc-day-label"></span><span id="rcGreeting"></span><span id="rcDate"></span><div id="rcCheckin"></div><div id="rcAction"></div><div id="rcMetrics"></div><span id="rcEventCount"></span><div id="rcTimeline"></div></div>`;
  }

  function renderV3(doc, win) {
    const today = doc.getElementById('today');
    if (!today) return;
    const { key, day, profile } = dayState(win);
    const wasOn = today.classList.contains('on');
    today.className = `screen rinlo-today-v3${wasOn ? ' on' : ''}`;
    today.innerHTML = `
      <div class="r3-head"><div class="r3-brand rc-wordmark" role="img" aria-label="Rinlo">Rinlo</div><button class="r3-bell" type="button" aria-label="Уведомления">⌑</button></div>
      <div class="r3-intro"><h1>${greeting()}</h1><p>${esc(formatDate(key))}</p><div class="r3-mantra">Маленькие шаги меняют большое завтра</div></div>
      ${actionMarkup(day)}
      ${checkinMarkup(day)}
      ${quickMarkup()}
      ${targetsMarkup(day, profile)}
      ${feedMarkup(day)}
      ${eveningMarkup(day)}
      ${compatMarkup()}
    `;
    today.dataset.rinloToday = VERSION;
    win.__rinloTodayV3 = VERSION;
  }

  function patch(win, doc) {
    if (!win?.renderToday || win.__rinloTodayV3Patched) {
      renderV3(doc, win);
      return;
    }
    const original = win.renderToday;
    win.renderToday = function(...args) {
      const result = original.apply(this, args);
      queueMicrotask(() => renderV3(doc, win));
      return result;
    };
    win.__rinloTodayV3Patched = true;
    patchedWindow = win;
    original.call(win);
    queueMicrotask(() => renderV3(doc, win));
  }

  function apply() {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.head || !doc.body || !win) return;
    ensureStyles(doc);
    patch(win, doc);
  }

  function schedule(delay = 38) {
    clearTimeout(timer);
    timer = setTimeout(apply, delay);
  }

  function install() {
    const doc = frame.contentDocument;
    if (!doc?.documentElement) return;
    apply();
    observer?.disconnect();
    observer = new MutationObserver((mutations) => {
      const meaningful = mutations.some((m) => Array.from(m.addedNodes).some((node) => node.nodeType === 1 && !node.classList?.contains('r3-compat')));
      if (meaningful) schedule();
    });
    observer.observe(doc.documentElement, { childList:true, subtree:true });
  }

  frame.addEventListener('load', () => { setTimeout(install,0); setTimeout(install,220); });
  setTimeout(install,0);
  setTimeout(install,260);
})();