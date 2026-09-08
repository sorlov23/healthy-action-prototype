(() => {
  const frame = document.getElementById('app');
  if(!frame) return;

  const APP_VERSION = 'v0.9.2';

  const icons = {
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.4 12 4l7.5 6.4v8.1a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6h-3.6V20H6a1.5 1.5 0 0 1-1.5-1.5z"/></svg>`,
    plan: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5.5" width="14" height="14" rx="3"/><path d="M8.4 11.8 10.7 14l4.9-5"/></svg>`,
    insights: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.5V13m4.7 5.5V9.5m4.7 9V6.5m4.6 12V11"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.2"/><path d="M5.8 19.2c.7-3.2 2.8-5 6.2-5s5.5 1.8 6.2 5"/></svg>`,
    left: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5.5 5 5.5"/></svg>`,
    right: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5.5-5 5.5"/></svg>`,
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    weight: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M9 10.5a3 3 0 0 1 6 0M12 10.5l1.5-1.5"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    smoke: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5h12v3H4zm12 0h2v3h-2zm3.5 0H21v3h-1.5zM14 9.5c0-1.2 1-2.2 2.2-2.2S18.5 6.4 18.5 5M17.5 12c0-1.2 1-2.2 2.2-2.2"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`
  };

  const iconBox = svg => `<span class="rinlo-line-icon">${svg}</span>`;

  function ensureStyles(doc){
    ['pwa-ui-polish-v2','pwa-ui-polish-v3','pwa-ui-polish-v4','pwa-ui-polish-v5'].forEach(id => doc.getElementById(id)?.remove());
    if(doc.getElementById('pwa-ui-polish-v6')) return;
    const style = doc.createElement('style');
    style.id = 'pwa-ui-polish-v6';
    style.textContent = `
      button{-webkit-tap-highlight-color:transparent}
      .btn,.action,.choice,.datebtn,.check,.nav button,.pill,.del,.photoRemove{touch-action:manipulation}
      .btn,.action,.choice,.datebtn,.pill,.foodMode,.foodSuggest{transition:transform .12s ease,background-color .12s ease,border-color .12s ease,box-shadow .12s ease}
      .btn:active,.action:active,.choice:active,.datebtn:active,.pill:active,.foodMode:active,.foodSuggest:active{transform:scale(.985)}
      .item{min-height:72px;padding:13px 14px;gap:12px}
      .item .left{width:40px;height:40px;border-radius:13px;font-size:20px}
      .item .main b{display:block;line-height:1.24}.item .main small{line-height:1.35}
      .check{appearance:none;-webkit-appearance:none;flex:0 0 32px;width:32px;height:32px;min-width:32px;padding:0!important;margin:0;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;display:grid;place-items:center;position:relative;box-sizing:border-box;font-size:0!important;line-height:0;overflow:visible}
      .check::after{content:'';position:absolute;left:50%;top:50%;width:27px;height:27px;transform:translate(-50%,-50%);border:2px solid #cbd5cd;border-radius:50%;box-sizing:border-box;opacity:1;transition:opacity .14s ease,border-color .14s ease}
      .check::before{content:'';position:absolute;left:50%;top:50%;width:18px;height:14px;transform:translate(-50%,-50%) scale(.9);opacity:0;background-repeat:no-repeat;background-position:center;background-size:18px 14px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 14'%3E%3Cpath d='M1.7 7.2 6.2 11.6 16.2 2' fill='none' stroke='%232E7D64' stroke-width='2.35' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");transition:opacity .14s ease,transform .14s ease}
      .check.done::after{opacity:0}.check.done::before{opacity:1;transform:translate(-50%,-50%) scale(1)}button.check:active{transform:scale(.94)}
      .field input,.field select,.field textarea{transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease}
      .field input:focus,.field select:focus,.field textarea:focus{border-color:#8CAFA0!important;box-shadow:0 0 0 4px rgba(46,125,100,.09);outline:none}
      .btn{min-height:48px}.pill{min-height:38px;display:inline-flex;align-items:center;justify-content:center}
      .datebtn{display:grid;place-items:center;font-size:0;color:#526058}.datebtn svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round}
      .nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;line-height:1.1}
      .nav button b{height:24px;margin:0!important;display:grid!important;place-items:center;font-size:0!important;line-height:0}.nav button b svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .nav button.active{color:#2E7D64!important}.nav button.active b svg{stroke-width:2.15}
      .fab{font-size:0!important;display:grid;place-items:center}.fab::before,.fab::after{content:'';position:absolute;width:23px;height:2.4px;border-radius:99px;background:#fff;left:50%;top:50%;transform:translate(-50%,-50%)}.fab::after{transform:translate(-50%,-50%) rotate(90deg)}
      .del,.photoRemove{font-size:0!important;position:relative;display:grid;place-items:center;padding:0}.del::before,.del::after,.photoRemove::before,.photoRemove::after{content:'';position:absolute;width:12px;height:1.7px;border-radius:99px;background:currentColor;left:50%;top:50%}.del::before,.photoRemove::before{transform:translate(-50%,-50%) rotate(45deg)}.del::after,.photoRemove::after{transform:translate(-50%,-50%) rotate(-45deg)}
      .sheet .handle{width:38px;height:5px;background:#d6ddd7;margin-bottom:16px}.sheet h2{line-height:1.22}.sheet .sub{margin-top:5px}.sheet .choice,.foodMode,.foodSuggest,.photoSelectedRow{box-shadow:0 1px 0 rgba(20,40,25,.02)}
      .metric .v{font-variant-numeric:tabular-nums}.tiny{line-height:1.45}.sec h2{line-height:1.2}.event .del{display:grid}
      #today.rinlo-today{--r-bg:#F3F6F4;--r-card:#FFFFFF;--r-text:#172027;--r-muted:#68737A;--r-line:#E2E8E5;--r-green:#2E7D64;--r-green-2:#489079;--r-sage:#8CAFA0;--r-mist:#D6E6DF;--r-dark:#0F1720;padding:max(18px,env(safe-area-inset-top)) 20px 112px;background:var(--r-bg);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
      #today.rinlo-today .rinlo-brand-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
      #today.rinlo-today .rinlo-wordmark{font-size:25px;line-height:1;font-weight:650;letter-spacing:-.055em;color:var(--r-dark)}
      #today.rinlo-today .rinlo-brand-dot{display:inline-block;width:7px;height:7px;margin-left:3px;border-radius:50%;background:var(--r-green);vertical-align:4px}
      #today.rinlo-today .rinlo-today-chip{font-size:12px;font-weight:600;color:var(--r-muted);background:rgba(255,255,255,.72);border:1px solid var(--r-line);border-radius:999px;padding:8px 11px}
      #today.rinlo-today .rinlo-greeting{margin-bottom:14px}#today.rinlo-today .rinlo-greeting h1{font-size:30px;line-height:1.08;font-weight:600;letter-spacing:-.04em;color:var(--r-text);margin:0 0 6px}#today.rinlo-today .rinlo-greeting .sub{font-size:14px;line-height:1.45;color:var(--r-muted)}
      #today.rinlo-today .rinlo-datebar{margin:0 0 14px;padding:0 2px}#today.rinlo-today .datebtn{background:transparent;width:36px;height:36px;border-radius:12px;color:#6F7A80}#today.rinlo-today .dateTitle b{font-size:13px;font-weight:600;color:var(--r-text)}#today.rinlo-today .dateTitle span{font-size:10px;color:#8A9499;margin-top:2px;display:block}
      #today.rinlo-today .rinlo-suggestion{position:relative;background:var(--r-card);border:1px solid var(--r-line);border-radius:24px;padding:18px;margin:0;box-shadow:0 8px 26px rgba(15,23,32,.045);overflow:hidden}
      #today.rinlo-today .rinlo-suggestion::after{content:'';position:absolute;width:130px;height:130px;border-radius:50%;right:-68px;top:-70px;background:radial-gradient(circle,rgba(140,175,160,.18),rgba(214,230,223,0) 68%);pointer-events:none}
      #today.rinlo-today .rinlo-suggestion-label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:650;color:var(--r-green);margin-bottom:10px}.rinlo-live-dot{width:8px;height:8px;border-radius:50%;background:var(--r-green);box-shadow:0 0 0 5px rgba(46,125,100,.08)}
      #today.rinlo-today .heroTitle{font-size:23px;line-height:1.19;font-weight:600;letter-spacing:-.025em;color:var(--r-text);margin:0 0 8px;max-width:320px}#today.rinlo-today .rinlo-suggestion .sub{font-size:13px;line-height:1.5;color:var(--r-muted);max-width:330px}
      #today.rinlo-today .rinlo-suggestion-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:16px}#today.rinlo-today .rinlo-primary{border:0;background:var(--r-green);color:#fff;border-radius:14px;min-height:48px;padding:12px 15px;font-weight:600}#today.rinlo-today .rinlo-secondary-action{border:1px solid var(--r-line);background:#F7F9F8;color:var(--r-text);border-radius:14px;min-height:48px;padding:12px 14px;font-weight:600}
      #today.rinlo-today .rinlo-section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:24px 0 10px}#today.rinlo-today .rinlo-section-head h2{font-size:18px;line-height:1.2;font-weight:600;color:var(--r-text);margin:0}#today.rinlo-today .rinlo-section-head span{font-size:11px;color:var(--r-muted)}
      #today.rinlo-today .rinlo-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}#today.rinlo-today .rinlo-quick{display:flex;align-items:center;gap:11px;min-height:76px;padding:12px;border:1px solid var(--r-line);border-radius:18px;background:#fff;text-align:left;color:var(--r-text)}#today.rinlo-today .rinlo-quick strong{display:block;font-size:13px;line-height:1.25;font-weight:600}#today.rinlo-today .rinlo-quick small{display:block;font-size:10.5px;line-height:1.3;color:var(--r-muted);margin-top:3px}
      .rinlo-line-icon{width:36px;height:36px;flex:0 0 36px;border-radius:12px;background:#EDF5F1;color:#2E7D64;display:grid;place-items:center}.rinlo-line-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #today.rinlo-today .rinlo-day-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}#today.rinlo-today .rinlo-summary-tile{min-width:0;border:1px solid var(--r-line);background:#fff;border-radius:17px;padding:11px 10px;text-align:left;color:var(--r-text)}#today.rinlo-today .rinlo-summary-tile .rinlo-mini-icon{display:block;width:24px;height:24px;color:var(--r-green);margin-bottom:8px}#today.rinlo-today .rinlo-summary-tile .rinlo-mini-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#today.rinlo-today .rinlo-summary-tile strong{display:block;font-size:13px;line-height:1.25;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#today.rinlo-today .rinlo-summary-tile small{display:block;font-size:10px;color:var(--r-muted);margin-top:3px}
      #today.rinlo-today .rinlo-nutrition-card{background:#fff;border:1px solid var(--r-line);border-radius:20px;padding:15px;margin-top:9px}#today.rinlo-today .rinlo-nutrition-title{font-size:12px;font-weight:650;color:var(--r-muted);margin-bottom:12px}#today.rinlo-today .metrics{gap:14px}#today.rinlo-today .metric{padding:0;border:0;border-radius:0;background:transparent}#today.rinlo-today .metric .v{font-size:19px;font-weight:600;color:var(--r-text)}#today.rinlo-today .metric .sub{font-size:10.5px;color:var(--r-muted)}#today.rinlo-today .progress{height:5px;background:#EDF1EF;margin-top:7px}#today.rinlo-today .fill{background:var(--r-green)}#today.rinlo-today .fill.b{background:var(--r-sage)}
      #today.rinlo-today .rinlo-insight{position:relative;background:#F7FAF8;border:1px solid #DDE8E2;border-radius:20px;padding:15px 15px 15px 46px;margin-top:12px}#today.rinlo-today .rinlo-insight-icon{position:absolute;left:14px;top:14px;width:24px;height:24px;color:var(--r-green)}#today.rinlo-today .rinlo-insight-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}#today.rinlo-today .rinlo-insight b{font-size:13px;font-weight:650;color:var(--r-text)}#today.rinlo-today .rinlo-insight p{font-size:12.5px;line-height:1.48;color:var(--r-muted);margin:5px 0 0}
      #today.rinlo-today .item{min-height:68px;background:#fff;border-color:var(--r-line);border-radius:17px;box-shadow:none}#today.rinlo-today .item .left{background:#EDF5F1;color:var(--r-green);font-size:0}#today.rinlo-today .item .left svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#today.rinlo-today .item b{font-weight:600;color:var(--r-text)}#today.rinlo-today .item small{color:var(--r-muted)}
      #today.rinlo-today .event{background:#fff;border-color:var(--r-line);border-radius:17px;box-shadow:none}#today.rinlo-today .event b{font-weight:600;color:var(--r-text)}#today.rinlo-today .event p{color:var(--r-muted)}
      #today.on ~ #fab{display:none!important}
      @media(max-width:360px){#today.rinlo-today{padding-left:16px;padding-right:16px}#today.rinlo-today .rinlo-suggestion-actions{grid-template-columns:1fr}#today.rinlo-today .rinlo-secondary-action{min-height:44px}}
    `;
    doc.head.appendChild(style);
  }

  function applyRinloToday(doc){
    const today = doc.getElementById('today');
    if(!today || today.dataset.rinloToday === 'v01') return;
    today.dataset.rinloToday = 'v01';
    today.classList.add('rinlo-today');
    today.innerHTML = `
      <div class="rinlo-brand-row"><div class="rinlo-wordmark">Rinlo<span class="rinlo-brand-dot"></span></div><div class="rinlo-today-chip">Сегодня</div></div>
      <div class="rinlo-greeting"><h1>Добрый день</h1><div class="sub">Хороший день для маленьких полезных действий.</div></div>
      <div class="datebar rinlo-datebar"><button class="datebtn" onclick="shiftDay(-1)" aria-label="Предыдущий день">‹</button><div class="dateTitle"><b id="dateTitle">Сегодня</b><span id="dateSub"></span></div><button class="datebtn" onclick="shiftDay(1)" aria-label="Следующий день">›</button></div>
      <div class="rinlo-suggestion"><div class="rinlo-suggestion-label"><span class="rinlo-live-dot"></span>Ваш шаг на сегодня</div><div id="focusTitle" class="heroTitle">—</div><div id="focusText" class="sub">—</div><div class="rinlo-suggestion-actions"><button id="rinloPrimaryAction" class="rinlo-primary" onclick="openQuick()">Добавить запись</button><button class="rinlo-secondary-action" onclick="openCoach()">Почему это?</button></div></div>
      <div class="rinlo-section-head"><h2>Быстрые действия</h2><span>1–2 касания</span></div>
      <div class="rinlo-quick-grid"><button class="rinlo-quick" onclick="openFood()">${iconBox(icons.meal)}<span><strong>Записать еду</strong><small>Обычным языком</small></span></button><button class="rinlo-quick" onclick="openWeight()">${iconBox(icons.weight)}<span><strong>Вес</strong><small>Новое измерение</small></span></button><button class="rinlo-quick" onclick="addSteps(1000)">${iconBox(icons.steps)}<span><strong>+1000 шагов</strong><small>Добавить движение</small></span></button><button class="rinlo-quick" onclick="addWater(250)">${iconBox(icons.water)}<span><strong>+250 мл воды</strong><small>Один стакан</small></span></button></div>
      <div class="rinlo-section-head"><h2>Сегодня</h2><span>цифры вторичны</span></div>
      <div class="rinlo-day-summary"><button class="rinlo-summary-tile" onclick="addWater(250)"><span class="rinlo-mini-icon">${icons.water}</span><strong id="quickWater">0 мл сегодня</strong><small>Вода</small></button><button class="rinlo-summary-tile" onclick="addSteps(1000)"><span class="rinlo-mini-icon">${icons.steps}</span><strong id="quickSteps">0 сегодня</strong><small>Шаги</small></button><button class="rinlo-summary-tile" onclick="openWeight()"><span class="rinlo-mini-icon">${icons.weight}</span><strong id="quickWeight">Добавить значение</strong><small>Вес</small></button></div>
      <div class="rinlo-nutrition-card"><div class="rinlo-nutrition-title">Питание · ориентиры, не экзамен</div><div class="metrics"><div class="metric"><div class="sub">Калории</div><div class="v"><span id="calVal">0</span></div><div class="sub">из <span id="calGoal">—</span> ккал</div><div class="progress"><div id="calFill" class="fill"></div></div></div><div class="metric"><div class="sub">Белок</div><div class="v"><span id="proteinVal">0</span> г</div><div class="sub">из <span id="proteinGoal">—</span> г</div><div class="progress"><div id="proteinFill" class="fill b"></div></div></div></div></div>
      <div class="card coach rinlo-insight"><span class="rinlo-insight-icon">${icons.spark}</span><b>Rinlo заметил</b><p id="coachText"></p></div>
      <div class="rinlo-section-head"><h2>Шаги на сегодня</h2><span id="missionCount"></span></div><div id="missionList" class="list"></div>
      <div class="rinlo-section-head"><h2>Записи дня</h2><span id="eventCount"></span></div><div id="timeline" class="list"></div>`;

    const win = doc.defaultView;
    if(win && typeof win.openCoach === 'function' && !win.__rinloCoachPatched){
      win.__rinloCoachPatched = true;
      win.openCoach = function(){ win.openSheet(`<h2>Rinlo</h2><div class="card coach"><b>Почему этот шаг</b><p>${win.coach()}</p></div><div class="tiny">Rinlo учитывает текущие записи дня и предлагает следующий практичный шаг. В прототипе логика пока rule-based.</div>`); };
    }
    if(win && typeof win.render === 'function') win.render();
  }

  function applyIcons(doc){
    const nav = [...doc.querySelectorAll('.nav button')];
    const navIcons = [icons.home, icons.plan, icons.insights, icons.profile];
    const navLabels = ['Сегодня','План','Инсайты','Профиль'];
    nav.forEach((button, i) => {
      const holder = button.querySelector('b');
      if(holder && navIcons[i]) holder.innerHTML = navIcons[i];
      const textNodes = [...button.childNodes].filter(n => n.nodeType === 3);
      if(textNodes.length && navLabels[i]) textNodes[textNodes.length - 1].nodeValue = navLabels[i];
    });
    const dateButtons = [...doc.querySelectorAll('.datebtn')];
    if(dateButtons[0]) dateButtons[0].innerHTML = icons.left;
    if(dateButtons[1]) dateButtons[1].innerHTML = icons.right;
  }

  function missionSvg(label){
    const t = (label || '').toLowerCase();
    if(t.includes('шаг')) return icons.steps;
    if(t.includes('вода') || t.includes('2 л')) return icons.water;
    if(t.includes('вейп') || t.includes('сигар')) return icons.smoke;
    return icons.meal;
  }

  function syncRinloDynamic(doc){
    const today = doc.getElementById('today');
    if(!today?.classList.contains('rinlo-today')) return;
    const title = doc.getElementById('focusTitle')?.textContent || '';
    const primary = doc.getElementById('rinloPrimaryAction');
    if(primary){
      let label = 'Добавить запись'; let action = 'openQuick()';
      if(/белков/i.test(title)){ label = 'Записать еду'; action = 'openFood()'; }
      else if(/движен/i.test(title)){ label = 'Добавить 1000 шагов'; action = 'addSteps(1000)'; }
      else if(/ритме|не усложняй/i.test(title)){ label = 'Открыть план'; action = "document.querySelectorAll('.nav button')[1].click()"; }
      if(primary.textContent !== label) primary.textContent = label;
      if(primary.getAttribute('onclick') !== action) primary.setAttribute('onclick', action);
    }
    doc.querySelectorAll('#missionList .item').forEach(item => {
      const left = item.querySelector('.left'); const label = item.querySelector('.main b')?.textContent || '';
      if(left && left.dataset.rinloIcon !== label){ left.dataset.rinloIcon = label; left.innerHTML = missionSvg(label); }
    });
    doc.querySelectorAll('#timeline .event b').forEach(b => { if(b.dataset.rinloClean) return; b.dataset.rinloClean = '1'; b.textContent = b.textContent.replace(/^[^\p{L}\p{N}]+/u,''); });
  }

  function observeRinloToday(doc){
    if(doc.__rinloTodayObserver) return;
    const today = doc.getElementById('today'); if(!today) return;
    let queued = false;
    doc.__rinloTodayObserver = new MutationObserver(() => {
      if(queued) return; queued = true;
      (doc.defaultView?.requestAnimationFrame || setTimeout)(() => { queued = false; syncRinloDynamic(doc); });
    });
    doc.__rinloTodayObserver.observe(today,{subtree:true,childList:true,characterData:true});
  }

  function syncVersions(doc){
    const replaceText = root => {
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => { const v = node.nodeValue; if(v && /v\d+\.\d+(?:\.\d+)?/i.test(v)) node.nodeValue = v.replace(/v\d+\.\d+(?:\.\d+)?/gi, APP_VERSION); });
    };
    replaceText(doc.body);
    if(!doc.__haVersionObserver){
      doc.__haVersionObserver = new MutationObserver(mutations => { mutations.forEach(m => m.addedNodes.forEach(node => { if(node.nodeType === 3){ if(/v\d+\.\d+(?:\.\d+)?/i.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/v\d+\.\d+(?:\.\d+)?/gi, APP_VERSION); } else if(node.nodeType === 1) replaceText(node); })); });
      doc.__haVersionObserver.observe(doc.body,{subtree:true,childList:true});
    }
  }

  function apply(){
    const doc = frame.contentDocument; if(!doc) return;
    ensureStyles(doc); applyRinloToday(doc); applyIcons(doc); syncRinloDynamic(doc); observeRinloToday(doc); syncVersions(doc);
  }

  frame.addEventListener('load', () => { try { apply(); } catch(e) { console.error('Rinlo UI polish', e); } });
  try { if(frame.contentDocument?.readyState === 'complete') setTimeout(apply, 0); } catch {}
})();