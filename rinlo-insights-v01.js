(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const icons = {
    trend: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 17.5 9 13l3.2 3.1L19.5 8.5"/><path d="M15.5 8.5h4v4"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    protein: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.7 8.2c1.5-2.7 4.5-4.1 7.3-3.1 3.5 1.2 5.2 5.2 3.7 8.6-1.4 3.1-5 4.6-8.1 3.4-3.5-1.3-5-5.7-2.9-8.9Z"/><path d="M9 8.8c1.6.6 3.3.4 4.8-.7"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6" width="15" height="13" rx="3"/><path d="M8 4v4m8-4v4M4.5 10.5h15"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`
  };

  const readDb = win => {
    try { return JSON.parse(win.localStorage.getItem('healthy-action-v07') || '{}'); }
    catch { return {}; }
  };

  const todayKey = () => new Date().toISOString().slice(0,10);
  const shiftKey = (k,n) => {
    const d = new Date(k + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0,10);
  };

  function ensureStyles(doc) {
    doc.getElementById('rinlo-insights-v01-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-insights-v01-style';
    style.textContent = `
      #progress.rinlo-insights-v01{
        min-height:100vh!important;
        padding:max(16px,env(safe-area-inset-top)) 18px calc(104px + env(safe-area-inset-bottom))!important;
        background:radial-gradient(circle at 106% 0%,rgba(154,185,172,.12),transparent 29%),linear-gradient(180deg,#F8FAF9 0%,#F4F7F5 100%)!important;
        color:#172027;
        font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important;
      }
      #progress.rinlo-insights-v01 .ri-top{display:flex;align-items:center;justify-content:space-between;min-height:32px;margin-bottom:16px}
      #progress.rinlo-insights-v01 .rinlo-wordmark{position:relative;display:inline-block;padding-right:8px;font-size:26px;font-weight:600;line-height:1;letter-spacing:-.045em;color:#0F1720}
      #progress.rinlo-insights-v01 .rinlo-wordmark-dot{position:absolute;width:6px;height:6px;right:0;top:6px;border-radius:50%;background:#2E7D64}
      #progress.rinlo-insights-v01 .ri-kicker{font-size:10px;font-weight:600;color:#7C888B;letter-spacing:.01em}
      #progress.rinlo-insights-v01 .ri-heading{margin-bottom:11px}
      #progress.rinlo-insights-v01 .ri-heading h1{margin:0 0 5px!important;font-size:24px!important;line-height:1.13!important;font-weight:600!important;letter-spacing:-.035em!important;color:#172027!important}
      #progress.rinlo-insights-v01 .ri-heading .sub{max-width:332px;font-size:12.5px!important;line-height:1.43!important;color:#68757A!important}

      #progress.rinlo-insights-v01 .ri-hero{position:relative;overflow:hidden;border-radius:22px;padding:17px 16px 15px;color:#fff;background:radial-gradient(circle at 82% 18%,rgba(118,170,151,.32),transparent 18%),radial-gradient(circle at 106% 90%,rgba(76,142,120,.30),transparent 34%),linear-gradient(145deg,#122126 0%,#0F1B1F 48%,#173D35 100%);box-shadow:0 10px 28px rgba(15,23,32,.075)}
      #progress.rinlo-insights-v01 .ri-hero::before{content:'';position:absolute;width:250px;height:116px;right:-104px;top:50px;border-radius:50%;border:1px solid rgba(186,213,202,.15);transform:rotate(-24deg);pointer-events:none}
      #progress.rinlo-insights-v01 .ri-hero-label{position:relative;z-index:1;display:flex;align-items:center;gap:7px;margin-bottom:8px;font-size:10px;font-weight:600;color:#B8D7CA}
      #progress.rinlo-insights-v01 .ri-hero-label span{width:7px;height:7px;border-radius:50%;background:#70B194;box-shadow:0 0 0 4px rgba(112,177,148,.1)}
      #progress.rinlo-insights-v01 .ri-hero h2{position:relative;z-index:1;max-width:298px;margin:0 0 6px!important;font-size:21px!important;line-height:1.16!important;font-weight:600!important;letter-spacing:-.028em!important;color:#fff!important}
      #progress.rinlo-insights-v01 .ri-hero p{position:relative;z-index:1;max-width:300px;margin:0;font-size:12px;line-height:1.46;color:rgba(255,255,255,.72)}
      #progress.rinlo-insights-v01 .ri-hero-meta{position:relative;z-index:1;display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}
      #progress.rinlo-insights-v01 .ri-hero-meta span{padding:4px 7px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.05);font-size:9px;color:rgba(255,255,255,.7)}

      #progress.rinlo-insights-v01 .ri-section{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:18px 0 8px}
      #progress.rinlo-insights-v01 .ri-section h2{margin:0!important;font-size:14.5px!important;line-height:1.2!important;font-weight:600!important;color:#172027!important}
      #progress.rinlo-insights-v01 .ri-section span{font-size:9.2px;color:#818C90}

      #progress.rinlo-insights-v01 .ri-weight{padding:14px;border:1px solid #E4E9E6;border-radius:18px;background:#fff}
      #progress.rinlo-insights-v01 .ri-weight-head{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
      #progress.rinlo-insights-v01 .ri-weight-cell:last-child{text-align:right}
      #progress.rinlo-insights-v01 .ri-weight-cell small{display:block;font-size:9px;color:#859095;margin-bottom:3px}
      #progress.rinlo-insights-v01 .ri-weight-cell strong{font-size:16px;line-height:1.1;font-weight:600;color:#172027}
      #progress.rinlo-insights-v01 #weightChart{height:156px!important;margin:0!important;padding:8px!important;border:0!important;border-radius:14px!important;background:#F8FAF9!important}
      #progress.rinlo-insights-v01 #weightChart svg{width:100%;height:100%}
      #progress.rinlo-insights-v01 #weightChart polyline{stroke:#2E7D64!important;stroke-width:3!important}
      #progress.rinlo-insights-v01 .ri-weight-note{margin-top:8px;font-size:9.4px;line-height:1.35;color:#788388}

      #progress.rinlo-insights-v01 .ri-week{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      #progress.rinlo-insights-v01 .ri-stat{min-width:0;padding:11px 10px 10px;border:1px solid #E4E9E6;border-radius:16px;background:#fff}
      #progress.rinlo-insights-v01 .ri-stat-icon{width:23px;height:23px;margin-bottom:8px;color:#2E7D64}
      #progress.rinlo-insights-v01 .ri-stat-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
      #progress.rinlo-insights-v01 .ri-stat strong{display:block;font-size:15px;line-height:1.1;font-weight:600;color:#172027;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #progress.rinlo-insights-v01 .ri-stat small{display:block;margin-top:4px;font-size:8.8px;line-height:1.25;color:#7C878B}

      #progress.rinlo-insights-v01 .ri-insight{position:relative;margin-top:9px;padding:13px 13px 13px 42px;border:1px solid #DDE8E2;border-radius:17px;background:#F7FAF8}
      #progress.rinlo-insights-v01 .ri-insight-icon{position:absolute;left:13px;top:13px;width:21px;height:21px;color:#2E7D64}
      #progress.rinlo-insights-v01 .ri-insight-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
      #progress.rinlo-insights-v01 .ri-insight b{font-size:10.5px;font-weight:650;color:#2F6654}
      #progress.rinlo-insights-v01 .ri-insight p{margin:3px 0 0;font-size:10.5px;line-height:1.42;color:#5F6D72}

      #progress.rinlo-insights-v01 .ri-patterns{display:grid;gap:7px}
      #progress.rinlo-insights-v01 .ri-pattern{display:flex;gap:10px;align-items:flex-start;padding:11px;border:1px solid #E4E9E6;border-radius:16px;background:#fff}
      #progress.rinlo-insights-v01 .ri-pattern-icon{width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:#EEF5F1;color:#2E7D64;display:grid;place-items:center}
      #progress.rinlo-insights-v01 .ri-pattern-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #progress.rinlo-insights-v01 .ri-pattern-copy{min-width:0;flex:1}
      #progress.rinlo-insights-v01 .ri-pattern-copy b{display:block;font-size:11.5px;line-height:1.2;font-weight:600;color:#172027}
      #progress.rinlo-insights-v01 .ri-pattern-copy p{margin:3px 0 0;font-size:9.4px;line-height:1.35;color:#788388}
      #progress.rinlo-insights-v01 .ri-hidden{display:none!important}

      @media(max-width:360px){
        #progress.rinlo-insights-v01{padding-left:14px!important;padding-right:14px!important}
        #progress.rinlo-insights-v01 .ri-heading h1{font-size:23px!important}
        #progress.rinlo-insights-v01 .ri-hero h2{font-size:20px!important}
        #progress.rinlo-insights-v01 .ri-week{gap:5px}
      }
    `;
    doc.head.appendChild(style);
  }

  function build(doc) {
    const el = doc.getElementById('progress');
    if (!el) return;
    el.className = 'screen rinlo-insights-v01';
    el.dataset.rinloInsights = 'v01';
    el.innerHTML = `
      <div class="ri-top"><div class="rinlo-wordmark">Rinlo<span class="rinlo-wordmark-dot"></span></div><div class="ri-kicker">Инсайты</div></div>
      <div class="ri-heading"><h1>Что меняется</h1><div class="sub">Rinlo смотрит на несколько дней сразу — без оценок за отдельный день.</div></div>

      <section class="ri-hero">
        <div class="ri-hero-label"><span></span>Наблюдение Rinlo</div>
        <h2 id="riHeroTitle">Rinlo ещё собирает контекст</h2>
        <p id="riHeroText">Нескольких спокойных записей уже хватит, чтобы увидеть первые закономерности.</p>
        <div class="ri-hero-meta"><span>Тренд, не оценка</span><span>Последние 7 дней</span></div>
      </section>

      <div class="ri-section"><h2>Вес</h2><span>смотрим на тренд</span></div>
      <div class="ri-weight">
        <div class="ri-weight-head">
          <div class="ri-weight-cell"><small>Старт</small><strong id="startWeight">—</strong></div>
          <div class="ri-weight-cell"><small>Последнее измерение</small><strong id="lastWeight">—</strong></div>
        </div>
        <div id="weightChart" class="chart"></div>
        <div class="ri-weight-note">Одно измерение ничего не доказывает. Rinlo меняет вывод только когда появляется последовательность точек.</div>
      </div>

      <div class="ri-section"><h2>Последние 7 дней</h2><span>контекст недели</span></div>
      <div class="ri-week">
        <div class="ri-stat"><div class="ri-stat-icon">${icons.calendar}</div><strong id="activeDays">—</strong><small>дней с записями</small></div>
        <div class="ri-stat"><div class="ri-stat-icon">${icons.steps}</div><strong id="avgSteps">—</strong><small>шагов в среднем</small></div>
        <div class="ri-stat"><div class="ri-stat-icon">${icons.protein}</div><strong id="avgProtein">—</strong><small>белка в среднем</small></div>
      </div>
      <span id="avgCal" class="ri-hidden">—</span>

      <div class="ri-insight"><span class="ri-insight-icon">${icons.spark}</span><b>Rinlo заметил</b><p id="progressInsight"></p></div>

      <div class="ri-section"><h2>Закономерности</h2><span>без рейтингов и streak</span></div>
      <div class="ri-patterns">
        <div class="ri-pattern"><div class="ri-pattern-icon">${icons.meal}</div><div class="ri-pattern-copy"><b id="riFoodTitle">Питание</b><p id="riFoodText">Пока недостаточно данных для вывода.</p></div></div>
        <div class="ri-pattern"><div class="ri-pattern-icon">${icons.water}</div><div class="ri-pattern-copy"><b id="riWaterTitle">Вода</b><p id="riWaterText">Rinlo покажет закономерность, когда появятся записи за несколько дней.</p></div></div>
        <div class="ri-pattern"><div class="ri-pattern-icon">${icons.trend}</div><div class="ri-pattern-copy"><b id="riRhythmTitle">Ритм</b><p id="riRhythmText">Регулярность важнее идеального выполнения плана.</p></div></div>
      </div>
    `;
  }

  function setText(doc,id,text) {
    const el = doc.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
  }

  function syncDerived(doc) {
    const win = doc.defaultView;
    const db = readDb(win);
    const days = db.days || {};
    const profile = db.profile || {};
    const today = todayKey();
    const keys = [];
    for (let i = 6; i >= 0; i--) keys.push(shiftKey(today,-i));

    const weightRows = [];
    Object.keys(days).sort().forEach(k => {
      (days[k]?.events || []).filter(e => e.type === 'weight' && Number.isFinite(Number(e.weight))).forEach(e => weightRows.push({date:k,w:Number(e.weight)}));
    });

    const week = keys.map(k => {
      const d = days[k] || {};
      const food = (d.events || []).filter(e => e.type === 'food');
      const protein = food.reduce((s,e) => s + Number(e.protein || 0),0);
      return {k,d,food,protein,steps:Number(d.steps || 0),water:Number(d.water || 0)};
    });

    const active = week.filter(x => (x.d.events || []).length || x.steps || x.water).length;
    const foodDays = week.filter(x => x.food.length).length;
    const waterDays = week.filter(x => x.water >= 1000).length;
    const movementDays = week.filter(x => x.steps >= 4000).length;

    if (weightRows.length < 2) {
      setText(doc,'riHeroTitle','Rinlo ещё собирает контекст');
      setText(doc,'riHeroText','Добавляйте только реальные события. Уже нескольких измерений и обычных записей хватит, чтобы увидеть первые закономерности.');
    } else {
      const last = weightRows[weightRows.length - 1].w;
      const baseIndex = Math.max(0,weightRows.length - Math.min(5,weightRows.length));
      const base = weightRows[baseIndex].w;
      const diff = last - base;
      if (diff <= -0.5) {
        setText(doc,'riHeroTitle','Вес постепенно движется вниз');
        setText(doc,'riHeroText',`За последние измерения изменение около ${Math.abs(diff).toFixed(1).replace('.',',')} кг. Резко ужесточать план не нужно.`);
      } else if (diff >= 0.5) {
        setText(doc,'riHeroTitle','Пока важнее наблюдать, чем менять план');
        setText(doc,'riHeroText',`Последние измерения выше примерно на ${diff.toFixed(1).replace('.',',')} кг. Несколько точек важнее одного скачка.`);
      } else {
        setText(doc,'riHeroTitle','Вес пока выглядит стабильным');
        setText(doc,'riHeroText','Изменения между последними измерениями небольшие. Rinlo пока не видит причины резко менять план.');
      }
    }

    if (foodDays >= 4) {
      setText(doc,'riFoodTitle','Питание записывается достаточно регулярно');
      setText(doc,'riFoodText',`${foodDays} из 7 дней содержат записи еды. Этого уже достаточно, чтобы видеть общий ритм без идеального дневника.`);
    } else if (foodDays > 0) {
      setText(doc,'riFoodTitle','По питанию пока мало контекста');
      setText(doc,'riFoodText',`Записи есть в ${foodDays} из 7 дней. Не нужно заполнять пропуски задним числом — просто продолжайте с текущего дня.`);
    } else {
      setText(doc,'riFoodTitle','Питание пока без данных');
      setText(doc,'riFoodText','Когда появятся несколько обычных записей, Rinlo сможет сравнить дни без подсчёта «идеальности».');
    }

    if (waterDays >= 4) {
      setText(doc,'riWaterTitle','Вода появляется в большинстве активных дней');
      setText(doc,'riWaterText',`${waterDays} из 7 дней — с заметной записью воды. Это уже похоже на устойчивую привычку.`);
    } else if (waterDays > 0) {
      setText(doc,'riWaterTitle','Вода пока нерегулярна');
      setText(doc,'riWaterText',`${waterDays} из 7 дней набрали хотя бы 1 л в записях. Rinlo не будет превращать это в штраф или streak.`);
    } else {
      setText(doc,'riWaterTitle','По воде пока нет устойчивого сигнала');
      setText(doc,'riWaterText','Можно записывать воду только когда это удобно. Нескольких дней достаточно для первого наблюдения.');
    }

    if (active >= 5) {
      setText(doc,'riRhythmTitle','Ритм уже достаточно устойчивый');
      setText(doc,'riRhythmText',`${active} активных дней из 7. Регулярность уже полезнее, чем попытка выполнить каждый показатель на 100%.`);
    } else if (movementDays >= 3) {
      setText(doc,'riRhythmTitle','Движение повторяется несколько дней');
      setText(doc,'riRhythmText',`${movementDays} дней с заметной активностью. Продолжать похожий темп разумнее, чем резко повышать цель.`);
    } else {
      setText(doc,'riRhythmTitle','Ритм ещё формируется');
      setText(doc,'riRhythmText',active ? `${active} активных дней из 7. Этого достаточно, чтобы продолжить наблюдение без давления.` : 'Пока нет задачи «догонять» пропущенные дни. Начните с одного полезного действия сегодня.');
    }

    if (!profile.weight) setText(doc,'startWeight','—');
  }

  function observe(doc) {
    if (doc.__rinloInsightsObserverV1) return;
    const root = doc.getElementById('progress');
    if (!root) return;
    let queued = false;
    doc.__rinloInsightsObserverV1 = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      (doc.defaultView?.requestAnimationFrame || setTimeout)(() => {
        queued = false;
        syncDerived(doc);
      });
    });
    doc.__rinloInsightsObserverV1.observe(root,{subtree:true,childList:true,characterData:true});
  }

  function apply() {
    const doc = frame.contentDocument;
    if (!doc) return;
    const el = doc.getElementById('progress');
    if (!el || el.dataset.rinloInsights === 'v01') return;
    ensureStyles(doc);
    build(doc);
    const win = doc.defaultView;
    const db = win ? readDb(win) : {};
    if (win && db.profile && typeof win.renderProgress === 'function') win.renderProgress();
    syncDerived(doc);
    observe(doc);
  }

  frame.addEventListener('load', () => {
    try { setTimeout(apply,0); }
    catch (e) { console.error('Rinlo insights v0.1', e); }
  });

  try { if (frame.contentDocument?.readyState === 'complete') setTimeout(apply,0); }
  catch {}
})();