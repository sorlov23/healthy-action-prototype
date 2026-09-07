(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const config = window.HEALTHY_ACTION_CONFIG || {};
  const apiBase = String(config.apiBase || '').replace(/\/+$/, '');
  const timeoutMs = Math.max(500, Number(config.apiTimeoutMs || 2500));
  const rawCatalog = Array.isArray(window.HEALTHY_FOOD_CATALOG) ? window.HEALTHY_FOOD_CATALOG : [];

  const norm = (value) => String(value || '')
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^a-zа-я0-9%]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function normalizeFood(record) {
    if (Array.isArray(record)) {
      return {
        id: String(record[0]),
        name: String(record[1]),
        aliases: String(record[2] || '').split('|').map((x) => x.trim()).filter(Boolean),
        kcal100: Number(record[3] || 0),
        protein100: Number(record[4] || 0),
        portion: Number(record[5] || 100),
        icon: String(record[6] || '🍽️'),
      };
    }
    return {
      ...record,
      id: String(record.id),
      name: String(record.name),
      aliases: Array.isArray(record.aliases) ? record.aliases : [],
      kcal100: Number(record.kcal100 || 0),
      protein100: Number(record.protein100 || 0),
      portion: Number(record.portion || 100),
      icon: String(record.icon || '🍽️'),
    };
  }

  const localCatalog = rawCatalog.map(normalizeFood);
  const foodCache = new Map(localCatalog.map((food) => [food.id, food]));

  function getFood(id) { return foodCache.get(String(id)); }
  function cacheFoods(items = []) {
    items.map(normalizeFood).forEach((food) => foodCache.set(food.id, food));
  }
  function portionNutrition(food, grams = food.portion) {
    return {
      cal: Math.round(Number(food.kcal100 || 0) * Number(grams || 0) / 100),
      protein: Math.round(Number(food.protein100 || 0) * Number(grams || 0) / 100),
    };
  }
  function usage() {
    try { return JSON.parse(localStorage.getItem('ha_food_usage') || '{}'); }
    catch { return {}; }
  }
  function recordUsage(id) {
    const u = usage();
    u[id] = { count: (u[id]?.count || 0) + 1, last: Date.now() };
    localStorage.setItem('ha_food_usage', JSON.stringify(u));
  }
  function currentFragment(text) {
    const value = String(text || '');
    const index = Math.max(value.lastIndexOf(','), value.lastIndexOf(';'), value.lastIndexOf('+'), value.lastIndexOf('\n'));
    return value.slice(index + 1).trim();
  }
  function localSearch(query, limit = 6) {
    const q = norm(query);
    if (q.length < 2) return [];
    const words = q.split(/\s+/).filter(Boolean);
    const u = usage();
    return localCatalog.map((food) => {
      const names = [food.name, ...(food.aliases || [])].map(norm);
      let best = -1;
      for (const name of names) {
        const tokens = name.split(' ');
        if (!words.every((word) => tokens.some((token) => token.startsWith(word)) || name.includes(word))) continue;
        let score = 20;
        if (name === q) score += 100;
        if (name.startsWith(q)) score += 70;
        if (tokens.some((token) => token.startsWith(q))) score += 45;
        score += (u[food.id]?.count || 0) * 12;
        if (u[food.id]?.last) score += Math.max(0, 12 - (Date.now() - u[food.id].last) / 86400000);
        best = Math.max(best, score);
      }
      return { food, score: best };
    }).filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, 'ru'))
      .slice(0, limit)
      .map((x) => x.food);
  }
  function popularFoods() {
    const u = usage();
    const used = Object.entries(u)
      .sort((a, b) => (b[1].count || 0) - (a[1].count || 0) || (b[1].last || 0) - (a[1].last || 0))
      .map(([id]) => getFood(id)).filter(Boolean);
    const defaults = ['chicken_breast', 'egg', 'rice_white', 'cottage5', 'cappuccino', 'banana']
      .map(getFood).filter(Boolean);
    return [...used, ...defaults].filter((food, i, all) => all.findIndex((x) => x.id === food.id) === i).slice(0, 5);
  }

  async function requestJson(path, options = {}) {
    if (!apiBase) throw new Error('api_disabled');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
      });
      if (!response.ok) throw new Error(`api_${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const api = {
    enabled: Boolean(apiBase),
    base: apiBase,
    lastSource: apiBase ? 'remote' : 'local',
    async searchFoods(query, limit = 6) {
      if (!apiBase) return { source: 'local', items: localSearch(query, limit) };
      try {
        const data = await requestJson(`/api/v1/foods/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`);
        const items = Array.isArray(data.items) ? data.items.map(normalizeFood) : [];
        cacheFoods(items);
        api.lastSource = 'remote';
        return { source: 'remote', items };
      } catch (error) {
        console.warn('Healthy Action API search fallback', error);
        api.lastSource = 'local';
        return { source: 'local', items: localSearch(query, limit) };
      }
    },
    async resolveFood(text) {
      if (!apiBase) return null;
      try {
        const data = await requestJson('/api/v1/food/resolve', {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
        (data.items || []).forEach((item) => item.food && cacheFoods([item.food]));
        api.lastSource = 'remote';
        return data;
      } catch (error) {
        console.warn('Healthy Action API resolver fallback', error);
        api.lastSource = 'local';
        return null;
      }
    },
  };

  window.HealthyActionAPI = api;

  function suggestionHtml(items, label, handler) {
    if (!items.length) return '<div class="foodCatalogHint">В каталоге пока нет совпадения — можно продолжить обычным текстом.</div>';
    return `<div class="foodSuggestLabel">${esc(label)}</div><div class="foodSuggestBox">${items.map((food) => {
      const n = portionNutrition(food);
      return `<button class="foodSuggest" type="button" onclick="${handler}('${esc(food.id)}')"><span class="foodSuggestIcon">${food.icon}</span><span class="foodSuggestCopy"><b>${esc(food.name)}</b><small>${food.portion} г · ≈${n.cal} ккал · ${n.protein} г белка</small></span></button>`;
    }).join('')}</div>`;
  }

  function patchFrame(attempt = 0) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;
    if (win.__healthyApiBridgePatched) return;
    if (typeof win.renderFoodSuggestions !== 'function' || typeof win.previewFood !== 'function') {
      if (attempt < 30) setTimeout(() => patchFrame(attempt + 1), 50);
      return;
    }
    win.__healthyApiBridgePatched = true;

    const originalRenderFoodSuggestions = win.renderFoodSuggestions.bind(win);
    const originalPreviewFood = win.previewFood.bind(win);
    const originalRenderPhotoFood = typeof win.renderPhotoFood === 'function' ? win.renderPhotoFood.bind(win) : null;
    let textRequest = 0;
    let photoRequest = 0;

    win.pickFood = function(id) {
      const food = getFood(id);
      const input = doc.getElementById('foodText');
      if (!food || !input) return;
      const raw = input.value;
      const index = Math.max(raw.lastIndexOf(','), raw.lastIndexOf(';'), raw.lastIndexOf('+'), raw.lastIndexOf('\n'));
      const prefix = index >= 0 ? raw.slice(0, index + 1).trimEnd() + ' ' : '';
      input.value = prefix + food.name;
      win.__selectedFoodIds ||= [];
      if (!win.__selectedFoodIds.includes(food.id)) win.__selectedFoodIds.push(food.id);
      recordUsage(food.id);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      win.renderFoodSuggestions();
    };

    win.renderFoodSuggestions = async function() {
      const input = doc.getElementById('foodText');
      const box = doc.getElementById('foodSuggestions');
      if (!input || !box) return;
      const fragment = currentFragment(input.value);
      if (fragment.length < 2 || !api.enabled) return originalRenderFoodSuggestions();

      const requestId = ++textRequest;
      const localItems = localSearch(fragment, 6);
      box.innerHTML = suggestionHtml(localItems, 'Подходит', 'pickFood');
      const result = await api.searchFoods(fragment, 6);
      if (requestId !== textRequest || currentFragment(input.value) !== fragment) return;
      if (result.source === 'remote') box.innerHTML = suggestionHtml(result.items, 'Подходит', 'pickFood');
    };

    win.previewFood = async function() {
      const input = doc.getElementById('foodText');
      const out = doc.getElementById('foodEstimate');
      const text = input?.value.trim();
      if (!text) return win.toast?.('Напиши, что ты ел');
      if (!api.enabled || !out) return originalPreviewFood();

      out.innerHTML = '<div class="foodCatalogHint">Уточняем состав и КБЖУ…</div>';
      const resolved = await api.resolveFood(text);
      if (!resolved?.items?.length) return originalPreviewFood();

      const foods = resolved.items.map((item) => normalizeFood(item.food));
      cacheFoods(foods);
      win.__selectedFoodIds = foods.map((food) => food.id);
      const totals = resolved.totals || { kcal: 0, protein: 0 };
      out.innerHTML = `<div class="two"><div class="field"><label>Ккал</label><input id="foodCal" inputmode="numeric" value="${Math.round(Number(totals.kcal || 0))}"></div><div class="field"><label>Белок, г</label><input id="foodProtein" inputmode="numeric" value="${Math.round(Number(totals.protein || 0))}"></div></div><div class="foodMatchChips">${foods.map((food) => `<span class="foodMatchChip">${food.icon} ${esc(food.name)}</span>`).join('')}</div><div class="tiny">Оценка по каталогу. Проверь порции и при необходимости исправь цифры.</div><button class="btn primary full" onclick="saveFood()">Записать</button>`;
    };

    if (originalRenderPhotoFood && win.__photoFood) {
      win.photoPickFood = function(id) {
        const food = getFood(id);
        if (!food) return;
        if (!win.__photoFood.selected.some((x) => x.id === food.id)) win.__photoFood.selected.push({ id: food.id, grams: food.portion });
        recordUsage(food.id);
        const query = doc.getElementById('photoFoodQuery');
        if (query) query.value = '';
        win.renderPhotoFood();
      };

      win.photoSetGrams = function(id, value) {
        const selected = win.__photoFood.selected.find((x) => x.id === id);
        const grams = parseFloat(String(value).replace(',', '.'));
        if (selected && Number.isFinite(grams) && grams > 0 && grams < 2000) selected.grams = grams;
        const row = doc.querySelector(`[data-photo-id="${CSS.escape(id)}"] .photoSelectedMain small`);
        const food = getFood(id);
        if (row && food && selected) {
          const n = portionNutrition(food, selected.grams);
          row.textContent = `≈${n.cal} ккал · ${n.protein} г белка`;
        }
      };

      win.renderPhotoFood = async function() {
        const queryInput = doc.getElementById('photoFoodQuery');
        const suggest = doc.getElementById('photoSuggestions');
        const selectedBox = doc.getElementById('photoSelected');
        const count = doc.getElementById('photoSelectedCount');
        if (!suggest || !selectedBox) return;
        const query = queryInput?.value.trim() || '';

        const render = (items) => {
          suggest.innerHTML = suggestionHtml(items, query.length >= 2 ? 'Подходит' : 'Можно добавить', 'photoPickFood');
          const selected = win.__photoFood.selected.map((x) => ({ ...x, food: getFood(x.id) })).filter((x) => x.food);
          if (count) count.textContent = `${selected.length} ${selected.length === 1 ? 'позиция' : selected.length < 5 ? 'позиции' : 'позиций'}`;
          selectedBox.innerHTML = selected.length ? selected.map((x) => {
            const n = portionNutrition(x.food, x.grams);
            return `<div class="photoSelectedRow" data-photo-id="${esc(x.id)}"><span class="photoSelectedIcon">${x.food.icon}</span><span class="photoSelectedMain"><b>${esc(x.food.name)}</b><small>≈${n.cal} ккал · ${n.protein} г белка</small></span><input class="photoGram" inputmode="numeric" value="${Math.round(x.grams)}" oninput="photoSetGrams('${esc(x.id)}',this.value)"><span class="tiny">г</span><button class="photoRemove" onclick="photoRemoveFood('${esc(x.id)}')">×</button></div>`;
          }).join('') : '<div class="photoEmpty">Добавь хотя бы один продукт. Когда подключим Vision, этот список будет заполняться автоматически после снимка.</div>';
        };

        if (query.length < 2) {
          render(popularFoods().filter((food) => !win.__photoFood.selected.some((x) => x.id === food.id)));
          return;
        }

        const requestId = ++photoRequest;
        render(localSearch(query, 6));
        if (!api.enabled) return;
        const result = await api.searchFoods(query, 6);
        if (requestId !== photoRequest || (doc.getElementById('photoFoodQuery')?.value.trim() || '') !== query) return;
        if (result.source === 'remote') render(result.items);
      };

      win.photoEstimate = function() {
        const selected = win.__photoFood.selected.map((x) => ({ ...x, food: getFood(x.id) })).filter((x) => x.food);
        if (!selected.length) return win.toast?.('Добавь хотя бы один продукт с фото');
        const total = selected.reduce((acc, item) => {
          const n = portionNutrition(item.food, item.grams);
          acc.cal += n.cal;
          acc.protein += n.protein;
          return acc;
        }, { cal: 0, protein: 0 });
        const names = selected.map((x) => x.food.name).join(', ');
        const out = doc.getElementById('photoEstimate');
        if (!out) return;
        out.innerHTML = `<textarea id="foodText" style="display:none">📷 ${esc(names)}</textarea><div class="two"><div class="field"><label>Ккал</label><input id="foodCal" inputmode="numeric" value="${Math.round(total.cal)}"></div><div class="field"><label>Белок, г</label><input id="foodProtein" inputmode="numeric" value="${Math.round(total.protein)}"></div></div><div class="tiny">Проверь оценку и при необходимости исправь цифры.</div><button class="btn primary full" onclick="savePhotoFood()">Записать еду</button>`;
        out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };

      win.savePhotoFood = function() {
        win.__photoFood.selected.forEach((x) => recordUsage(x.id));
        win.saveFood();
      };
    }
  }

  frame.addEventListener('load', () => patchFrame());
  try {
    if (frame.contentDocument?.readyState === 'complete') setTimeout(() => patchFrame(), 0);
  } catch {}
})();
