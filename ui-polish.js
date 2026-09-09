(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const APP_VERSION = 'v0.9.2';

  const icons = {
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.8 10.5 12 4.4l7.2 6.1v8a1.5 1.5 0 0 1-1.5 1.5h-4v-5.5h-3.4V20h-4a1.5 1.5 0 0 1-1.5-1.5z"/></svg>`,
    plan: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5.5" width="14" height="14" rx="3"/><path d="M8.4 11.8 10.7 14l4.9-5"/></svg>`,
    insights: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 18.5v-5.2m4.5 5.2V9.7m4.5 8.8V6.7m4.5 11.8v-7.1"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.1"/><path d="M5.9 19.2c.7-3.2 2.7-4.9 6.1-4.9s5.4 1.7 6.1 4.9"/></svg>`,
    left: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5.5 5 5.5"/></svg>`,
    right: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5.5-5 5.5"/></svg>`,
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    weight: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M9 10.5a3 3 0 0 1 6 0M12 10.5l1.5-1.5"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    smoke: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5h12v3H4zm12 0h2v3h-2zm3.5 0H21v3h-1.5zM14 9.5c0-1.2 1-2.2 2.2-2.2S18.5 6.4 18.5 5M17.5 12c0-1.2 1-2.2 2.2-2.2"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.3 3.4 3.4 7.7-8"/></svg>`
  };

  const iconBox = svg => `<span class="rinlo-icon-box">${svg}</span>`;

  function ensureStyles(doc) {
    [...doc.querySelectorAll('style[id^="pwa-ui-polish-"]')].forEach(x => x.remove());
    doc.getElementById('rinlo-today-v02')?.remove();

    const style = doc.createElement('style');
    style.id = 'rinlo-today-v02';
    style.textContent = `
      :root{
        --r-bg:#F6F8F7;--r-card:#FFFFFF;--r-text:#172027;--r-muted:#747E82;
        --r-line:#E4E9E6;--r-green:#2E7D64;--r-green-2:#4C8E78;--r-sage:#9AB9AC;
        --r-mist:#EAF2EE;--r-dark:#0F1720;--r-dark-2:#152529;
      }
      html,body{background:var(--r-bg)!important}
      body,.app{font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important}
      .app{background:var(--r-bg)!important}
      button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
      button:active{transform:scale(.985)}
      .btn,.action,.choice,.datebtn,.pill,.rinlo-quick,.rinlo-hero-primary,.rinlo-hero-secondary{transition:transform .12s ease,background-color .12s ease,border-color .12s ease}

      /* Rinlo Today */
      #today.rinlo-today-v02{
        min-height:100vh!important;
        padding:max(14px,env(safe-area-inset-top)) 18px 92px!important;
        background:
          radial-gradient(circle at 105% 2%,rgba(154,185,172,.13),transparent 30%),
          linear-gradient(180deg,#F8FAF9 0%,#F4F7F5 100%)!important;
        color:var(--r-text);
      }
      #today.rinlo-today-v02 .rinlo-top{
        display:flex;align-items:center;justify-content:space-between;min-height:34px;margin-bottom:18px;
      }
      #today.rinlo-today-v02 .rinlo-wordmark{
        font-size:21px;font-weight:650;line-height:1;letter-spacing:-.055em;color:var(--r-dark);
      }
      #today.rinlo-today-v02 .rinlo-wordmark-dot{
        display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--r-green);margin-left:3px;vertical-align:3px;
      }
      #today.rinlo-today-v02 .rinlo-day-status{
        display:flex;align-items:center;gap:6px;font-size:11px;font-weight:550;color:var(--r-muted);
      }
      #today.rinlo-today-v02 .rinlo-day-status::before{
        content:'';width:6px;height:6px;border-radius:50%;background:var(--r-green);
      }
      #today.rinlo-today-v02 .rinlo-greeting{margin-bottom:12px}
      #today.rinlo-today-v02 .rinlo-greeting h1{
        margin:0 0 4px!important;font-size:24px!important;line-height:1.14!important;font-weight:600!important;letter-spacing:-.035em!important;color:var(--r-text)!important;
      }
      #today.rinlo-today-v02 .rinlo-greeting .sub{
        font-size:12.5px!important;line-height:1.42!important;color:var(--r-muted)!important;
      }
      #today.rinlo-today-v02 .rinlo-date-compact{
        display:grid;grid-template-columns:30px 1fr 30px;align-items:center;margin:0 0 13px;
      }
      #today.rinlo-today-v02 .datebtn{
        width:30px!important;height:30px!important;border:0!important;background:transparent!important;border-radius:10px!important;color:#899296!important;display:grid;place-items:center;font-size:0!important;padding:0!important;
      }
      #today.rinlo-today-v02 .datebtn svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      #today.rinlo-today-v02 .dateTitle{text-align:center!important;line-height:1.1}
      #today.rinlo-today-v02 .dateTitle b{font-size:11.5px!important;font-weight:600!important;color:#4D575B!important}
      #today.rinlo-today-v02 .dateTitle span{display:none!important}

      #today.rinlo-today-v02 .rinlo-hero{
        position:relative;overflow:hidden;margin:0;border:0;border-radius:24px;padding:18px 17px 16px;color:#fff;
        background:
          radial-gradient(circle at 82% 18%,rgba(118,170,151,.34),transparent 18%),
          radial-gradient(circle at 106% 90%,rgba(76,142,120,.32),transparent 34%),
          linear-gradient(145deg,#122126 0%,#0F1B1F 48%,#173D35 100%);
        box-shadow:0 12px 30px rgba(15,23,32,.09);
      }
      #today.rinlo-today-v02 .rinlo-hero::before{
        content:'';position:absolute;width:260px;height:120px;right:-104px;top:52px;border-radius:50%;
        border:1px solid rgba(186,213,202,.16);transform:rotate(-24deg);pointer-events:none;
      }
      #today.rinlo-today-v02 .rinlo-hero::after{
        content:'';position:absolute;width:170px;height:170px;right:-118px;bottom:-105px;border-radius:50%;
        background:linear-gradient(145deg,rgba(154,185,172,.18),rgba(154,185,172,0));pointer-events:none;
      }
      #today.rinlo-today-v02 .rinlo-hero-label{
        position:relative;z-index:1;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:600;color:#B8D7CA;letter-spacing:.01em;margin-bottom:9px;
      }
      #today.rinlo-today-v02 .rinlo-hero-label-dot{
        width:7px;height:7px;border-radius:50%;background:#70B194;box-shadow:0 0 0 4px rgba(112,177,148,.1);
      }
      #today.rinlo-today-v02 .heroTitle{
        position:relative;z-index:1;margin:0 0 7px!important;max-width:300px;font-size:22px!important;line-height:1.16!important;font-weight:600!important;letter-spacing:-.028em!important;color:#fff!important;
      }
      #today.rinlo-today-v02 .rinlo-hero .sub{
        position:relative;z-index:1;max-width:300px;font-size:12px!important;line-height:1.46!important;color:rgba(255,255,255,.68)!important;
      }
      #today.rinlo-today-v02 .rinlo-hero-meta{
        position:relative;z-index:1;display:flex;gap:6px;flex-wrap:wrap;margin-top:11px;
      }
      #today.rinlo-today-v02 .rinlo-hero-meta span{
        padding:5px 8px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.05);font-size:9.5px;color:rgba(255,255,255,.7);
      }
      #today.rinlo-today-v02 .rinlo-hero-actions{
        position:relative;z-index:1;display:flex;align-items:center;gap:8px;margin-top:14px;
      }
      #today.rinlo-today-v02 .rinlo-hero-primary{
        min-height:42px;padding:10px 15px;border:0;border-radius:13px;background:#F7FAF8;color:#142126;font-size:12px;font-weight:650;flex:1;
      }
      #today.rinlo-today-v02 .rinlo-hero-secondary{
        min-height:42px;padding:9px 12px;border:1px solid rgba(255,255,255,.13);border-radius:13px;background:rgba(255,255,255,.055);color:rgba(255,255,255,.82);font-size:11.5px;font-weight:550;
      }
      #today.rinlo-today-v02 .rinlo-why{
        position:relative;z-index:1;display:inline-block;margin-top:10px;border:0;background:transparent;padding:0;color:rgba(255,255,255,.48);font-size:10.5px;text-decoration:none;
      }

      #today.rinlo-today-v02 .rinlo-section-title{
        display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:21px 0 9px;
      }
      #today.rinlo-today-v02 .rinlo-section-title h2{
        margin:0!important;font-size:15px!important;line-height:1.2!important;font-weight:600!important;color:var(--r-text)!important;
      }
      #today.rinlo-today-v02 .rinlo-section-title span{font-size:9.5px;color:#90999D}

      #today.rinlo-today-v02 .rinlo-quick-row{
        display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;
      }
      #today.rinlo-today-v02 .rinlo-quick{
        min-width:0;min-height:73px;padding:9px 4px 8px;border:1px solid var(--r-line);border-radius:17px;background:rgba(255,255,255,.88);color:var(--r-text);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
        box-shadow:0 2px 10px rgba(15,23,32,.025);
      }
      #today.rinlo-today-v02 .rinlo-quick .rinlo-icon-box{
        width:30px;height:30px;border-radius:10px;background:#EEF5F1;color:var(--r-green);display:grid;place-items:center;margin-bottom:7px;
      }
      #today.rinlo-today-v02 .rinlo-quick svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #today.rinlo-today-v02 .rinlo-quick strong{
        display:block;max-width:100%;font-size:10px;line-height:1.12;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }

      #today.rinlo-today-v02 .rinlo-summary{
        display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;
      }
      #today.rinlo-today-v02 .rinlo-summary-card{
        min-width:0;padding:10px 10px 9px;border:1px solid var(--r-line);border-radius:16px;background:#fff;text-align:left;color:var(--r-text);
      }
      #today.rinlo-today-v02 .rinlo-summary-card .mini{
        width:22px;height:22px;margin-bottom:7px;color:var(--r-green);
      }
      #today.rinlo-today-v02 .rinlo-summary-card .mini svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #today.rinlo-today-v02 .rinlo-summary-card strong{
        display:block;font-size:11px;line-height:1.15;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      #today.rinlo-today-v02 .rinlo-summary-card small{display:block;margin-top:3px;font-size:8.8px;color:#8B9599}

      #today.rinlo-today-v02 .rinlo-insight{
        position:relative;margin-top:11px;padding:13px 13px 13px 42px;border:1px solid #DDE8E2;border-radius:17px;background:#F7FAF8;
      }
      #today.rinlo-today-v02 .rinlo-insight .rinlo-insight-icon{
        position:absolute;left:13px;top:13px;width:21px;height:21px;color:var(--r-green);
      }
      #today.rinlo-today-v02 .rinlo-insight svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
      #today.rinlo-today-v02 .rinlo-insight b{font-size:10.5px;font-weight:650;color:#2F6654}
      #today.rinlo-today-v02 .rinlo-insight p{margin:3px 0 0;font-size:10.5px;line-height:1.42;color:#68757A}

      #today.rinlo-today-v02 .rinlo-nutrition{
        margin-top:8px;padding:12px;border:1px solid var(--r-line);border-radius:17px;background:#fff;
      }
      #today.rinlo-today-v02 .rinlo-nutrition-label{margin-bottom:9px;font-size:9.5px;font-weight:600;color:#7C878B}
      #today.rinlo-today-v02 .metrics{display:grid;grid-template-columns:1fr 1fr;gap:14px!important}
      #today.rinlo-today-v02 .metric{padding:0!important;border:0!important;background:transparent!important;border-radius:0!important}
      #today.rinlo-today-v02 .metric .v{margin:2px 0!important;font-size:15px!important;font-weight:600!important;color:var(--r-text)!important}
      #today.rinlo-today-v02 .metric .sub{font-size:8.8px!important;color:#899397!important}
      #today.rinlo-today-v02 .progress{height:4px!important;margin-top:6px!important;background:#EDF1EF!important}
      #today.rinlo-today-v02 .fill{background:var(--r-green)!important}.fill.b{background:var(--r-sage)!important}

      #today.rinlo-today-v02 .list{display:grid;gap:7px!important}
      #today.rinlo-today-v02 .item{
        min-height:59px!important;padding:10px 11px!important;gap:10px!important;border:1px solid var(--r-line)!important;border-radius:16px!important;background:#fff!important;box-shadow:none!important;
      }
      #today.rinlo-today-v02 .item .left{
        width:34px!important;height:34px!important;flex:0 0 34px!important;border-radius:11px!important;background:#EEF5F1!important;color:var(--r-green)!important;display:grid!important;place-items:center!important;font-size:0!important;
      }
      #today.rinlo-today-v02 .item .left svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #today.rinlo-today-v02 .item .main b{display:block;font-size:11.5px!important;line-height:1.2!important;font-weight:600!important;color:var(--r-text)!important}
      #today.rinlo-today-v02 .item .main small{display:block;margin-top:2px;font-size:9px!important;line-height:1.25!important;color:#8A9498!important}
      #today.rinlo-today-v02 .check{
        appearance:none;-webkit-appearance:none;width:28px!important;height:28px!important;min-width:28px!important;flex:0 0 28px!important;padding:0!important;border:0!important;background:transparent!important;border-radius:50%!important;position:relative;font-size:0!important;
      }
      #today.rinlo-today-v02 .check::after{content:'';position:absolute;inset:3px;border:1.5px solid #CAD4CF;border-radius:50%}
      #today.rinlo-today-v02 .check.done::after{background:var(--r-green);border-color:var(--r-green)}
      #today.rinlo-today-v02 .check.done::before{content:'';position:absolute;z-index:1;left:8px;top:8px;width:10px;height:6px;border-left:1.8px solid #fff;border-bottom:1.8px solid #fff;transform:rotate(-45deg)}

      #today.rinlo-today-v02 .event{
        position:relative;padding:10px 34px 10px 11px!important;border:1px solid var(--r-line)!important;border-radius:15px!important;background:#fff!important;
      }
      #today.rinlo-today-v02 .event .time{font-size:8.5px!important;color:#98A0A3!important}
      #today.rinlo-today-v02 .event b{font-size:10.8px!important;font-weight:600!important;color:var(--r-text)!important}
      #today.rinlo-today-v02 .event p{margin:3px 0 0!important;font-size:9px!important;line-height:1.3!important;color:#8B9599!important}
      #today.rinlo-today-v02 .del{right:7px!important;top:7px!important;width:26px!important;height:26px!important;border:0!important;background:#F4F6F5!important;color:#8B9599!important;border-radius:9px!important}

      /* Smaller bottom navigation */
      .nav{
        height:66px!important;padding:5px 8px calc(5px + env(safe-area-inset-bottom))!important;background:rgba(255,255,255,.96)!important;border-top:1px solid #E5EAE7!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
      }
      .nav button{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;border:0!important;background:transparent!important;color:#7A8580!important;font-size:9px!important;font-weight:550!important;line-height:1!important;padding:0!important}
      .nav button b{display:grid!important;place-items:center!important;width:22px!important;height:22px!important;margin:0!important;font-size:0!important;line-height:0!important}
      .nav button b svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
      .nav button.active{color:var(--r-green)!important;font-weight:600!important}
      .fab{display:none!important}
      #today.on ~ #fab{display:none!important}

      /* Keep sheets tactile but cleaner */
      .overlay{background:rgba(15,23,32,.34)!important}
      .sheet{border-radius:26px 26px 0 0!important;padding:12px 16px calc(22px + env(safe-area-inset-bottom))!important}
      .sheet .handle{width:34px!important;height:4px!important;margin:0 auto 14px!important;background:#D7DEDA!important}

      @media(max-width:360px){
        #today.rinlo-today-v02{padding-left:14px!important;padding-right:14px!important}
        #today.rinlo-today-v02 .rinlo-hero{border-radius:21px;padding:16px 15px 15px}
        #today.rinlo-today-v02 .rinlo-quick-row{gap:5px}
        #today.rinlo-today-v02 .rinlo-quick strong{font-size:9.2px}
      }
    `;
    doc.head.appendChild(style);
  }

  function applyRinloToday(doc) {
    const today = doc.getElementById('today');
    if (!today) return;
    today.className = 'screen rinlo-today-v02';
    if (today.style.display === 'none') today.style.removeProperty('display');

    today.innerHTML = `
      <div class="rinlo-top">
        <div class="rinlo-wordmark">Rinlo<span class="rinlo-wordmark-dot"></span></div>
        <div class="rinlo-day-status">Сегодня</div>
      </div>

      <div class="rinlo-greeting">
        <h1>Добрый день</h1>
        <div class="sub">Небольшой полезный шаг — уже достаточно.</div>
      </div>

      <div class="rinlo-date-compact">
        <button class="datebtn" onclick="shiftDay(-1)" aria-label="Предыдущий день">${icons.left}</button>
        <div class="dateTitle"><b id="dateTitle">Сегодня</b><span id="dateSub"></span></div>
        <button class="datebtn" onclick="shiftDay(1)" aria-label="Следующий день">${icons.right}</button>
      </div>

      <section class="rinlo-hero">
        <div class="rinlo-hero-label"><span class="rinlo-hero-label-dot"></span>Ваш шаг на сегодня</div>
        <div id="focusTitle" class="heroTitle">—</div>
        <div id="focusText" class="sub">—</div>
        <div class="rinlo-hero-meta"><span>Небольшой шаг</span><span>Без давления</span></div>
        <div class="rinlo-hero-actions">
          <button id="rinloPrimaryAction" class="rinlo-hero-primary" onclick="openQuick()">Я сделаю это</button>
          <button class="rinlo-hero-secondary" onclick="openQuick()">Другой вариант</button>
        </div>
        <button class="rinlo-why" onclick="openCoach()">Почему именно это?</button>
      </section>

      <div class="rinlo-section-title"><h2>Быстрые действия</h2><span>в одно касание</span></div>
      <div class="rinlo-quick-row">
        <button class="rinlo-quick" onclick="openFood()">${iconBox(icons.meal)}<strong>Еда</strong></button>
        <button class="rinlo-quick" onclick="openWeight()">${iconBox(icons.weight)}<strong>Вес</strong></button>
        <button class="rinlo-quick" onclick="addSteps(1000)">${iconBox(icons.steps)}<strong>Шаги</strong></button>
        <button class="rinlo-quick" onclick="addWater(250)">${iconBox(icons.water)}<strong>Вода</strong></button>
      </div>

      <div class="rinlo-section-title"><h2>Сегодня</h2><span>только контекст</span></div>
      <div class="rinlo-summary">
        <button class="rinlo-summary-card" onclick="addWater(250)"><div class="mini">${icons.water}</div><strong id="quickWater">0 мл сегодня</strong><small>Вода</small></button>
        <button class="rinlo-summary-card" onclick="openFood()"><div class="mini">${icons.meal}</div><strong id="quickMeals">0 записей</strong><small>Питание</small></button>
        <button class="rinlo-summary-card" onclick="addSteps(1000)"><div class="mini">${icons.steps}</div><strong id="quickSteps">0 сегодня</strong><small>Шаги</small></button>
      </div>

      <div class="rinlo-insight"><span class="rinlo-insight-icon">${icons.spark}</span><b>Rinlo заметил</b><p id="coachText"></p></div>

      <div class="rinlo-section-title"><h2>Питание</h2><span>ориентир, не экзамен</span></div>
      <div class="rinlo-nutrition">
        <div class="rinlo-nutrition-label">Сегодняшний ориентир</div>
        <div class="metrics">
          <div class="metric"><div class="sub">Калории</div><div class="v"><span id="calVal">0</span></div><div class="sub">из <span id="calGoal">—</span> ккал</div><div class="progress"><div id="calFill" class="fill"></div></div></div>
          <div class="metric"><div class="sub">Белок</div><div class="v"><span id="proteinVal">0</span> г</div><div class="sub">из <span id="proteinGoal">—</span> г</div><div class="progress"><div id="proteinFill" class="fill b"></div></div></div>
        </div>
      </div>

      <div class="rinlo-section-title"><h2>Шаги на сегодня</h2><span id="missionCount"></span></div>
      <div id="missionList" class="list"></div>

      <div class="rinlo-section-title"><h2>Записи дня</h2><span id="eventCount"></span></div>
      <div id="timeline" class="list"></div>

      <div style="display:none" id="quickWeight">Добавить значение</div>
    `;

    const win = doc.defaultView;
    if (win && typeof win.openCoach === 'function' && !win.__rinloCoachPatchedV2) {
      win.__rinloCoachPatchedV2 = true;
      win.openCoach = function () {
        win.openSheet(`<h2>Почему этот шаг</h2><div class="card coach"><b>Rinlo учитывает сегодняшний контекст</b><p>${win.coach()}</p></div><div class="tiny">В прототипе рекомендации пока rule-based. Мы проверяем механику до подключения полноценной AI-модели.</div>`);
      };
    }

    if (win && typeof win.render === 'function') win.render();
  }

  function applyNavigation(doc) {
    const nav = [...doc.querySelectorAll('.nav button')];
    const navIcons = [icons.home, icons.plan, icons.insights, icons.profile];
    const labels = ['Сегодня', 'План', 'Инсайты', 'Профиль'];
    nav.forEach((button, i) => {
      const holder = button.querySelector('b');
      if (holder && navIcons[i]) holder.innerHTML = navIcons[i];
      const textNodes = [...button.childNodes].filter(n => n.nodeType === 3);
      if (textNodes.length && labels[i]) textNodes[textNodes.length - 1].nodeValue = labels[i];
    });
  }

  function missionSvg(label) {
    const t = (label || '').toLowerCase();
    if (t.includes('шаг')) return icons.steps;
    if (t.includes('вода') || t.includes('2 л')) return icons.water;
    if (t.includes('вейп') || t.includes('сигар')) return icons.smoke;
    return icons.meal;
  }

  function syncToday(doc) {
    const today = doc.getElementById('today');
    if (!today?.classList.contains('rinlo-today-v02')) return;

    const win = doc.defaultView;
    const title = doc.getElementById('focusTitle')?.textContent || '';
    const primary = doc.getElementById('rinloPrimaryAction');
    if (primary) {
      let action = 'openQuick()';
      if (/белков/i.test(title)) action = 'openFood()';
      else if (/движен/i.test(title)) action = 'addSteps(1000)';
      else if (/ритме|не усложняй/i.test(title)) action = "document.querySelectorAll('.nav button')[1].click()";
      if (primary.getAttribute('onclick') !== action) primary.setAttribute('onclick', action);
      primary.textContent = 'Я сделаю это';
    }

    const meals = doc.getElementById('quickMeals');
    try {
      if (meals && win && typeof win.day === 'function') {
        const d = win.day();
        const count = (d.events || []).filter(e => e.type === 'food').length;
        meals.textContent = count ? `${count} ${count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей'}` : '0 записей';
      }
    } catch {}

    doc.querySelectorAll('#missionList .item').forEach(item => {
      const left = item.querySelector('.left');
      const label = item.querySelector('.main b')?.textContent || '';
      if (left && left.dataset.rinloIcon !== label) {
        left.dataset.rinloIcon = label;
        left.innerHTML = missionSvg(label);
      }
    });

    doc.querySelectorAll('#timeline .event b').forEach(b => {
      b.textContent = b.textContent.replace(/^[^\p{L}\p{N}]+/u, '');
    });
  }

  function observeToday(doc) {
    if (doc.__rinloTodayObserverV2) return;
    const today = doc.getElementById('today');
    if (!today) return;
    let queued = false;
    doc.__rinloTodayObserverV2 = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      (doc.defaultView?.requestAnimationFrame || setTimeout)(() => {
        queued = false;
        syncToday(doc);
      });
    });
    doc.__rinloTodayObserverV2.observe(today, { subtree: true, childList: true, characterData: true });
  }

  function syncVersions(doc) {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (/v\d+\.\d+(?:\.\d+)?/i.test(node.nodeValue || '')) {
        node.nodeValue = node.nodeValue.replace(/v\d+\.\d+(?:\.\d+)?/gi, APP_VERSION);
      }
    });
  }

  function apply() {
    const doc = frame.contentDocument;
    if (!doc?.head || !doc.body) {
      setTimeout(apply, 0);
      return;
    }
    ensureStyles(doc);
    applyRinloToday(doc);
    applyNavigation(doc);
    syncToday(doc);
    observeToday(doc);
    syncVersions(doc);
  }

  frame.addEventListener('load', () => {
    try { apply(); }
    catch (e) { console.error('Rinlo Today v0.2', e); }
  });

  try {
    if (frame.contentDocument?.readyState === 'complete') setTimeout(apply, 0);
  } catch {}
})();