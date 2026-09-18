(() => {
  const STORAGE_KEY = 'rinlo2-decisions-v2';
  const DAY_TARGET = null;
  const flow = document.getElementById('decisionFlow');
  if (!flow) return;

  const steps = [...flow.querySelectorAll('[data-flow-step]')];
  const questionInput = document.getElementById('decisionQuestion');
  const questionCount = document.getElementById('questionCount');
  const analyzeButton = document.getElementById('analyzeDecision');
  const textAiStatus = document.getElementById('textAiStatus');
  const textAiTitle = document.getElementById('textAiTitle');
  const textAiDetail = document.getElementById('textAiDetail');
  const textClarification = document.getElementById('textClarification');
  const textClarificationQuestion = document.getElementById('textClarificationQuestion');
  const textClarificationAnswer = document.getElementById('textClarificationAnswer');
  const resultQuestion = document.getElementById('resultQuestion');
  const resultCard = document.getElementById('resultVerdictCard');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultExplanation = document.getElementById('resultExplanation');
  const resultCalories = document.getElementById('resultCalories');
  const resultContext = document.getElementById('resultContext');
  const resultFit = document.getElementById('resultFit');
  const fitCard = document.getElementById('fitCard');
  const actionNowCard = document.getElementById('actionNowCard');
  const actionNowList = document.getElementById('actionNowList');
  const futureTipCard = document.getElementById('futureTipCard');
  const futureTip = document.getElementById('futureTip');
  const showAlternativeButton = document.getElementById('showAlternative');
  const saveOriginalButton = document.getElementById('saveOriginal');
  const originalName = document.getElementById('originalName');
  const originalCalories = document.getElementById('originalCalories');
  const alternativeName = document.getElementById('alternativeName');
  const alternativeCalories = document.getElementById('alternativeCalories');
  const differenceList = document.getElementById('differenceList');
  const savedName = document.getElementById('savedName');
  const savedCalories = document.getElementById('savedCalories');
  const originalPhoto = flow.querySelector('.burger-cola');
  const alternativePhoto = flow.querySelector('.burger-zero');
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const photoDescription = document.getElementById('photoDescription');
  const analyzePhotoButton = document.getElementById('analyzePhoto');
  const photoVisionStatus = document.getElementById('photoVisionStatus');
  const historyList = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  const historyCount = document.getElementById('historyCount');
  const historySearch = document.getElementById('historySearch');
  const historyFilters = [...document.querySelectorAll('[data-history-filter]')];
  const homeRecentList = document.getElementById('homeRecentList');
  const homeRecentEmpty = document.getElementById('homeRecentEmpty');

  let activeStep = 'ask';
  let currentDecision = null;
  let historyFilter = 'all';
  let decisions = loadDecisions();
  let toastTimer = null;
  let photoObjectUrl = null;
  let photoAnalysis = null;
  let autoPhotoDescription = '';
  let textBaseQuestion = '';
  let pendingTextClarification = '';

  const presets = {
    burger: {
      title: 'Можно, но лучше аккуратнее', icon: '✓', tone: 'caution',
      explanation: 'Бургер и кола — нормальный выбор иногда, но вместе это довольно калорийно. Не нужно отказываться от идеи целиком — достаточно немного облегчить комбинацию.',
      calories: '~ 820 ккал', context: 'плотный выбор',
      fit: 'Если хочется сохранить текущий темп, проще уменьшить калорийность напитка или соуса, не меняя саму идею.',
      original: { name: 'Бургер + кола', calories: '~ 820 ккал', thumb: 'food-burger', image: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=85')" },
      alternative: { name: 'Бургер без соуса + Cola Zero', calories: '~ 540 ккал', diffs: ['примерно на 280 ккал меньше', 'меньше сахара', 'проще вписать в текущий темп'], image: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=85')" }
    },
    rolls: {
      title: 'Можно брать', icon: '✓', tone: 'good',
      explanation: 'Роллы вполне могут вписаться в ужин. Основная разница обычно не в самих роллах, а в количестве, темпуре и дополнительных соусах.',
      calories: '~ 560 ккал', context: 'нормально для ужина',
      fit: 'Одна обычная порция без темпуры и лишнего соуса выглядит спокойно для твоей текущей цели.',
      original: { name: 'Роллы на ужин', calories: '~ 560 ккал', thumb: 'food-salad', image: "url('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=85')" },
      alternative: null
    },
    oatmeal: {
      title: 'Можно брать', icon: '✓', tone: 'good',
      explanation: 'Овсянка с ягодами — простой и понятный завтрак. Если порция обычная и без большого количества сиропа, здесь нечего специально исправлять.',
      calories: '~ 320 ккал', context: 'лёгкий выбор',
      fit: 'Нормально вписывается в текущую цель. Альтернатива здесь не нужна.',
      original: { name: 'Овсянка с ягодами', calories: '~ 320 ккал', thumb: 'food-berries', image: "url('https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=500&q=85')" },
      alternative: null
    },
    generic: {
      title: 'Можно, но лучше аккуратнее', icon: '✓', tone: 'caution',
      explanation: 'По одному названию нельзя делать вид, что всё известно точно. Для первого решения Rinlo даёт ориентир, а не выдуманную точность.',
      calories: '~ 500–650 ккал', context: 'нужен контекст порции',
      fit: 'Если порция обычная, это можно оставить. В следующем slice добавим уточняющие вопросы и реальный анализ состава.',
      original: { name: 'Твой вариант', calories: '~ 500–650 ккал', thumb: 'food-salad', image: "url('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85')" },
      alternative: { name: 'Та же идея, но чуть легче', calories: '~ 400–500 ккал', diffs: ['меньше лишнего соуса', 'обычная порция', 'без жёсткого запрета'], image: "url('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85')" }
    }
  };

  function loadDecisions() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  function saveDecisions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions.slice(0, 20)));
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function calorieRange(value) {
    const numbers = String(value || '').match(/\d+/g)?.map(Number) || [];
    if (!numbers.length) return { min: 0, max: 0 };
    if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
    return { min: numbers[0], max: numbers[1] };
  }

  function sameLocalDay(iso, date = new Date()) {
    const source = new Date(iso);
    return source.getFullYear() === date.getFullYear()
      && source.getMonth() === date.getMonth()
      && source.getDate() === date.getDate();
  }

  function todayDecisions() {
    return decisions.filter((decision) => sameLocalDay(decision.createdAt));
  }

  function sumCalories(items = todayDecisions()) {
    return items.reduce((total, decision) => {
      const selected = decision.selected?.calories || decision.original?.calories || decision.calories;
      const range = calorieRange(selected);
      return { min: total.min + range.min, max: total.max + range.max };
    }, { min: 0, max: 0 });
  }

  function addRanges(a, b) {
    return { min: a.min + b.min, max: a.max + b.max };
  }

  function formatCalories(range) {
    if (!range.max) return 'Пока нет сохранённых решений';
    if (range.min === range.max) return `≈ ${range.min.toLocaleString('ru-RU')} ккал`;
    return `≈ ${range.min.toLocaleString('ru-RU')}–${range.max.toLocaleString('ru-RU')} ккал`;
  }


  function formatEstimatedCalories(min, max) {
    const low = Number(min || 0);
    const high = Number(max || low);
    if (!low && !high) return 'оценка недоступна';
    if (low === high) return `~ ${low.toLocaleString('ru-RU')} ккал`;
    return `~ ${low.toLocaleString('ru-RU')}–${high.toLocaleString('ru-RU')} ккал`;
  }

  function thumbForDish(value = '') {
    const text = String(value).toLowerCase();
    if (/бургер|кола|фри|картош|шаурм|пицц/.test(text)) return 'food-burger';
    if (/кофе|капуч|латте/.test(text)) return 'food-coffee';
    if (/овсян|каша|ягод/.test(text)) return 'food-berries';
    return 'food-salad';
  }


  function inferDecisionStage(question = '') {
    const text = String(question).toLowerCase();
    if (/уже\s+(приготов|свар|пожар|сделал|сделала)|приготовил|приготовила|сварил|сварила|готовая\s+порц|готовое\s+блюд|на\s+тарелк/.test(text)) return 'ready';
    if (/готовлю|варю|жарю|запекаю|собираю|режу|мешаю/.test(text)) return 'preparing';
    return 'choosing';
  }

  function setPhotoVisionStatus(state, title, detail) {
    if (!photoVisionStatus) return;
    photoVisionStatus.dataset.state = state;
    const titleNode = photoVisionStatus.querySelector('b');
    const detailNode = photoVisionStatus.querySelector('small');
    if (titleNode) titleNode.textContent = title;
    if (detailNode) detailNode.textContent = detail;
  }

  function visionDecision(description, analysis, source = 'photo') {
    const calorieText = formatEstimatedCalories(analysis.calorie_min, analysis.calorie_max);
    const stage = ['choosing','preparing','ready'].includes(analysis.decision_stage)
      ? analysis.decision_stage
      : 'ready';
    const alternative = stage !== 'ready' && analysis.alternative?.available ? {
      name: analysis.alternative.name || 'Более удобный вариант',
      calories: formatEstimatedCalories(
        analysis.alternative.calorie_min,
        analysis.alternative.calorie_max,
      ),
      diffs: Array.isArray(analysis.alternative.changes)
        ? analysis.alternative.changes.slice(0, 4)
        : [],
    } : null;

    return {
      id: `d-${Date.now()}`,
      source,
      stage,
      question: description || analysis.dish_name || 'Фото блюда',
      createdAt: new Date().toISOString(),
      decisionState: analysis.decision_state || (alternative ? 'fits_with_adjustment' : 'fits_well'),
      title: analysis.verdict_title || (alternative ? 'Можно, но лучше аккуратнее' : 'Можно брать'),
      icon: '✓',
      tone: analysis.decision_state === 'fits_well' ? 'good' : 'caution',
      explanation: analysis.explanation || (source === 'photo' ? 'Rinlo оценил блюдо по фото.' : 'Rinlo разобрал твой вопрос.'),
      calories: calorieText,
      context: analysis.context_label || (source === 'photo' ? 'оценка по фото' : 'оценка по описанию'),
      fit: analysis.fit_text || 'Оценка учитывает твою цель и текущий контекст дня.',
      actionsNow: Array.isArray(analysis.actions_now)
        ? analysis.actions_now.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
        : [],
      futureTip: String(analysis.future_tip || '').trim(),
      original: {
        name: analysis.dish_name || description || 'Блюдо на фото',
        calories: calorieText,
        thumb: thumbForDish(analysis.dish_name || description),
      },
      alternative,
      selected: null,
      vision: {
        confidence: Number(analysis.confidence || 0),
        components: Array.isArray(analysis.components) ? analysis.components.slice(0, 12) : [],
        portionAssumption: analysis.portion_assumption || '',
        stage,
        actionsNow: Array.isArray(analysis.actions_now) ? analysis.actions_now.slice(0, 3) : [],
        futureTip: String(analysis.future_tip || '').trim(),
      },
    };
  }

  function injectCalorieContext() {
    if (document.getElementById('dayCalorieContext')) return;

    const style = document.createElement('style');
    style.textContent = `
      .day-calorie-context{display:block;background:#fff;border:1px solid rgba(17,19,21,.06);border-radius:18px;padding:13px 15px;margin:4px 0 16px;box-shadow:0 7px 24px rgba(17,19,21,.04)}
      .day-calorie-copy{min-width:0;display:flex;flex-direction:column;gap:3px}.day-calorie-copy small{font-size:9px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8a9298}.day-calorie-copy strong{font-size:15px;line-height:1.2;letter-spacing:-.025em}.day-calorie-copy span{font-size:10px;line-height:1.35;color:#7b848c}
      .day-calorie-target{text-align:right;display:flex;flex-direction:column;gap:2px;white-space:nowrap}.day-calorie-target small{font-size:9px;color:#8a9298}.day-calorie-target b{font-size:12px}.day-calorie-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#c7ff5b;box-shadow:0 0 0 4px rgba(199,255,91,.16);margin-right:6px}
      .prospective-calories{margin-top:11px;padding:12px 14px;background:#111315;color:#fff;border-radius:16px;display:flex;justify-content:space-between;align-items:center;gap:12px}.prospective-calories div{display:flex;flex-direction:column;gap:2px}.prospective-calories small{font-size:9px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.09em;font-weight:800}.prospective-calories strong{font-size:13px;line-height:1.25}.prospective-calories span{font-size:10px;color:rgba(255,255,255,.62);line-height:1.3;text-align:right;max-width:130px}
      @media(max-width:380px){.day-calorie-context{grid-template-columns:1fr}.day-calorie-target{text-align:left;flex-direction:row;gap:5px}.prospective-calories{align-items:flex-start;flex-direction:column}.prospective-calories span{text-align:left;max-width:none}}
    `;
    document.head.appendChild(style);

    const hero = document.querySelector('[data-screen="home"] .decision-hero');
    if (hero) {
      const card = document.createElement('section');
      card.className = 'day-calorie-context';
      card.id = 'dayCalorieContext';
      card.innerHTML = `
        <div class="day-calorie-copy">
          <small><span class="day-calorie-dot"></span>Контекст дня</small>
          <strong id="dayCalorieValue">Пока нет сохранённых решений</strong>
          <span id="dayCalorieNote">Только по решениям, которые ты сохранил в Rinlo</span>
        </div>
      `;
      hero.insertAdjacentElement('beforebegin', card);
    }
    const metrics = document.querySelector('.result-metrics');
    if (metrics) {
      const note = document.createElement('article');
      note.className = 'prospective-calories';
      note.id = 'prospectiveCalories';
      note.innerHTML = '<div><small>Если сохранишь этот выбор</small><strong id="prospectiveCalorieValue">—</strong></div><span>по решениям Rinlo сегодня</span>';
      metrics.insertAdjacentElement('afterend', note);
    }

    const difference = document.querySelector('.difference-card');
    if (difference) {
      const note = document.createElement('article');
      note.className = 'prospective-calories';
      note.id = 'alternativeProspectiveCalories';
      note.innerHTML = '<div><small>Если выберешь этот вариант</small><strong id="alternativeProspectiveValue">—</strong></div><span>по решениям Rinlo сегодня</span>';
      difference.insertAdjacentElement('afterend', note);
    }
  }

  function renderDayContext() {
    const value = document.getElementById('dayCalorieValue');
    const note = document.getElementById('dayCalorieNote');
    if (!value) return;
    const today = todayDecisions();
    value.textContent = formatCalories(sumCalories(today));
    if (note) {
      note.textContent = today.length
        ? `${today.length} ${today.length === 1 ? 'сохранённое решение' : 'сохранённых решения'} · не полный дневник еды`
        : 'Только по решениям, которые ты сохранил в Rinlo';
    }
  }

  function renderProspective(calories, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const future = addRanges(sumCalories(), calorieRange(calories));
    target.textContent = formatCalories(future);
  }


  function decisionsSince(days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return decisions.filter((decision) => {
      const time = new Date(decision.createdAt || 0).getTime();
      return Number.isFinite(time) && time >= cutoff;
    });
  }

  function decisionWord(count) {
    const n10 = count % 10;
    const n100 = count % 100;
    if (n10 === 1 && n100 !== 11) return 'решение';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'решения';
    return 'решений';
  }

  function progressPattern(items) {
    const corpus = items.map((decision) => [
      decision.question,
      decision.selected?.name,
      decision.original?.name,
      decision.alternative?.name,
      ...(decision.alternative?.diffs || []),
      ...(decision.actionsNow || []),
      decision.futureTip,
    ].filter(Boolean).join(' ')).join(' ').toLowerCase();

    const patterns = [
      {
        score: (corpus.match(/напит|кола|zero|сок|лимонад|кофе/g) || []).length,
        title: 'Чаще всего помогает корректировать напиток.',
        text: 'Основную идею еды можно оставить, а заметную разницу часто даёт напиток без сахара или более простой вариант.',
      },
      {
        score: (corpus.match(/соус|майон|масл|заправ/g) || []).length,
        title: 'Чаще всего разница — в соусе или добавках.',
        text: 'Rinlo будет сначала искать небольшую корректировку, а не предлагать полностью менять блюдо.',
      },
      {
        score: (corpus.match(/порц|добавк|втор(ая|ую)|ещ[её]/g) || []).length,
        title: 'Самый частый рычаг — порция и добавка.',
        text: 'Для готовой еды это особенно полезно: менять приготовленное не нужно, важнее то, что ещё можно сделать сейчас.',
      },
      {
        score: (corpus.match(/гарнир|фри|картош|хлеб/g) || []).length,
        title: 'Чаще всего можно сохранить основное блюдо.',
        text: 'Изменение гарнира или необязательной добавки нередко даёт больше пользы, чем полная замена еды.',
      },
    ].sort((a, b) => b.score - a.score);

    if (patterns[0]?.score > 0) return patterns[0];
    return {
      title: 'Ты чаще улучшаешь выбор без полной замены блюда.',
      text: 'Rinlo будет продолжать искать небольшие действия, которые реально доступны в момент решения.',
    };
  }

  function renderProgress() {
    const countNode = document.getElementById('progressDecisionCount');
    const adjustedNode = document.getElementById('progressAdjustedCount');
    const chosenNode = document.getElementById('progressChosenAdjustmentCount');
    const patternTitle = document.getElementById('progressPatternTitle');
    const patternText = document.getElementById('progressPatternText');
    const weightNode = document.getElementById('progressWeightContext');
    if (!countNode) return;

    const recent = decisionsSince(7);
    const adjusted = recent.filter((decision) =>
      ['fits_with_adjustment', 'better_alternative'].includes(decision.decisionState)
      || Boolean(decision.alternative)
    ).length;
    const chosenAdjustment = recent.filter((decision) =>
      decision.selected?.kind === 'alternative'
    ).length;

    countNode.textContent = recent.length
      ? `${recent.length} ${decisionWord(recent.length)}`
      : 'Пока нет решений';
    if (adjustedNode) adjustedNode.textContent = String(adjusted);
    if (chosenNode) chosenNode.textContent = String(chosenAdjustment);

    if (patternTitle && patternText) {
      if (recent.length < 3) {
        const missing = 3 - recent.length;
        patternTitle.textContent = 'Нужно ещё несколько решений.';
        patternText.textContent = `Ещё ${missing} ${decisionWord(missing)} — и Rinlo сможет показать первый повторяющийся паттерн без догадок.`;
      } else {
        const pattern = progressPattern(recent);
        patternTitle.textContent = pattern.title;
        patternText.textContent = pattern.text;
      }
    }

    const foundation = window.Rinlo2Foundation?.getState?.() || {};
    const current = Number(foundation.currentWeight);
    const target = Number(foundation.targetWeight);
    if (weightNode && Number.isFinite(current) && Number.isFinite(target)) {
      const fmt = (value) => value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      weightNode.textContent = `${fmt(current)} → ${fmt(target)} кг`;
    }
  }

  function showStep(name) {
    activeStep = name;
    steps.forEach((step) => step.classList.toggle('active', step.dataset.flowStep === name));
    flow.hidden = false;
    document.body.style.overflow = 'hidden';
    flow.querySelector('.flow-step.active .flow-body')?.scrollTo(0, 0);
    if (name === 'ask') setTimeout(() => questionInput?.focus({ preventScroll: true }), 180);
    if (name === 'photo') setTimeout(() => photoDescription?.focus({ preventScroll: true }), 180);
  }

  function closeFlow() {
    flow.hidden = true;
    steps.forEach((step) => step.classList.remove('active'));
    document.body.style.overflow = '';
  }

  function resetTextAiState() {
    textBaseQuestion = '';
    pendingTextClarification = '';
    if (textAiStatus) textAiStatus.hidden = true;
    if (textClarification) textClarification.hidden = true;
    if (textClarificationAnswer) textClarificationAnswer.value = '';
    if (analyzeButton) analyzeButton.textContent = 'Получить ответ →';
  }

  function setTextAiStatus(state, title, detail) {
    if (!textAiStatus) return;
    textAiStatus.hidden = false;
    textAiStatus.dataset.state = state;
    if (textAiTitle) textAiTitle.textContent = title;
    if (textAiDetail) textAiDetail.textContent = detail;
  }

  function openAsk() {
    currentDecision = null;
    questionInput.value = '';
    resetTextAiState();
    updateQuestionState();
    showStep('ask');
  }

  function openPhotoPicker() {
    if (!photoInput) return;
    photoInput.value = '';
    photoInput.click();
  }

  function updatePhotoState() {
    if (!analyzePhotoButton || !photoDescription) return;
    analyzePhotoButton.disabled = photoDescription.value.trim().length < 2;
  }

  async function showPhoto(file) {
    if (!file || !photoPreview) return;
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    photoObjectUrl = URL.createObjectURL(file);
    photoPreview.style.backgroundImage = `linear-gradient(180deg,rgba(17,19,21,.02),rgba(17,19,21,.18)),url("${photoObjectUrl}")`;
    photoAnalysis = null;
    autoPhotoDescription = '';
    photoDescription.value = '';
    updatePhotoState();
    showStep('photo');

    const vision = window.RinloVision;
    if (!vision?.enabled) {
      setPhotoVisionStatus(
        'fallback',
        'Нужно одно уточнение',
        'Опиши блюдо одной фразой — остальное Rinlo разберёт дальше.',
      );
      return;
    }

    setPhotoVisionStatus(
      'analyzing',
      'Разбираю фото…',
      'Проверяю блюдо, порцию и примерную калорийность.',
    );

    const foundation = window.Rinlo2Foundation?.getState?.() || {};
    const day = sumCalories();
    try {
      const response = await vision.analyzeFile(file, {
        goal: foundation.goal === 'maintain' ? 'maintain_weight' : 'weight_loss',
        decisionStage: 'ready',
        dailyTarget: DAY_TARGET || 0,
        dayCaloriesMin: day.min,
        dayCaloriesMax: day.max,
      });
      const analysis = response?.analysis;
      if (!analysis) throw new Error('empty_photo_analysis');
      photoAnalysis = analysis;

      if (analysis.status === 'recognized') {
        autoPhotoDescription = String(analysis.dish_name || '').trim();
        photoDescription.value = autoPhotoDescription;
        updatePhotoState();
        setPhotoVisionStatus(
          'recognized',
          autoPhotoDescription ? `Похоже, это ${autoPhotoDescription}` : 'Блюдо распознано',
          analysis.portion_assumption || 'Можно сразу перейти к решению.',
        );
        currentDecision = visionDecision(autoPhotoDescription, analysis);
        renderResult(currentDecision);
        showStep('result');
        return;
      }

      setPhotoVisionStatus(
        'clarify',
        'Нужно уточнить',
        analysis.clarifying_question || 'Что именно входит в блюдо?',
      );
      photoDescription.placeholder = analysis.clarifying_question || 'Коротко уточни блюдо или состав';
      setTimeout(() => photoDescription?.focus({ preventScroll: true }), 80);
    } catch (error) {
      const unavailable = ['vision_not_configured', 'vision_disabled'].includes(error?.code);
      setPhotoVisionStatus(
        'fallback',
        unavailable ? 'Автоанализ пока не подключён' : 'Не удалось разобрать фото',
        'Опиши блюдо одной фразой — выбор не потеряется.',
      );
    }
  }

  function updateQuestionState() {
    const length = questionInput.value.length;
    questionCount.textContent = String(length);
    analyzeButton.disabled = questionInput.value.trim().length < 3;
  }

  function classify(question) {
    const q = question.toLowerCase();
    if (/бургер|кола|фри|картош/.test(q)) return structuredDecision(question, presets.burger);
    if (/ролл|суш/.test(q)) return structuredDecision(question, presets.rolls);
    if (/овсян|каша|ягод/.test(q)) return structuredDecision(question, presets.oatmeal);
    return structuredDecision(question, presets.generic);
  }

  function structuredDecision(question, preset) {
    const stage = inferDecisionStage(question);
    return {
      id: `d-${Date.now()}`,
      stage,
      question,
      createdAt: new Date().toISOString(),
      title: preset.title,
      icon: preset.icon,
      tone: preset.tone,
      explanation: preset.explanation,
      calories: preset.calories,
      context: preset.context,
      fit: preset.fit,
      actionsNow: [],
      futureTip: '',
      original: { ...preset.original },
      alternative: stage === 'ready'
        ? null
        : (preset.alternative ? { ...preset.alternative, diffs: [...preset.alternative.diffs] } : null),
      selected: null
    };
  }

  function renderResult(decision) {
    resultQuestion.textContent = decision.question;
    resultTitle.textContent = decision.title;
    resultIcon.textContent = decision.icon;
    resultExplanation.textContent = decision.explanation;
    resultCalories.textContent = decision.calories;
    resultContext.textContent = decision.context;
    resultFit.textContent = decision.fit || '';
    if (fitCard) fitCard.hidden = !String(decision.fit || '').trim();
    resultCard.classList.toggle('good', decision.tone === 'good');

    const actions = Array.isArray(decision.actionsNow)
      ? decision.actionsNow.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
      : [];
    if (actionNowList) {
      actionNowList.replaceChildren(...actions.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }));
    }
    if (actionNowCard) actionNowCard.hidden = actions.length === 0;

    const future = String(decision.futureTip || '').trim();
    if (futureTip) futureTip.textContent = future;
    if (futureTipCard) futureTipCard.hidden = !future;

    const hasAlternative = decision.stage !== 'ready' && Boolean(decision.alternative);
    showAlternativeButton.hidden = !hasAlternative;
    saveOriginalButton.textContent = hasAlternative ? 'Оставить как есть' : 'Сохранить решение';
    saveOriginalButton.classList.toggle('primary', !hasAlternative);
    saveOriginalButton.classList.toggle('secondary', hasAlternative);
    renderProspective(decision.original.calories, 'prospectiveCalorieValue');
  }

  function renderAlternative(decision) {
    if (!decision.alternative) return;
    originalName.textContent = decision.original.name;
    originalCalories.textContent = decision.original.calories;
    alternativeName.textContent = decision.alternative.name;
    alternativeCalories.textContent = decision.alternative.calories;
    const originalBackground = decision.source === 'photo' && photoObjectUrl
      ? `url("${photoObjectUrl}")`
      : decision.original.image;
    originalPhoto.style.backgroundImage = originalBackground || 'linear-gradient(135deg,#e7ece5,#f5f7f3)';
    alternativePhoto.style.backgroundImage = decision.alternative.image
      ? `linear-gradient(135deg,rgba(199,255,91,.12),rgba(255,255,255,.04)),${decision.alternative.image}`
      : 'linear-gradient(135deg,#dfe8d4,#f7faef)';
    differenceList.replaceChildren(...decision.alternative.diffs.map((text) => {
      const li = document.createElement('li'); li.textContent = text; return li;
    }));
    renderProspective(decision.alternative.calories, 'alternativeProspectiveValue');
  }

  function saveChoice(useAlternative) {
    if (!currentDecision) return;
    const selected = useAlternative && currentDecision.alternative ? currentDecision.alternative : currentDecision.original;
    currentDecision.selected = { ...selected, kind: useAlternative ? 'alternative' : 'original' };
    decisions.unshift(currentDecision);
    saveDecisions();
    window.dispatchEvent(new CustomEvent('rinlo2:decision-saved', {
      detail: { decision: JSON.parse(JSON.stringify(currentDecision)) }
    }));
    savedName.textContent = selected.name;
    savedCalories.textContent = selected.calories;
    renderDecisionSurfaces();
    renderDayContext();
    renderProgress();
    showStep('saved');
  }

  function formatDecisionDate(value) {
    const date = new Date(value || 0);
    if (!Number.isFinite(date.getTime())) return '';
    const now = new Date();
    const sameDay = sameLocalDay(date.toISOString(), now);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const isYesterday = sameLocalDay(date.toISOString(), yesterday);
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `Сегодня · ${time}`;
    if (isYesterday) return `Вчера · ${time}`;
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} · ${time}`;
  }

  function stageLabel(stage) {
    if (stage === 'ready') return 'еда уже была готова';
    if (stage === 'preparing') return 'еда ещё готовилась';
    if (stage === 'choosing') return 'выбор ещё был открыт';
    return 'стадия не сохранена';
  }

  function stageNote(stage) {
    if (stage === 'ready') return 'Еда уже была готова — Rinlo ограничил рекомендации только тем, что ещё реально можно было изменить.';
    if (stage === 'preparing') return 'Решение было принято во время приготовления — Rinlo учитывал только ещё доступные изменения.';
    if (stage === 'choosing') return 'Решение было принято до еды — поэтому Rinlo мог сравнивать варианты шире.';
    return 'Это более раннее решение: стадия выбора ещё не сохранялась.';
  }

  function createRow(decision, large = false) {
    const row = document.createElement('article');
    row.className = `decision-row${large ? ' large' : ''}`;
    row.dataset.decisionId = decision.id;
    row.setAttribute('role', 'button');
    row.tabIndex = 0;

    const thumb = document.createElement('div');
    thumb.className = `thumb ${decision.original?.thumb || thumbForDish(decision.selected?.name || decision.original?.name || decision.question)}`;

    const copy = document.createElement('div');
    copy.className = 'row-copy';
    const name = document.createElement('b');
    name.textContent = decision.selected?.name || decision.original?.name || decision.question || 'Решение';

    const verdict = document.createElement('span');
    const adjusted = decision.selected?.kind === 'alternative';
    verdict.className = `verdict ${adjusted || decision.tone === 'good' ? 'good' : 'neutral'}`;
    verdict.textContent = adjusted ? '● Выбран вариант с корректировкой' : `● ${decision.title || 'Решение сохранено'}`;

    const time = document.createElement('small');
    time.textContent = formatDecisionDate(decision.createdAt);

    const arrow = document.createElement('span');
    arrow.textContent = '›';
    copy.append(name, verdict, time);
    row.append(thumb, copy, arrow);

    const open = () => showDecisionDetail(decision);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
    return row;
  }

  function matchesHistoryFilter(decision) {
    if (historyFilter === 'fits') {
      return decision.decisionState === 'fits_well' || decision.title === 'Можно брать';
    }
    if (historyFilter === 'adjusted') {
      return ['fits_with_adjustment', 'better_alternative'].includes(decision.decisionState)
        || decision.selected?.kind === 'alternative';
    }
    return true;
  }

  function matchesHistorySearch(decision) {
    const query = String(historySearch?.value || '').trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      decision.question,
      decision.title,
      decision.explanation,
      decision.original?.name,
      decision.selected?.name,
      decision.futureTip,
      ...(decision.actionsNow || []),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function renderDecisionSurfaces() {
    const ordered = [...decisions].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (homeRecentList) {
      homeRecentList.replaceChildren(...ordered.slice(0, 3).map((decision) => createRow(decision, false)));
      if (homeRecentEmpty) homeRecentEmpty.hidden = ordered.length > 0;
    }

    if (historyList) {
      const visible = ordered.filter((decision) => matchesHistoryFilter(decision) && matchesHistorySearch(decision));
      historyList.replaceChildren(...visible.map((decision) => createRow(decision, true)));
      if (historyEmpty) historyEmpty.hidden = visible.length > 0;
      if (historyCount) historyCount.textContent = `${visible.length} ${decisionWord(visible.length)}`;
    }
  }

  function showDecisionDetail(decision) {
    const selected = decision.selected || decision.original || {};
    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value || '—';
    };

    const sourceLabels = { photo: 'Фото', text: 'Текст', voice: 'Голос' };
    setText('detailSource', sourceLabels[decision.source] || 'Решение');
    setText('detailDate', formatDecisionDate(decision.createdAt));
    setText('detailName', selected.name || decision.original?.name || decision.question || 'Сохранённое решение');
    setText('detailTitle', decision.title || 'Решение сохранено');
    setText('detailExplanation', decision.explanation || 'Описание этого решения не сохранилось.');
    setText('detailCalories', selected.calories || decision.calories || '—');
    setText('detailContext', decision.context || stageLabel(decision.stage));
    setText('detailSelectedName', selected.name || decision.original?.name || 'Исходный вариант');
    setText('detailSelectedCalories', selected.calories || decision.calories || '—');
    setText('detailStageNote', stageNote(decision.stage));

    const actions = Array.isArray(decision.actionsNow)
      ? decision.actionsNow.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
      : [];
    const actionsList = document.getElementById('detailActions');
    if (actionsList) {
      actionsList.replaceChildren(...actions.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }));
    }
    const actionsCard = document.getElementById('detailActionsCard');
    if (actionsCard) actionsCard.hidden = actions.length === 0;

    const future = String(decision.futureTip || '').trim();
    setText('detailFuture', future);
    const futureCard = document.getElementById('detailFutureCard');
    if (futureCard) futureCard.hidden = !future;

    const verdict = document.getElementById('detailVerdict');
    verdict?.classList.toggle('good', decision.tone === 'good' || decision.decisionState === 'fits_well');
    showStep('detail');
  }

  function renderStoredDecisions() {
    renderDecisionSurfaces();
  }

  function importDecisions(incoming = []) {
    const existing = new Set(decisions.map((item) => item?.id).filter(Boolean));
    let added = 0;
    incoming.forEach((decision) => {
      if (!decision?.id || existing.has(decision.id)) return;
      decisions.push(decision);
      existing.add(decision.id);
      added += 1;
    });
    if (!added) return 0;
    decisions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    saveDecisions();
    renderDecisionSurfaces();
    renderDayContext();
    renderProgress();
    return added;
  }

  document.querySelector('[data-action="text"]')?.addEventListener('click', openAsk);
  document.querySelector('[data-action="photo"]')?.addEventListener('click', openPhotoPicker);
  document.querySelector('[data-action="voice"]')?.addEventListener('click', () => showToast('Голос подключим после основного decision flow.'));

  photoInput?.addEventListener('change', () => showPhoto(photoInput.files?.[0]));
  photoPreview?.addEventListener('click', openPhotoPicker);
  photoDescription?.addEventListener('input', updatePhotoState);
  document.querySelectorAll('[data-photo-question]').forEach((button) => button.addEventListener('click', () => {
    photoDescription.value = button.dataset.photoQuestion || '';
    updatePhotoState();
    photoDescription.focus();
  }));
  analyzePhotoButton?.addEventListener('click', () => {
    const description = photoDescription?.value.trim() || '';
    if (description.length < 2) return;
    const canReuseVision = photoAnalysis?.status === 'recognized'
      && autoPhotoDescription
      && description.localeCompare(autoPhotoDescription, 'ru', { sensitivity: 'base' }) === 0;
    currentDecision = canReuseVision
      ? visionDecision(description, photoAnalysis)
      : classify(description);
    currentDecision.source = 'photo';
    currentDecision.stage = 'ready';
    if (!canReuseVision) currentDecision.alternative = null;
    currentDecision.question = description;
    renderResult(currentDecision);
    showStep('result');
  });

  questionInput?.addEventListener('input', () => {
    if (textBaseQuestion && questionInput.value.trim() !== textBaseQuestion) resetTextAiState();
    updateQuestionState();
  });
  textClarificationAnswer?.addEventListener('input', () => {
    if (pendingTextClarification && analyzeButton) {
      analyzeButton.disabled = textClarificationAnswer.value.trim().length < 1;
    }
  });
  document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => {
    questionInput.value = button.dataset.question || '';
    updateQuestionState();
    questionInput.focus();
  }));

  analyzeButton?.addEventListener('click', async () => {
    const localOnly = window.RinloVision?.localOnly === true;
    const clarification = String(textClarificationAnswer?.value || '').trim();
    const baseQuestion = textBaseQuestion || questionInput.value.trim();
    if (baseQuestion.length < 3) return;

    if (localOnly || typeof window.RinloVision?.analyzeText !== 'function') {
      currentDecision = classify(baseQuestion);
      renderResult(currentDecision);
      showStep('result');
      return;
    }

    if (pendingTextClarification && clarification.length < 1) {
      textClarificationAnswer?.focus();
      return;
    }

    const requestText = pendingTextClarification
      ? `${baseQuestion}\nУточнение пользователя: ${clarification}`
      : baseQuestion;
    textBaseQuestion = baseQuestion;

    analyzeButton.disabled = true;
    analyzeButton.textContent = 'Разбираю…';
    setTextAiStatus('analyzing', 'Разбираю вопрос…', 'Учитываю блюдо, стадию решения и твой текущий контекст.');

    const foundation = window.Rinlo2Foundation?.getState?.() || {};
    const day = sumCalories();
    const stage = inferDecisionStage(requestText);

    try {
      const response = await window.RinloVision.analyzeText(requestText, {
        goal: foundation.goal === 'maintain' ? 'maintain_weight' : 'weight_loss',
        decisionStage: stage,
        dailyTarget: DAY_TARGET || 0,
        dayCaloriesMin: day.min,
        dayCaloriesMax: day.max,
      });
      const analysis = response?.analysis;
      if (!analysis) throw new Error('empty_text_analysis');

      if (analysis.status === 'needs_clarification') {
        pendingTextClarification = analysis.clarifying_question || 'Нужно одно уточнение';
        setTextAiStatus('clarify', 'Нужно уточнить', pendingTextClarification);
        if (textClarificationQuestion) textClarificationQuestion.textContent = pendingTextClarification;
        if (textClarification) textClarification.hidden = false;
        if (textClarificationAnswer) textClarificationAnswer.value = '';
        analyzeButton.textContent = 'Продолжить →';
        analyzeButton.disabled = true;
        setTimeout(() => textClarificationAnswer?.focus({ preventScroll: true }), 80);
        return;
      }

      pendingTextClarification = '';
      currentDecision = visionDecision(baseQuestion, analysis, 'text');
      renderResult(currentDecision);
      showStep('result');
    } catch (error) {
      setTextAiStatus('error', 'Не получилось получить ответ', 'Попробуй ещё раз — вопрос останется на месте.');
      analyzeButton.textContent = 'Попробовать снова →';
    } finally {
      if (!pendingTextClarification) analyzeButton.disabled = questionInput.value.trim().length < 3;
    }
  });

  showAlternativeButton?.addEventListener('click', () => {
    if (!currentDecision?.alternative) return;
    renderAlternative(currentDecision);
    showStep('alternative');
  });
  saveOriginalButton?.addEventListener('click', () => saveChoice(false));
  document.getElementById('chooseAlternative')?.addEventListener('click', () => saveChoice(true));
  document.getElementById('keepOriginal')?.addEventListener('click', () => saveChoice(false));

  flow.querySelectorAll('[data-flow-back]').forEach((button) => button.addEventListener('click', () => {
    if (activeStep === 'ask' || activeStep === 'photo' || activeStep === 'detail') closeFlow();
    else if (activeStep === 'result') showStep(currentDecision?.source === 'photo' ? 'photo' : 'ask');
    else if (activeStep === 'alternative') showStep('result');
  }));

  document.getElementById('goHistory')?.addEventListener('click', () => {
    closeFlow();
    window.Rinlo2Foundation?.navigate?.('history');
  });
  document.getElementById('askAgain')?.addEventListener('click', openAsk);
  document.getElementById('detailDone')?.addEventListener('click', closeFlow);

  historySearch?.addEventListener('input', renderDecisionSurfaces);
  historyFilters.forEach((button) => button.addEventListener('click', () => {
    historyFilter = button.dataset.historyFilter || 'all';
    historyFilters.forEach((item) => item.classList.toggle('active', item === button));
    renderDecisionSurfaces();
  }));

  injectCalorieContext();
  renderStoredDecisions();
  renderDayContext();
  renderProgress();
  updateQuestionState();

  window.Rinlo2Decisions = {
    version: 'decision-v2.7-ai-text',
    openAsk,
    openPhoto: openPhotoPicker,
    getDecisions: () => decisions.map((item) => JSON.parse(JSON.stringify(item))),
    importDecisions,
    getDayContext: () => ({ target: DAY_TARGET, decisions: todayDecisions().length, calories: sumCalories() }),
    clearDecisions() { decisions = []; localStorage.removeItem(STORAGE_KEY); location.reload(); }
  };
})();