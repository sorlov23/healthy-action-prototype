(function () {
  'use strict';

  const VERSION = 'v1-prototype';
  const STORAGE_KEY = 'rinlo2-cook-v1';
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
      : '<p>Добавь хотя бы 2 продукта — фото для этого прототипа пока не требуется.</p>';
    const count = $('#cookIngredientCount');
    if (count) count.textContent = list.length ? String(list.length) : '0';
    const next = $('#cookIngredientsNext');
    if (next) next.disabled = list.length < 2;
    $$('[data-cook-ingredient]').forEach((button) => {
      button.classList.toggle('active', selected.has(button.dataset.cookIngredient));
    });
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
    const text = $('#cookIngredientText');
    if (text) text.value = '';
    const outcomeQuestion = $('#cookOutcomeQuestion');
    const outcomeFeedback = $('#cookOutcomeFeedback');
    if (outcomeQuestion) outcomeQuestion.hidden = false;
    if (outcomeFeedback) outcomeFeedback.hidden = true;
    $('[data-cook-priority]').forEach((b) => b.classList.remove('active'));
    renderSelected();
    renderRecent();
  }

  function renderResult() {
    recommendations = buildRecommendations();
    activeRecipe = recommendations[0];
    const title = $('#cookResultTitle');
    const duration = $('#cookResultDuration');
    const note = $('#cookResultNote');
    const context = $('#cookResultContext');
    if (title) title.textContent = activeRecipe.name;
    if (duration) duration.textContent = activeRecipe.duration + ' минут';
    if (note) note.textContent = activeRecipe.note;
    if (context) context.textContent = priorityLabel(priority) + ' · ' + profileHint();

    const alt = $('#cookAlternatives');
    if (alt) {
      alt.innerHTML = recommendations.slice(1).map((recipe, idx) =>
        '<button type="button" data-cook-alt-index="' + (idx + 1) + '"><span>' +
        (idx === 0 ? 'Ещё вариант' : 'Альтернатива') +
        '</span><b>' + escapeHtml(recipe.name) + '</b><small>' + recipe.duration + ' минут</small></button>'
      ).join('');
    }
  }

  function selectRecipe(index) {
    activeRecipe = recommendations[index] || recommendations[0];
    if (!activeRecipe) return;
    $('#cookResultTitle').textContent = activeRecipe.name;
    $('#cookResultDuration').textContent = activeRecipe.duration + ' минут';
    $('#cookResultNote').textContent = activeRecipe.note;
    $$('[data-cook-alt-index]').forEach((button) => button.classList.toggle('active', Number(button.dataset.cookAltIndex) === index));
  }

  function renderCookStep() {
    if (!activeRecipe) return;
    const steps = activeRecipe.steps || [];
    const item = steps[stepIndex] || steps[0];
    $('#cookStepCounter').textContent = (stepIndex + 1) + ' из ' + steps.length;
    $('#cookStepTitle').textContent = item[0];
    $('#cookStepText').textContent = item[1];
    $('#cookStepPrev').disabled = stepIndex === 0;
    $('#cookStepNext').textContent = stepIndex >= steps.length - 1 ? 'Готово →' : 'Далее →';
    const bar = $('#cookStepBar');
    if (bar) bar.style.width = (((stepIndex + 1) / steps.length) * 100) + '%';
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
      showFlow('ingredients');
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
      const quick = event.target.closest('[data-cook-ingredient]');
      if (quick) {
        const name = quick.dataset.cookIngredient;
        if (selected.has(name)) selected.delete(name); else selected.add(name);
        renderSelected();
        return;
      }
      const recent = event.target.closest('[data-cook-recent]');
      if (recent) {
        selected.add(recent.dataset.cookRecent);
        renderSelected();
        return;
      }
      const remove = event.target.closest('[data-cook-remove]');
      if (remove) {
        selected.delete(remove.dataset.cookRemove);
        renderSelected();
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

    $('#cookPriorityNext')?.addEventListener('click', () => {
      renderResult();
      showFlow('result');
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
      $('#cookOutcomeQuestion').hidden = true;
      $('#cookOutcomeFeedback').hidden = false;
    });

    $('#cookOutcomeSkipped')?.addEventListener('click', () => {
      saveOutcome('skipped');
      closeFlow();
    });

    $('[data-cook-feedback]').forEach((button) => {
      button.addEventListener('click', () => {
        updateLatestFeedback(button.dataset.cookFeedback);
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
  }

  window.RinloCook = {
    version: VERSION,
    getState: readState,
    getSelected: () => [...selected]
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();