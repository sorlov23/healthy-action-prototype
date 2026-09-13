(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const VERSION = 'v2';
  let observer;
  let timer;

  const HERO_IMAGE = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82';

  function ensureStyles(doc) {
    let style = doc.getElementById('rinlo-visual-system-v2-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'rinlo-visual-system-v2-style';
      doc.head.appendChild(style);
    }

    style.textContent = `
      :root{
        --rv2-bg:#eef3f1;
        --rv2-bg-2:#f7f9f8;
        --rv2-surface:rgba(255,255,255,.68);
        --rv2-surface-strong:rgba(255,255,255,.88);
        --rv2-line:rgba(255,255,255,.72);
        --rv2-stroke:rgba(34,55,48,.09);
        --rv2-text:#152034;
        --rv2-muted:#6f7a86;
        --rv2-green:#116846;
        --rv2-green-2:#21805e;
        --rv2-green-soft:#daf2e7;
        --rv2-blue-soft:#e6f0ff;
        --rv2-shadow:0 18px 45px rgba(36,58,50,.09);
        --rv2-shadow-soft:0 8px 22px rgba(35,54,48,.06);
        --rv2-radius:24px;
      }

      html,body{background:var(--rv2-bg)!important;color:var(--rv2-text)!important}
      body{font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif!important}
      .app{
        background:
          radial-gradient(circle at 90% 0%,rgba(198,218,211,.42),transparent 30%),
          radial-gradient(circle at -15% 42%,rgba(224,232,239,.52),transparent 32%),
          linear-gradient(180deg,#f7f9f8 0%,#edf2f0 54%,#f6f8f7 100%)!important;
      }
      .screen{background:transparent!important;color:var(--rv2-text)!important}
      h1,h2,b,strong{color:var(--rv2-text)!important}
      .sub,.tiny,.k{color:var(--rv2-muted)!important}

      /* Global glass surfaces */
      .card,.item,.event,.metric,.stat,.choice,.action,.rc-card,.rc-checkin,.rc-calories,.rc-mini,.rc-event,.rc-placeholder,.rc-summary-row,.profileRow,.chart{
        background:var(--rv2-surface)!important;
        border:1px solid var(--rv2-line)!important;
        box-shadow:inset 0 0 0 1px var(--rv2-stroke),var(--rv2-shadow-soft)!important;
        backdrop-filter:blur(18px) saturate(1.05)!important;
        -webkit-backdrop-filter:blur(18px) saturate(1.05)!important;
      }
      .card,.rc-card,.rc-checkin,.rc-calories,.rc-placeholder,.chart{border-radius:24px!important}
      .item,.event,.metric,.stat,.choice,.action,.rc-mini,.rc-event,.rc-summary-row{border-radius:18px!important}

      /* Controls */
      button{transition:transform .14s ease,box-shadow .14s ease,background .14s ease,border-color .14s ease}
      button:active{transform:scale(.985)}
      .btn,.rc-next,.rc-done,.rpp-save{
        border-radius:16px!important;
        font-weight:650!important;
        box-shadow:none!important;
      }
      .primary,.rc-done,.rc-next.start,.rpp-save{
        background:linear-gradient(135deg,var(--rv2-green-2),var(--rv2-green))!important;
        color:#fff!important;
      }
      .secondary,.ghost,.rc-alt,.rc-back{
        background:rgba(255,255,255,.65)!important;
        border:1px solid rgba(27,67,53,.12)!important;
        color:var(--rv2-text)!important;
      }
      .field input,.field select,.field textarea,.rc-field input,.rc-field select{
        background:rgba(255,255,255,.72)!important;
        border:1px solid rgba(29,52,44,.10)!important;
        border-radius:16px!important;
        color:var(--rv2-text)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.8)!important;
      }

      /* Modern floating bottom nav */
      .nav{
        left:50%!important;
        bottom:calc(9px + env(safe-area-inset-bottom))!important;
        width:min(402px,calc(100vw - 24px))!important;
        height:72px!important;
        padding:6px 8px!important;
        border:1px solid rgba(255,255,255,.78)!important;
        border-radius:24px!important;
        background:rgba(249,251,250,.78)!important;
        box-shadow:0 18px 46px rgba(30,47,42,.14),inset 0 1px 0 rgba(255,255,255,.9)!important;
        backdrop-filter:blur(24px) saturate(1.2)!important;
        -webkit-backdrop-filter:blur(24px) saturate(1.2)!important;
      }
      .nav button{
        position:relative!important;
        border-radius:16px!important;
        color:#7a8490!important;
        font-size:10px!important;
        font-weight:520!important;
      }
      .nav button b{font-size:18px!important;margin-bottom:3px!important;color:inherit!important}
      .nav button.active,.nav .active{color:var(--rv2-green)!important;background:rgba(219,239,230,.58)!important}
      .nav button.active:after,.nav .active:after{
        content:'';position:absolute;left:50%;bottom:3px;width:5px;height:5px;border-radius:50%;background:#50b37c;transform:translateX(-50%);
      }
      .fab{display:none!important}

      /* Sheets and overlays */
      .overlay{background:rgba(22,31,29,.24)!important;backdrop-filter:blur(7px)!important;-webkit-backdrop-filter:blur(7px)!important}
      .sheet{
        background:rgba(250,252,251,.94)!important;
        border:1px solid rgba(255,255,255,.84)!important;
        border-radius:30px 30px 0 0!important;
        box-shadow:0 -24px 70px rgba(18,33,29,.16)!important;
        backdrop-filter:blur(26px) saturate(1.15)!important;
        -webkit-backdrop-filter:blur(26px) saturate(1.15)!important;
      }
      .handle{background:rgba(52,68,62,.15)!important}

      /* Today — selected 2026 direction */
      #today.rinlo-core-today.rtv2{
        padding:max(16px,env(safe-area-inset-top)) 16px calc(104px + env(safe-area-inset-bottom))!important;
        background:transparent!important;
      }
      #today.rtv2 .rc-today-top{align-items:flex-start!important;margin-bottom:15px!important}
      #today.rtv2 .rc-greeting{position:relative;padding-right:116px;min-height:74px}
      #today.rtv2 .rc-greeting h1{
        margin:5px 0 2px!important;
        font-size:33px!important;
        line-height:1.02!important;
        letter-spacing:-.047em!important;
        font-weight:720!important;
        color:var(--rv2-text)!important;
      }
      #today.rtv2 .rc-greeting p{font-size:12px!important;color:#85909a!important}
      #today.rtv2 .rv2-mantra{
        position:absolute;right:0;top:5px;width:98px;font-size:10px;line-height:1.35;color:#84908f;font-weight:520;
      }
      #today.rtv2 .rv2-mantra:after{content:'';display:inline-block;width:28px;height:1px;margin-left:7px;vertical-align:middle;background:#9da7a5}
      #today.rtv2 .rpr-day-promise,#today.rtv2 .rpr-precision{display:none!important}

      #today.rtv2 .rc-action{
        min-height:292px!important;
        margin-top:10px!important;
        padding:22px 18px 18px!important;
        border-radius:29px!important;
        border:1px solid rgba(255,255,255,.86)!important;
        background:
          linear-gradient(90deg,rgba(243,248,247,.98) 0%,rgba(243,248,247,.92) 43%,rgba(243,248,247,.22) 72%),
          linear-gradient(180deg,rgba(255,255,255,.10),rgba(198,221,215,.24)),
          var(--rv2-hero-image)!important;
        background-size:cover!important;
        background-position:center!important;
        box-shadow:0 22px 52px rgba(34,57,49,.13),inset 0 1px 0 rgba(255,255,255,.92)!important;
        overflow:hidden!important;
      }
      #today.rtv2 .rc-action:before{
        content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0) 40%,rgba(235,244,241,.16));
      }
      #today.rtv2 .rc-action>*{position:relative;z-index:2}
      #today.rtv2 .rc-action-kicker{font-size:0!important;margin-bottom:9px!important;color:#78868a!important}
      #today.rtv2 .rc-action-kicker svg{display:none!important}
      #today.rtv2 .rc-action-kicker:after{content:'НА СЕГОДНЯ';font-size:10px;letter-spacing:.16em;font-weight:600;color:#7c8990}
      #today.rtv2 .rc-action h2{
        max-width:230px!important;margin:0 0 8px!important;font-size:38px!important;line-height:.96!important;letter-spacing:-.052em!important;font-weight:760!important;color:var(--rv2-text)!important;
      }
      #today.rtv2 .rc-action>p{display:block!important;max-width:218px!important;margin:0!important;font-size:13px!important;line-height:1.35!important;color:#71808a!important}
      #today.rtv2 .rc-effort{
        display:inline-flex!important;margin-top:15px!important;padding:0!important;background:transparent!important;font-size:11px!important;color:#294b41!important;font-weight:600!important
      }
      #today.rtv2 .rc-action-buttons{max-width:320px!important;grid-template-columns:1.08fr .92fr!important;gap:8px!important;margin-top:14px!important}
      #today.rtv2 .rc-action-buttons button{height:48px!important;border-radius:999px!important;font-size:11.5px!important}
      #today.rtv2 .rc-done{background:linear-gradient(135deg,#1f8c63,#07583a)!important;box-shadow:0 10px 22px rgba(11,94,62,.18)!important}
      #today.rtv2 .rc-alt{background:rgba(255,255,255,.72)!important;border:1px solid rgba(255,255,255,.92)!important;color:#233038!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}
      #today.rtv2 .rc-not-fit{color:#60716f!important}
      #today.rtv2 .rtv2-why-toggle{
        display:inline-flex!important;align-items:center!important;margin-top:10px!important;padding:0!important;border:0!important;background:transparent!important;color:#255f50!important;font-size:10.5px!important;font-weight:600!important;text-decoration:underline;text-underline-offset:3px
      }
      #today.rtv2 .rtv2-why-toggle:after{content:'→';font-size:14px;margin-left:7px;transform:none!important}
      #today.rtv2 .rc-action>.rpr-why{background:rgba(255,255,255,.68)!important;border-radius:16px!important;padding:10px!important;border:1px solid rgba(255,255,255,.76)!important}
      #today.rtv2 .rv2-hero-note{
        position:absolute;right:17px;top:18px;width:75px;font-size:8px;line-height:1.4;letter-spacing:.19em;color:rgba(54,74,70,.55);text-transform:uppercase;text-align:right;z-index:2
      }

      #today.rtv2 #rcCheckin.rpr-checkin-compact{margin-top:11px!important}
      #today.rtv2 #rcCheckin.rpr-checkin-compact .rc-checkin{
        min-height:54px!important;padding:0 14px!important;border-radius:20px!important;background:rgba(255,255,255,.70)!important;box-shadow:inset 0 0 0 1px rgba(42,61,55,.05),var(--rv2-shadow-soft)!important
      }
      #today.rtv2 .rtv2-checkin-summary{min-height:54px!important;padding:0!important}
      #today.rtv2 .rtv2-checkin-summary:before{content:'▥';width:30px;height:30px;margin-right:9px;border-radius:50%;display:grid;place-items:center;background:#e1f4eb;color:#1d7855;font-size:13px}
      #today.rtv2 .rtv2-checkin-summary span{flex:1;font-size:11.5px!important;color:#394751!important}
      #today.rtv2 .rtv2-checkin-summary button{font-size:10.5px!important;color:#25614f!important}

      #today.rtv2 .rc-section{margin:18px 2px 9px!important}
      #today.rtv2 .rc-section h2{font-size:17px!important;letter-spacing:-.02em!important;font-weight:690!important}
      #today.rtv2 .rtv2-add-section h2:after,#today.rtv2 .rtv2-metrics-section h2:after,#today.rtv2 .rtv2-timeline-section h2:after{font-size:17px!important;font-weight:690!important;color:var(--rv2-text)!important}

      #today.rtv2 .rc-quick{gap:8px!important}
      #today.rtv2 .rc-quick button{
        height:76px!important;border-radius:19px!important;background:rgba(255,255,255,.58)!important;border:1px solid rgba(255,255,255,.74)!important;box-shadow:inset 0 0 0 1px rgba(33,52,46,.05),0 8px 20px rgba(42,62,55,.055)!important;color:#24323d!important;font-size:10.5px!important;font-weight:540!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important
      }
      #today.rtv2 .rc-quick svg{width:22px!important;height:22px!important;stroke:#1e2e3e!important;stroke-width:1.6!important}

      #today.rtv2 #rcMetrics{margin-top:2px!important}
      #today.rtv2 .rtv2-metrics-summary{
        padding:12px 10px!important;border-radius:19px!important;background:rgba(255,255,255,.58)!important;border:1px solid rgba(255,255,255,.75)!important;box-shadow:inset 0 0 0 1px rgba(37,57,50,.05),var(--rv2-shadow-soft)!important
      }
      #today.rtv2 .rtv2-metrics-copy{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:0!important;width:100%!important;font-size:0!important;color:var(--rv2-text)!important}
      #today.rtv2 .rv2-metric-chip{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;padding:0 7px;border-right:1px solid rgba(36,52,47,.09);font-size:10px;color:#75808a;text-align:center}
      #today.rtv2 .rv2-metric-chip:last-child{border-right:0}
      #today.rtv2 .rv2-metric-chip b,#today.rtv2 .rv2-metric-chip strong{display:block;font-size:13.5px;color:var(--rv2-text)!important;font-weight:670;white-space:nowrap}
      #today.rtv2 .rtv2-metrics-summary>button{display:none!important}

      #today.rtv2 .rtv2-timeline-section{margin-bottom:8px!important}
      #today.rtv2 .rc-timeline{position:relative;gap:6px!important;padding-left:18px}
      #today.rtv2 .rc-timeline:before{content:'';position:absolute;left:6px;top:13px;bottom:13px;width:1px;background:rgba(54,77,68,.10)}
      #today.rtv2 .rc-event{
        min-height:48px!important;padding:10px 34px 10px 12px!important;border-radius:16px!important;background:rgba(255,255,255,.52)!important;border:1px solid rgba(255,255,255,.70)!important;box-shadow:0 5px 14px rgba(42,61,54,.035)!important
      }
      #today.rtv2 .rc-event:before{content:'';position:absolute;left:-17px;top:18px;width:8px;height:8px;border-radius:50%;background:#69c78f;box-shadow:0 0 0 4px rgba(105,199,143,.09)}
      #today.rtv2 .rc-event:nth-child(2):before{background:#9fc3ff;box-shadow:0 0 0 4px rgba(159,195,255,.09)}
      #today.rtv2 .rc-event small{font-size:8.5px!important;color:#929ba3!important}
      #today.rtv2 .rc-event b{font-size:11.5px!important;font-weight:590!important}
      #today.rtv2 .rc-event p{font-size:9.5px!important;color:#7c8790!important}
      #today.rtv2 .rtv2-timeline-more{color:#2a6956!important}

      #today.rtv2 .rtv2-evening{
        position:relative;margin-top:17px!important;padding:15px 15px 15px 76px!important;min-height:88px;border-radius:22px!important;background:linear-gradient(100deg,rgba(224,247,237,.85),rgba(255,255,255,.70))!important;border:1px solid rgba(255,255,255,.82)!important;box-shadow:inset 0 0 0 1px rgba(32,69,56,.04),0 10px 25px rgba(36,58,50,.07)!important;overflow:hidden
      }
      #today.rtv2 .rtv2-evening:before{
        content:'';position:absolute;left:17px;top:16px;width:48px;height:48px;border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.98),rgba(154,239,203,.58) 30%,rgba(55,184,132,.20) 62%,rgba(255,255,255,.30) 100%);box-shadow:0 0 28px rgba(64,193,140,.22),inset 0 0 12px rgba(255,255,255,.9)
      }
      #today.rtv2 .rtv2-evening b{font-size:14.5px!important;font-weight:700!important;color:var(--rv2-text)!important}
      #today.rtv2 .rtv2-evening p{max-width:190px!important;font-size:9.8px!important;color:#77838d!important}
      #today.rtv2 .rtv2-evening button{position:absolute!important;right:12px!important;top:20px!important;width:auto!important;min-width:125px!important;height:45px!important;margin:0!important;padding:0 16px!important;border-radius:999px!important;background:linear-gradient(135deg,#1d8b63,#07563a)!important;font-size:10.5px!important}

      /* Whole-app visual language */
      #onboarding,#actions,#progress,#profile{background:transparent!important;color:var(--rv2-text)!important}
      #onboarding.rinlo-core-onboarding,#actions.rinlo-plan-v01,#profile,#progress{font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",sans-serif!important}
      #onboarding .rc-on-screen h1,#actions h1,#progress h1,#profile h1{color:var(--rv2-text)!important;font-weight:710!important;letter-spacing:-.042em!important}
      #onboarding .rc-goal,#onboarding .rc-card,#actions .item,#actions .rp-week-card,#actions .rp-insight,#progress .card,#progress .stat,#profile .card,#profile .profileRow{
        background:rgba(255,255,255,.62)!important;border:1px solid rgba(255,255,255,.76)!important;box-shadow:inset 0 0 0 1px rgba(31,52,45,.05),var(--rv2-shadow-soft)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important
      }
      #onboarding .rc-goal.sel{background:rgba(223,246,236,.76)!important;border-color:rgba(58,145,107,.18)!important}
      #actions.rinlo-plan-v01 #actionHero{border-radius:28px!important;box-shadow:0 18px 45px rgba(26,47,41,.12)!important}
      #progress .chart{background:rgba(255,255,255,.60)!important}

      @media(max-width:370px){
        #today.rtv2 .rc-greeting{padding-right:94px}
        #today.rtv2 .rv2-mantra{width:82px;font-size:9px}
        #today.rtv2 .rc-action{min-height:278px!important;padding:20px 15px 16px!important}
        #today.rtv2 .rc-action h2{font-size:34px!important;max-width:210px!important}
        #today.rtv2 .rc-action>p{max-width:195px!important}
        #today.rtv2 .rtv2-evening{padding-left:68px!important}
        #today.rtv2 .rtv2-evening button{min-width:112px!important;padding:0 12px!important}
      }
    `;
  }

  function parseMetrics(doc) {
    const copy = doc.querySelector('#today .rtv2-metrics-copy');
    if (!copy || copy.dataset.rv2Metrics === '1') return;
    const raw = copy.textContent.replace(/\s+/g, ' ').trim();
    if (!raw) return;
    const parts = raw.split('·').map(s => s.trim()).filter(Boolean).slice(0, 4);
    if (parts.length < 2) return;
    copy.innerHTML = parts.map((part, i) => {
      const match = part.match(/^(калории|белок|вода|шаги)?\s*(.*)$/i);
      const label = match?.[1] || (i === 0 ? 'Калории' : '');
      const value = match?.[2] || part;
      return `<span class="rv2-metric-chip">${label ? `<small>${label}</small>` : ''}<b>${value}</b></span>`;
    }).join('');
    copy.dataset.rv2Metrics = '1';
  }

  function decorateToday(doc) {
    const today = doc.getElementById('today');
    if (!today) return;
    today.style.setProperty('--rv2-hero-image', `url("${HERO_IMAGE}")`);

    const greeting = today.querySelector('.rc-greeting');
    if (greeting && !greeting.querySelector('.rv2-mantra')) {
      const mantra = doc.createElement('div');
      mantra.className = 'rv2-mantra';
      mantra.textContent = 'Маленькие шаги меняют большое завтра';
      greeting.appendChild(mantra);
    }

    const action = today.querySelector('#rcAction .rc-action');
    if (action && !action.querySelector('.rv2-hero-note')) {
      const note = doc.createElement('div');
      note.className = 'rv2-hero-note';
      note.textContent = 'больше чем забота о себе';
      action.appendChild(note);
    }

    parseMetrics(doc);
  }

  function apply() {
    const doc = frame.contentDocument;
    if (!doc?.head || !doc.body) return;
    ensureStyles(doc);
    doc.documentElement.dataset.rinloVisual = VERSION;
    doc.body.dataset.rinloVisual = VERSION;
    decorateToday(doc);
    window.__rinloVisualSystemV2 = VERSION;
  }

  function schedule(delay = 24) {
    clearTimeout(timer);
    timer = setTimeout(apply, delay);
  }

  function install() {
    const doc = frame.contentDocument;
    if (!doc?.documentElement) return;
    apply();
    observer?.disconnect();
    observer = new MutationObserver(() => schedule(36));
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }

  frame.addEventListener('load', () => {
    setTimeout(install, 0);
    setTimeout(install, 180);
  });
  setTimeout(install, 0);
  setTimeout(install, 220);
})();