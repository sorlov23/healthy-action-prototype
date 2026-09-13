(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const APP_KEY = 'healthy-action-v07';
  const VERSION = 'v1';
  let installTimer = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const norm = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9%]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const readDb = (win) => {
    try { return JSON.parse(win.localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  };
  const catalog = () => (window.HEALTHY_FOOD_CATALOG || []).map((row) => ({
    id: row[0], name: row[1], aliases: String(row[2] || '').split('|').filter(Boolean),
    kcal100: Number(row[3] || 0), protein100: Number(row[4] || 0), serving: Number(row[5] || 100), emoji: row[6] || '🍽️',
  }));
  const aliasCache = () => catalog().flatMap((item) => [item.name, ...item.aliases].map(alias => ({ item, alias, n: norm(alias) }))).filter(x => x.n);

  function recentFoods(win) {
    const db = readDb(win);
    const all = [];
    for (const [day, state] of Object.entries(db.days || {})) {
      for (const event of state?.events || []) {
        if (event?.type !== 'food' || !event.text) continue;
        all.push({ day, at: event.updatedAt || event.time || day, text: event.text, cal: Number(event.cal || 0), protein: Number(event.protein || 0) });
      }
    }
    all.sort((a,b) => String(b.at).localeCompare(String(a.at)));
    const seen = new Set();
    return all.filter(item => {
      const key = norm(item.text);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  function gramsFor(textNorm, match) {
    if (match.item.id === 'egg') {
      const count = textNorm.match(/(\d+)\s*(?:яйц[ао]?|яиц|яйца)/);
      if (count) return Math.min(12, Number(count[1])) * 50;
      if (textNorm.includes('омлет')) return 100;
    }
    if (match.item.id === 'milk25' || match.item.id === 'milk15') {
      if (textNorm.includes('кофе')) return 50;
    }
    const alias = match.n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const before = textNorm.match(new RegExp(`(\\d{1,4})\\s*(?:г|гр|грамм(?:а|ов)?)\\s+${alias}`));
    const after = textNorm.match(new RegExp(`${alias}\\s+(\\d{1,4})\\s*(?:г|гр|грамм(?:а|ов)?)`));
    const value = Number(before?.[1] || after?.[1] || 0);
    return value > 0 && value <= 3000 ? value : match.item.serving;
  }

  function parseText(text, multiplier = 1) {
    const q = norm(text);
    if (!q) return { items: [], kcal: 0, protein: 0, confidence: 'low' };
    const candidates = [];
    for (const entry of aliasCache()) {
      let from = 0;
      while (from < q.length) {
        const index = q.indexOf(entry.n, from);
        if (index < 0) break;
        const leftOk = index === 0 || q[index - 1] === ' ';
        const right = index + entry.n.length;
        const rightOk = right === q.length || q[right] === ' ';
        if (leftOk && rightOk) candidates.push({ ...entry, index, end: right });
        from = index + Math.max(1, entry.n.length);
      }
    }
    candidates.sort((a,b) => (b.n.length - a.n.length) || (a.index - b.index));
    const accepted = [];
    for (const candidate of candidates) {
      if (accepted.some(x => candidate.index < x.end && candidate.end > x.index)) continue;
      if (accepted.some(x => x.item.id === candidate.item.id)) continue;
      accepted.push(candidate);
    }
    accepted.sort((a,b) => a.index - b.index);

    const items = accepted.map(match => {
      const grams = Math.max(1, Math.round(gramsFor(q, match) * multiplier));
      return {
        id: match.item.id,
        name: match.item.name,
        emoji: match.item.emoji,
        grams,
        kcal: Math.round(match.item.kcal100 * grams / 100),
        protein: Math.round(match.item.protein100 * grams / 100),
      };
    });

    if (/\bкофе\b/.test(q) && !items.some(item => ['cappuccino','latte','espresso','coffee_sugar'].includes(item.id))) {
      items.push({ id:'coffee_plain', name:'Кофе', emoji:'☕', grams:200, kcal:5, protein:0 });
    }

    const kcal = items.reduce((sum, item) => sum + item.kcal, 0);
    const protein = items.reduce((sum, item) => sum + item.protein, 0);
    const confidence = items.length >= 2 ? 'high' : items.length === 1 ? 'medium' : 'low';
    return { items, kcal, protein, confidence };
  }

  function suggestions(query) {
    const q = norm(query);
    if (!q || q.length < 2) return [];
    const scored = [];
    for (const item of catalog()) {
      const terms = [item.name, ...item.aliases].map(norm);
      let score = 0;
      for (const term of terms) {
        if (term === q) score = Math.max(score, 100);
        else if (term.startsWith(q)) score = Math.max(score, 80 - Math.min(20, term.length - q.length));
        else if (term.includes(q)) score = Math.max(score, 45);
        else if (q.split(' ').some(part => part.length >= 3 && term.startsWith(part))) score = Math.max(score, 30);
      }
      if (score) scored.push({ item, score });
    }
    return scored.sort((a,b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'ru')).slice(0, 5).map(x => x.item);
  }

  function ensureStyles(doc) {
    if (doc.getElementById('rinlo-smart-food-v1-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-smart-food-v1-style';
    style.textContent = `
      .rsf-head{padding:2px 0 4px}.rsf-kicker{font-size:10px;font-weight:700;color:#2E8F68;margin-bottom:5px}.rsf-head h2{margin:0!important;font-size:24px!important;line-height:1.08!important;letter-spacing:-.04em!important}.rsf-head p{margin:7px 0 0;font-size:11px;line-height:1.45;color:#75817D}
      .rsf-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:15px}.rsf-mode{min-height:86px;border:1px solid #E0E7E3;border-radius:17px;background:#fff;padding:11px 8px;text-align:left;color:#1C2824}.rsf-mode.active{border-color:#9FD4BC;background:#F3FAF6}.rsf-mode-emoji{display:block;font-size:22px;margin-bottom:7px}.rsf-mode b{display:block;font-size:11px}.rsf-mode span{display:block;margin-top:3px;font-size:8.5px;line-height:1.3;color:#84908B}
      .rsf-panel{margin-top:13px}.rsf-input{width:100%;min-height:92px;box-sizing:border-box;border:1px solid #E1E8E4;border-radius:16px;background:#FBFCFC;padding:13px;color:#17211D;font:inherit;font-size:13px;line-height:1.45;resize:none;outline:none}.rsf-input:focus{border-color:#8BC8AE;box-shadow:0 0 0 3px rgba(36,151,101,.07)}
      .rsf-suggestions{display:grid;gap:6px;margin-top:8px}.rsf-suggestion{display:flex;align-items:center;gap:9px;width:100%;min-height:43px;padding:8px 10px;border:1px solid #E5EAE7;border-radius:13px;background:#fff;text-align:left}.rsf-suggestion .e{font-size:18px}.rsf-suggestion b{font-size:10.5px}.rsf-suggestion small{display:block;margin-top:2px;font-size:8.5px;color:#89938F}
      .rsf-primary{width:100%;min-height:50px;margin-top:11px;border:0;border-radius:15px;background:#111B18;color:#fff;font-weight:700}.rsf-photo{display:grid;gap:10px}.rsf-photo-drop{position:relative;min-height:180px;border:1px dashed #BFD2C9;border-radius:18px;background:#F7FAF8;display:grid;place-items:center;overflow:hidden;text-align:center;padding:16px}.rsf-photo-drop input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}.rsf-photo-drop img{width:100%;height:180px;object-fit:cover;border-radius:14px}.rsf-photo-copy b{display:block;font-size:12px}.rsf-photo-copy span{display:block;margin-top:4px;font-size:9px;line-height:1.4;color:#7D8984}
      .rsf-beta{padding:10px 11px;border-radius:14px;background:#F4F7F5;color:#6D7A75;font-size:9px;line-height:1.45}.rsf-recent{display:grid;gap:8px}.rsf-recent button{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:56px;padding:10px 12px;border:1px solid #E2E8E5;border-radius:15px;background:#fff;text-align:left}.rsf-recent b{display:block;font-size:11px}.rsf-recent small{display:block;margin-top:3px;font-size:9px;color:#86908C}.rsf-empty{padding:18px;border:1px dashed #DDE4E0;border-radius:16px;text-align:center;font-size:10px;line-height:1.45;color:#7E8A85}
      .rsf-confirm{margin-top:13px}.rsf-detected{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}.rsf-chip{display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border-radius:999px;background:#F3F7F5;color:#315E4E;font-size:9.5px;font-weight:650}.rsf-portion{display:flex;gap:6px;margin:10px 0}.rsf-portion button{flex:1;min-height:38px;border:1px solid #E0E7E3;border-radius:12px;background:#fff;color:#57645F;font-size:9.5px;font-weight:650}.rsf-portion button.active{border-color:#91CDB3;background:#EEF8F3;color:#236A50}.rsf-total{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rsf-total .field{margin:0!important}.rsf-note{margin:8px 0 0;font-size:9px;line-height:1.4;color:#87918D}.rsf-back{width:100%;min-height:42px;margin-top:7px;border:0;background:transparent;color:#6F7C77;font-size:10px;font-weight:650}
    `;
    doc.head.appendChild(style);
  }

  function shell(win, doc, active = 'text') {
    ensureStyles(doc);
    win.openSheet?.(`
      <div class="rsf-head"><div class="rsf-kicker">Smart Food Capture</div><h2>Что съели?</h2><p>Не нужно считать вручную. Дайте Rinlo минимум контекста — остальное он подготовит к подтверждению.</p></div>
      <div class="rsf-modes">
        <button class="rsf-mode ${active==='photo'?'active':''}" onclick="rinloSmartFoodMode('photo')"><span class="rsf-mode-emoji">📷</span><b>Фото</b><span>Камера или медиатека</span></button>
        <button class="rsf-mode ${active==='text'?'active':''}" onclick="rinloSmartFoodMode('text')"><span class="rsf-mode-emoji">✍️</span><b>Написать</b><span>Обычной фразой</span></button>
        <button class="rsf-mode ${active==='recent'?'active':''}" onclick="rinloSmartFoodMode('recent')"><span class="rsf-mode-emoji">🕘</span><b>Недавнее</b><span>Добавить снова</span></button>
      </div>
      <div id="rsfPanel" class="rsf-panel"></div>
    `);
    renderMode(win, doc, active);
  }

  function renderMode(win, doc, mode) {
    const panel = doc.getElementById('rsfPanel');
    if (!panel) return;
    doc.querySelectorAll('.rsf-mode').forEach((button, index) => button.classList.toggle('active', ['photo','text','recent'][index] === mode));
    if (mode === 'photo') {
      panel.innerHTML = `
        <div class="rsf-photo">
          <label class="rsf-photo-drop"><input id="rsfPhotoInput" type="file" accept="image/*" capture="environment" onchange="rinloSmartFoodPhotoSelected(this)"><div id="rsfPhotoPreview" class="rsf-photo-copy"><b>Сфотографировать еду</b><span>Фото не сохраняется. В этом PR проверяем camera-flow; Vision-анализ подключим следующим слоем.</span></div></label>
          <div class="rsf-beta">Пока после фото добавьте короткую подпись — например «курица, рис и овощи». На следующем этапе подпись будет заполняться автоматически по изображению.</div>
          <textarea id="rsfPhotoText" class="rsf-input" placeholder="Что на фото?"></textarea>
          <button class="rsf-primary" onclick="rinloSmartFoodAnalyze('photo')">Подготовить запись</button>
        </div>`;
      return;
    }
    if (mode === 'recent') {
      const recent = recentFoods(win);
      panel.innerHTML = recent.length ? `<div class="rsf-recent">${recent.map((item, index) => `<button onclick="rinloSmartFoodUseRecent(${index})"><span><b>${esc(item.text)}</b><small>${Math.round(item.cal)} ккал · ${Math.round(item.protein)} г белка</small></span><span>＋</span></button>`).join('')}</div>` : `<div class="rsf-empty">Пока нет недавних приёмов еды. После первой записи они появятся здесь для добавления в один тап.</div>`;
      win.__rinloSmartFoodRecent = recent;
      return;
    }
    panel.innerHTML = `
      <textarea id="rsfText" class="rsf-input" placeholder="Например: куриная грудка, рис и огурец"></textarea>
      <div id="rsfSuggestions" class="rsf-suggestions"></div>
      <button class="rsf-primary" onclick="rinloSmartFoodAnalyze('text')">Распознать описание</button>`;
    const input = doc.getElementById('rsfText');
    input?.addEventListener('input', () => renderSuggestions(win, doc));
  }

  function renderSuggestions(win, doc) {
    const input = doc.getElementById('rsfText');
    const target = doc.getElementById('rsfSuggestions');
    if (!input || !target) return;
    const list = suggestions(input.value);
    target.innerHTML = list.map((item, index) => `<button class="rsf-suggestion" onclick="rinloSmartFoodAddSuggestion(${index})"><span class="e">${item.emoji}</span><span><b>${esc(item.name)}</b><small>Типовая порция ${Math.round(item.serving)} г · ${Math.round(item.kcal100 * item.serving / 100)} ккал</small></span></button>`).join('');
    win.__rinloSmartFoodSuggestions = list;
  }

  function confirmation(win, doc, text, parsed, source = 'text', multiplier = 1) {
    const panel = doc.getElementById('rsfPanel');
    if (!panel) return;
    win.__rinloSmartFoodDraft = { text, source, multiplier };
    const items = parsed.items || [];
    const fallback = typeof win.estimateFood === 'function' ? win.estimateFood(text) : { cal: 450, protein: 20 };
    const kcal = items.length ? parsed.kcal : Math.round(Number(fallback?.cal || 450));
    const protein = items.length ? parsed.protein : Math.round(Number(fallback?.protein || 20));
    panel.innerHTML = `
      <div class="rsf-confirm">
        <div class="rsf-head"><div class="rsf-kicker">Проверьте перед сохранением</div><h2>Похоже на это</h2><p>${items.length ? 'Rinlo собрал оценку из найденных продуктов.' : 'Точного совпадения в каталоге нет, поэтому показываем ориентировочную оценку.'}</p></div>
        <div class="rsf-detected">${items.length ? items.map(item => `<span class="rsf-chip">${item.emoji} ${esc(item.name)} · ${item.grams} г</span>`).join('') : `<span class="rsf-chip">🍽️ ${esc(text)}</span>`}</div>
        <div class="rsf-portion"><button class="${multiplier===0.75?'active':''}" onclick="rinloSmartFoodPortion(.75)">Небольшая</button><button class="${multiplier===1?'active':''}" onclick="rinloSmartFoodPortion(1)">Средняя</button><button class="${multiplier===1.35?'active':''}" onclick="rinloSmartFoodPortion(1.35)">Большая</button></div>
        <div class="field"><label>Описание</label><textarea id="rfFoodText">${esc(text)}</textarea></div>
        <div class="rsf-total"><div class="field"><label>Ккал</label><input id="rfFoodCal" inputmode="numeric" value="${Math.max(0, Math.round(kcal))}"></div><div class="field"><label>Белок, г</label><input id="rfFoodProtein" inputmode="numeric" value="${Math.max(0, Math.round(protein))}"></div></div>
        <div class="rsf-note">Это оценка, а не лабораторный расчёт. Если знаете точнее — поправьте цифры перед сохранением.</div>
        <button class="rsf-primary" onclick="rinloSmartFoodSave()">Всё верно — сохранить</button>
        <button class="rsf-back" onclick="rinloSmartFoodMode('${source === 'recent' ? 'recent' : source}')">← Назад</button>
      </div>`;
    win.__rinloSmartFoodParsed = parsed;
  }

  function install(win, doc) {
    if (!win || !doc?.body) return;
    ensureStyles(doc);
    if (typeof win.rinloSaveFood !== 'function') return;

    win.openFood = () => shell(win, doc, 'text');
    win.rinloSmartFoodMode = (mode) => renderMode(win, doc, ['photo','text','recent'].includes(mode) ? mode : 'text');
    win.rinloSmartFoodSuggest = () => renderSuggestions(win, doc);
    win.rinloSmartFoodAddSuggestion = (index) => {
      const item = win.__rinloSmartFoodSuggestions?.[Number(index)];
      const input = doc.getElementById('rsfText');
      if (!item || !input) return;
      const prefix = input.value.trim();
      input.value = prefix ? `${prefix}${/[,.]$/.test(prefix) ? ' ' : ', '}${item.name}` : item.name;
      input.focus();
      renderSuggestions(win, doc);
    };
    win.rinloSmartFoodAnalyze = (source = 'text') => {
      const text = (source === 'photo' ? doc.getElementById('rsfPhotoText') : doc.getElementById('rsfText'))?.value?.trim();
      if (!text) return win.toast?.(source === 'photo' ? 'Добавьте короткую подпись к фото' : 'Напишите, что вы съели');
      confirmation(win, doc, text, parseText(text, 1), source, 1);
    };
    win.rinloSmartFoodPortion = (multiplier) => {
      const draft = win.__rinloSmartFoodDraft;
      if (!draft?.text) return;
      const value = [0.75,1,1.35].includes(Number(multiplier)) ? Number(multiplier) : 1;
      confirmation(win, doc, draft.text, parseText(draft.text, value), draft.source || 'text', value);
    };
    win.rinloSmartFoodUseRecent = (index) => {
      const item = win.__rinloSmartFoodRecent?.[Number(index)];
      if (!item) return;
      confirmation(win, doc, item.text, { items:[], kcal:item.cal, protein:item.protein, confidence:'recent' }, 'recent', 1);
      const cal = doc.getElementById('rfFoodCal');
      const protein = doc.getElementById('rfFoodProtein');
      if (cal) cal.value = Math.round(item.cal || 0);
      if (protein) protein.value = Math.round(item.protein || 0);
    };
    win.rinloSmartFoodPhotoSelected = (input) => {
      const file = input?.files?.[0];
      if (!file) return;
      const reader = new win.FileReader();
      reader.onload = () => {
        const target = doc.getElementById('rsfPhotoPreview');
        if (target) target.innerHTML = `<img src="${String(reader.result || '')}" alt="Выбранная еда">`;
      };
      reader.readAsDataURL(file);
    };
    win.rinloSmartFoodSave = () => win.rinloSaveFood?.();
    win.RinloSmartFood = Object.freeze({ version: VERSION, parseText, suggestions });
    win.__rinloSmartFood = VERSION;
  }

  function mount() {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc?.body) return;
    install(win, doc);
    clearTimeout(installTimer);
    installTimer = setTimeout(() => install(win, doc), 400);
  }

  frame.addEventListener('load', () => setTimeout(mount, 0));
  setTimeout(mount, 0);
  setTimeout(mount, 220);
})();
