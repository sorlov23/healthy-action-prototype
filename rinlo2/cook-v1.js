(function () {
  'use strict';

  const VERSION = 'v3-photo-ingredients';
  const STORAGE_KEY = 'rinlo2-cook-v1';
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const auth = window.RinloSupabaseAuth;
  const vision = window.RinloVision;
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const localOnly = new URLSearchParams(location.search).get('local') === '1';
  const aiEnabled = !localOnly && Boolean(auth?.enabled && base && publishableKey);
  const STAPLE_LABELS = {
    salt: 'Соль',
    pepper: 'Чёрный перец',
    vegetable_oil: 'Растительное масло',
    butter: 'Сливочное масло',
    garlic: 'Чеснок',
    onion: 'Лук',
    eggs: 'Яйца',
    rice: 'Рис',
    buckwheat: 'Гречка',
    pasta: 'Макароны',
    flour: 'Мука',
    milk: 'Молоко',
    cheese: 'Сыр',
    sour_cream: 'Сметана',
    soy_sauce: 'Соевый соус',
  };

  const COMMON = [
    'Яйца','Куриное филе','Свинина','Говядина','Фарш','Сыр','Творог',
    'Помидоры','Огурцы','Картофель','Лук','Морковь','Шампиньоны',
    'Рис','Гречка','Макароны','Брокколи'
  ];

  const ALIASES = [
    [/^(курица|курицы|куриное филе|филе курицы)$/i, 'Куриное филе'],
    [/^(грибы|грибов|шампиньоны|шампиньон|шампиньонов)$/i, 'Шампиньоны'],
    [/^(помидор|помидоры|помидоров|томаты|томат)$/i, 'Помидоры'],
    [/^(яйцо|яйца|яиц)$/i, 'Яйца'],
    [/^(рис|риса)$/i, 'Рис'],
    [/^(сыр|сыра)$/i, 'Сыр'],
    [/^(свинина)$/i, 'Свинина'],
    [/^(говядина)$/i, 'Говядина'],
    [/^(фарш)$/i, 'Фарш'],
    [/^(картофель|картошка)$/i, 'Картофель'],
    [/^(огурец|огурцы)$/i, 'Огурцы'],
    [/^(лук)$/i, 'Лук'],
    [/^(морковь)$/i, 'Морковь'],
    [/^(брокколи)$/i, 'Брокколи'],
    [/^(гречка)$/i, 'Гречка'],
    [/^(макароны|паста)$/i, 'Макароны'],
    [/^(творог)$/i, 'Творог']
  ];

  const RECIPES = [
    {
      name: 'Курица с грибами и рисом',
      ingredients: ['Куриное филе','Шампиньоны','Рис'],
      duration: 20,
      tags: ['fast','satiety'],
      note: 'Все основные продукты уже есть. Получается понятный горячий ужин без лишней возни.',
      steps: [
        ['Подготовь продукты','Нарежь курицу небольшими кусочками, грибы — пластинами.'],
        ['Поставь рис','Промой рис и поставь вариться.'],
        ['Обжарь курицу','Разогрей сковороду, добавь немного масла и обжарь курицу 5–6 минут.'],
        ['Добавь грибы','Добавь грибы и готовь ещё 5–7 минут. Посоли и поперчи по вкусу.'],
        ['Собери блюдо','Подавай курицу с грибами вместе с рисом.']
      ]
    },
    {
      name: 'Омлет с грибами и сыром',
      ingredients: ['Яйца','Шампиньоны','Сыр'],
      duration: 10,
      tags: ['fast'],
      note: 'Самый быстрый вариант из базовых продуктов — минимум подготовки и одна сковорода.',
      steps: [
        ['Подготовь грибы','Нарежь грибы и быстро обжарь 3–4 минуты.'],
        ['Взбей яйца','Смешай яйца вилкой, можно добавить щепотку соли.'],
        ['Собери омлет','Вылей яйца к грибам и готовь на среднем огне.'],
        ['Добавь сыр','Посыпь сыром, накрой крышкой ещё на 1–2 минуты.']
      ]
    },
    {
      name: 'Курица с брокколи и помидорами',
      ingredients: ['Куриное филе','Брокколи','Помидоры'],
      duration: 18,
      tags: ['fast','light'],
      note: 'Лёгкий горячий вариант с белком и овощами, который не требует сложного гарнира.',
      steps: [
        ['Подготовь продукты','Нарежь курицу и помидоры, брокколи раздели на небольшие части.'],
        ['Обжарь курицу','Готовь курицу на сковороде 6–7 минут.'],
        ['Добавь брокколи','Добавь брокколи и пару ложек воды, накрой на 5 минут.'],
        ['Добавь помидоры','В конце добавь помидоры и прогрей ещё 2 минуты.']
      ]
    },
    {
      name: 'Свинина с картофелем и луком',
      ingredients: ['Свинина','Картофель','Лук'],
      duration: 28,
      tags: ['satiety'],
      note: 'Сытный вариант из простых продуктов. Хорош, когда скорость не главный приоритет.',
      steps: [
        ['Подготовь продукты','Нарежь свинину, картофель и лук небольшими кусочками.'],
        ['Обжарь мясо','Обжарь свинину до лёгкой корочки.'],
        ['Добавь картофель','Добавь картофель и готовь под крышкой 15–18 минут.'],
        ['Добавь лук','Вмешай лук ближе к концу и доведи всё до готовности.']
      ]
    },
    {
      name: 'Говядина с рисом',
      ingredients: ['Говядина','Рис','Лук'],
      duration: 25,
      tags: ['satiety'],
      note: 'Простой сытный вариант, когда хочется полноценной горячей еды без сложного рецепта.',
      steps: [
        ['Поставь рис','Промой рис и поставь вариться.'],
        ['Подготовь мясо','Нарежь говядину тонкими полосками, лук — полукольцами.'],
        ['Обжарь','Сначала обжарь мясо, затем добавь лук.'],
        ['Собери блюдо','Подавай говядину вместе с готовым рисом.']
      ]
    },
    {
      name: 'Творог с яйцом на сковороде',
      ingredients: ['Творог','Яйца'],
      duration: 12,
      tags: ['fast','light'],
      note: 'Быстро, просто и без большого количества ингредиентов.',
      steps: [
        ['Смешай основу','Смешай творог с яйцом и щепоткой соли.'],
        ['Разогрей сковороду','Добавь совсем немного масла.'],
        ['Приготовь','Выложи смесь и готовь под крышкой 7–8 минут на небольшом огне.']
      ]
    }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let selected = new Set();
  let priority = 'none';
  let recommendations = [];
  let activeRecipe = null;
  let stepIndex = 0;
  let photoItems = [];
  let photoBusy = false;
  let activeCookDecisionId = null;
  let activeCookDecisionCreatedAt = null;

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        recent: Array.isArray(state.recent) ? state.recent : [],
        outcomes: Array.isArray(state.outcomes) ? state.outcomes : []
      };
    } catch {
      return { recent: [], outcomes: [] };
    }
  }

  function writeState(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveRecent() {
    const state = readState();
    state.recent = [...selected].slice(0, 16);
    writeState(state);
    renderRecent();
  }

  function canonical(raw) {
    let value = String(raw || '')
      .trim()
      .replace(/^(есть|ещ[её]\s+есть|немного|остал(?:ся|ось|ись)|у меня есть)\s+/i, '')
      .replace(/[.!?]+$/g, '')
      .trim();
    if (!value) return '';
    const match = ALIASES.find(([rx]) => rx.test(value));
    if (match) return match[1];
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function parseText(value) {
    return String(value || '')
      .split(/[,;\n]+|\s+и\s+/i)
      .map(canonical)
      .filter(Boolean)
      .slice(0, 20);
  }

  function renderSelected() {
    const host = $('#cookSelectedIngredients');
    if (!host) return;
    const list = [...selected];
    host.innerHTML = list.length
      ? list.map((name) => '<button type="button" data-cook-remove="' + escapeHtml(name) + '"><span>' + escapeHtml(name) + '</span><b>×</b></button>').join('')
      : '<p>Добавь хотя бы 2 продукта — фото, текстом или из списка.</p>';
    const count = $('#cookIngredientCount');
    if (count) count.textContent = list.length ? String(list.length) : '0';
    const next = $('#cookIngredientsNext');
    if (next) next.disabled = list.length < 2;
    $$('[data-cook-ingredient]').forEach((button) => {
      button.classList.toggle('active', selected.has(button.dataset.cookIngredient));
    });
  }


  function renderPhotoResults() {
    const card = $('#cookPhotoResults');
    const chips = $('#cookPhotoChips');
    const count = $('#cookPhotoCount');
    const summary = $('#cookPhotoSummary');
    const note = $('#cookPhotoNote');
    const apply = $('#cookPhotoApply');
    if (!card || !chips || !count || !summary || !note || !apply) return;

    card.hidden = !photoItems.length;
    if (!photoItems.length) {
      chips.innerHTML = '';
      count.textContent = '0';
      apply.disabled = true;
      return;
    }

    const chosen = photoItems.filter((item) => item.selected);
    count.textContent = String(chosen.length) + '/' + String(photoItems.length);
    summary.textContent = chosen.length
      ? 'Проверь и оставь только то, что действительно есть'
      : 'Выбери хотя бы один распознанный продукт';
    note.textContent = photoItems.some((item) => item.confidence === 'low')
      ? 'Знаком ? отмечены продукты, в которых Rinlo не уверен.'
      : 'Нажми на продукт, чтобы убрать его перед добавлением.';
    chips.innerHTML = photoItems.map((item, index) =>
      '<button type="button" data-cook-photo-index="' + index + '" class="' +
      (item.selected ? 'active ' : '') + (item.confidence === 'low' ? 'uncertain' : '') + '">' +
      (item.confidence === 'low' ? '<span>?</span>' : '') +
      '<b>' + escapeHtml(item.name) + '</b>' +
      (item.detail ? '<small>' + escapeHtml(item.detail) + '</small>' : '') +
      '</button>'
    ).join('');
    apply.disabled = chosen.length === 0;
  }

  function setPhotoStatus(message = '') {
    const status = $('#cookPhotoStatus');
    if (status) status.textContent = message;
  }

  async function analyzeCookPhoto(file) {
    if (!file || photoBusy) return;
    if (!vision?.enabled || typeof vision.analyzeIngredientsPhoto !== 'function') {
      setPhotoStatus(localOnly
        ? 'Фото недоступно в локальном режиме.'
        : 'Распознавание фото сейчас недоступно.');
      return;
    }

    const button = $('#cookPhotoButton');
    photoBusy = true;
    if (button) button.disabled = true;
    setPhotoStatus('Rinlo смотрит, что есть на фото…');

    try {
      const data = await vision.analyzeIngredientsPhoto(file);
      const result = data?.ingredientPhoto || {};
      photoItems = (Array.isArray(result.ingredients) ? result.ingredients : [])
        .map((item) => ({
          name: canonical(item?.name),
          confidence: ['high','medium','low'].includes(item?.confidence) ? item.confidence : 'low',
          detail: String(item?.detail || '').trim(),
          selected: item?.confidence !== 'low',
        }))
        .filter((item) => item.name)
        .slice(0, 24);

      if (!photoItems.length) {
        renderPhotoResults();
        setPhotoStatus(result.note || 'Не смог уверенно распознать продукты. Попробуй другое фото или добавь их вручную.');
        return;
      }

      renderPhotoResults();
      setPhotoStatus(result.status === 'needs_review'
        ? 'Есть сомнения — проверь список перед добавлением.'
        : 'Готово. Проверь список перед добавлением.');
    } catch (error) {
      console.error('Cook ingredient photo failed', error);
      photoItems = [];
      renderPhotoResults();
      setPhotoStatus('Не получилось распознать фото. Можно попробовать ещё раз или добавить продукты вручную.');
    } finally {
      photoBusy = false;
      if (button) button.disabled = false;
    }
  }

  function renderRecent() {
    const state = readState();
    const recent = state.recent.filter(Boolean);
    const flowHost = $('#cookRecentIngredients');
    const home = $('#cookRecentHome');
    const homeList = $('#cookRecentHomeList');
    if (flowHost) {
      flowHost.innerHTML = recent.length
        ? recent.slice(0, 8).map((name) => '<button type="button" data-cook-recent="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>').join('')
        : '';
      flowHost.hidden = !recent.length;
    }
    if (home && homeList) {
      home.hidden = !recent.length;
      homeList.textContent = recent.slice(0, 5).join(' · ');
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[char]));
  }

  function getAvailableStaples() {
    const profile = window.Rinlo2Foundation?.getDecisionProfile?.() || {};
    const chosenToday = new Set([...selected].map((item) => item.toLowerCase()));
    return (Array.isArray(profile.staples) ? profile.staples : [])
      .map((id) => STAPLE_LABELS[id])
      .filter(Boolean)
      .filter((label) => !chosenToday.has(label.toLowerCase()));
  }

  function renderStaplesContext() {
    const host = $('#cookStaplesContext');
    const list = $('#cookStaplesContextList');
    if (!host || !list) return;
    const staples = getAvailableStaples();
    host.hidden = !staples.length;
    list.textContent = staples.join(' · ');
  }

  function profileHint() {
    try {
      const data = JSON.parse(localStorage.getItem('rinlo2-foundation-state-v1') || '{}');
      const goal = data?.profile?.goal || data?.goal || data?.setup?.goal || '';
      if (goal === 'lose') return 'Я также держу в уме твою цель снижать вес — без жёстких запретов и подсчёта каждого грамма.';
      if (goal === 'maintain') return 'Я также учитываю, что твоя цель — удерживать текущий вес.';
      if (goal === 'aware') return 'Я также учитываю, что тебе важно питаться осознаннее без жёсткого контроля.';
    } catch {}
    return 'Сейчас решение основано прежде всего на продуктах и выбранном приоритете.';
  }

  function genericRecipe(names, index = 0) {
    const protein = names.find((x) => /кур|свинин|говядин|фарш|яй|творог/i.test(x)) || names[0];
    const veg = names.find((x) => /помид|огур|гриб|брок|морков|лук/i.test(x) && x !== protein) || names[1] || names[0];
    const carb = names.find((x) => /рис|греч|макарон|картоф/i.test(x));
    const title = index === 0
      ? (carb ? protein + ' с ' + veg.toLowerCase() + ' и ' + carb.toLowerCase() : protein + ' с ' + veg.toLowerCase())
      : index === 1
        ? 'Быстрая сковорода: ' + protein.toLowerCase() + ' + ' + veg.toLowerCase()
        : 'Простой вариант из выбранных продуктов';
    return {
      name: title,
      ingredients: [protein, veg, ...(carb ? [carb] : [])],
      duration: index === 1 ? 15 : 20 + index * 3,
      tags: index === 1 ? ['fast'] : [],
      note: 'Собрал вариант только из того, что ты указал. Для MVP Rinlo не требует идеального учёта холодильника.',
      steps: [
        ['Подготовь продукты','Нарежь основные ингредиенты удобными кусочками.'],
        ['Начни с основы','Сначала приготовь продукт, которому нужно больше времени.'],
        ['Добавь остальное','Добавь остальные выбранные продукты и доведи до готовности.'],
        ['Попробуй и заверши','Посоли, поперчи и скорректируй вкус перед подачей.']
      ]
    };
  }


  function normalizeAiRecipe(recipe = {}) {
    return {
      name: String(recipe.name || '').trim(),
      duration: Math.max(5, Number(recipe.duration_minutes || 20)),
      note: String(recipe.reason || '').trim(),
      ingredients: Array.isArray(recipe.ingredients_used) ? recipe.ingredients_used.map(String) : [],
      staples: Array.isArray(recipe.assumed_staples) ? recipe.assumed_staples.map(String) : [],
      nutrition: recipe?.nutrition && typeof recipe.nutrition === 'object'
        ? {
            calorieMin: Math.max(0, Number(recipe.nutrition.calorie_min || 0)),
            calorieMax: Math.max(0, Number(recipe.nutrition.calorie_max || 0)),
            proteinMin: Math.max(0, Number(recipe.nutrition.protein_min || 0)),
            proteinMax: Math.max(0, Number(recipe.nutrition.protein_max || 0)),
            fatMin: Math.max(0, Number(recipe.nutrition.fat_min || 0)),
            fatMax: Math.max(0, Number(recipe.nutrition.fat_max || 0)),
            carbsMin: Math.max(0, Number(recipe.nutrition.carbs_min || 0)),
            carbsMax: Math.max(0, Number(recipe.nutrition.carbs_max || 0)),
            assumption: String(recipe.nutrition.assumption || '').trim(),
          }
        : null,
      steps: Array.isArray(recipe.steps)
        ? recipe.steps.map((step) => [
            String(step?.title || '').trim(),
            String(step?.instruction || '').trim(),
            Math.max(0, Number(step?.minutes || 0)),
          ]).filter((step) => step[0] && step[1])
        : [],
    };
  }

  async function requestCookPlan() {
    if (!aiEnabled) return null;
    const session = await auth.ensureSession();
    if (!session?.access_token) throw new Error('no_supabase_session');

    const profile = window.Rinlo2Foundation?.getDecisionProfile?.() || {};
    const staples = getAvailableStaples();
    const state = readState();
    const recentCookOutcomes = (state.outcomes || []).slice(0, 6);

    const response = await fetch(`${base}/functions/v1/analyze-food`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        mode: 'cook',
        ingredients: [...selected],
        staples,
        priority,
        profile,
        recentCookOutcomes,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `cook_${response.status}`);
      error.code = data?.error || null;
      error.status = response.status;
      throw error;
    }
    if (!data?.cook?.primary || !Array.isArray(data?.cook?.alternatives)) {
      throw new Error('empty_cook_plan');
    }

    return {
      summary: String(data.cook.summary || ''),
      recipes: [
        normalizeAiRecipe(data.cook.primary),
        ...data.cook.alternatives.map(normalizeAiRecipe),
      ].filter((recipe) => recipe.name && recipe.steps.length >= 3).slice(0, 3),
      meta: data.meta || {},
    };
  }

  function buildRecommendations() {
    const names = [...selected];
    const available = new Set(names);
    const ranked = RECIPES
      .filter((recipe) => recipe.ingredients.every((item) => available.has(item)))
      .map((recipe) => {
        let score = recipe.ingredients.length * 10;
        if (priority !== 'none' && recipe.tags.includes(priority)) score += 15;
        if (priority === 'fast') score += Math.max(0, 25 - recipe.duration);
        return { recipe, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.recipe);

    const result = [];
    for (const recipe of ranked) if (!result.some((x) => x.name === recipe.name)) result.push(recipe);
    let i = 0;
    while (result.length < 3) {
      const recipe = genericRecipe(names, i++);
      if (!result.some((x) => x.name === recipe.name)) result.push(recipe);
    }
    return result.slice(0, 3);
  }

  function priorityLabel(value) {
    return ({fast:'Быстро',satiety:'Сытно',light:'Полегче',use:'Использовать продукты',none:'Без приоритета'})[value] || 'Без приоритета';
  }

  function showFlow(step) {
    const flow = $('#cookFlow');
    if (!flow) return;
    flow.hidden = false;
    document.body.classList.add('cook-flow-open');
    $$('[data-cook-step]', flow).forEach((node) => node.classList.toggle('active', node.dataset.cookStep === step));
  }

  function closeFlow() {
    const flow = $('#cookFlow');
    if (flow) flow.hidden = true;
    document.body.classList.remove('cook-flow-open');
  }

  function resetFlow() {
    selected = new Set();
    priority = 'none';
    recommendations = [];
    activeRecipe = null;
    stepIndex = 0;
    photoItems = [];
    photoBusy = false;
    activeCookDecisionId = null;
    activeCookDecisionCreatedAt = null;
    const text = $('#cookIngredientText');
    if (text) text.value = '';
    const outcomeQuestion = $('#cookOutcomeQuestion');
    const outcomeFeedback = $('#cookOutcomeFeedback');
    if (outcomeQuestion) outcomeQuestion.hidden = false;
    if (outcomeFeedback) outcomeFeedback.hidden = true;
    const photoInput = $('#cookPhotoInput');
    if (photoInput) photoInput.value = '';
    setPhotoStatus('');
    renderPhotoResults();
    $$('[data-cook-priority]').forEach((b) => b.classList.remove('active'));
    renderSelected();
    renderRecent();
    renderStaplesContext();
  }

  function nutritionRange(min, max, suffix = '') {
    const a = Math.round(Number(min || 0));
    const b = Math.round(Number(max || 0));
    if (!a && !b) return '—';
    if (!a || a === b) return String(b || a) + suffix;
    return a + '–' + b + suffix;
  }

  function renderNutrition(recipe) {
    const box = $('#cookResultNutrition');
    const assumption = $('#cookNutritionAssumption');
    const dailyFit = $('#cookNutritionDailyFit');
    const n = recipe?.nutrition;
    const hasNutrition = Boolean(n && (n.calorieMax || n.proteinMax || n.fatMax || n.carbsMax));
    if (box) box.hidden = !hasNutrition;
    if (!hasNutrition) {
      if (assumption) assumption.hidden = true;
      if (dailyFit) dailyFit.hidden = true;
      return;
    }
    $('#cookNutritionCalories').textContent = nutritionRange(n.calorieMin, n.calorieMax);
    $('#cookNutritionProtein').textContent = nutritionRange(n.proteinMin, n.proteinMax, ' г');
    $('#cookNutritionFat').textContent = nutritionRange(n.fatMin, n.fatMax, ' г');
    $('#cookNutritionCarbs').textContent = nutritionRange(n.carbsMin, n.carbsMax, ' г');
    if (assumption) {
      assumption.hidden = !n.assumption;
      assumption.textContent = n.assumption ? 'Оценка на порцию: ' + n.assumption : '';
    }
    if (dailyFit) {
      const plan = window.Rinlo2Foundation?.getCaloriePlan?.() || {};
      if (plan.status === 'ready' && plan.targetMin > 0 && plan.targetMax > 0 && n.calorieMin > 0 && n.calorieMax > 0) {
        const minPercent = Math.max(1, Math.round((n.calorieMin / plan.targetMax) * 100));
        const maxPercent = Math.max(minPercent, Math.round((n.calorieMax / plan.targetMin) * 100));
        dailyFit.hidden = false;
        dailyFit.textContent = `≈ ${minPercent}–${maxPercent}% твоего дневного ориентира ${plan.targetMin.toLocaleString('ru-RU')}–${plan.targetMax.toLocaleString('ru-RU')} ккал`;
      } else {
        dailyFit.hidden = true;
      }
    }
  }

  function renderResult(plan = null) {
    recommendations = plan?.recipes?.length === 3 ? plan.recipes : buildRecommendations();
    activeRecipe = recommendations[0];
    const title = $('#cookResultTitle');
    const duration = $('#cookResultDuration');
    const note = $('#cookResultNote');
    const context = $('#cookResultContext');
    if (title) title.textContent = activeRecipe.name;
    if (duration) duration.textContent = activeRecipe.duration + ' минут';
    if (note) note.textContent = activeRecipe.note;
    renderNutrition(activeRecipe);
    if (context) context.textContent = activeRecipe.note || (priorityLabel(priority) + ' · ' + profileHint());

    const assumptions = $('#cookResultAssumptions');
    if (assumptions) {
      const staples = Array.isArray(activeRecipe.staples) ? activeRecipe.staples.filter(Boolean) : [];
      assumptions.hidden = !staples.length;
      assumptions.textContent = staples.length ? 'Также предполагаю, что дома есть: ' + staples.join(', ') + '.' : '';
    }

    const alt = $('#cookAlternatives');
    if (alt) {
      alt.innerHTML = recommendations.slice(1).map((recipe, idx) =>
        '<button type="button" data-cook-alt-index="' + (idx + 1) + '"><span>' +
        (idx === 0 ? 'Ещё вариант' : 'Альтернатива') +
        '</span><b>' + escapeHtml(recipe.name) + '</b><small>' +
        recipe.duration + ' минут' +
        (recipe.nutrition?.calorieMax ? ' · ≈ ' + nutritionRange(recipe.nutrition.calorieMin, recipe.nutrition.calorieMax) + ' ккал' : '') +
        '</small>' +
        (recipe.nutrition?.proteinMax ? '<em>Б ' + nutritionRange(recipe.nutrition.proteinMin, recipe.nutrition.proteinMax) +
          ' · Ж ' + nutritionRange(recipe.nutrition.fatMin, recipe.nutrition.fatMax) +
          ' · У ' + nutritionRange(recipe.nutrition.carbsMin, recipe.nutrition.carbsMax) + ' г</em>' : '') +
        '</button>'
      ).join('');
    }
  }

  function selectRecipe(index) {
    activeRecipe = recommendations[index] || recommendations[0];
    if (!activeRecipe) return;
    $('#cookResultTitle').textContent = activeRecipe.name;
    $('#cookResultDuration').textContent = activeRecipe.duration + ' минут';
    $('#cookResultNote').textContent = activeRecipe.note;
    renderNutrition(activeRecipe);
    const assumptions = $('#cookResultAssumptions');
    if (assumptions) {
      const staples = Array.isArray(activeRecipe.staples) ? activeRecipe.staples.filter(Boolean) : [];
      assumptions.hidden = !staples.length;
      assumptions.textContent = staples.length ? 'Также предполагаю, что дома есть: ' + staples.join(', ') + '.' : '';
    }
    $$('[data-cook-alt-index]').forEach((button) => button.classList.toggle('active', Number(button.dataset.cookAltIndex) === index));
  }

  function renderCookStep() {
    if (!activeRecipe) return;
    const steps = activeRecipe.steps || [];
    const item = steps[stepIndex] || steps[0];
    $('#cookStepCounter').textContent = (stepIndex + 1) + ' из ' + steps.length;
    $('#cookStepTitle').textContent = item[0];
    $('#cookStepText').textContent = item[2] > 0 ? item[1] + ' · примерно ' + item[2] + ' мин.' : item[1];
    $('#cookStepPrev').disabled = stepIndex === 0;
    $('#cookStepNext').textContent = stepIndex >= steps.length - 1 ? 'Готово →' : 'Далее →';
    const bar = $('#cookStepBar');
    if (bar) bar.style.width = (((stepIndex + 1) / steps.length) * 100) + '%';
  }


  function persistCookDecision(feedback = '') {
    if (!activeRecipe || typeof window.Rinlo2Decisions?.recordCookDecision !== 'function') return null;
    if (!activeCookDecisionId) {
      activeCookDecisionId = `cook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      activeCookDecisionCreatedAt = new Date().toISOString();
    }
    const savedId = window.Rinlo2Decisions.recordCookDecision({
      id: activeCookDecisionId,
      createdAt: activeCookDecisionCreatedAt,
      recipe: activeRecipe,
      ingredients: [...selected],
      priority,
      outcome: 'prepared',
      feedback,
    });
    if (savedId) activeCookDecisionId = savedId;
    return savedId;
  }

  function saveOutcome(kind, feedback = '') {
    const state = readState();
    state.recent = [...selected].slice(0, 16);
    state.outcomes.unshift({
      at: new Date().toISOString(),
      type: 'cook',
      recipe: activeRecipe?.name || '',
      ingredients: [...selected],
      priority,
      outcome: kind,
      feedback
    });
    state.outcomes = state.outcomes.slice(0, 40);
    writeState(state);
    renderRecent();
  }

  function updateLatestFeedback(feedback) {
    const state = readState();
    const recipe = activeRecipe?.name || '';
    const index = state.outcomes.findIndex((item) => item.type === 'cook' && item.recipe === recipe && item.outcome === 'prepared');
    if (index >= 0) state.outcomes[index] = { ...state.outcomes[index], feedback };
    else state.outcomes.unshift({
      at: new Date().toISOString(),
      type: 'cook',
      recipe,
      ingredients: [...selected],
      priority,
      outcome: 'prepared',
      feedback
    });
    state.outcomes = state.outcomes.slice(0, 40);
    writeState(state);
  }

  function bind() {
    const start = $('#cookStart');
    if (!start) return;

    start.addEventListener('click', () => {
      resetFlow();
      showFlow('ingredients');
    });

    $('#cookRecentHomeUse')?.addEventListener('click', () => {
      resetFlow();
      readState().recent.forEach((item) => selected.add(item));
      renderSelected();
      renderStaplesContext();
      showFlow('ingredients');
    });

    $('#cookPhotoButton')?.addEventListener('click', () => {
      if (!vision?.enabled) {
        setPhotoStatus(localOnly
          ? 'Фото недоступно в локальном режиме.'
          : 'Распознавание фото сейчас недоступно.');
        return;
      }
      $('#cookPhotoInput')?.click();
    });

    $('#cookPhotoInput')?.addEventListener('change', async (event) => {
      const file = event.target?.files?.[0] || null;
      if (file) await analyzeCookPhoto(file);
      if (event.target) event.target.value = '';
    });

    $('#cookPhotoApply')?.addEventListener('click', () => {
      const chosen = photoItems.filter((item) => item.selected);
      chosen.forEach((item) => selected.add(item.name));
      renderSelected();
      renderStaplesContext();
      setPhotoStatus(chosen.length
        ? 'Добавлено с фото: ' + chosen.length + '. Можно добавить ещё или продолжить.'
        : 'Сначала выбери продукты на фото.');
      if (chosen.length) {
        photoItems = [];
        renderPhotoResults();
      }
    });

    $('#cookAddText')?.addEventListener('click', () => {
      const input = $('#cookIngredientText');
      parseText(input?.value).forEach((item) => selected.add(item));
      if (input) input.value = '';
      renderSelected();
    });

    $('#cookIngredientText')?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') $('#cookAddText')?.click();
    });

    document.addEventListener('click', (event) => {
      const photo = event.target.closest('[data-cook-photo-index]');
      if (photo) {
        const index = Number(photo.dataset.cookPhotoIndex);
        if (photoItems[index]) {
          photoItems[index].selected = !photoItems[index].selected;
          renderPhotoResults();
        }
        return;
      }
      const quick = event.target.closest('[data-cook-ingredient]');
      if (quick) {
        const name = quick.dataset.cookIngredient;
        if (selected.has(name)) selected.delete(name); else selected.add(name);
        renderSelected();
        renderStaplesContext();
        return;
      }
      const recent = event.target.closest('[data-cook-recent]');
      if (recent) {
        selected.add(recent.dataset.cookRecent);
        renderSelected();
        renderStaplesContext();
        return;
      }
      const remove = event.target.closest('[data-cook-remove]');
      if (remove) {
        selected.delete(remove.dataset.cookRemove);
        renderSelected();
        renderStaplesContext();
        return;
      }
      const alt = event.target.closest('[data-cook-alt-index]');
      if (alt) selectRecipe(Number(alt.dataset.cookAltIndex));
    });

    $('#cookIngredientsNext')?.addEventListener('click', () => {
      if (selected.size < 2) return;
      saveRecent();
      showFlow('priority');
    });

    $$('[data-cook-priority]').forEach((button) => {
      button.addEventListener('click', () => {
        priority = button.dataset.cookPriority || 'none';
        $$('[data-cook-priority]').forEach((item) => item.classList.toggle('active', item === button));
        $('#cookPriorityNext').disabled = false;
      });
    });

    $('#cookPriorityNext')?.addEventListener('click', async () => {
      const button = $('#cookPriorityNext');
      const status = $('#cookAiStatus');
      if (!button) return;
      button.disabled = true;
      const previousLabel = button.textContent;
      button.textContent = aiEnabled ? 'Rinlo подбирает блюдо…' : 'Подбираю…';
      if (status) status.textContent = aiEnabled ? 'Учитываю продукты, приоритет и твой контекст.' : '';

      try {
        const plan = await requestCookPlan();
        renderResult(plan);
        showFlow('result');
      } catch (error) {
        console.error('Cook AI failed', error);
        if (status) status.textContent = 'Не получилось получить рецепт от Rinlo. Попробуй ещё раз.';
      } finally {
        button.textContent = previousLabel;
        button.disabled = false;
      }
    });

    $('#cookStartCooking')?.addEventListener('click', () => {
      stepIndex = 0;
      $('#cookActiveRecipe').textContent = activeRecipe?.name || 'Готовим';
      renderCookStep();
      showFlow('cook');
    });

    $('#cookStepPrev')?.addEventListener('click', () => {
      if (stepIndex > 0) stepIndex -= 1;
      renderCookStep();
    });

    $('#cookStepNext')?.addEventListener('click', () => {
      const last = (activeRecipe?.steps?.length || 1) - 1;
      if (stepIndex >= last) {
        $('#cookOutcomeRecipe').textContent = activeRecipe?.name || 'Блюдо';
        showFlow('outcome');
        return;
      }
      stepIndex += 1;
      renderCookStep();
    });

    $('#cookOutcomePrepared')?.addEventListener('click', () => {
      saveOutcome('prepared');
      try {
        persistCookDecision('');
      } catch (error) {
        console.error('Cook history save failed', error);
      }
      $('#cookOutcomeQuestion').hidden = true;
      $('#cookOutcomeFeedback').hidden = false;
    });

    $('#cookOutcomeSkipped')?.addEventListener('click', () => {
      saveOutcome('skipped');
      closeFlow();
    });

    $$('[data-cook-feedback]').forEach((button) => {
      button.addEventListener('click', () => {
        const feedback = button.dataset.cookFeedback || '';
        updateLatestFeedback(feedback);
        persistCookDecision(feedback);
        closeFlow();
      });
    });

    $$('[data-cook-close]').forEach((button) => button.addEventListener('click', closeFlow));
    $$('[data-cook-back]').forEach((button) => {
      button.addEventListener('click', () => {
        const step = button.closest('[data-cook-step]')?.dataset.cookStep;
        if (step === 'ingredients') return closeFlow();
        if (step === 'priority') return showFlow('ingredients');
        if (step === 'result') return showFlow('priority');
        if (step === 'cook') return showFlow('result');
        if (step === 'outcome') return showFlow('cook');
      });
    });

    renderRecent();
    renderSelected();
    renderStaplesContext();
  }

  window.RinloCook = {
    version: VERSION,
    getState: readState,
    getSelected: () => [...selected],
    getAvailableStaples: () => getAvailableStaples(),
    getPhotoItems: () => photoItems.map((item) => ({ ...item })),
    getActiveDecisionId: () => activeCookDecisionId
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();