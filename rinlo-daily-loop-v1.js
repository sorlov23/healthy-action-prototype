(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const KEY = 'healthy-action-v07';
  const VERSION = 'v1';
  let mountedDocument = null;
  let decorateTimer = null;

  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  function readDb(win) {
    try { return JSON.parse(win.localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }

  function activeAction(day) {
    const actions = day?.rinloActions || [];
    return actions.find((action) => ['suggested','accepted'].includes(action.status))
      || actions.find((action) => action.status === 'completed')
      || null;
  }

  function adaptationCopy(adaptation) {
    if (!adaptation || adaptation.source !== 'evening_review') return '';
    if (adaptation.avoidedPreviousKind && adaptation.effortReduced) {
      return 'Учли вчера: сегодня короче и без повтора неудачного шага.';
    }
    if (adaptation.easedAfterSkip) {
      return 'Учли вчера: сегодня начинаем с более короткого шага.';
    }
    if (adaptation.effortReduced) {
      return 'Учли вчера: сегодня шаг короче.';
    }
    if (adaptation.avoidedPreviousKind) {
      return 'Учли вчера: сегодня другой тип шага.';
    }
    if (adaptation.repeatedHelpfulKind) {
      return 'Учли вчера: оставили формат, который тебе подошёл.';
    }
    return '';
  }

  function nextDayCopy(review) {
    if (!review?.planFit || !review?.actionUseful) return 'Итог сохранён. Завтра будет новый шаг.';
    if (review.planFit === 'too_much' && review.actionUseful === 'no') {
      return 'Итог сохранён. Завтра начнём короче и не повторим этот тип шага.';
    }
    if (review.actionUseful === 'skipped') {
      return 'Итог сохранён. Завтра сделаем первый шаг короче.';
    }
    if (review.planFit === 'too_much') {
      return 'Итог сохранён. Завтра начнём с более короткого шага.';
    }
    if (review.actionUseful === 'no') {
      return 'Итог сохранён. Завтра попробуем другой тип шага.';
    }
    if (review.actionUseful === 'yes') {
      return 'Итог сохранён. Завтра учтём, что этот формат тебе подошёл.';
    }
    return 'Итог сохранён. Завтра будет новый шаг.';
  }

  function installStyles(doc) {
    if (doc.getElementById('rinlo-daily-loop-v1-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-daily-loop-v1-style';
    style.textContent = `
      .rdl-adaptation{position:relative;z-index:1;margin-top:12px;padding:9px 10px;border:1px solid rgba(210,231,221,.18);border-radius:12px;background:rgba(235,247,241,.08);font-size:9.5px;line-height:1.4;color:#C6DED2}
      .rdl-plan-adaptation{margin-top:12px;padding:10px 11px;border-radius:13px;background:#EEF5F1;color:#456657;font-size:9.5px;line-height:1.42}
    `;
    doc.head.appendChild(style);
  }

  function upsertNote(doc, host, selector, className, text, beforeSelector = null) {
    host?.querySelector(selector)?.remove();
    if (!host || !text) return;
    const note = doc.createElement('div');
    note.className = className;
    note.dataset.rinloDailyLoop = 'adaptation';
    note.textContent = text;
    const before = beforeSelector ? host.querySelector(beforeSelector) : null;
    if (before) host.insertBefore(note, before);
    else host.appendChild(note);
  }

  function decorate() {
    decorateTimer = null;
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.body || !win || win.__rinloProductUi !== 'v3') return;

    installStyles(doc);
    const db = readDb(win);
    const dayKey = win.__haViewDay || localDayKey();
    const day = db.days?.[dayKey] || {};
    const action = activeAction(day);
    const adaptation = action?.context?.adaptation || null;
    const summary = action?.status === 'completed' ? '' : adaptationCopy(adaptation);

    const todayAction = doc.querySelector('#today .r3-action');
    upsertNote(
      doc,
      todayAction,
      '[data-rinlo-daily-loop="adaptation"]',
      'rdl-adaptation',
      summary,
      '.r3-action-buttons, .r3-why, .r3-feedback'
    );

    const planHero = doc.querySelector('#actions .r3-plan-hero');
    upsertNote(
      doc,
      planHero,
      '[data-rinlo-daily-loop="adaptation"]',
      'rdl-plan-adaptation',
      adaptationCopy(adaptation)
    );

    const eveningText = doc.querySelector('#today .r3-soft-copy span');
    if (eveningText && day.closed && day.rinloEveningReview) {
      eveningText.textContent = nextDayCopy(day.rinloEveningReview);
      eveningText.dataset.testid = 'daily-loop-next-day';
    }
  }

  function scheduleDecorate() {
    if (decorateTimer) clearTimeout(decorateTimer);
    decorateTimer = setTimeout(decorate, 0);
  }

  function wrap(win, name) {
    const original = win[name];
    if (typeof original !== 'function' || original.__rinloDailyLoopWrapped) return;
    const wrapped = function(...args) {
      const result = original.apply(this, args);
      if (result && typeof result.then === 'function') {
        result.finally(scheduleDecorate);
      } else {
        scheduleDecorate();
      }
      return result;
    };
    wrapped.__rinloDailyLoopWrapped = true;
    win[name] = wrapped;
  }

  function install(attempt = 0) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.body || !win || win.__rinloProductUi !== 'v3') {
      if (attempt < 120) setTimeout(() => install(attempt + 1), 50);
      return;
    }

    if (mountedDocument !== doc) {
      mountedDocument = doc;
      installStyles(doc);
    }

    [
      'render',
      'renderToday',
      'rinloProductGo',
      'rinloProductCheckin',
      'rinloProductSkipCheckin',
      'rinloCoreCompleteAction',
      'rinloCoreReplaceAction',
      'rinloCoreActionFeedback',
      'rinloEveningReviewSave',
    ].forEach((name) => wrap(win, name));

    win.__rinloDailyLoop = VERSION;
    window.RinloDailyLoop = {
      version: VERSION,
      adaptationCopy,
      nextDayCopy,
      refresh: scheduleDecorate,
    };
    scheduleDecorate();
  }

  frame.addEventListener('load', () => setTimeout(() => install(), 0));
  setTimeout(() => install(), 0);
  setTimeout(() => install(), 300);
})();
