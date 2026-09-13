(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const APP_KEY = 'healthy-action-v07';
  const VERSION = 'v1';
  let observer = null;
  let timer = null;

  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const readDb = () => {
    try { return JSON.parse(localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  };
  const currentDayState = (win) => {
    const key = win.__haViewDay || localDayKey();
    const db = readDb();
    return { key, day: db.days?.[key] || {} };
  };
  const text = (node) => String(node?.textContent || '').replace(/\s+/g, ' ').trim();

  function ensureStyles(doc) {
    if (doc.getElementById('rinlo-today-v2-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-today-v2-style';
    style.textContent = `
      #today.rtv2{padding-top:max(18px,env(safe-area-inset-top))!important}
      #today.rtv2 .rc-today-top{margin-bottom:14px}
      #today.rtv2 .rc-greeting{margin-bottom:2px}
      #today.rtv2 .rc-greeting h1{font-size:28px!important}
      #today.rtv2 .rpr-day-promise,#today.rtv2 .rpr-precision{display:none!important}

      #today.rtv2 .rc-action{margin-top:12px!important;padding:18px 17px 17px;border-radius:24px;box-shadow:0 10px 30px rgba(38,88,65,.045)!important}
      #today.rtv2 .rc-action-kicker{font-size:0!important;margin-bottom:9px!important}
      #today.rtv2 .rc-action-kicker svg{display:none!important}
      #today.rtv2 .rc-action-kicker::after{content:'НА СЕГОДНЯ';font-size:9.5px;font-weight:650;letter-spacing:.055em;color:#1D7852}
      #today.rtv2 .rc-action h2{font-size:25px!important;margin-bottom:7px!important}
      #today.rtv2 .rc-action>p,#today.rtv2 .rc-action>.rpr-why{display:none!important}
      #today.rtv2 .rc-action.rtv2-why-open>p{display:block!important;margin-top:5px!important}
      #today.rtv2 .rc-action.rtv2-why-open>.rpr-why{display:block!important;margin-top:12px!important}
      #today.rtv2 .rtv2-why-toggle{display:inline-flex;align-items:center;margin-top:11px;padding:0;border:0;background:transparent;color:#37755d;font-size:10.5px;font-weight:650}
      #today.rtv2 .rtv2-why-toggle::after{content:'›';font-size:16px;line-height:1;margin-left:4px;transform:rotate(90deg);transition:transform .18s ease}
      #today.rtv2 .rc-action.rtv2-why-open .rtv2-why-toggle::after{transform:rotate(-90deg)}

      #today.rtv2 .rpr-checkin-compact{padding:0!important;border:0!important;background:transparent!important;margin-top:10px!important}
      #today.rtv2 .rpr-checkin-compact>.rc-checkin-head,#today.rtv2 .rpr-checkin-compact>.rc-moods,#today.rtv2 .rpr-checkin-compact>.rc-checkin-note{display:none!important}
      #today.rtv2 .rpr-checkin-compact.rtv2-checkin-open>.rc-checkin-head{display:flex!important}
      #today.rtv2 .rpr-checkin-compact.rtv2-checkin-open>.rc-moods{display:grid!important;margin-top:9px}
      #today.rtv2 .rpr-checkin-compact.rtv2-checkin-open>.rc-checkin-note{display:block!important}
      #today.rtv2 .rtv2-checkin-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:0 2px;color:#65716d}
      #today.rtv2 .rtv2-checkin-summary span{font-size:11px;line-height:1.35}
      #today.rtv2 .rtv2-checkin-summary b{color:#283b34;font-weight:650}
      #today.rtv2 .rtv2-checkin-summary button{border:0;background:transparent;color:#2f7a5b;font-size:10.5px;font-weight:650;padding:8px 0}

      #today.rtv2 .rc-section.rtv2-add-section{margin-top:18px;margin-bottom:9px}
      #today.rtv2 .rtv2-add-section h2{font-size:0!important}
      #today.rtv2 .rtv2-add-section h2::after{content:'Добавить';font-size:15px;font-weight:650;color:#111B18}
      #today.rtv2 .rtv2-add-section span{display:none!important}
      #today.rtv2 .rc-quick{margin-bottom:2px}

      #today.rtv2 #rcMetrics{margin-top:4px}
      #today.rtv2 .rtv2-metrics-section{margin-top:18px;margin-bottom:9px}
      #today.rtv2 .rtv2-metrics-section h2{font-size:0!important}
      #today.rtv2 .rtv2-metrics-section h2::after{content:'Ориентиры';font-size:15px;font-weight:650;color:#111B18}
      #today.rtv2 .rtv2-metrics-section span{display:none!important}
      #today.rtv2 .rtv2-metrics-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border:1px solid #E5EBE8;border-radius:17px;background:#fff}
      #today.rtv2 .rtv2-metrics-copy{min-width:0;font-size:10.5px;line-height:1.45;color:#67736f}
      #today.rtv2 .rtv2-metrics-copy b{color:#20362d;font-weight:650}
      #today.rtv2 .rtv2-metrics-summary button{flex:0 0 auto;border:0;background:transparent;color:#2f7a5b;font-size:10.5px;font-weight:650;padding:8px 0}
      #today.rtv2 #rcMetrics:not(.rtv2-open)>.rc-calories,#today.rtv2 #rcMetrics:not(.rtv2-open)>.rc-mini-grid{display:none!important}
      #today.rtv2 #rcMetrics.rtv2-open .rtv2-metrics-summary{margin-bottom:8px}

      #today.rtv2 .rtv2-timeline-section h2{font-size:0!important}
      #today.rtv2 .rtv2-timeline-section h2::after{content:'За сегодня';font-size:15px;font-weight:650;color:#111B18}
      #today.rtv2 .rtv2-extra-event{display:none!important}
      #today.rtv2 .rc-timeline.rtv2-all .rtv2-extra-event{display:block!important}
      #today.rtv2 .rtv2-timeline-more{width:100%;height:38px;margin-top:7px;border:0;background:transparent;color:#2f7a5b;font-size:10.5px;font-weight:650}

      #today.rtv2 .rtv2-evening{margin-top:18px;padding:16px;border:1px solid #DDE8E3;border-radius:20px;background:#F7FAF8}
      #today.rtv2 .rtv2-evening b{display:block;font-size:13px;color:#23382f}
      #today.rtv2 .rtv2-evening p{margin:5px 0 0;font-size:10.8px;line-height:1.45;color:#75817c}
      #today.rtv2 .rtv2-evening button{width:100%;height:43px;margin-top:12px;border:0;border-radius:13px;background:#17231f;color:#fff;font-size:11px;font-weight:650}
      #today.rtv2 .rtv2-evening.done{background:#F4F8F6}
      #today.rtv2 .rtv2-evening.done b{color:#557067}

      #today.rtv2 .rc-action.rtv2-finished{background:#F5F8F6;border-color:#E1E8E4}
      #today.rtv2 .rc-action.rtv2-finished .rc-action-kicker::after{content:'✓ На сегодня главное сделано';font-size:11px;letter-spacing:0;text-transform:none;color:#557067}
      #today.rtv2 .rc-action.rtv2-finished h2,#today.rtv2 .rc-action.rtv2-finished .rc-effort,#today.rtv2 .rc-action.rtv2-finished .rc-feedback,#today.rtv2 .rc-action.rtv2-finished .rtv2-why-toggle{display:none!important}
      #today.rtv2 .rtv2-finished-copy{font-size:12px;line-height:1.45;color:#6f7b76}
      #today.rtv2 .rtv2-more-action{margin-top:10px;border:0;background:transparent;color:#2f7a5b;font-size:10.5px;font-weight:650;padding:5px 0}
      @media(max-width:360px){#today.rtv2 .rc-action h2{font-size:23px!important}.rtv2-metrics-summary{padding:12px!important}}
    `;
    doc.head.appendChild(style);
  }

  function enhanceAction(doc, win, day) {
    const card = doc.querySelector('#rcAction .rc-action');
    if (!card) return;
    const active = (day.rinloActions || []).find((x) => ['suggested', 'accepted'].includes(x.status));
    const completed = (day.rinloActions || []).find((x) => x.status === 'completed');
    const reviewed = !active && Boolean(completed?.feedback && typeof completed.feedback.useful === 'boolean');
    const closed = Boolean(day.rinloEveningReview || day.closed);

    if (!reviewed && !card.querySelector('.rtv2-why-toggle') && card.querySelector('p')) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'rtv2-why-toggle';
      btn.textContent = 'Почему этот шаг?';
      btn.onclick = () => card.classList.toggle('rtv2-why-open');
      const effort = card.querySelector('.rc-effort');
      (effort || card.querySelector('p')).insertAdjacentElement('afterend', btn);
    }

    if (completed && !active && reviewed) {
      card.classList.add('rtv2-finished');
      if (!card.querySelector('.rtv2-finished-copy')) {
        const copy = doc.createElement('div');
        copy.className = 'rtv2-finished-copy';
        copy.textContent = 'Дальше можно просто продолжать день.';
        card.querySelector('.rc-action-kicker')?.insertAdjacentElement('afterend', copy);
      }
      if (!closed && !card.querySelector('.rtv2-more-action')) {
        const more = doc.createElement('button');
        more.type = 'button';
        more.className = 'rtv2-more-action';
        more.textContent = 'Хочу ещё один шаг';
        more.onclick = () => win.rinloCoreSkipCheckin?.();
        card.appendChild(more);
      }
    }
  }

  function enhanceCheckin(doc, day) {
    const checkin = doc.querySelector('#rcCheckin .rc-checkin');
    if (!checkin || !day.rinloCheckin || !checkin.classList.contains('rpr-checkin-compact')) return;
    if (checkin.querySelector('.rtv2-checkin-summary')) return;
    const selected = text(checkin.querySelector('.rc-mood.sel')) || 'Отмечено';
    const energy = Number(day.rinloCheckin.energy);
    const sleepMinutes = Number(day.rinloCheckin.sleepMinutes);
    let detail = '';
    if (Number.isFinite(energy) && energy > 0) detail = ` · энергия ${energy}/5`;
    else if (Number.isFinite(sleepMinutes) && sleepMinutes > 0) detail = ` · сон ${Math.round(sleepMinutes / 6) / 10} ч`;

    const summary = doc.createElement('div');
    summary.className = 'rtv2-checkin-summary';
    summary.innerHTML = `<span>Сегодня: <b>${selected}</b>${detail}</span><button type="button">Изменить</button>`;
    summary.querySelector('button').onclick = () => {
      checkin.classList.toggle('rtv2-checkin-open');
      summary.querySelector('button').textContent = checkin.classList.contains('rtv2-checkin-open') ? 'Свернуть' : 'Изменить';
    };
    checkin.insertBefore(summary, checkin.firstChild);
  }

  function reorderQuickActions(doc) {
    const metrics = doc.getElementById('rcMetrics');
    const quick = doc.querySelector('#today .rc-quick');
    const section = quick?.previousElementSibling;
    if (!metrics || !quick || !section?.classList.contains('rc-section')) return;
    section.classList.add('rtv2-add-section');
    if (quick.nextElementSibling !== metrics) {
      metrics.parentNode.insertBefore(section, metrics);
      metrics.parentNode.insertBefore(quick, metrics);
    }
  }

  function enhanceMetrics(doc) {
    const metrics = doc.getElementById('rcMetrics');
    if (!metrics || metrics.style.display === 'none') return;
    const section = metrics.querySelector(':scope > .rc-section');
    section?.classList.add('rtv2-metrics-section');
    if (metrics.querySelector('.rtv2-metrics-summary')) return;

    const values = {};
    const calories = text(metrics.querySelector('.rc-cal-top b'));
    if (calories) values.calories = `${calories} ккал`;
    metrics.querySelectorAll('.rc-mini').forEach((item) => {
      const label = text(item.querySelector('small')).toLowerCase();
      const value = text(item.querySelector('b'));
      if (label && value) values[label] = value;
    });
    const parts = [];
    if (values.calories) parts.push(`<b>${values.calories}</b>`);
    if (values['белок']) parts.push(`белок ${values['белок']}`);
    if (values['вода']) parts.push(`вода ${values['вода']}`);
    if (values['шаги']) parts.push(`шаги ${values['шаги']}`);
    if (!parts.length) return;

    const summary = doc.createElement('div');
    summary.className = 'rtv2-metrics-summary';
    summary.innerHTML = `<div class="rtv2-metrics-copy">${parts.join(' · ')}</div><button type="button">Подробнее</button>`;
    summary.querySelector('button').onclick = () => {
      metrics.classList.toggle('rtv2-open');
      summary.querySelector('button').textContent = metrics.classList.contains('rtv2-open') ? 'Свернуть' : 'Подробнее';
    };
    (section || metrics).insertAdjacentElement(section ? 'afterend' : 'afterbegin', summary);
  }

  function enhanceTimeline(doc) {
    const timeline = doc.getElementById('rcTimeline');
    if (!timeline) return;
    const section = timeline.previousElementSibling;
    section?.classList.add('rtv2-timeline-section');
    const events = Array.from(timeline.querySelectorAll('.rc-event'));
    events.forEach((event, index) => event.classList.toggle('rtv2-extra-event', index >= 3));

    let toggle = timeline.nextElementSibling?.classList.contains('rtv2-timeline-more') ? timeline.nextElementSibling : null;
    if (events.length <= 3) {
      toggle?.remove();
      return;
    }
    if (!toggle) {
      toggle = doc.createElement('button');
      toggle.type = 'button';
      toggle.className = 'rtv2-timeline-more';
      timeline.insertAdjacentElement('afterend', toggle);
      toggle.onclick = () => {
        timeline.classList.toggle('rtv2-all');
        toggle.textContent = timeline.classList.contains('rtv2-all') ? 'Свернуть' : 'Все записи →';
      };
    }
    toggle.textContent = timeline.classList.contains('rtv2-all') ? 'Свернуть' : 'Все записи →';
  }

  function enhanceEvening(doc, win, key, day) {
    const today = doc.getElementById('today');
    const timeline = doc.getElementById('rcTimeline');
    if (!today || !timeline) return;
    const hasReview = Boolean(day.rinloEveningReview || day.closed);
    const completed = (day.rinloActions || []).some((x) => x.status === 'completed');
    const shouldShow = key === localDayKey() && (hasReview || completed || new Date().getHours() >= 18);
    let card = today.querySelector('.rtv2-evening');
    if (!shouldShow) { card?.remove(); return; }

    if (!card) {
      card = doc.createElement('div');
      card.className = 'rtv2-evening';
      const after = timeline.nextElementSibling?.classList.contains('rtv2-timeline-more') ? timeline.nextElementSibling : timeline;
      after.insertAdjacentElement('afterend', card);
    }
    card.classList.toggle('done', hasReview);
    if (hasReview) {
      card.innerHTML = '<b>✓ Итог дня сохранён</b><p>На сегодня всё. Завтра начнём с нового небольшого шага.</p>';
    } else if (!card.querySelector('button')) {
      card.innerHTML = '<b>Как прошёл день?</b><p>Пара вопросов — и закончим на сегодня.</p><button type="button">Подвести итог</button>';
      card.querySelector('button').onclick = () => win.finishDay?.();
    }
  }

  function enhanceToday() {
    timer = null;
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    const today = doc?.getElementById('today');
    if (!win || !doc || !today) return;
    ensureStyles(doc);
    today.classList.add('rtv2');
    const { key, day } = currentDayState(win);
    enhanceAction(doc, win, day);
    enhanceCheckin(doc, day);
    reorderQuickActions(doc);
    enhanceMetrics(doc);
    enhanceTimeline(doc);
    enhanceEvening(doc, win, key, day);
    win.__rinloTodayV2 = VERSION;
  }

  function schedule() {
    if (timer) return;
    timer = setTimeout(enhanceToday, 70);
  }

  function install(attempt = 0) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win || !doc.getElementById('today')) {
      if (attempt < 80) setTimeout(() => install(attempt + 1), 75);
      return;
    }
    observer?.disconnect();
    observer = new MutationObserver(schedule);
    observer.observe(doc.documentElement, { childList: true, subtree: true });
    schedule();
    setTimeout(enhanceToday, 220);
    setTimeout(enhanceToday, 700);
  }

  frame.addEventListener('load', () => setTimeout(() => install(), 0));
  setTimeout(() => install(), 0);
  setTimeout(() => install(), 350);
})();
