(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const icons = {
    scale: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M9 10.5a3 3 0 0 1 6 0M12 10.5l1.5-1.5"/></svg>`,
    person: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M6 19c.7-3.1 2.7-4.8 6-4.8s5.3 1.7 6 4.8"/></svg>`,
    smoke: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5h12v3H4zm12 0h2v3h-2zm3.5 0H21v3h-1.5zM14 9.5c0-1.2 1-2.2 2.2-2.2S18.5 6.4 18.5 5M17.5 12c0-1.2 1-2.2 2.2-2.2"/></svg>`,
    food: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.4 3.4 3.3 7.7-8"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>`,
    back: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5.5 5 5.5"/></svg>`
  };

  let step = 1;

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function profileFromStorage(win) {
    try { return JSON.parse(win.localStorage.getItem('healthy-action-v07') || '{}')?.profile || null; }
    catch { return null; }
  }

  function ensureStyles(doc) {
    doc.getElementById('rinlo-onboarding-v01-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-onboarding-v01-style';
    style.textContent = `
      #onboarding.rinlo-onboarding{
        --ro-bg:#F6F8F7;--ro-card:#FFFFFF;--ro-text:#172027;--ro-muted:#747E82;--ro-line:#E3E9E5;
        --ro-green:#2E7D64;--ro-green2:#4C8E78;--ro-mist:#EDF4F0;--ro-dark:#0F1720;
        min-height:100vh!important;padding:max(16px,env(safe-area-inset-top)) 18px calc(28px + env(safe-area-inset-bottom))!important;
        background:radial-gradient(circle at 105% 0%,rgba(154,185,172,.13),transparent 29%),linear-gradient(180deg,#F8FAF9 0%,#F4F7F5 100%)!important;
        color:var(--ro-text)!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important;
      }
      #onboarding.rinlo-onboarding *{box-sizing:border-box}
      #onboarding.rinlo-onboarding .ro-top{display:flex;align-items:center;justify-content:space-between;min-height:34px;margin-bottom:28px}
      #onboarding.rinlo-onboarding .ro-wordmark{position:relative;display:inline-block;font-size:26px;font-weight:600;line-height:1;letter-spacing:-.045em;color:var(--ro-dark);padding-right:10px}
      #onboarding.rinlo-onboarding .ro-wordmark-dot{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--ro-green);right:2px;top:6px}
      #onboarding.rinlo-onboarding .ro-step-count{font-size:11px;font-weight:600;color:#899397}
      #onboarding.rinlo-onboarding .ro-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:25px}
      #onboarding.rinlo-onboarding .ro-progress span{height:3px;border-radius:99px;background:#DDE4E0;transition:background .2s ease,transform .2s ease}
      #onboarding.rinlo-onboarding .ro-progress span.on{background:var(--ro-green)}
      #onboarding.rinlo-onboarding .ro-screen{display:none;animation:roIn .22s ease both}
      #onboarding.rinlo-onboarding .ro-screen.on{display:block}
      @keyframes roIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      #onboarding.rinlo-onboarding .ro-eyebrow{font-size:10px;font-weight:650;letter-spacing:.04em;color:var(--ro-green);margin-bottom:8px}
      #onboarding.rinlo-onboarding h1{max-width:350px;margin:0 0 8px!important;font-size:31px!important;line-height:1.06!important;font-weight:600!important;letter-spacing:-.045em!important;color:var(--ro-text)!important}
      #onboarding.rinlo-onboarding .ro-lead{max-width:355px;margin:0 0 22px;font-size:13px;line-height:1.5;color:var(--ro-muted)}
      #onboarding.rinlo-onboarding .ro-card{padding:16px;border:1px solid var(--ro-line);border-radius:22px;background:rgba(255,255,255,.94);box-shadow:0 7px 24px rgba(15,23,32,.035)}
      #onboarding.rinlo-onboarding .ro-card + .ro-card{margin-top:10px}
      #onboarding.rinlo-onboarding .ro-card-head{display:flex;align-items:center;gap:11px;margin-bottom:14px}
      #onboarding.rinlo-onboarding .ro-card-icon{width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:var(--ro-mist);color:var(--ro-green);display:grid;place-items:center}
      #onboarding.rinlo-onboarding .ro-card-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #onboarding.rinlo-onboarding .ro-card-head b{display:block;font-size:13px;font-weight:650;color:var(--ro-text)}
      #onboarding.rinlo-onboarding .ro-card-head small{display:block;margin-top:2px;font-size:10px;line-height:1.3;color:#8A9498}
      #onboarding.rinlo-onboarding .ro-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #onboarding.rinlo-onboarding .ro-field{margin-top:12px}
      #onboarding.rinlo-onboarding .ro-field:first-child{margin-top:0}
      #onboarding.rinlo-onboarding .ro-field label{display:block;margin:0 0 7px;font-size:10.5px;font-weight:600;color:#778286}
      #onboarding.rinlo-onboarding .ro-field input,#onboarding.rinlo-onboarding .ro-field select{width:100%;height:50px;border:1px solid var(--ro-line);border-radius:15px;background:#FAFCFB;padding:0 13px;font-size:15px;font-weight:550;color:var(--ro-text);outline:none;box-shadow:none}
      #onboarding.rinlo-onboarding .ro-field input:focus,#onboarding.rinlo-onboarding .ro-field select:focus{border-color:#9AB9AC;box-shadow:0 0 0 4px rgba(46,125,100,.08)}
      #onboarding.rinlo-onboarding .ro-note{display:flex;gap:8px;margin-top:13px;padding:11px 12px;border-radius:15px;background:#EEF4F1;color:#6F7C78;font-size:10.5px;line-height:1.42}
      #onboarding.rinlo-onboarding .ro-note::before{content:'';width:6px;height:6px;margin-top:4px;flex:0 0 6px;border-radius:50%;background:var(--ro-green)}
      #onboarding.rinlo-onboarding .ro-focus-list{display:grid;gap:8px}
      #onboarding.rinlo-onboarding .choice.ro-focus{width:100%;min-height:72px;margin:0!important;padding:12px 13px!important;border:1px solid var(--ro-line)!important;border-radius:18px!important;background:#fff!important;display:flex;align-items:center;gap:12px;text-align:left;box-shadow:none!important;color:var(--ro-text)!important}
      #onboarding.rinlo-onboarding .choice.ro-focus.sel{border-color:#9AB9AC!important;background:#F4F9F6!important;box-shadow:0 0 0 1px rgba(46,125,100,.03)!important}
      #onboarding.rinlo-onboarding .ro-focus-icon{width:36px;height:36px;flex:0 0 36px;border-radius:12px;background:#EEF5F1;color:var(--ro-green);display:grid;place-items:center}
      #onboarding.rinlo-onboarding .ro-focus-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #onboarding.rinlo-onboarding .ro-focus-copy{flex:1;min-width:0}
      #onboarding.rinlo-onboarding .ro-focus-copy b{display:block;font-size:12.5px;line-height:1.22;font-weight:600;color:var(--ro-text)}
      #onboarding.rinlo-onboarding .ro-focus-copy span{display:block;margin-top:3px;font-size:10px;line-height:1.35;color:#879195}
      #onboarding.rinlo-onboarding .ro-focus-check{width:25px;height:25px;flex:0 0 25px;border:1.5px solid #CBD5D0;border-radius:50%;display:grid;place-items:center;color:transparent}
      #onboarding.rinlo-onboarding .ro-focus.sel .ro-focus-check{border-color:var(--ro-green);background:var(--ro-green);color:#fff}
      #onboarding.rinlo-onboarding .ro-focus-check svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
      #onboarding.rinlo-onboarding .ro-focus-counter{margin:0 0 10px;font-size:10.5px;color:#899397}
      #onboarding.rinlo-onboarding .ro-ready{position:relative;overflow:hidden;padding:20px 18px;border-radius:24px;background:radial-gradient(circle at 82% 18%,rgba(118,170,151,.32),transparent 19%),linear-gradient(145deg,#122126 0%,#0F1B1F 48%,#173D35 100%);color:#fff;box-shadow:0 14px 32px rgba(15,23,32,.10)}
      #onboarding.rinlo-onboarding .ro-ready::after{content:'';position:absolute;width:180px;height:180px;right:-120px;bottom:-110px;border-radius:50%;background:linear-gradient(145deg,rgba(154,185,172,.20),rgba(154,185,172,0))}
      #onboarding.rinlo-onboarding .ro-ready-dot{position:relative;z-index:1;width:10px;height:10px;border-radius:50%;background:#72B79B;box-shadow:0 0 0 7px rgba(114,183,155,.09);margin-bottom:18px}
      #onboarding.rinlo-onboarding .ro-ready h2{position:relative;z-index:1;margin:0 0 8px;font-size:25px;line-height:1.08;font-weight:600;letter-spacing:-.035em;color:#fff}
      #onboarding.rinlo-onboarding .ro-ready p{position:relative;z-index:1;max-width:320px;margin:0;font-size:12px;line-height:1.5;color:rgba(255,255,255,.67)}
      #onboarding.rinlo-onboarding .ro-summary{display:grid;gap:7px;margin-top:13px}
      #onboarding.rinlo-onboarding .ro-summary-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 12px;border:1px solid var(--ro-line);border-radius:15px;background:#fff}
      #onboarding.rinlo-onboarding .ro-summary-row span{font-size:10px;color:#879195}
      #onboarding.rinlo-onboarding .ro-summary-row b{max-width:68%;font-size:11px;font-weight:600;text-align:right;color:var(--ro-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #onboarding.rinlo-onboarding .ro-footer{display:flex;gap:8px;margin-top:22px;position:sticky;bottom:calc(10px + env(safe-area-inset-bottom));z-index:4;padding-top:8px;background:linear-gradient(180deg,rgba(246,248,247,0),rgba(246,248,247,.96) 26%,rgba(246,248,247,.99) 100%)}
      #onboarding.rinlo-onboarding .ro-back{width:48px;height:48px;flex:0 0 48px;border:1px solid var(--ro-line);border-radius:14px;background:#fff;color:#61706B;display:grid;place-items:center}
      #onboarding.rinlo-onboarding .ro-back svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      #onboarding.rinlo-onboarding .ro-back[hidden]{display:none!important}
      #onboarding.rinlo-onboarding .ro-next{height:48px;flex:1;border:0;border-radius:14px;background:var(--ro-dark);color:#fff;font-size:12.5px;font-weight:650;display:flex;align-items:center;justify-content:center;gap:8px}
      #onboarding.rinlo-onboarding .ro-next svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      #onboarding.rinlo-onboarding .ro-start{background:var(--ro-green)}
      #onboarding.rinlo-onboarding .ro-error{display:none;margin:10px 2px 0;font-size:10.5px;line-height:1.4;color:#A85454}
      #onboarding.rinlo-onboarding .ro-error.on{display:block}
      @media(max-width:360px){#onboarding.rinlo-onboarding{padding-left:14px!important;padding-right:14px!important}#onboarding.rinlo-onboarding h1{font-size:28px!important}.ro-two{gap:7px!important}}
    `;
    doc.head.appendChild(style);
  }

  function build(doc) {
    const ob = doc.getElementById('onboarding');
    if (!ob) return;

    const initial = {
      weight: doc.getElementById('obWeight')?.value || '85',
      goal: doc.getElementById('obGoal')?.value || '75',
      height: doc.getElementById('obHeight')?.value || '176',
      age: doc.getElementById('obAge')?.value || '37',
      activity: doc.getElementById('obActivity')?.value || 'low',
      habits: [...ob.querySelectorAll('[data-h].sel')].map(x => x.dataset.h)
    };
    if (!initial.habits.length) initial.habits = ['vape','fastfood'];

    ob.className = 'screen onboard rinlo-onboarding' + (ob.classList.contains('on') ? ' on' : '');
    ob.dataset.rinloOnboarding = 'v01';
    ob.innerHTML = `
      <div class="ro-top"><div class="ro-wordmark">Rinlo<span class="ro-wordmark-dot"></span></div><div id="roStepCount" class="ro-step-count">1 из 4</div></div>
      <div id="roProgress" class="ro-progress"><span class="on"></span><span></span><span></span><span></span></div>

      <section class="ro-screen on" data-ro-step="1">
        <div class="ro-eyebrow">Начнём с главного</div>
        <h1>Что хочется изменить?</h1>
        <p class="ro-lead">Rinlo не требует идеального плана. Нужна только отправная точка, чтобы первые рекомендации были разумными.</p>
        <div class="ro-card">
          <div class="ro-card-head"><span class="ro-card-icon">${icons.scale}</span><span><b>Вес и цель</b><small>Используем как контекст, а не как оценку</small></span></div>
          <div class="ro-two">
            <div class="ro-field"><label>Сейчас, кг</label><input id="obWeight" inputmode="decimal" value="${esc(initial.weight)}"></div>
            <div class="ro-field"><label>Хочу, кг</label><input id="obGoal" inputmode="decimal" value="${esc(initial.goal)}"></div>
          </div>
          <div class="ro-note">Цель можно изменить позже. Rinlo не будет предлагать резких ограничений ради скорости.</div>
        </div>
        <div id="roError1" class="ro-error">Проверь значения веса — нужны числа от 30 до 300 кг.</div>
      </section>

      <section class="ro-screen" data-ro-step="2">
        <div class="ro-eyebrow">Немного контекста</div>
        <h1>Расскажите немного о себе</h1>
        <p class="ro-lead">Эти данные помогают Rinlo подобрать реалистичную нагрузку и ориентиры. Без лишней анкеты.</p>
        <div class="ro-card">
          <div class="ro-card-head"><span class="ro-card-icon">${icons.person}</span><span><b>Базовые параметры</b><small>Только то, что влияет на рекомендации</small></span></div>
          <div class="ro-two">
            <div class="ro-field"><label>Рост, см</label><input id="obHeight" inputmode="numeric" value="${esc(initial.height)}"></div>
            <div class="ro-field"><label>Возраст</label><input id="obAge" inputmode="numeric" value="${esc(initial.age)}"></div>
          </div>
          <div class="ro-field"><label>Обычная активность</label><select id="obActivity"><option value="low"${initial.activity==='low'?' selected':''}>Низкая</option><option value="medium"${initial.activity==='medium'?' selected':''}>Средняя</option><option value="high"${initial.activity==='high'?' selected':''}>Высокая</option></select></div>
        </div>
        <div id="roError2" class="ro-error">Проверь рост и возраст. Рост — 120–230 см, возраст — 16–100 лет.</div>
      </section>

      <section class="ro-screen" data-ro-step="3">
        <div class="ro-eyebrow">Ваши приоритеты</div>
        <h1>Что ещё для вас важно?</h1>
        <p class="ro-lead">Выберите до двух вещей. Это не обязательства и не streak — просто контекст для следующих шагов.</p>
        <div id="roFocusCounter" class="ro-focus-counter">Выбрано 0 из 2</div>
        <div class="ro-focus-list">
          <button class="choice ro-focus${initial.habits.includes('vape')?' sel':''}" data-h="vape" onclick="toggleOb(this);rinloOnboardingSync()"><span class="ro-focus-icon">${icons.smoke}</span><span class="ro-focus-copy"><b>Меньше вейпа / сигарет</b><span>Спокойно замечать прогресс без штрафов</span></span><span class="ro-focus-check">${icons.check}</span></button>
          <button class="choice ro-focus${initial.habits.includes('fastfood')?' sel':''}" data-h="fastfood" onclick="toggleOb(this);rinloOnboardingSync()"><span class="ro-focus-icon">${icons.food}</span><span class="ro-focus-copy"><b>Меньше фастфуда</b><span>Следить за частотой, а не вводить запрет</span></span><span class="ro-focus-check">${icons.check}</span></button>
          <button class="choice ro-focus${initial.habits.includes('water')?' sel':''}" data-h="water" onclick="toggleOb(this);rinloOnboardingSync()"><span class="ro-focus-icon">${icons.water}</span><span class="ro-focus-copy"><b>Пить больше воды</b><span>Мягко добавить воды в обычный день</span></span><span class="ro-focus-check">${icons.check}</span></button>
        </div>
        <div class="ro-note">Фокусы можно поменять позже. Ничего страшного, если сегодня хочется выбрать только один — или ни одного.</div>
      </section>

      <section class="ro-screen" data-ro-step="4">
        <div class="ro-eyebrow">Всё готово</div>
        <div class="ro-ready"><div class="ro-ready-dot"></div><h2>Rinlo готов</h2><p>Начнём с небольших действий и будем адаптировать рекомендации по мере того, как узнаём вас лучше.</p></div>
        <div class="ro-summary">
          <div class="ro-summary-row"><span>Цель</span><b id="roSummaryGoal">—</b></div>
          <div class="ro-summary-row"><span>Активность</span><b id="roSummaryActivity">—</b></div>
          <div class="ro-summary-row"><span>Фокусы</span><b id="roSummaryFocus">—</b></div>
        </div>
        <div class="ro-note">Первый небольшой шаг появится на экране «Сегодня». Без списка из десяти целей на старте.</div>
      </section>

      <div class="ro-footer">
        <button id="roBack" class="ro-back" onclick="rinloOnboardingBack()" hidden aria-label="Назад">${icons.back}</button>
        <button id="roNext" class="ro-next" onclick="rinloOnboardingNext()">Продолжить ${icons.arrow}</button>
      </div>
    `;
  }

  function numberValue(doc, id) {
    const n = parseFloat(String(doc.getElementById(id)?.value || '').replace(',','.'));
    return Number.isFinite(n) ? n : NaN;
  }

  function validate(doc, n) {
    doc.querySelectorAll('.ro-error').forEach(x => x.classList.remove('on'));
    if (n === 1) {
      const w = numberValue(doc,'obWeight'), g = numberValue(doc,'obGoal');
      const ok = w >= 30 && w <= 300 && g >= 30 && g <= 300;
      if (!ok) doc.getElementById('roError1')?.classList.add('on');
      return ok;
    }
    if (n === 2) {
      const h = numberValue(doc,'obHeight'), a = numberValue(doc,'obAge');
      const ok = h >= 120 && h <= 230 && a >= 16 && a <= 100;
      if (!ok) doc.getElementById('roError2')?.classList.add('on');
      return ok;
    }
    return true;
  }

  function activityLabel(v) {
    return v === 'high' ? 'Высокая' : v === 'medium' ? 'Средняя' : 'Низкая';
  }

  function focusLabels(doc) {
    const map = {vape:'Меньше вейпа',fastfood:'Меньше фастфуда',water:'Больше воды'};
    return [...doc.querySelectorAll('.ro-focus.sel')].map(x => map[x.dataset.h] || x.dataset.h);
  }

  function sync(doc) {
    const count = doc.querySelectorAll('.ro-focus.sel').length;
    const counter = doc.getElementById('roFocusCounter');
    if (counter) counter.textContent = `Выбрано ${count} из 2`;
    if (step === 4) {
      const w = doc.getElementById('obWeight')?.value || '—';
      const g = doc.getElementById('obGoal')?.value || '—';
      const act = doc.getElementById('obActivity')?.value || 'low';
      const focuses = focusLabels(doc);
      const goal = doc.getElementById('roSummaryGoal'); if (goal) goal.textContent = `${w} → ${g} кг`;
      const activity = doc.getElementById('roSummaryActivity'); if (activity) activity.textContent = activityLabel(act);
      const focus = doc.getElementById('roSummaryFocus'); if (focus) focus.textContent = focuses.length ? focuses.join(' · ') : 'Без дополнительных';
    }
  }

  function showStep(doc, n) {
    step = Math.max(1,Math.min(4,n));
    doc.querySelectorAll('.ro-screen').forEach(x => x.classList.toggle('on', Number(x.dataset.roStep) === step));
    [...doc.querySelectorAll('#roProgress span')].forEach((x,i) => x.classList.toggle('on', i < step));
    const count = doc.getElementById('roStepCount'); if (count) count.textContent = `${step} из 4`;
    const back = doc.getElementById('roBack'); if (back) back.hidden = step === 1;
    const next = doc.getElementById('roNext');
    if (next) {
      next.classList.toggle('ro-start', step === 4);
      next.innerHTML = step === 4 ? `Начать ${icons.arrow}` : `Продолжить ${icons.arrow}`;
    }
    sync(doc);
    const ob = doc.getElementById('onboarding');
    if (ob) ob.scrollTop = 0;
  }

  function wire(doc) {
    const win = doc.defaultView;
    if (!win) return;

    win.rinloOnboardingSync = () => sync(doc);
    win.rinloOnboardingBack = () => showStep(doc, step - 1);
    win.rinloOnboardingNext = () => {
      if (step < 4) {
        if (!validate(doc, step)) return;
        showStep(doc, step + 1);
        return;
      }
      if (typeof win.finishOnboarding === 'function') win.finishOnboarding();
    };

    if (typeof win.restartOnboarding === 'function' && !win.__rinloRestartOnboardingWrapped) {
      win.__rinloRestartOnboardingWrapped = true;
      const original = win.restartOnboarding.bind(win);
      win.restartOnboarding = function () {
        original();
        const p = profileFromStorage(win);
        if (p) {
          const set = (id,v) => { const el = doc.getElementById(id); if (el && v != null) el.value = v; };
          set('obWeight',p.weight); set('obGoal',p.goal); set('obHeight',p.height); set('obAge',p.age); set('obActivity',p.activity);
          doc.querySelectorAll('.ro-focus').forEach(b => b.classList.toggle('sel',(p.habits || []).includes(b.dataset.h)));
        }
        showStep(doc,1);
      };
    }

    doc.querySelectorAll('#onboarding input,#onboarding select').forEach(el => el.addEventListener('input',() => sync(doc)));
    sync(doc);
  }

  function apply() {
    const doc = frame.contentDocument;
    if (!doc) return;
    const ob = doc.getElementById('onboarding');
    if (!ob || ob.dataset.rinloOnboarding === 'v01') return;
    ensureStyles(doc);
    build(doc);
    wire(doc);
    showStep(doc,1);
  }

  frame.addEventListener('load', () => {
    try { setTimeout(apply,0); }
    catch (e) { console.error('Rinlo onboarding v0.1', e); }
  });

  try { if (frame.contentDocument?.readyState === 'complete') setTimeout(apply,0); }
  catch {}
})();