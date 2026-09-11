(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const icons = {
    user: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.8 19.2c.7-3.3 2.8-5 6.2-5s5.5 1.7 6.2 5"/></svg>`,
    target: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.3"/><path d="M16.8 7.2 12 12"/></svg>`,
    focus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14M5 15.5h14"/><circle cx="9" cy="8.5" r="2"/><circle cx="15" cy="15.5" r="2"/></svg>`,
    sliders: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5h9m4 0h2M4.5 16.5h2m4 0h9"/><circle cx="15.5" cy="7.5" r="2"/><circle cx="8.5" cy="16.5" r="2"/></svg>`,
    data: `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>`,
    demo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6M10 4v5l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V4"/><path d="M8.5 15h7"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 7.5h13M9 4.5h6l1 3H8l1-3ZM8 10v7m4-7v7m4-7v7M7 7.5l.8 11a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4l.8-11"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5.5-5 5.5"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`
  };

  const readDb = win => {
    try { return JSON.parse(win.localStorage.getItem('healthy-action-v07') || '{}'); }
    catch { return {}; }
  };

  const habitLabel = h => h === 'vape' ? 'Без вейпа / сигарет' : h === 'fastfood' ? 'Меньше фастфуда' : h === 'water' ? 'Пить больше воды' : h;
  const activityLabel = v => v === 'high' ? 'Высокая' : v === 'medium' ? 'Средняя' : 'Низкая';

  function ensureStyles(doc) {
    doc.getElementById('rinlo-profile-v01-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-profile-v01-style';
    style.textContent = `
      #profile.rinlo-profile-v01{
        min-height:100vh!important;
        padding:max(16px,env(safe-area-inset-top)) 18px calc(104px + env(safe-area-inset-bottom))!important;
        background:radial-gradient(circle at 106% 0%,rgba(154,185,172,.12),transparent 29%),linear-gradient(180deg,#F8FAF9 0%,#F4F7F5 100%)!important;
        color:#172027;
        font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important;
      }
      #profile.rinlo-profile-v01 .rpf-top{display:flex;align-items:center;justify-content:space-between;min-height:32px;margin-bottom:16px}
      #profile.rinlo-profile-v01 .rinlo-wordmark{position:relative;display:inline-block;padding-right:8px;font-size:26px;font-weight:600;line-height:1;letter-spacing:-.045em;color:#0F1720}
      #profile.rinlo-profile-v01 .rinlo-wordmark-dot{position:absolute;width:6px;height:6px;right:0;top:6px;border-radius:50%;background:#2E7D64}
      #profile.rinlo-profile-v01 .rpf-kicker{font-size:10px;font-weight:600;color:#7C888B;letter-spacing:.01em}
      #profile.rinlo-profile-v01 .rpf-heading{margin-bottom:12px}
      #profile.rinlo-profile-v01 .rpf-heading h1{margin:0 0 5px!important;font-size:24px!important;line-height:1.13!important;font-weight:600!important;letter-spacing:-.035em!important;color:#172027!important}
      #profile.rinlo-profile-v01 .rpf-heading .sub{max-width:332px;font-size:12.5px!important;line-height:1.43!important;color:#68757A!important}

      #profile.rinlo-profile-v01 .rpf-context{padding:14px;border:1px solid #E4E9E6;border-radius:19px;background:#fff}
      #profile.rinlo-profile-v01 .rpf-context-head{display:flex;align-items:flex-start;gap:11px}
      #profile.rinlo-profile-v01 .rpf-context-icon{width:36px;height:36px;flex:0 0 36px;border-radius:12px;background:#EEF5F1;color:#2E7D64;display:grid;place-items:center}
      #profile.rinlo-profile-v01 .rpf-context-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #profile.rinlo-profile-v01 .rpf-context-copy{min-width:0;flex:1}
      #profile.rinlo-profile-v01 .rpf-context-copy b{display:block;font-size:12px;line-height:1.25;font-weight:600;color:#172027}
      #profile.rinlo-profile-v01 .rpf-context-copy p{margin:3px 0 0;font-size:9.7px;line-height:1.38;color:#748086}
      #profile.rinlo-profile-v01 .rpf-context-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}
      #profile.rinlo-profile-v01 .rpf-context-cell{min-width:0;padding:9px 9px 8px;border-radius:14px;background:#F7F9F8}
      #profile.rinlo-profile-v01 .rpf-context-cell small{display:block;font-size:8.5px;color:#8A9498;margin-bottom:3px}
      #profile.rinlo-profile-v01 .rpf-context-cell strong{display:block;font-size:10.8px;line-height:1.2;font-weight:600;color:#253137;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      #profile.rinlo-profile-v01 .rpf-section{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:18px 0 8px}
      #profile.rinlo-profile-v01 .rpf-section h2{margin:0!important;font-size:14.5px!important;line-height:1.2!important;font-weight:600!important;color:#172027!important}
      #profile.rinlo-profile-v01 .rpf-section span{font-size:9.2px;color:#818C90}

      #profile.rinlo-profile-v01 .rpf-card{padding:13px;border:1px solid #E4E9E6;border-radius:17px;background:#fff}
      #profile.rinlo-profile-v01 .rpf-row{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #EEF1EF}
      #profile.rinlo-profile-v01 .rpf-row:first-child{padding-top:0}
      #profile.rinlo-profile-v01 .rpf-row:last-child{padding-bottom:0;border-bottom:0}
      #profile.rinlo-profile-v01 .rpf-row-icon{width:31px;height:31px;flex:0 0 31px;border-radius:10px;background:#EEF5F1;color:#2E7D64;display:grid;place-items:center}
      #profile.rinlo-profile-v01 .rpf-row-icon svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #profile.rinlo-profile-v01 .rpf-row-copy{min-width:0;flex:1}
      #profile.rinlo-profile-v01 .rpf-row-copy small{display:block;font-size:8.8px;color:#879195;margin-bottom:3px}
      #profile.rinlo-profile-v01 .rpf-row-copy strong{display:block;font-size:11.4px;line-height:1.28;font-weight:600;color:#243036}
      #profile.rinlo-profile-v01 .rpf-note{margin-top:8px;font-size:9.3px;line-height:1.38;color:#7B868B}

      #profile.rinlo-profile-v01 .rpf-focuses{display:flex;flex-wrap:wrap;gap:6px}
      #profile.rinlo-profile-v01 .rpf-focus-chip{padding:7px 9px;border:1px solid #DDE8E2;border-radius:999px;background:#F5F9F7;color:#2F6654;font-size:9.5px;font-weight:600}
      #profile.rinlo-profile-v01 .rpf-empty{font-size:10px;line-height:1.4;color:#7D888C}

      #profile.rinlo-profile-v01 .rpf-actions{display:grid;gap:7px}
      #profile.rinlo-profile-v01 .rpf-action{width:100%;min-height:54px;padding:9px 10px;border:1px solid #E4E9E6;border-radius:16px;background:#fff;color:#243036;display:flex;align-items:center;gap:10px;text-align:left}
      #profile.rinlo-profile-v01 .rpf-action:active{background:#F7F9F8}
      #profile.rinlo-profile-v01 .rpf-action-icon{width:33px;height:33px;flex:0 0 33px;border-radius:11px;background:#EEF5F1;color:#2E7D64;display:grid;place-items:center}
      #profile.rinlo-profile-v01 .rpf-action-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #profile.rinlo-profile-v01 .rpf-action-copy{min-width:0;flex:1}
      #profile.rinlo-profile-v01 .rpf-action-copy b{display:block;font-size:11.3px;line-height:1.2;font-weight:600}
      #profile.rinlo-profile-v01 .rpf-action-copy span{display:block;margin-top:3px;font-size:9px;line-height:1.3;color:#7B868B}
      #profile.rinlo-profile-v01 .rpf-action-chevron{width:18px;height:18px;color:#9AA2A5}
      #profile.rinlo-profile-v01 .rpf-action-chevron svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

      #profile.rinlo-profile-v01 .rpf-sync{position:relative;padding:13px 13px 13px 42px;border:1px solid #DDE8E2;border-radius:17px;background:#F7FAF8}
      #profile.rinlo-profile-v01 .rpf-sync-icon{position:absolute;left:13px;top:13px;width:21px;height:21px;color:#2E7D64}
      #profile.rinlo-profile-v01 .rpf-sync-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
      #profile.rinlo-profile-v01 .rpf-sync b{font-size:10.5px;font-weight:650;color:#2F6654}
      #profile.rinlo-profile-v01 .rpf-sync p{margin:3px 0 0;font-size:10.2px;line-height:1.42;color:#5F6D72}

      #profile.rinlo-profile-v01 .rpf-prototype{margin-top:8px;padding:12px;border:1px dashed #D7DEDA;border-radius:16px;background:rgba(255,255,255,.65)}
      #profile.rinlo-profile-v01 .rpf-prototype b{display:block;font-size:10px;font-weight:600;color:#657176}
      #profile.rinlo-profile-v01 .rpf-prototype p{margin:4px 0 9px;font-size:9.2px;line-height:1.35;color:#879195}
      #profile.rinlo-profile-v01 .rpf-demo{width:100%;min-height:42px;border:1px solid #E0E6E3;border-radius:13px;background:#fff;color:#586469;font-size:10.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px}
      #profile.rinlo-profile-v01 .rpf-demo svg{width:16px;height:16px;fill:none;stroke:#2E7D64;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

      #profile.rinlo-profile-v01 .rpf-danger{width:100%;min-height:46px;border:1px solid #F0D8D8;border-radius:14px;background:#FFF9F9;color:#9B4B4B;font-size:10.8px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px}
      #profile.rinlo-profile-v01 .rpf-danger svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #profile.rinlo-profile-v01 .rpf-footer{text-align:center;margin:16px 0 4px;font-size:8.8px;line-height:1.4;color:#98A1A4}

      @media(max-width:360px){
        #profile.rinlo-profile-v01{padding-left:14px!important;padding-right:14px!important}
        #profile.rinlo-profile-v01 .rpf-heading h1{font-size:23px!important}
        #profile.rinlo-profile-v01 .rpf-context-grid{gap:5px}
      }
    `;
    doc.head.appendChild(style);
  }

  function build(doc) {
    const el = doc.getElementById('profile');
    if (!el) return;
    el.className = 'screen rinlo-profile-v01';
    el.dataset.rinloProfile = 'v01';
    el.innerHTML = `
      <div class="rpf-top"><div class="rinlo-wordmark">Rinlo<span class="rinlo-wordmark-dot"></span></div><div class="rpf-kicker">Профиль</div></div>
      <div class="rpf-heading"><h1>Ваши настройки</h1><div class="sub">То, что Rinlo учитывает, когда предлагает следующий небольшой шаг.</div></div>

      <section class="rpf-context">
        <div class="rpf-context-head">
          <div class="rpf-context-icon">${icons.user}</div>
          <div class="rpf-context-copy"><b>Личный контекст</b><p>Базовые параметры нужны только для настройки рекомендаций и ориентиров.</p></div>
        </div>
        <div class="rpf-context-grid">
          <div class="rpf-context-cell"><small>Рост</small><strong id="rpfHeight">—</strong></div>
          <div class="rpf-context-cell"><small>Возраст</small><strong id="rpfAge">—</strong></div>
          <div class="rpf-context-cell"><small>Активность</small><strong id="rpfActivity">—</strong></div>
        </div>
      </section>

      <div class="rpf-section"><h2>Ориентиры</h2><span>не обязательные нормы</span></div>
      <div class="rpf-card">
        <div class="rpf-row"><div class="rpf-row-icon">${icons.target}</div><div class="rpf-row-copy"><small>Цель</small><strong id="pGoal">—</strong></div></div>
        <div class="rpf-row"><div class="rpf-row-icon">${icons.spark}</div><div class="rpf-row-copy"><small>Дневные ориентиры</small><strong id="pTargets">—</strong></div></div>
        <div class="rpf-note">Rinlo использует эти значения как контекст для рекомендаций, а не как оценку успешности дня.</div>
      </div>

      <div class="rpf-section"><h2>Фокусы</h2><span>до двух направлений</span></div>
      <div class="rpf-card"><div id="pHabits" class="rpf-focuses"></div></div>

      <div class="rpf-section"><h2>Настройки</h2><span>можно менять в любой момент</span></div>
      <div class="rpf-actions">
        <button class="rpf-action" onclick="restartOnboarding()"><span class="rpf-action-icon">${icons.sliders}</span><span class="rpf-action-copy"><b>Изменить параметры</b><span>Вес, цель, активность и фокусы</span></span><span class="rpf-action-chevron">${icons.chevron}</span></button>
        <button class="rpf-action" onclick="rinloProfileDataInfo()"><span class="rpf-action-icon">${icons.data}</span><span class="rpf-action-copy"><b>Данные и синхронизация</b><span id="rpfSyncActionText">Состояние хранения данных</span></span><span class="rpf-action-chevron">${icons.chevron}</span></button>
      </div>

      <div class="rpf-section"><h2>Данные</h2><span>прозрачно и спокойно</span></div>
      <div class="rpf-sync"><span class="rpf-sync-icon">${icons.data}</span><b id="rpfSyncTitle">Данные сохранены</b><p id="rpfSyncText">Rinlo использует только данные, которые есть в этом прототипе.</p></div>

      <div class="rpf-prototype"><b>Для тестирования прототипа</b><p>Демо-неделя добавляет пример записей, чтобы проверить графики и закономерности.</p><button class="rpf-demo" onclick="loadDemo()">${icons.demo}<span>Добавить демо-неделю</span></button></div>

      <div class="rpf-section"><h2>Удаление</h2><span>необратимое действие</span></div>
      <button class="rpf-danger" onclick="resetAll()">${icons.trash}<span>Удалить все данные Rinlo</span></button>
      <div class="rpf-footer">Rinlo · прототип v0.9.2<br>Small steps. A healthier you.</div>
    `;
  }

  function profileMarkupIntact(doc) {
    const el = doc.getElementById('profile');
    return Boolean(
      el?.dataset.rinloProfile === 'v01'
      && el.querySelector('.rpf-actions')
      && [...el.querySelectorAll('.rpf-action b')].some(node => node.textContent?.includes('Изменить параметры'))
    );
  }

  function syncExtra(doc) {
    const win = doc.defaultView;
    const db = readDb(win);
    const p = db.profile || {};
    const set = (id, value) => { const el = doc.getElementById(id); if (el) el.textContent = value; };

    set('rpfHeight', p.height ? `${p.height} см` : '—');
    set('rpfAge', p.age ? `${p.age}` : '—');
    set('rpfActivity', activityLabel(p.activity));

    const focuses = doc.getElementById('pHabits');
    if (focuses) {
      const items = Array.isArray(p.habits) ? p.habits : [];
      focuses.innerHTML = items.length
        ? items.map(h => `<span class="rpf-focus-chip">${habitLabel(h)}</span>`).join('')
        : '<span class="rpf-empty">Дополнительные фокусы пока не выбраны.</span>';
    }

    const api = window.HealthyActionAPI;
    const syncAvailable = !!api?.enabled;
    set('rpfSyncTitle', syncAvailable ? 'Синхронизация доступна' : 'Данные на этом устройстве');
    set('rpfSyncText', syncAvailable
      ? 'Локальные записи остаются основой прототипа; при доступном API профиль и данные могут синхронизироваться.'
      : 'Сейчас записи хранятся локально в браузере на этом устройстве.');
    set('rpfSyncActionText', syncAvailable ? 'Локально + доступная синхронизация' : 'Хранится локально');
  }

  function wire(doc) {
    const win = doc.defaultView;
    if (!win) return;

    if (typeof win.renderProfile === 'function' && !win.__rinloProfileWrapped) {
      win.__rinloProfileWrapped = true;
      const original = win.renderProfile.bind(win);
      win.renderProfile = function () {
        let result = original();
        if (!profileMarkupIntact(doc)) {
          ensureStyles(doc);
          build(doc);
          // The legacy renderer fills pGoal/pTargets. Run it once more against
          // the repaired v0.1 markup so visual values stay current as well.
          result = original();
          // Some legacy renderers may rewrite the section themselves. In that
          // case restore the skin one final time and keep the local context data.
          if (!profileMarkupIntact(doc)) build(doc);
        }
        syncExtra(doc);
        return result;
      };
    }

    win.rinloProfileDataInfo = function () {
      const api = window.HealthyActionAPI;
      const syncAvailable = !!api?.enabled;
      const syncCopy = syncAvailable
        ? 'Синхронизация доступна, при этом локальные записи остаются на устройстве и используются как основной рабочий источник прототипа.'
        : 'В этой конфигурации данные хранятся только локально на устройстве.';
      if (typeof win.openSheet === 'function') {
        win.openSheet(`<h2>Данные и синхронизация</h2><div class="card coach"><b>Как это работает сейчас</b><p>${syncCopy}</p></div><div class="tiny">Полное управление аккаунтом и приватностью будет вынесено в отдельный production-flow перед релизом.</div><button class="btn primary full" onclick="closeSheet()">Понятно</button>`);
      }
    };

    syncExtra(doc);
    if (typeof win.render === 'function') win.render();
  }

  function apply() {
    const doc = frame.contentDocument;
    if (!doc) return;
    const el = doc.getElementById('profile');
    if (!el) return;
    if (!profileMarkupIntact(doc)) {
      ensureStyles(doc);
      build(doc);
    }
    wire(doc);
  }

  frame.addEventListener('load', () => {
    try { setTimeout(apply, 0); }
    catch (e) { console.error('Rinlo profile v0.1', e); }
  });

  try { if (frame.contentDocument?.readyState === 'complete') setTimeout(apply, 0); }
  catch {}
})();