(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const APP_KEY = 'healthy-action-v07';
  const VERSION = 'v1';
  let observer = null;

  const num = (value, fallback = NaN) => {
    const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const readDb = (win) => {
    try { return JSON.parse(win.localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  };
  const writeDb = (win, db) => win.localStorage.setItem(APP_KEY, JSON.stringify(db));

  function ensureStyles(doc) {
    if (doc.getElementById('rinlo-product-precision-v1-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-product-precision-v1-style';
    style.textContent = `
      .rpp-head{padding:2px 0 5px}.rpp-kicker{font-size:10.5px;font-weight:650;color:#2E8F68;margin-bottom:6px}.rpp-head h2{margin:0!important;font-size:23px!important;line-height:1.08!important;letter-spacing:-.035em!important}.rpp-head p{margin:7px 0 0;font-size:11px;line-height:1.43;color:#788480}
      .rpp-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.rpp-field{min-width:0}.rpp-field.full{grid-column:1/-1}.rpp-field label{display:block;margin:0 0 6px;font-size:10px;font-weight:650;color:#7D8884}.rpp-field input,.rpp-field select{box-sizing:border-box;width:100%;height:49px;border:1px solid #E1E8E4;border-radius:14px;background:#FBFCFC;padding:0 12px;color:#111B18;font-size:14px;outline:none}.rpp-field input:focus,.rpp-field select:focus{border-color:#8BC8AE;box-shadow:0 0 0 3px rgba(36,151,101,.07)}
      .rpp-calories{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;padding:12px 13px;border-radius:15px;background:#F3FAF6}.rpp-calories b{display:block;font-size:11.5px}.rpp-calories span{display:block;margin-top:3px;font-size:9.5px;line-height:1.35;color:#7D8884}.rpp-check{width:46px;height:28px;flex:0 0 46px;box-sizing:border-box;border:0;border-radius:99px;padding:2px;background:#CDD7D2}.rpp-check i{display:block;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .16s ease}.rpp-check.on{background:#249765}.rpp-check.on i{transform:translateX(18px)}
      .rpp-save{width:100%;min-height:50px;margin-top:15px;border:0;border-radius:15px;background:#101A18;color:#fff;font-weight:650}.rpp-note{margin-top:9px;font-size:9.5px;line-height:1.4;color:#87918E;text-align:center}
    `;
    doc.head.appendChild(style);
  }

  function profilePayload(win, profile) {
    let targets = { cal: 1900, protein: 120, steps: 8000 };
    try { targets = win.targets?.() || targets; } catch {}
    return {
      startWeightKg: num(profile.weight),
      targetWeightKg: num(profile.goal),
      heightCm: num(profile.height),
      ageYears: Math.round(num(profile.age)),
      sex: ['male','female','other'].includes(profile.sex) ? profile.sex : null,
      activity: ['low','medium','high'].includes(profile.activity) ? profile.activity : 'low',
      focuses: Array.isArray(profile.habits) ? profile.habits.slice(0, 2) : [],
      primaryGoal: profile.primaryGoal || null,
      secondaryGoals: Array.isArray(profile.secondaryGoals) ? profile.secondaryGoals.slice(0, 3) : [],
      calorieTrackingEnabled: profile.calorieTrackingEnabled !== false,
      calorieTarget: Math.max(800, Math.round(Number(targets.cal || 1900))),
      proteinTargetG: Math.max(20, Math.round(Number(targets.protein || 120))),
      stepTarget: Math.max(1000, Math.round(Number(targets.steps || 8000))),
    };
  }

  function renderSheet(win, doc) {
    ensureStyles(doc);
    const profile = readDb(win).profile || {};
    win.openSheet?.(`
      <div class="rpp-head"><div class="rpp-kicker">Необязательно</div><h2>Уточнить параметры</h2><p>Rinlo уже работает. Эти данные нужны только для более точных ориентиров по питанию и движению.</p></div>
      <div class="rpp-grid">
        <div class="rpp-field"><label>Текущий вес, кг</label><input id="rppWeight" inputmode="decimal" value="${esc(profile.weight || 85)}"></div>
        <div class="rpp-field"><label>Целевой вес, кг</label><input id="rppGoal" inputmode="decimal" value="${esc(profile.goal || 75)}"></div>
        <div class="rpp-field"><label>Рост, см</label><input id="rppHeight" inputmode="numeric" value="${esc(profile.height || 176)}"></div>
        <div class="rpp-field"><label>Возраст</label><input id="rppAge" inputmode="numeric" value="${esc(profile.age || 37)}"></div>
        <div class="rpp-field"><label>Активность</label><select id="rppActivity"><option value="low" ${(profile.activity || 'low')==='low'?'selected':''}>Низкая</option><option value="medium" ${profile.activity==='medium'?'selected':''}>Средняя</option><option value="high" ${profile.activity==='high'?'selected':''}>Высокая</option></select></div>
        <div class="rpp-field"><label>Пол для расчёта</label><select id="rppSex"><option value="male" ${profile.sex==='male'?'selected':''}>Мужской</option><option value="female" ${profile.sex==='female'?'selected':''}>Женский</option><option value="other" ${!profile.sex || profile.sex==='other'?'selected':''}>Не указывать</option></select></div>
      </div>
      <div class="rpp-calories"><div><b>Показывать калории</b><span>Ориентир, а не оценка дня.</span></div><button id="rppCalories" type="button" class="rpp-check ${profile.calorieTrackingEnabled ? 'on' : ''}" role="switch" aria-checked="${profile.calorieTrackingEnabled ? 'true' : 'false'}" onclick="rinloProductPrecisionToggle()"><i></i></button></div>
      <button class="rpp-save" type="button" onclick="rinloProductPrecisionSave()">Сохранить параметры</button>
      <div class="rpp-note">Позже это можно изменить снова в профиле.</div>
    `);
  }

  function install(win, doc) {
    if (!win || !doc) return;
    ensureStyles(doc);

    win.rinloProductOpenPrecision = () => renderSheet(win, doc);
    // Legacy profile markup resolves this global at click time. Keeping the
    // function name lets old UI layers coexist while changing the product flow.
    win.restartOnboarding = () => renderSheet(win, doc);
    win.rinloProductPrecisionToggle = () => {
      const button = doc.getElementById('rppCalories');
      if (!button) return;
      const next = !button.classList.contains('on');
      button.classList.toggle('on', next);
      button.setAttribute('aria-checked', String(next));
    };
    win.rinloProductPrecisionSave = () => {
      const weight = num(doc.getElementById('rppWeight')?.value);
      const goal = num(doc.getElementById('rppGoal')?.value);
      const height = num(doc.getElementById('rppHeight')?.value);
      const age = Math.round(num(doc.getElementById('rppAge')?.value));
      if (!(weight >= 30 && weight <= 300 && goal >= 30 && goal <= 300 && height >= 120 && height <= 230 && age >= 14 && age <= 100)) {
        win.toast?.('Проверьте вес, рост и возраст');
        return;
      }
      const db = readDb(win);
      const previous = db.profile || {};
      db.profile = {
        ...previous,
        weight, goal, height, age,
        activity: doc.getElementById('rppActivity')?.value || 'low',
        sex: doc.getElementById('rppSex')?.value || 'other',
        calorieTrackingEnabled: doc.getElementById('rppCalories')?.classList.contains('on') || false,
        detailsComplete: true,
        productResetVersion: previous.productResetVersion || 'v1',
      };
      writeDb(win, db);
      try { win.eval('db = load()'); } catch {}
      try { win.render?.(); } catch {}
      const payload = profilePayload(win, db.profile);
      if (Object.values(payload).slice(0,4).every(Number.isFinite)) {
        window.RinloServerSync?.enqueue?.({ kind:'profile-upsert', payload }, { replaceKey:'profile' });
      }
      win.closeSheet?.();
      win.toast?.('Параметры сохранены');
    };

    const rename = () => {
      for (const button of doc.querySelectorAll('#profile .rpf-action')) {
        const title = button.querySelector('.rpf-action-copy b');
        if (title?.textContent?.includes('Изменить параметры')) {
          title.textContent = 'Уточнить параметры';
          const sub = button.querySelector('.rpf-action-copy span');
          if (sub) sub.textContent = 'Вес, рост и ориентиры — только если нужны';
        }
      }
    };
    rename();
    observer?.disconnect();
    observer = new MutationObserver(rename);
    observer.observe(doc.getElementById('profile') || doc.body, { childList:true, subtree:true });
    win.__rinloProductPrecision = VERSION;
  }

  const mount = () => {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc?.body) return;
    install(win, doc);
  };
  frame.addEventListener('load', () => setTimeout(mount, 0));
  setTimeout(mount, 0);
  setTimeout(mount, 180);
})();
