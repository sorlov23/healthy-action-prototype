(() => {
  const frame = document.getElementById('app');
  const foodCatalog = window.HEALTHY_FOOD_CATALOG || [];

  const norm = s => String(s || '').toLowerCase().replaceAll('ё', 'е').replace(/[^a-zа-я0-9%]+/gi, ' ').trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const foodById = id => foodCatalog.find(f => f.id === id);
  const portionNutrition = (f, grams = f.portion) => ({
    cal: Math.round(f.kcal100 * grams / 100),
    protein: Math.round(f.protein100 * grams / 100)
  });

  function usage(){
    try { return JSON.parse(localStorage.getItem('ha_food_usage') || '{}'); }
    catch { return {}; }
  }
  function recordUsage(id){
    const u = usage();
    u[id] = {count:(u[id]?.count || 0) + 1, last:Date.now()};
    localStorage.setItem('ha_food_usage', JSON.stringify(u));
  }
  function currentFragment(text){
    const s = String(text || '');
    const i = Math.max(s.lastIndexOf(','), s.lastIndexOf(';'), s.lastIndexOf('+'), s.lastIndexOf('\n'));
    return s.slice(i + 1).trim();
  }
  function searchFoods(query){
    const q = norm(query);
    if(q.length < 2) return [];
    const words = q.split(/\s+/).filter(Boolean), u = usage();
    return foodCatalog.map(f => {
      const names = [f.name, ...(f.aliases || [])].map(norm);
      let best = -1;
      for(const n of names){
        const tokens = n.split(' ');
        const all = words.every(w => tokens.some(t => t.startsWith(w)) || n.includes(w));
        if(!all) continue;
        let score = 20;
        if(n === q) score += 100;
        if(n.startsWith(q)) score += 70;
        if(tokens.some(t => t.startsWith(q))) score += 45;
        score += (u[f.id]?.count || 0) * 12;
        if(u[f.id]?.last) score += Math.max(0, 12 - (Date.now() - u[f.id].last) / 86400000);
        best = Math.max(best, score);
      }
      return {f, score:best};
    }).filter(x => x.score >= 0)
      .sort((a,b) => b.score - a.score || a.f.name.localeCompare(b.f.name, 'ru'))
      .slice(0, 6).map(x => x.f);
  }
  function popularFoods(){
    const u = usage();
    const used = Object.entries(u)
      .sort((a,b) => (b[1].count || 0) - (a[1].count || 0) || (b[1].last || 0) - (a[1].last || 0))
      .map(([id]) => foodById(id)).filter(Boolean);
    const defaults = ['chicken_breast','egg','rice_white','cottage5','cappuccino','banana'].map(foodById).filter(Boolean);
    return [...used, ...defaults].filter((f,i,a) => a.findIndex(x => x.id === f.id) === i).slice(0,5);
  }
  function matchFoodsInText(text){
    const q = norm(text);
    if(!q) return [];
    const candidates = [];
    foodCatalog.forEach(f => {
      const names = [f.name, ...(f.aliases || [])].map(norm).filter(x => x.length >= 3).sort((a,b) => b.length - a.length);
      const hit = names.find(a => q.includes(a));
      if(hit) candidates.push({f, len:hit.length});
    });
    return candidates.sort((a,b) => b.len - a.len)
      .filter((x,i,a) => a.findIndex(y => y.f.id === x.f.id) === i)
      .slice(0,6).map(x => x.f);
  }

  function ensureUiStyle(doc){
    if(doc.getElementById('pwa-shared-ui-polish')) return;
    const style = doc.createElement('style');
    style.id = 'pwa-shared-ui-polish';
    style.textContent = `
      .choice>b,.choice>span{display:block}.choice>span{margin-top:4px;color:var(--muted);font-size:13px;line-height:1.35}
      .sheet .choice{width:100%;min-height:74px;border-radius:20px;padding:14px 16px;text-align:left}
      .sheet .quickChoice{display:flex;align-items:center;gap:14px}.sheet .quickIcon{flex:0 0 40px;width:40px;height:40px;display:grid;place-items:center;font-size:26px;line-height:1}
      .sheet .quickCopy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.sheet .quickCopy b{display:block;font-size:17px;line-height:1.22;color:var(--text);font-weight:800}.sheet .quickCopy span{display:block;font-size:13px;line-height:1.35;color:var(--muted);margin:0;overflow-wrap:anywhere}
      .foodSuggestBox{margin-top:9px;display:grid;gap:7px}.foodSuggestLabel{font-size:11px;color:var(--muted);font-weight:800;margin:3px 2px 0}
      .foodSuggest{width:100%;border:1px solid var(--line);background:#fff;border-radius:16px;padding:11px 12px;display:flex;align-items:center;gap:11px;text-align:left}
      .foodSuggest:active{background:#f2f8f4}.foodSuggestIcon{width:35px;height:35px;border-radius:11px;background:var(--gs);display:grid;place-items:center;font-size:20px;flex:none}
      .foodSuggestCopy{flex:1;min-width:0}.foodSuggestCopy b{display:block;font-size:14px;line-height:1.25}.foodSuggestCopy small{display:block;color:var(--muted);font-size:11px;line-height:1.35;margin-top:3px}
      .foodCatalogHint{font-size:11px;line-height:1.45;color:var(--muted);padding:10px 2px 0}.foodMatchChips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px}.foodMatchChip{font-size:11px;background:var(--gs);color:var(--gd);border-radius:999px;padding:6px 9px}
      .sheet{will-change:transform;overscroll-behavior:contain}.sheet .handle{position:relative;touch-action:none;cursor:grab}.sheet .handle:before{content:'';position:absolute;left:-44px;right:-44px;top:-14px;bottom:-16px}
      .foodModeGrid{display:grid;gap:8px;margin-top:14px}.foodMode{width:100%;border:1px solid var(--line);background:#fff;border-radius:19px;padding:14px;display:flex;align-items:center;gap:13px;text-align:left}.foodMode:active{background:#f4f8f5}
      .foodModeIcon{width:44px;height:44px;border-radius:14px;background:var(--gs);display:grid;place-items:center;font-size:24px;flex:none}.foodModeIcon.blue{background:var(--bs)}
      .foodModeCopy{flex:1;min-width:0}.foodModeCopy b{display:block;font-size:15px}.foodModeCopy small{display:block;color:var(--muted);font-size:11px;line-height:1.35;margin-top:3px}
      .photoPreview{width:100%;height:218px;object-fit:cover;border-radius:20px;background:#eef2ee;margin-top:12px;display:block}.photoVisionNote{margin-top:10px;padding:12px 13px;border-radius:16px;background:#eef7f1;border:1px solid #d9eadf}.photoVisionNote b{display:block;font-size:13px}.photoVisionNote span{display:block;color:#68756b;font-size:11px;line-height:1.45;margin-top:4px}
      .photoSelected{display:grid;gap:7px;margin-top:10px}.photoSelectedRow{display:flex;align-items:center;gap:9px;border:1px solid var(--line);background:#fff;border-radius:15px;padding:9px 10px}.photoSelectedIcon{width:32px;height:32px;border-radius:10px;background:var(--gs);display:grid;place-items:center;flex:none}.photoSelectedMain{flex:1;min-width:0}.photoSelectedMain b{display:block;font-size:13px}.photoSelectedMain small{display:block;font-size:10px;color:var(--muted);margin-top:2px}.photoGram{width:68px!important;padding:8px!important;border-radius:11px!important;text-align:center;font-size:12px!important}.photoRemove{border:0;background:#f1f4f1;color:#778078;width:30px;height:30px;border-radius:10px;font-size:17px}.photoEmpty{padding:12px 2px;color:var(--muted);font-size:12px;line-height:1.45}
    `;
    doc.head.appendChild(style);
  }

  function applyOnboardingPolish(doc){
    const ob = doc.getElementById('onboarding');
    if(!ob) return;
    if(!doc.getElementById('pwa-onboarding-polish')){
      const style = doc.createElement('style');
      style.id = 'pwa-onboarding-polish';
      style.textContent = `
        #onboarding{padding-top:max(28px,env(safe-area-inset-top));padding-left:18px;padding-right:18px;padding-bottom:36px}#onboarding .k{font-size:10px;letter-spacing:.12em;color:#7b857d}#onboarding h1{font-size:34px;line-height:1.02;margin:7px 0 10px;max-width:350px}#onboarding> .sub{font-size:14px;line-height:1.5;max-width:360px;color:#778078}#onboarding .steps{margin:22px 0 26px;gap:8px}#onboarding .step{height:6px;background:#dfe6df}#onboarding .step.on{background:linear-gradient(90deg,#28a65a,#39b96b)}#onboarding .field{margin-top:15px}#onboarding .field label{font-size:13px;color:#667168;margin-bottom:8px}#onboarding .field input,#onboarding .field select{height:58px;border-radius:19px;padding:0 17px;font-size:18px;background:#fff;border:1px solid #dfe6df;box-shadow:0 1px 0 rgba(20,40,25,.02)}#onboarding .field input:focus,#onboarding .field select:focus{border-color:#7bc894;box-shadow:0 0 0 4px rgba(39,158,83,.08)}#onboarding .focusGroup{margin-top:18px}#onboarding .focusGroup>label{font-size:13px;font-weight:800;color:#667168;margin-bottom:8px}#onboarding .choice.focusChoice{display:flex;align-items:center;gap:14px;min-height:78px;border-radius:20px;margin:7px 0;padding:16px;border:1px solid #dfe6df;background:#fff;text-align:left;box-shadow:0 1px 0 rgba(20,40,25,.02)}#onboarding .choice.focusChoice.sel{background:#f1faf4;border-color:#7fce9a;box-shadow:0 0 0 1px rgba(39,158,83,.05)}#onboarding .focusIcon{flex:0 0 38px;width:38px;font-size:28px;line-height:1.1;text-align:center}#onboarding .focusCopy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}#onboarding .focusCopy b{display:block;font-size:16px;line-height:1.24;color:#17211a}#onboarding .focusCopy span{display:block;font-size:13px;line-height:1.35;color:#788179;margin:0}#onboarding .onbBadge{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:#edf8f0;color:#237744;font-size:12px;font-weight:800;margin-top:10px}#onboarding .onbBadgeDot{width:7px;height:7px;border-radius:50%;background:#2eac61}#onboarding .onbNote{margin-top:12px;padding:12px 13px;border-radius:16px;background:#eef3ef;color:#6d786f;font-size:12px;line-height:1.45}#onboarding .btn.full{position:sticky;bottom:calc(12px + env(safe-area-inset-bottom));margin-top:22px;min-height:58px;border-radius:20px;font-size:17px;box-shadow:0 12px 26px rgba(35,154,85,.20);z-index:4}`;
      doc.head.appendChild(style);
    }
    const mainSub = ob.querySelector(':scope > .sub');
    if(mainSub) mainSub.textContent = 'Эти значения сохранятся и будут влиять на дневные цели.';
    if(!ob.querySelector('.onbBadge')){
      const sub = ob.querySelector(':scope > .sub');
      if(sub){
        const badge = doc.createElement('div');
        badge.className = 'onbBadge';
        badge.innerHTML = '<span class="onbBadgeDot"></span>Займёт меньше минуты';
        sub.insertAdjacentElement('afterend', badge);
      }
    }
    const focusField = [...ob.querySelectorAll('.field')].find(el => el.querySelector('label')?.textContent.includes('Два фокуса'));
    if(focusField){
      focusField.classList.add('focusGroup');
      const label = focusField.querySelector('label');
      const choices = [...focusField.querySelectorAll('.choice[data-h]')];
      const cfg = {
        vape:['🚭','Без вейпа / сигарет','Ежедневная отметка без давления и штрафов'],
        fastfood:['🍔','Меньше фастфуда','Следить за частотой, а не запрещать полностью'],
        water:['💧','Пить больше воды','Мягкая дневная цель без лишних напоминаний']
      };
      const updateCount = () => { if(label) label.textContent = `Выбрано ${choices.filter(x => x.classList.contains('sel')).length} из 2`; };
      choices.forEach(choice => {
        const c = cfg[choice.dataset.h];
        if(c && !choice.classList.contains('focusChoice')){
          choice.classList.add('focusChoice');
          choice.innerHTML = `<span class="focusIcon">${c[0]}</span><span class="focusCopy"><b>${c[1]}</b><span>${c[2]}</span></span>`;
          choice.addEventListener('click', () => setTimeout(updateCount,0));
        }
      });
      updateCount();
      const cta = ob.querySelector('.btn.full');
      if(cta && !ob.querySelector('.onbNote')){
        const note = doc.createElement('div');
        note.className = 'onbNote';
        note.textContent = 'Фокусы можно будет изменить в профиле в любой момент.';
        cta.insertAdjacentElement('beforebegin', note);
      }
    }
  }

  function applyFoodTextFlow(doc, win){
    const fallbackEstimate = typeof win.estimateFood === 'function' ? win.estimateFood.bind(win) : () => ({cal:450, protein:20});
    const originalSaveFood = typeof win.saveFood === 'function' ? win.saveFood.bind(win) : null;
    win.__selectedFoodIds = [];

    win.renderFoodSuggestions = function(){
      const input = doc.getElementById('foodText'), box = doc.getElementById('foodSuggestions');
      if(!input || !box) return;
      const fragment = currentFragment(input.value);
      const items = fragment.length >= 2 ? searchFoods(fragment) : popularFoods();
      const label = fragment.length >= 2 ? 'Подходит' : 'Недавнее и популярное';
      if(!items.length){
        box.innerHTML = fragment.length >= 2 ? '<div class="foodCatalogHint">В каталоге пока нет совпадения — можно продолжить обычным текстом.</div>' : '';
        return;
      }
      box.innerHTML = `<div class="foodSuggestLabel">${label}</div><div class="foodSuggestBox">${items.map(f => {
        const n = portionNutrition(f);
        return `<button class="foodSuggest" type="button" onclick="pickFood('${f.id}')"><span class="foodSuggestIcon">${f.icon}</span><span class="foodSuggestCopy"><b>${esc(f.name)}</b><small>${f.portion} г · ≈${n.cal} ккал · ${n.protein} г белка</small></span></button>`;
      }).join('')}</div>`;
    };
    win.foodAutocompleteInput = () => win.renderFoodSuggestions();
    win.pickFood = function(id){
      const f = foodById(id), input = doc.getElementById('foodText');
      if(!f || !input) return;
      const raw = input.value;
      const idx = Math.max(raw.lastIndexOf(','), raw.lastIndexOf(';'), raw.lastIndexOf('+'), raw.lastIndexOf('\n'));
      const prefix = idx >= 0 ? raw.slice(0,idx+1).trimEnd() + ' ' : '';
      input.value = prefix + f.name;
      if(!win.__selectedFoodIds.includes(id)) win.__selectedFoodIds.push(id);
      recordUsage(id);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      win.renderFoodSuggestions();
    };
    win.openFoodText = function(){
      win.__selectedFoodIds = [];
      win.openSheet(`<h2>Записать еду</h2><div class="sub">Начни печатать — предложим продукты из каталога. Можно и просто написать фразу целиком.</div><div class="field"><label>Что ел?</label><textarea id="foodText" autocomplete="off" autocapitalize="sentences" placeholder="Например: куриная грудка, рис и овощи" oninput="foodAutocompleteInput()"></textarea></div><div id="foodSuggestions"></div><div class="foodCatalogHint">КБЖУ — ориентировочные и их можно исправить перед сохранением.</div><button class="btn secondary full" onclick="previewFood()">Оценить</button><div id="foodEstimate"></div>`);
      setTimeout(() => { doc.getElementById('foodText')?.focus(); win.renderFoodSuggestions(); }, 0);
    };
    win.previewFood = function(){
      const input = doc.getElementById('foodText'), out = doc.getElementById('foodEstimate');
      const text = input?.value.trim();
      if(!text) return win.toast?.('Напиши, что ты ел');
      let matched = (win.__selectedFoodIds || []).map(foodById).filter(Boolean).filter(f => norm(text).includes(norm(f.name)));
      if(!matched.length) matched = matchFoodsInText(text);
      let e;
      if(matched.length){
        e = matched.reduce((a,f) => { const n = portionNutrition(f); a.cal += n.cal; a.protein += n.protein; return a; }, {cal:0,protein:0});
      } else e = fallbackEstimate(text);
      out.innerHTML = `<div class="two"><div class="field"><label>Ккал</label><input id="foodCal" inputmode="numeric" value="${Math.round(e.cal)}"></div><div class="field"><label>Белок, г</label><input id="foodProtein" inputmode="numeric" value="${Math.round(e.protein)}"></div></div>${matched.length ? `<div class="foodMatchChips">${matched.map(f => `<span class="foodMatchChip">${f.icon} ${esc(f.name)}</span>`).join('')}</div>` : ''}<div class="tiny">Оценка прототипа. Проверь порцию и при необходимости исправь цифры.</div><button class="btn primary full" onclick="saveFood()">Записать</button>`;
    };
    if(originalSaveFood){
      win.saveFood = function(){
        const text = doc.getElementById('foodText')?.value || '';
        matchFoodsInText(text).forEach(f => recordUsage(f.id));
        return originalSaveFood();
      };
    }
  }

  function applyPhotoFoodFlow(doc, win){
    win.__photoFood = {url:null, selected:[]};

    function revokePhoto(){
      if(win.__photoFood.url){ try { URL.revokeObjectURL(win.__photoFood.url); } catch {} }
      win.__photoFood.url = null;
    }
    function selectedById(id){ return win.__photoFood.selected.find(x => x.id === id); }

    win.openFood = function(){
      win.openSheet(`<h2>Добавить еду</h2><div class="sub">Самый быстрый путь — фото. Текстовый ввод остаётся доступен.</div><div class="foodModeGrid"><button class="foodMode" onclick="pickFoodPhoto('camera')"><span class="foodModeIcon">📷</span><span class="foodModeCopy"><b>Сфотографировать</b><small>Открыть камеру и снять тарелку</small></span></button><button class="foodMode" onclick="pickFoodPhoto('library')"><span class="foodModeIcon blue">🖼️</span><span class="foodModeCopy"><b>Выбрать фото</b><small>Взять готовый снимок из медиатеки</small></span></button><button class="foodMode" onclick="openFoodText()"><span class="foodModeIcon">⌨️</span><span class="foodModeCopy"><b>Ввести текстом</b><small>Автодополнение из Food Catalog</small></span></button></div>`);
    };

    win.pickFoodPhoto = function(mode){
      const input = doc.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if(mode === 'camera') input.setAttribute('capture', 'environment');
      input.style.display = 'none';
      doc.body.appendChild(input);
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        input.remove();
        if(!file) return;
        revokePhoto();
        win.__photoFood.url = URL.createObjectURL(file);
        win.__photoFood.selected = [];
        win.openPhotoReview();
      }, {once:true});
      input.click();
    };

    win.openPhotoReview = function(){
      const url = win.__photoFood.url;
      if(!url) return win.openFood();
      win.openSheet(`<h2>Фото еды</h2><img class="photoPreview" src="${url}" alt="Фото еды"><div class="photoVisionNote"><b>✦ Фото готово к анализу</b><span>В статическом прототипе Vision API ещё не подключён. Пока подтвердим состав через Food Catalog — именно этот экран позже получит распознанные продукты автоматически.</span></div><div class="field"><label>Что на фото?</label><input id="photoFoodQuery" autocomplete="off" placeholder="Например: курица" oninput="photoSearchInput()"></div><div id="photoSuggestions"></div><div class="sec" style="margin-top:14px"><h2>Состав</h2><span id="photoSelectedCount">0 позиций</span></div><div id="photoSelected" class="photoSelected"></div><button class="btn secondary full" onclick="photoEstimate()">Рассчитать КБЖУ</button><button class="btn ghost full" onclick="openFoodText()">Ввести описанием вместо фото</button><div id="photoEstimate"></div>`);
      setTimeout(() => win.renderPhotoFood(), 0);
    };

    win.photoSearchInput = () => win.renderPhotoFood();
    win.photoPickFood = function(id){
      const f = foodById(id);
      if(!f) return;
      if(!selectedById(id)) win.__photoFood.selected.push({id, grams:f.portion});
      recordUsage(id);
      const q = doc.getElementById('photoFoodQuery');
      if(q) q.value = '';
      win.renderPhotoFood();
    };
    win.photoRemoveFood = function(id){
      win.__photoFood.selected = win.__photoFood.selected.filter(x => x.id !== id);
      win.renderPhotoFood();
    };
    win.photoSetGrams = function(id, value){
      const x = selectedById(id), n = parseFloat(String(value).replace(',','.'));
      if(x && Number.isFinite(n) && n > 0 && n < 2000) x.grams = n;
      const row = doc.querySelector(`[data-photo-id="${id}"] .photoSelectedMain small`);
      const f = foodById(id);
      if(row && f && x){ const p = portionNutrition(f, x.grams); row.textContent = `≈${p.cal} ккал · ${p.protein} г белка`; }
    };
    win.renderPhotoFood = function(){
      const q = doc.getElementById('photoFoodQuery'), suggest = doc.getElementById('photoSuggestions'), selected = doc.getElementById('photoSelected'), count = doc.getElementById('photoSelectedCount');
      if(!suggest || !selected) return;
      const query = q?.value.trim() || '';
      const items = query.length >= 2 ? searchFoods(query) : popularFoods().filter(f => !selectedById(f.id));
      suggest.innerHTML = `<div class="foodSuggestLabel">${query.length >= 2 ? 'Подходит' : 'Можно добавить'}</div><div class="foodSuggestBox">${items.map(f => { const n = portionNutrition(f); return `<button class="foodSuggest" type="button" onclick="photoPickFood('${f.id}')"><span class="foodSuggestIcon">${f.icon}</span><span class="foodSuggestCopy"><b>${esc(f.name)}</b><small>${f.portion} г · ≈${n.cal} ккал · ${n.protein} г белка</small></span></button>`; }).join('')}</div>`;
      if(count) count.textContent = `${win.__photoFood.selected.length} ${win.__photoFood.selected.length === 1 ? 'позиция' : win.__photoFood.selected.length < 5 ? 'позиции' : 'позиций'}`;
      selected.innerHTML = win.__photoFood.selected.length ? win.__photoFood.selected.map(x => {
        const f = foodById(x.id), n = portionNutrition(f, x.grams);
        return `<div class="photoSelectedRow" data-photo-id="${x.id}"><span class="photoSelectedIcon">${f.icon}</span><span class="photoSelectedMain"><b>${esc(f.name)}</b><small>≈${n.cal} ккал · ${n.protein} г белка</small></span><input class="photoGram" inputmode="numeric" value="${Math.round(x.grams)}" oninput="photoSetGrams('${x.id}',this.value)"><span class="tiny">г</span><button class="photoRemove" onclick="photoRemoveFood('${x.id}')">×</button></div>`;
      }).join('') : '<div class="photoEmpty">Добавь хотя бы один продукт. Когда подключим Vision, этот список будет заполняться автоматически после снимка.</div>';
    };

    win.photoEstimate = function(){
      const list = win.__photoFood.selected;
      if(!list.length) return win.toast?.('Добавь хотя бы один продукт с фото');
      const total = list.reduce((a,x) => {
        const f = foodById(x.id), n = portionNutrition(f, x.grams);
        a.cal += n.cal; a.protein += n.protein; return a;
      }, {cal:0,protein:0});
      const names = list.map(x => foodById(x.id)?.name).filter(Boolean).join(', ');
      const out = doc.getElementById('photoEstimate');
      out.innerHTML = `<textarea id="foodText" style="display:none">📷 ${esc(names)}</textarea><div class="two"><div class="field"><label>Ккал</label><input id="foodCal" inputmode="numeric" value="${Math.round(total.cal)}"></div><div class="field"><label>Белок, г</label><input id="foodProtein" inputmode="numeric" value="${Math.round(total.protein)}"></div></div><div class="tiny">Проверь оценку и при необходимости исправь цифры.</div><button class="btn primary full" onclick="savePhotoFood()">Записать еду</button>`;
      out.scrollIntoView({behavior:'smooth', block:'nearest'});
    };
    win.savePhotoFood = function(){
      win.__photoFood.selected.forEach(x => recordUsage(x.id));
      win.saveFood();
      setTimeout(revokePhoto, 500);
    };

    const quickAction = [...doc.querySelectorAll('.action')].find(b => b.getAttribute('onclick')?.includes('openFood()'));
    const small = quickAction?.querySelector('small');
    if(small) small.textContent = 'Фото или текст';
  }

  function applyQuickMenu(doc, win){
    win.openQuick = function(){
      win.openSheet(`<h2>Что добавить?</h2><div class="list"><button class="choice quickChoice" onclick="openFood()"><span class="quickIcon">🍽</span><span class="quickCopy"><b>Еда</b><span>Фото или текст</span></span></button><button class="choice quickChoice" onclick="openWeight()"><span class="quickIcon">⚖️</span><span class="quickCopy"><b>Вес</b><span>Любое значение</span></span></button><button class="choice quickChoice" onclick="addWater(250);closeSheet()"><span class="quickIcon">💧</span><span class="quickCopy"><b>Вода</b><span>Добавить 250 мл</span></span></button><button class="choice quickChoice" onclick="addSteps(1000);closeSheet()"><span class="quickIcon">👟</span><span class="quickCopy"><b>Шаги</b><span>Добавить 1000 шагов</span></span></button></div>`);
    };
  }

  function applySheetDismissGestures(doc, win){
    if(win.__sheetGesturesPatched) return;
    const overlay = doc.getElementById('overlay'), sheet = doc.querySelector('.sheet'), handle = doc.querySelector('.sheet .handle');
    if(!overlay || !sheet || !handle || typeof win.closeSheet !== 'function') return;
    win.__sheetGesturesPatched = true;
    const originalClose = win.closeSheet.bind(win);
    const reset = () => { sheet.style.transition=''; sheet.style.transform=''; overlay.style.background=''; };
    win.closeSheet = function(){ try { doc.activeElement?.blur?.(); } catch {} reset(); originalClose(); };
    overlay.addEventListener('click', e => { if(e.target === overlay) win.closeSheet(); });

    let startY=0,startX=0,lastY=0,startAt=0,dragging=false;
    const begin = e => {
      if(!overlay.classList.contains('on') || sheet.scrollTop > 0) return;
      const t = e.touches?.[0]; if(!t) return;
      startY = lastY = t.clientY; startX = t.clientX; startAt = performance.now(); dragging = false; sheet.style.transition='none';
    };
    const move = e => {
      const t = e.touches?.[0]; if(!t || !startAt) return;
      const dy = t.clientY - startY, dx = t.clientX - startX;
      if(dy <= 0 || Math.abs(dx) > Math.abs(dy)){ if(!dragging) return; }
      if(sheet.scrollTop > 0 && !dragging) return;
      if(dy > 5 && Math.abs(dy) >= Math.abs(dx)) dragging = true;
      if(!dragging) return;
      e.preventDefault(); lastY = t.clientY;
      const y = Math.max(0, dy * .92);
      sheet.style.transform = `translate3d(0,${y}px,0)`;
      const alpha = Math.max(.08, .34 * (1 - Math.min(y/320,.8)));
      overlay.style.background = `rgba(20,27,21,${alpha})`;
    };
    const end = () => {
      if(!startAt) return;
      const dy = Math.max(0,lastY-startY), dt = Math.max(1,performance.now()-startAt), velocity = dy/dt;
      const dismiss = dragging && (dy > 92 || (dy > 38 && velocity > .55));
      startAt=0; dragging=false; sheet.style.transition='transform .22s cubic-bezier(.22,.8,.32,1)';
      if(dismiss){
        sheet.style.transform='translate3d(0,105%,0)'; overlay.style.background='rgba(20,27,21,0)'; setTimeout(() => win.closeSheet(),220);
      } else {
        sheet.style.transform='translate3d(0,0,0)'; overlay.style.background=''; setTimeout(() => {sheet.style.transition='';sheet.style.transform='';},220);
      }
    };
    sheet.addEventListener('touchstart', begin, {passive:true});
    sheet.addEventListener('touchmove', move, {passive:false});
    sheet.addEventListener('touchend', end, {passive:true});
    sheet.addEventListener('touchcancel', end, {passive:true});
  }

  function applyAll(){
    const doc = frame.contentDocument, win = frame.contentWindow;
    if(!doc || !win || typeof win.openSheet !== 'function') return;
    ensureUiStyle(doc);
    applyOnboardingPolish(doc);
    applyFoodTextFlow(doc, win);
    applyPhotoFoodFlow(doc, win);
    applyQuickMenu(doc, win);
    applySheetDismissGestures(doc, win);
  }

  frame.addEventListener('load', () => {
    document.getElementById('loading').style.display = 'none';
    try { applyAll(); } catch(e) { console.error('Healthy Action enhancements', e); }
  });
})();