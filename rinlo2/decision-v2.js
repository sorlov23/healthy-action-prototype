(() => {
  const STORAGE_KEY = 'rinlo2-decisions-v2';
  function getCaloriePlan() {
    return window.Rinlo2Foundation?.getCaloriePlan?.() || { status: 'incomplete' };
  }

  function getDailyTarget() {
    const plan = getCaloriePlan();
    return plan?.status === 'ready' ? Number(plan.targetMid || 0) || null : null;
  }

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
  const savedThumb = document.getElementById('savedThumb');
  const originalPhoto = flow.querySelector('.burger-cola');
  const alternativePhoto = flow.querySelector('.burger-zero');
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const photoDescription = document.getElementById('photoDescription');
  const analyzePhotoButton = document.getElementById('analyzePhoto');
  const photoVisionStatus = document.getElementById('photoVisionStatus');
  const voiceRecordButton = document.getElementById('voiceRecordButton');
  const voiceState = document.getElementById('voiceState');
  const voiceStateTitle = document.getElementById('voiceStateTitle');
  const voiceStateDetail = document.getElementById('voiceStateDetail');
  const voiceTimer = document.getElementById('voiceTimer');
  const voiceFileButton = document.getElementById('voiceFileButton');
  const voiceFileInput = document.getElementById('voiceFileInput');
  const voiceClarification = document.getElementById('voiceClarification');
  const voiceClarificationQuestion = document.getElementById('voiceClarificationQuestion');
  const voiceClarificationAnswer = document.getElementById('voiceClarificationAnswer');
  const voiceClarificationSubmit = document.getElementById('voiceClarificationSubmit');
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
  let voiceRecorder = null;
  let voiceStream = null;
  let voiceChunks = [];
  let voiceBlob = null;
  let voiceTimerHandle = null;
  let voiceStartedAt = 0;
  let voiceAnalyzeOnStop = true;
  let pendingVoiceClarification = '';
  let activeDetailDecision = null;
  let correctionTarget = null;
  let correctionOrigin = 'result';
  let correctionType = 'dish';
  let correctionChoice = null;

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
  function sourceIconMarkup(source = 'text') {
    if (source === 'cook') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v7a3 3 0 0 0 3 3h1V4M8 4v10M18 4v16M15.5 4v6a2.5 2.5 0 0 0 5 0V4"/></svg>';
    }
    if (source === 'photo') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.4 6.5 9.8 4.8h4.4l1.4 1.7H18a2 2 0 0 1 2 2v8.7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h2.4Z"/><circle cx="12" cy="12.8" r="3.2"/></svg>';
    }
    if (source === 'voice') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v1.5M8 9v7M12 6.5v11M16 9v7M20 12v1.5"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5.5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3v-3h-1a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13.5h5.5"/></svg>';
  }

  function setDecisionThumb(node, source = 'text', photoUrl = '') {
    if (!node) return;
    node.className = 'thumb decision-source-thumb';
    node.dataset.source = source || 'text';
    node.classList.toggle('has-photo', Boolean(photoUrl));
    node.style.backgroundImage = photoUrl ? `url("${photoUrl}")` : '';
    node.innerHTML = sourceIconMarkup(source);
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
    const fallbackStage = source === 'photo' ? 'ready' : 'choosing';
    const stage = ['choosing','preparing','ready'].includes(analysis.decision_stage)
      ? analysis.decision_stage
      : fallbackStage;
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
      explanation: analysis.explanation || (source === 'photo' ? 'Rinlo оценил блюдо по фото.' : (source === 'voice' ? 'Rinlo разобрал голосовой вопрос.' : 'Rinlo разобрал твой вопрос.')),
      calories: calorieText,
      context: analysis.context_label || (source === 'photo' ? 'оценка по фото' : (source === 'voice' ? 'оценка по голосовому запросу' : 'оценка по описанию')),
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
      memoryAppliedCount: Number(analysis.__memoryAppliedCount || 0),
      memorySources: Array.isArray(analysis.__memorySources)
        ? analysis.__memorySources.slice(0, 4).map((item) => ({
            type: String(item?.type || ''),
            value: String(item?.value || '').slice(0, 160),
            dishName: String(item?.dishName || '').slice(0, 120),
            relevance: Number(item?.relevance || 0),
          }))
        : [],
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


  function requestGoal(profile = {}) {
    if (profile.goal === 'lose') return 'weight_loss';
    if (profile.goal === 'maintain') return 'maintain_weight';
    if (profile.goal === 'aware') return 'aware_eating';
    return 'general_food_choice';
  }

  function buildDecisionProfile(memoryQuery = '') {
    const explicit = window.Rinlo2Foundation?.getDecisionProfile?.()
      || window.Rinlo2Foundation?.getState?.()
      || {};
    const recent = decisionsSince(7);
    const recentAdjustedCount = recent.filter((decision) =>
      ['fits_with_adjustment', 'better_alternative'].includes(decision.decisionState)
      || Boolean(decision.alternative)
    ).length;
    const recentChosenAdjustmentCount = recent.filter((decision) =>
      decision.selected?.kind === 'alternative'
    ).length;
    const pattern = recent.length >= 3 ? progressPattern(recent) : null;
    const relevantCorrections = memoryQuery
      ? (window.Rinlo2Corrections?.getRelevantContext?.(memoryQuery, 30, 4) || [])
      : [];

    return {
      goal: explicit.goal || null,
      currentWeight: Number(explicit.currentWeight) > 0 ? Number(explicit.currentWeight) : null,
      targetWeight: Number(explicit.targetWeight) > 0 ? Number(explicit.targetWeight) : null,
      priorities: Array.isArray(explicit.priorities) ? explicit.priorities.slice(0, 4) : [],
      recentDecisionCount: recent.length,
      recentAdjustedCount,
      recentChosenAdjustmentCount,
      recentPattern: pattern?.title || '',
      recentCorrections: relevantCorrections,
    };
  }

  function memoryQueryFromAnalysis(analysis = {}, fallback = '') {
    return [
      fallback,
      analysis.dish_name,
      analysis.request_summary,
      analysis.portion_assumption,
      ...(Array.isArray(analysis.components) ? analysis.components.slice(0, 8) : []),
    ].filter(Boolean).join(' ');
  }

  async function refineWithRelevantMemory(analysis, fallbackQuery, day) {
    if (!analysis || analysis.status !== 'recognized') return analysis;
    const engine = window.RinloVision;
    if (!engine?.enabled || typeof engine.refineAnalysis !== 'function') return analysis;

    const memoryQuery = memoryQueryFromAnalysis(analysis, fallbackQuery);
    const profile = buildDecisionProfile(memoryQuery);
    const correctionCount = profile.recentCorrections.length;
    if (!correctionCount) return analysis;

    try {
      const response = await engine.refineAnalysis(analysis, {
        query: memoryQuery,
        goal: requestGoal(profile),
        profile,
        decisionStage: analysis.decision_stage || 'choosing',
        dailyTarget: getDailyTarget() || 0,
        dayCaloriesMin: day.min,
        dayCaloriesMax: day.max,
      });
      const refined = response?.analysis || analysis;
      if (refined.status !== 'recognized') return analysis;
      refined.__memoryAppliedCount = correctionCount;
      refined.__memorySources = profile.recentCorrections;
      return refined;
    } catch (error) {
      console.warn('Rinlo relevant memory refinement failed', error);
      return analysis;
    }
  }

  function decisionWord(count) {
    const n10 = count % 10;
    const n100 = count % 100;
    if (n10 === 1 && n100 !== 11) return 'решение';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'решения';
    return 'решений';
  }

  function progressPattern(items) {
    const cook = items.filter((decision) => decision.source === 'cook');
    const choose = items.filter((decision) => decision.source !== 'cook');

    if (cook.length >= 2) {
      const fast = cook.filter((decision) => decision.cook?.priority === 'fast').length;
      if (fast >= 2 && fast / cook.length >= 0.5) {
        return {
          title: 'Когда готовишь, чаще выбираешь «быстро».',
          text: `${fast} из ${cook.length} приготовленных решений за неделю были с приоритетом скорости.`,
        };
      }

      const timed = cook.filter((decision) => Number(decision.cook?.duration || 0) > 0);
      const quick = timed.filter((decision) => Number(decision.cook?.duration || 0) <= 20).length;
      if (quick >= 2 && timed.length && quick / timed.length >= 0.5) {
        return {
          title: 'В готовке повторяются блюда до 20 минут.',
          text: `${quick} из ${timed.length} приготовленных вариантов укладывались примерно в 20 минут.`,
        };
      }

      const ingredientCounts = new Map();
      cook.forEach((decision) => {
        [...new Set(Array.isArray(decision.cook?.ingredients) ? decision.cook.ingredients : [])]
          .forEach((name) => {
            const label = String(name || '').trim();
            if (!label) return;
            const key = label.toLowerCase().replace(/ё/g, 'е');
            const current = ingredientCounts.get(key) || { label, count: 0 };
            current.count += 1;
            ingredientCounts.set(key, current);
          });
      });
      const topIngredient = [...ingredientCounts.values()].sort((a, b) => b.count - a.count)[0];
      if (topIngredient?.count >= 2) {
        return {
          title: `В готовке повторяется: ${topIngredient.label}.`,
          text: `Этот продукт встречался в ${topIngredient.count} приготовленных решениях за последние 7 дней.`,
        };
      }
    }

    if (cook.length >= 2 && cook.length > choose.length) {
      return {
        title: 'На этой неделе Rinlo чаще помогал готовить дома.',
        text: `${cook.length} приготовленных решений против ${choose.length} ситуаций выбора готовой еды.`,
      };
    }

    if (choose.length >= 2 && choose.length > cook.length) {
      return {
        title: 'На этой неделе Rinlo чаще помогал выбирать готовую еду.',
        text: `${choose.length} ситуаций выбора против ${cook.length} приготовленных решений.`,
      };
    }

    const chosenAdjustment = choose.filter((decision) => decision.selected?.kind === 'alternative').length;
    if (chosenAdjustment >= 2) {
      return {
        title: 'В готовом выборе ты несколько раз выбрал предложенную корректировку.',
        text: `${chosenAdjustment} раза за неделю исходный вариант был заменён на предложенную Rinlo альтернативу.`,
      };
    }

    return {
      title: 'Пока нет одного устойчивого паттерна.',
      text: 'Готовка и выбор пока распределены без явного повторяющегося сценария. Rinlo продолжит смотреть на реальные действия.',
    };
  }

  function renderProgress() {
    const countNode = document.getElementById('progressDecisionCount');
    if (!countNode) return;

    const recent = decisionsSince(7);
    const cook = recent.filter((decision) => decision.source === 'cook');
    const choose = recent.filter((decision) => decision.source !== 'cook');
    const cookNode = document.getElementById('progressCookCount');
    const chooseNode = document.getElementById('progressChooseCount');
    const breakdownNode = document.getElementById('progressDecisionBreakdown');
    const patternTitle = document.getElementById('progressPatternTitle');
    const patternText = document.getElementById('progressPatternText');
    const feedbackTitle = document.getElementById('progressFeedbackTitle');
    const feedbackText = document.getElementById('progressFeedbackText');
    const feedbackSignal = document.getElementById('progressFeedbackSignal');
    const todayCaloriesNode = document.getElementById('progressTodayCalories');
    const dailyTargetNode = document.getElementById('progressDailyTarget');
    const calorieNote = document.getElementById('progressCalorieNote');

    countNode.textContent = recent.length
      ? `${recent.length} ${decisionWord(recent.length)}`
      : 'Пока нет решений';
    if (cookNode) cookNode.textContent = String(cook.length);
    if (chooseNode) chooseNode.textContent = String(choose.length);
    if (breakdownNode) {
      breakdownNode.textContent = recent.length
        ? `${cook.length} приготовил · ${choose.length} выбрал. Только действия, которые были сохранены в Rinlo.`
        : 'Rinlo начнёт собирать картину после первых реальных решений.';
    }

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

    const chooseFeedback = window.Rinlo2Feedback?.getRecentStats?.(7) || { total: 0, helpful: 0, notHelpful: 0 };
    const cookRated = cook.filter((decision) => ['helpful','not_for_me'].includes(decision.cook?.feedback));
    const cookHelpful = cookRated.filter((decision) => decision.cook?.feedback === 'helpful').length;
    const cookNotHelpful = cookRated.filter((decision) => decision.cook?.feedback === 'not_for_me').length;
    const feedbackStats = {
      total: chooseFeedback.total + cookRated.length,
      helpful: chooseFeedback.helpful + cookHelpful,
      notHelpful: chooseFeedback.notHelpful + cookNotHelpful,
    };

    if (feedbackTitle && feedbackText) {
      if (feedbackStats.total > 0) {
        feedbackTitle.textContent = `${feedbackStats.helpful} из ${feedbackStats.total} рекомендаций отмечены полезными`;
        feedbackText.textContent = feedbackStats.notHelpful
          ? `${feedbackStats.notHelpful} ${feedbackStats.notHelpful === 1 ? 'оценка показывает' : 'оценки показывают'}, что ответ не сработал. Это сигнал для будущих рекомендаций, а не оценка твоего питания.`
          : 'Все оценённые рекомендации за последние 7 дней были отмечены полезными.';
        if (feedbackSignal) feedbackSignal.textContent = feedbackStats.helpful === feedbackStats.total ? '✓' : '↗';
      } else {
        feedbackTitle.textContent = 'Пока нет оценок';
        feedbackText.textContent = 'Оцени несколько рекомендаций — и здесь появится сигнал о качестве решений Rinlo.';
        if (feedbackSignal) feedbackSignal.textContent = '○';
      }
    }

    const today = todayDecisions();
    const dayCalories = sumCalories(today);
    const plan = getCaloriePlan();
    if (todayCaloriesNode) todayCaloriesNode.textContent = formatCalories(dayCalories);
    if (dailyTargetNode) {
      dailyTargetNode.textContent = plan?.status === 'ready'
        ? `${Number(plan.targetMin).toLocaleString('ru-RU')}–${Number(plan.targetMax).toLocaleString('ru-RU')} ккал/день`
        : 'Настрой в Профиле';
    }
    if (calorieNote) {
      calorieNote.textContent = today.length
        ? `Учтено ${today.length} ${today.length === 1 ? 'сохранённое решение' : 'сохранённых решения'}. Это не полный дневник питания и не «остаток калорий».`
        : 'Здесь учитываются только решения, сохранённые в Rinlo. Это не полный дневник питания и не «остаток калорий».';
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
    if (voiceRecorder?.state === 'recording') cancelVoiceRecording();
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


  function setVoiceState(state, title, detail = '') {
    if (voiceState) voiceState.dataset.state = state;
    if (voiceStateTitle) voiceStateTitle.textContent = title;
    if (voiceStateDetail) voiceStateDetail.textContent = detail;
  }

  function formatVoiceTime(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  function stopVoiceTimer() {
    if (voiceTimerHandle) clearInterval(voiceTimerHandle);
    voiceTimerHandle = null;
  }

  function releaseVoiceStream() {
    voiceStream?.getTracks?.().forEach((track) => track.stop());
    voiceStream = null;
  }

  function resetVoiceFlow() {
    if (voiceRecorder?.state === 'recording') {
      voiceAnalyzeOnStop = false;
      try { voiceRecorder.stop(); } catch {}
    }
    stopVoiceTimer();
    releaseVoiceStream();
    voiceRecorder = null;
    voiceChunks = [];
    voiceBlob = null;
    pendingVoiceClarification = '';
    if (voiceRecordButton) {
      voiceRecordButton.dataset.recording = 'false';
      voiceRecordButton.setAttribute('aria-label', 'Начать запись');
      voiceRecordButton.disabled = false;
    }
    if (voiceTimer) voiceTimer.textContent = '0:00';
    if (voiceClarification) voiceClarification.hidden = true;
    if (voiceClarificationAnswer) voiceClarificationAnswer.value = '';
    if (voiceClarificationSubmit) voiceClarificationSubmit.disabled = true;
    setVoiceState('idle', 'Готов к записи', 'Нажми на микрофон');
  }

  function cancelVoiceRecording() {
    voiceAnalyzeOnStop = false;
    if (voiceRecorder?.state === 'recording') {
      try { voiceRecorder.stop(); } catch {}
    }
    stopVoiceTimer();
    releaseVoiceStream();
    if (voiceRecordButton) {
      voiceRecordButton.dataset.recording = 'false';
      voiceRecordButton.setAttribute('aria-label', 'Начать запись');
    }
  }

  function openVoice() {
    currentDecision = null;
    resetVoiceFlow();
    showStep('voice');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceState('error', 'Запись недоступна в этом браузере', 'Можно выбрать готовый аудиофайл ниже.');
    }
  }

  function preferredVoiceMimeType() {
    if (!window.MediaRecorder?.isTypeSupported) return '';
    return [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/aac',
    ].find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  async function analyzeVoiceAudio(blob, clarification = '') {
    if (!blob) return;
    const engine = window.RinloVision;
    if (!engine?.enabled || typeof engine.analyzeAudio !== 'function') {
      setVoiceState('error', 'Голосовой анализ сейчас недоступен', 'Попробуй текстом или выбери аудиофайл позже.');
      return;
    }

    if (voiceRecordButton) voiceRecordButton.disabled = true;
    setVoiceState('analyzing', 'Разбираю голос…', 'Понимаю блюдо, стадию решения и контекст.');
    const foundation = window.Rinlo2Foundation?.getState?.() || {};
    const day = sumCalories();

    try {
      const profile = buildDecisionProfile();
      const response = await engine.analyzeAudio(blob, {
        clarification,
        goal: requestGoal(profile),
        profile,
        decisionStage: 'auto',
        dailyTarget: getDailyTarget() || 0,
        dayCaloriesMin: day.min,
        dayCaloriesMax: day.max,
      });
      let analysis = response?.analysis;
      if (!analysis) throw new Error('empty_voice_analysis');

      if (analysis.status === 'needs_clarification') {
        pendingVoiceClarification = analysis.clarifying_question || 'Нужно одно уточнение';
        if (voiceClarificationQuestion) voiceClarificationQuestion.textContent = pendingVoiceClarification;
        if (voiceClarification) voiceClarification.hidden = false;
        if (voiceClarificationAnswer) voiceClarificationAnswer.value = '';
        if (voiceClarificationSubmit) voiceClarificationSubmit.disabled = true;
        setVoiceState('clarify', 'Нужно уточнить', pendingVoiceClarification);
        setTimeout(() => voiceClarificationAnswer?.focus({ preventScroll: true }), 80);
        return;
      }

      pendingVoiceClarification = '';
      const initialSummary = String(analysis.request_summary || analysis.dish_name || 'Голосовой вопрос').trim();
      analysis = await refineWithRelevantMemory(analysis, initialSummary, day);
      const summary = String(analysis.request_summary || analysis.dish_name || initialSummary).trim();
      currentDecision = visionDecision(summary, analysis, 'voice');
      setVoiceState('done', 'Готово', summary);
      renderResult(currentDecision);
      showStep('result');
    } catch (error) {
      setVoiceState('error', 'Не получилось разобрать запись', 'Запиши ещё раз или выбери аудиофайл.');
    } finally {
      if (voiceRecordButton) voiceRecordButton.disabled = false;
    }
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceState('error', 'Запись недоступна в этом браузере', 'Можно выбрать аудиофайл ниже.');
      return;
    }

    try {
      voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredVoiceMimeType();
      voiceRecorder = mimeType
        ? new MediaRecorder(voiceStream, { mimeType })
        : new MediaRecorder(voiceStream);
      voiceChunks = [];
      voiceAnalyzeOnStop = true;

      voiceRecorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) voiceChunks.push(event.data);
      });

      voiceRecorder.addEventListener('stop', async () => {
        stopVoiceTimer();
        const shouldAnalyze = voiceAnalyzeOnStop;
        const type = voiceRecorder?.mimeType || mimeType || voiceChunks[0]?.type || 'audio/webm';
        const blob = new Blob(voiceChunks, { type });
        releaseVoiceStream();
        if (voiceRecordButton) {
          voiceRecordButton.dataset.recording = 'false';
          voiceRecordButton.setAttribute('aria-label', 'Начать запись');
        }
        if (!shouldAnalyze || !blob.size) return;
        voiceBlob = blob;
        await analyzeVoiceAudio(blob);
      }, { once: true });

      voiceRecorder.start(250);
      voiceStartedAt = Date.now();
      if (voiceRecordButton) {
        voiceRecordButton.dataset.recording = 'true';
        voiceRecordButton.setAttribute('aria-label', 'Остановить запись');
      }
      setVoiceState('recording', 'Слушаю…', 'Нажми ещё раз, когда закончишь');
      if (voiceTimer) voiceTimer.textContent = '0:00';

      stopVoiceTimer();
      voiceTimerHandle = setInterval(() => {
        const elapsed = Math.floor((Date.now() - voiceStartedAt) / 1000);
        if (voiceTimer) voiceTimer.textContent = formatVoiceTime(elapsed);
        if (elapsed >= 30 && voiceRecorder?.state === 'recording') {
          voiceRecorder.stop();
        }
      }, 250);
    } catch (error) {
      releaseVoiceStream();
      setVoiceState('error', 'Нет доступа к микрофону', 'Разреши микрофон в Safari или выбери аудиофайл.');
    }
  }

  function stopVoiceRecording() {
    if (voiceRecorder?.state === 'recording') {
      voiceAnalyzeOnStop = true;
      voiceRecorder.stop();
    }
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
      const profile = buildDecisionProfile();
      const response = await vision.analyzeFile(file, {
        goal: requestGoal(profile),
        profile,
        decisionStage: 'ready',
        dailyTarget: getDailyTarget() || 0,
        dayCaloriesMin: day.min,
        dayCaloriesMax: day.max,
      });
      let analysis = response?.analysis;
      if (!analysis) throw new Error('empty_photo_analysis');

      if (analysis.status === 'recognized') {
        analysis = await refineWithRelevantMemory(
          analysis,
          String(analysis.dish_name || analysis.request_summary || ''),
          day,
        );
      }
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

  function correctionTypeLabel(type) {
    if (type === 'dish') return 'Блюдо';
    if (type === 'portion') return 'Порция';
    if (type === 'ingredients') return 'Состав';
    if (type === 'choice') return 'Фактический выбор';
    return 'Поправка';
  }

  function correctionPrompt(type) {
    if (type === 'dish') return ['Что это было на самом деле?', 'Например: куриная шаурма, а не бургер'];
    if (type === 'portion') return ['Какая была порция?', 'Например: большая, примерно 450 г'];
    if (type === 'ingredients') return ['Что в составе было иначе?', 'Например: соуса не было, без сыра'];
    return ['', ''];
  }

  function renderCorrectionHistory(decision) {
    const card = document.getElementById('detailCorrectionHistory');
    if (!card || !decision?.id) return;
    const correctionSource = window.Rinlo2Corrections?.getActiveCorrections?.()
      || window.Rinlo2Corrections?.getCorrections?.()
      || [];
    const corrections = correctionSource
      .filter((item) => item?.decisionId === decision.id && !item?.revokedAt)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (!corrections.length) {
      card.hidden = true;
      return;
    }
    const latest = corrections[0];
    const label = card.querySelector('small');
    const value = card.querySelector('p');
    if (label) label.textContent = corrections.length > 1
      ? `ПОПРАВКИ · ${corrections.length}`
      : 'ПОПРАВКА ПОЛЬЗОВАТЕЛЯ';
    if (value) value.textContent = `${correctionTypeLabel(latest.type)}: ${latest.value}`;
    card.hidden = false;
  }

  function updateCorrectionEditor() {
    const inputWrap = document.getElementById('correctionInputWrap');
    const inputLabel = document.getElementById('correctionInputLabel');
    const input = document.getElementById('correctionInput');
    const choiceWrap = document.getElementById('correctionChoiceWrap');
    const save = document.getElementById('saveCorrection');
    const prompt = correctionPrompt(correctionType);

    document.querySelectorAll('[data-correction-type]').forEach((button) => {
      button.classList.toggle('active', button.dataset.correctionType === correctionType);
    });

    const isChoice = correctionType === 'choice';
    if (inputWrap) inputWrap.hidden = isChoice;
    if (choiceWrap) choiceWrap.hidden = !isChoice;
    if (inputLabel) inputLabel.textContent = prompt[0];
    if (input) {
      input.placeholder = prompt[1];
      if (isChoice) input.value = '';
    }

    document.querySelectorAll('[data-correction-choice]').forEach((button) => {
      const choice = button.dataset.correctionChoice;
      button.classList.toggle('active', choice === correctionChoice);
      if (choice === 'alternative') {
        button.hidden = !correctionTarget?.alternative;
      }
    });

    if (save) {
      const ready = isChoice
        ? Boolean(correctionChoice)
        : Boolean(String(input?.value || '').trim());
      save.disabled = !ready;
    }
  }

  function closeCorrectionSheet() {
    const sheet = document.getElementById('correctionSheet');
    if (sheet) sheet.hidden = true;
    correctionTarget = null;
    correctionChoice = null;
  }

  function openCorrectionSheet(decision, origin = 'result') {
    if (!decision) return;
    correctionTarget = decision;
    correctionOrigin = origin;
    correctionType = 'dish';
    correctionChoice = null;

    const sheet = document.getElementById('correctionSheet');
    const title = document.getElementById('correctionSheetTitle');
    const subtitle = document.getElementById('correctionSheetSubtitle');
    const input = document.getElementById('correctionInput');
    const choiceType = document.querySelector('[data-correction-type="choice"]');
    if (input) input.value = '';
    if (title) title.textContent = 'Что нужно поправить?';
    if (subtitle) subtitle.textContent = decision.original?.name
      ? `Сейчас Rinlo считает, что это «${decision.original.name}».`
      : 'Поправка сохранится и будет учитываться в похожих решениях.';
    if (choiceType) choiceType.hidden = !(origin === 'detail' && decision.selected && decision.alternative);
    if (sheet) sheet.hidden = false;
    updateCorrectionEditor();
  }

  function persistCorrectedDecision(decision) {
    if (!decision?.id) return false;
    decision.updatedAt = new Date().toISOString();
    const index = decisions.findIndex((item) => item?.id === decision.id);
    if (index < 0) return false;
    decisions[index] = decision;
    saveDecisions();
    window.dispatchEvent(new CustomEvent('rinlo2:decision-saved', {
      detail: { decision: JSON.parse(JSON.stringify(decision)) }
    }));
    renderDecisionSurfaces();
    renderDayContext();
    renderProgress();
    return true;
  }

  function applyChoiceCorrection(decision, choice) {
    if (!decision?.original) return false;
    const useAlternative = choice === 'alternative' && Boolean(decision.alternative);
    const selected = useAlternative ? decision.alternative : decision.original;
    decision.selected = { ...selected, kind: useAlternative ? 'alternative' : 'original' };
    if (currentDecision?.id === decision.id) currentDecision = decision;
    persistCorrectedDecision(decision);
    return true;
  }

  async function reanalyzeWithCorrection(decision, type, value) {
    const engine = window.RinloVision;
    if (!engine?.enabled || typeof engine.analyzeText !== 'function') return null;

    const day = sumCalories();
    const labels = {
      dish: 'правильное блюдо',
      portion: 'правильный размер порции',
      ingredients: 'правильный состав',
    };
    const baseQuestion = String(decision.question || decision.original?.name || 'Предыдущее решение').trim();
    const correctionText = [
      baseQuestion,
      `Явная поправка пользователя к предыдущему распознаванию Rinlo — ${labels[type] || 'уточнение'}: ${value}.`,
      'Считай эту поправку фактом текущего решения и пересобери ответ. Не повторяй старое распознавание, если оно ей противоречит.',
    ].join('\n');
    const profile = buildDecisionProfile(correctionText);

    const response = await engine.analyzeText(correctionText, {
      goal: requestGoal(profile),
      profile,
      decisionStage: ['choosing','preparing','ready'].includes(decision.stage) ? decision.stage : 'choosing',
      dailyTarget: getDailyTarget() || 0,
      dayCaloriesMin: day.min,
      dayCaloriesMax: day.max,
    });
    const analysis = response?.analysis;
    if (!analysis || analysis.status === 'needs_clarification') return null;

    const revised = visionDecision(baseQuestion, analysis, decision.source || 'text');
    revised.id = decision.id;
    revised.createdAt = decision.createdAt || revised.createdAt;
    revised.source = decision.source || revised.source;
    revised.stage = decision.stage || revised.stage;
    revised.correctionsApplied = Number(decision.correctionsApplied || 0) + 1;

    if (decision.selected) {
      const keepAlternative = decision.selected.kind === 'alternative' && revised.alternative;
      const selected = keepAlternative ? revised.alternative : revised.original;
      revised.selected = { ...selected, kind: keepAlternative ? 'alternative' : 'original' };
    }
    return revised;
  }

  async function saveCorrectionFromSheet() {
    if (!correctionTarget) return;
    const decision = correctionTarget;
    const input = document.getElementById('correctionInput');
    const save = document.getElementById('saveCorrection');
    const isChoice = correctionType === 'choice';
    const value = isChoice
      ? (correctionChoice === 'alternative' ? 'выбрал предложенный вариант Rinlo' : 'оставил исходный вариант')
      : String(input?.value || '').trim();
    if (!value) return;

    if (save) {
      save.disabled = true;
      save.textContent = 'Сохраняю…';
    }

    try {
      window.Rinlo2Corrections?.record?.({
        decisionId: decision.id,
        type: correctionType,
        value,
        dishName: decision.original?.name || decision.question || '',
        payload: {
          source: decision.source || 'text',
          origin: correctionOrigin,
          ...(isChoice ? { choice: correctionChoice } : {}),
        },
      });

      if (isChoice) {
        applyChoiceCorrection(decision, correctionChoice);
        closeCorrectionSheet();
        if (correctionOrigin === 'detail') showDecisionDetail(decision);
        showToast('Фактический выбор обновлён');
        return;
      }

      let revised = null;
      try {
        revised = await reanalyzeWithCorrection(decision, correctionType, value);
      } catch (error) {
        console.warn('Rinlo correction reanalysis failed', error);
      }

      if (revised) {
        if (currentDecision?.id === decision.id) currentDecision = revised;
        const wasSaved = persistCorrectedDecision(revised);
        closeCorrectionSheet();
        if (correctionOrigin === 'detail' && wasSaved) {
          showDecisionDetail(revised);
        } else {
          renderResult(revised);
          showStep('result');
        }
        showToast('Поправка учтена — ответ обновлён');
      } else {
        closeCorrectionSheet();
        if (correctionOrigin === 'detail') renderCorrectionHistory(decision);
        showToast('Поправка сохранена для следующих решений');
      }
    } finally {
      if (save) {
        save.textContent = 'Сохранить поправку';
        save.disabled = false;
      }
    }
  }

  function memoryTypeLabel(type) {
    if (type === 'dish') return 'Блюдо';
    if (type === 'portion') return 'Порция';
    if (type === 'ingredients') return 'Состав';
    if (type === 'choice') return 'Фактический выбор';
    return 'Поправка';
  }

  function memoryReason(type) {
    if (type === 'dish') return 'Ты раньше исправлял распознавание похожего блюда.';
    if (type === 'portion') return 'Ты раньше уточнял порцию похожего блюда.';
    if (type === 'ingredients') return 'Ты раньше уточнял состав похожего блюда.';
    if (type === 'choice') return 'Ты раньше отмечал фактический выбор в похожей ситуации.';
    return 'Эта поправка относится к похожему контексту еды.';
  }

  function closeMemoryExplanation() {
    const sheet = document.getElementById('memoryExplainSheet');
    if (sheet) sheet.hidden = true;
  }

  function showMemoryExplanation(sources = []) {
    const sheet = document.getElementById('memoryExplainSheet');
    const list = document.getElementById('memoryExplainList');
    if (!sheet || !list) return;
    const safeSources = Array.isArray(sources) ? sources.filter((item) => item?.value).slice(0, 4) : [];
    list.replaceChildren(...safeSources.map((item) => {
      const card = document.createElement('article');
      card.className = 'memory-explain-item';

      const meta = document.createElement('small');
      meta.textContent = memoryTypeLabel(item.type);

      const title = document.createElement('b');
      title.textContent = item.dishName || 'Похожий прошлый выбор';

      const value = document.createElement('p');
      value.textContent = item.value;

      const reason = document.createElement('span');
      reason.textContent = memoryReason(item.type);

      card.append(meta, title, value, reason);
      return card;
    }));
    sheet.hidden = safeSources.length === 0;
  }

  function injectMemoryExplainUi() {
    if (document.getElementById('memoryExplainSheet')) return;

    const sheet = document.createElement('div');
    sheet.id = 'memoryExplainSheet';
    sheet.className = 'memory-explain-sheet';
    sheet.hidden = true;
    sheet.innerHTML = `
      <button class="memory-explain-backdrop" type="button" data-memory-explain-close aria-label="Закрыть"></button>
      <section class="memory-explain-panel" role="dialog" aria-modal="true" aria-labelledby="memoryExplainTitle">
        <div class="memory-explain-handle" aria-hidden="true"></div>
        <div class="memory-explain-head">
          <div>
            <small>ПОЧЕМУ RINLO ЭТО УЧЁЛ</small>
            <h2 id="memoryExplainTitle">Что повлияло на ответ</h2>
            <p>Rinlo нашёл совпадение только среди твоих явных прошлых поправок. Текущий запрос всегда важнее памяти.</p>
          </div>
          <button class="memory-explain-close" type="button" data-memory-explain-close aria-label="Закрыть">×</button>
        </div>
        <div class="memory-explain-list" id="memoryExplainList"></div>
        <p class="memory-explain-trust">Здесь нет скрытых выводов о тебе: только то, что ты сам раньше исправил. Любую такую память можно удалить в Профиле.</p>
        <button type="button" class="btn primary memory-explain-done" data-memory-explain-close>Понятно</button>
      </section>
    `;
    document.body.appendChild(sheet);
    sheet.addEventListener('click', (event) => {
      if (event.target.closest('[data-memory-explain-close]')) closeMemoryExplanation();
    });
  }

  function feedbackCopy(value) {
    if (value === 'helpful') return 'Отмечено как полезное';
    if (value === 'not_helpful') return 'Отмечено: не помогло';
    return '';
  }

  function updateFeedbackSurface(decision, scope = 'result') {
    const card = document.getElementById(scope === 'detail' ? 'detailFeedbackCard' : 'resultFeedbackCard');
    if (!card) return;
    const item = window.Rinlo2Feedback?.getFeedback?.(decision?.id);
    const value = item?.feedback || null;
    card.querySelectorAll('[data-feedback-value]').forEach((button) => {
      button.classList.toggle('active', button.dataset.feedbackValue === value);
      button.setAttribute('aria-pressed', button.dataset.feedbackValue === value ? 'true' : 'false');
    });
    const status = card.querySelector('[data-feedback-status]');
    if (status) status.textContent = feedbackCopy(value);
  }

  function setDecisionFeedback(decision, value) {
    if (!decision?.id || !window.Rinlo2Feedback?.setFeedback) return;
    window.Rinlo2Feedback.setFeedback(decision, value);
    updateFeedbackSurface(decision, 'result');
    updateFeedbackSurface(decision, 'detail');
    renderProgress();
    showToast(value === 'helpful'
      ? 'Спасибо — отметил ответ как полезный'
      : 'Спасибо — сохранил, что ответ не помог');
  }

  function createFeedbackCard(id, compact = false) {
    const card = document.createElement('article');
    card.id = id;
    card.className = compact ? 'decision-feedback-card compact' : 'decision-feedback-card';
    card.innerHTML = `
      <div class="decision-feedback-copy">
        <small>КАЧЕСТВО ОТВЕТА</small>
        <b>Этот ответ помог?</b>
      </div>
      <div class="decision-feedback-actions" role="group" aria-label="Оценить ответ Rinlo">
        <button type="button" data-feedback-value="helpful" aria-pressed="false">Полезно</button>
        <button type="button" data-feedback-value="not_helpful" aria-pressed="false">Не помогло</button>
      </div>
      <span class="decision-feedback-status" data-feedback-status aria-live="polite"></span>
    `;
    return card;
  }

  function injectFeedbackUi() {
    if (document.getElementById('resultFeedbackCard')) return;

    const resultBody = document.querySelector('[data-flow-step="result"] .flow-body');
    if (resultBody) {
      const card = createFeedbackCard('resultFeedbackCard');
      const correction = document.getElementById('resultCorrectionButton');
      if (correction) correction.insertAdjacentElement('beforebegin', card);
      else resultBody.appendChild(card);
      card.addEventListener('click', (event) => {
        const button = event.target.closest('[data-feedback-value]');
        if (button) setDecisionFeedback(currentDecision, button.dataset.feedbackValue);
      });
    }

    const detailBody = document.querySelector('[data-flow-step="detail"] .flow-body');
    const stageNote = document.getElementById('detailStageNote');
    if (detailBody) {
      const card = createFeedbackCard('detailFeedbackCard', true);
      if (stageNote) stageNote.insertAdjacentElement('beforebegin', card);
      else detailBody.appendChild(card);
      card.addEventListener('click', (event) => {
        const button = event.target.closest('[data-feedback-value]');
        if (button) setDecisionFeedback(activeDetailDecision, button.dataset.feedbackValue);
      });
    }

    const progressScreen = document.querySelector('[data-screen="progress"]');
    const patternCard = document.getElementById('progressPatternCard');
    if (progressScreen && !document.getElementById('progressFeedbackCard')) {
      const card = document.createElement('article');
      card.id = 'progressFeedbackCard';
      card.className = 'progress-feedback-card';
      card.innerHTML = `
        <div>
          <small>КАЧЕСТВО ОТВЕТОВ · 30 ДНЕЙ</small>
          <strong id="progressFeedbackTitle">Пока нет оценок</strong>
          <p id="progressFeedbackText">После пары оценок здесь будет видно, насколько ответы Rinlo реально помогают принимать решения.</p>
        </div>
        <span id="progressFeedbackSignal" aria-hidden="true">○</span>
      `;
      if (patternCard) patternCard.insertAdjacentElement('afterend', card);
      else progressScreen.appendChild(card);
    }
  }

  function injectCorrectionUi() {
    if (document.getElementById('correctionSheet')) return;

    const resultBody = document.querySelector('[data-flow-step="result"] .flow-body');
    if (resultBody) {
      const memoryNote = document.createElement('button');
      memoryNote.type = 'button';
      memoryNote.id = 'memoryAppliedNote';
      memoryNote.className = 'memory-applied-note';
      memoryNote.hidden = true;
      resultBody.appendChild(memoryNote);

      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'resultCorrectionButton';
      button.className = 'correction-link';
      button.textContent = 'Что-то распознано не так? Исправить';
      button.addEventListener('click', () => openCorrectionSheet(currentDecision, 'result'));
      resultBody.appendChild(button);
    }

    const detailBody = document.querySelector('[data-flow-step="detail"] .flow-body');
    const stageNote = document.getElementById('detailStageNote');
    if (detailBody) {
      const memoryCard = document.createElement('button');
      memoryCard.type = 'button';
      memoryCard.id = 'detailMemoryExplanation';
      memoryCard.className = 'detail-memory-explanation';
      memoryCard.hidden = true;
      memoryCard.innerHTML = '<small>ПЕРСОНАЛИЗАЦИЯ</small><b>Rinlo учёл твою прошлую поправку</b><span>Посмотреть почему →</span>';
      memoryCard.addEventListener('click', () => {
        const sources = Array.isArray(activeDetailDecision?.memorySources) ? activeDetailDecision.memorySources : [];
        showMemoryExplanation(sources);
      });

      const historyCard = document.createElement('article');
      historyCard.id = 'detailCorrectionHistory';
      historyCard.className = 'detail-section correction-history-card';
      historyCard.hidden = true;
      historyCard.innerHTML = '<small>ПОПРАВКА ПОЛЬЗОВАТЕЛЯ</small><p></p>';

      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'detailCorrectionButton';
      button.className = 'correction-link detail-correction-link';
      button.textContent = 'Исправить данные решения';
      button.addEventListener('click', () => openCorrectionSheet(activeDetailDecision, 'detail'));

      if (stageNote) {
        stageNote.insertAdjacentElement('beforebegin', memoryCard);
        stageNote.insertAdjacentElement('beforebegin', historyCard);
        stageNote.insertAdjacentElement('beforebegin', button);
      } else {
        detailBody.append(historyCard, memoryCard, button);
      }
    }

    const sheet = document.createElement('div');
    sheet.id = 'correctionSheet';
    sheet.className = 'correction-sheet';
    sheet.hidden = true;
    sheet.innerHTML = `
      <button class="correction-sheet-backdrop" type="button" data-correction-close aria-label="Закрыть"></button>
      <section class="correction-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="correctionSheetTitle">
        <div class="correction-sheet-handle" aria-hidden="true"></div>
        <div class="correction-sheet-head">
          <div>
            <small>ПОПРАВКА RINLO</small>
            <h2 id="correctionSheetTitle">Что нужно поправить?</h2>
            <p id="correctionSheetSubtitle"></p>
          </div>
          <button type="button" class="correction-sheet-close" data-correction-close aria-label="Закрыть">×</button>
        </div>
        <div class="correction-types">
          <button type="button" class="active" data-correction-type="dish">Не то блюдо</button>
          <button type="button" data-correction-type="portion">Другая порция</button>
          <button type="button" data-correction-type="ingredients">Неточный состав</button>
          <button type="button" data-correction-type="choice">Выбрал другое</button>
        </div>
        <label class="correction-input-wrap" id="correctionInputWrap">
          <span id="correctionInputLabel">Что это было на самом деле?</span>
          <input id="correctionInput" maxlength="240" autocomplete="off" />
        </label>
        <div class="correction-choice-wrap" id="correctionChoiceWrap" hidden>
          <span>Что было выбрано в итоге?</span>
          <div>
            <button type="button" data-correction-choice="original">Исходный вариант</button>
            <button type="button" data-correction-choice="alternative">Вариант Rinlo</button>
          </div>
        </div>
        <p class="correction-trust-note">Rinlo сохранит именно твою поправку. Она не станет универсальным правилом и будет учитываться только там, где действительно релевантна.</p>
        <button class="btn primary wide" type="button" id="saveCorrection" disabled>Сохранить поправку</button>
      </section>
    `;
    document.body.appendChild(sheet);

    sheet.querySelectorAll('[data-correction-close]').forEach((button) => {
      button.addEventListener('click', closeCorrectionSheet);
    });
    sheet.querySelectorAll('[data-correction-type]').forEach((button) => {
      button.addEventListener('click', () => {
        correctionType = button.dataset.correctionType || 'dish';
        correctionChoice = null;
        const input = document.getElementById('correctionInput');
        if (input) input.value = '';
        updateCorrectionEditor();
        if (correctionType !== 'choice') setTimeout(() => input?.focus({ preventScroll: true }), 50);
      });
    });
    sheet.querySelectorAll('[data-correction-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        correctionChoice = button.dataset.correctionChoice || null;
        updateCorrectionEditor();
      });
    });
    document.getElementById('correctionInput')?.addEventListener('input', updateCorrectionEditor);
    document.getElementById('saveCorrection')?.addEventListener('click', saveCorrectionFromSheet);
  }

  function renderResult(decision) {
    resultQuestion.textContent = decision.question;
    const memoryNote = document.getElementById('memoryAppliedNote');
    if (memoryNote) {
      const sources = Array.isArray(decision.memorySources) ? decision.memorySources : [];
      const count = Math.min(Number(decision.memoryAppliedCount || 0), sources.length || Number(decision.memoryAppliedCount || 0));
      memoryNote.hidden = count <= 0 || sources.length === 0;
      memoryNote.textContent = count > 0
        ? `Учтена ${count === 1 ? '1 релевантная поправка' : count + ' релевантные поправки'} · Почему?`
        : '';
      memoryNote.onclick = sources.length ? () => showMemoryExplanation(sources) : null;
    }
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
    updateFeedbackSurface(decision, 'result');
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
    currentDecision.updatedAt = new Date().toISOString();
    const existingFeedback = window.Rinlo2Feedback?.getFeedback?.(currentDecision.id);
    if (existingFeedback?.feedback) window.Rinlo2Feedback?.setFeedback?.(currentDecision, existingFeedback.feedback);
    decisions.unshift(currentDecision);
    saveDecisions();
    window.dispatchEvent(new CustomEvent('rinlo2:decision-saved', {
      detail: { decision: JSON.parse(JSON.stringify(currentDecision)) }
    }));
    savedName.textContent = selected.name;
    savedCalories.textContent = selected.calories;
    setDecisionThumb(
      savedThumb,
      currentDecision.source || 'text',
      currentDecision.source === 'photo' ? photoObjectUrl : '',
    );
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
    const currentPhotoUrl = decision.source === 'photo'
      && currentDecision?.id === decision.id
      ? photoObjectUrl
      : '';
    setDecisionThumb(thumb, decision.source || 'text', currentPhotoUrl);

    const copy = document.createElement('div');
    copy.className = 'row-copy';
    const name = document.createElement('b');
    name.textContent = decision.selected?.name || decision.original?.name || decision.question || 'Решение';

    const verdict = document.createElement('span');
    const adjusted = decision.selected?.kind === 'alternative';
    verdict.className = `verdict ${adjusted || decision.tone === 'good' ? 'good' : 'neutral'}`;
    if (decision.source === 'cook') {
      const duration = Number(decision.cook?.duration || 0);
      verdict.textContent = duration ? `● Приготовил · ${duration} мин` : '● Приготовил';
    } else {
      verdict.textContent = adjusted ? '● Выбран вариант с корректировкой' : `● ${decision.title || 'Решение сохранено'}`;
    }

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
    if (historyFilter === 'cook') return decision.source === 'cook';
    if (historyFilter === 'choose') return decision.source !== 'cook';
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
      ...(decision.cook?.ingredients || []),
      ...(decision.cook?.steps || []).flatMap((step) => [step?.title, step?.instruction]),
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
    activeDetailDecision = decision;
    const selected = decision.selected || decision.original || {};
    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value || '—';
    };

    const sourceLabels = { photo: 'Фото', text: 'Текст', voice: 'Голос', cook: 'Готовка' };
    const isCook = decision.source === 'cook';
    setText('detailSource', sourceLabels[decision.source] || 'Решение');

    const explanationLabel = document.querySelector('[data-flow-step="detail"] .detail-section > small');
    const actionsLabel = document.querySelector('#detailActionsCard > small');
    const selectedLabel = document.querySelector('[data-flow-step="detail"] .selected-detail > small');
    if (explanationLabel) explanationLabel.textContent = isCook ? 'ПОЧЕМУ ЭТОТ ВАРИАНТ' : 'ЧТО БЫЛО В МОМЕНТ РЕШЕНИЯ';
    if (actionsLabel) actionsLabel.textContent = isCook ? 'КАК ГОТОВИЛ' : 'МОЖНО БЫЛО СДЕЛАТЬ ТОГДА';
    if (selectedLabel) selectedLabel.textContent = isCook ? 'ЧТО ПРИГОТОВИЛ' : 'ЧТО ТЫ ВЫБРАЛ';
    setText('detailDate', formatDecisionDate(decision.createdAt));
    setText('detailName', selected.name || decision.original?.name || decision.question || 'Сохранённое решение');
    setText('detailTitle', decision.title || 'Решение сохранено');
    setText('detailExplanation', decision.explanation || 'Описание этого решения не сохранилось.');
    setText('detailCalories', selected.calories || decision.calories || '—');
    setText('detailContext', decision.context || (decision.source === 'cook' ? 'приготовлено дома' : stageLabel(decision.stage)));
    setText('detailSelectedName', selected.name || decision.original?.name || 'Исходный вариант');
    setText('detailSelectedCalories', selected.calories || decision.calories || '—');
    setText('detailStageNote', decision.source === 'cook'
      ? (decision.cook?.feedback === 'helpful'
          ? 'Ты отметил этот вариант как удачный. Rinlo сможет использовать это как сигнал для будущих рецептов.'
          : 'Это блюдо было приготовлено через Cook Flow и сохранено в общей истории решений.')
      : stageNote(decision.stage));

    const actions = decision.source === 'cook' && Array.isArray(decision.cook?.steps)
      ? decision.cook.steps.map((step) => {
          const title = String(step?.title || '').trim();
          const instruction = String(step?.instruction || '').trim();
          return [title, instruction].filter(Boolean).join(': ');
        }).filter(Boolean).slice(0, 8)
      : (Array.isArray(decision.actionsNow)
          ? decision.actionsNow.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
          : []);
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
    renderCorrectionHistory(decision);
    const detailMemory = document.getElementById('detailMemoryExplanation');
    if (detailMemory) {
      const sources = Array.isArray(decision.memorySources) ? decision.memorySources : [];
      detailMemory.hidden = Number(decision.memoryAppliedCount || 0) <= 0 || sources.length === 0;
    }
    updateFeedbackSurface(decision, 'detail');
    showStep('detail');
  }


  function cookNutritionText(nutrition = {}) {
    const range = (min, max, suffix = '') => {
      const a = Math.max(0, Math.round(Number(min || 0)));
      const b = Math.max(0, Math.round(Number(max || 0)));
      if (!a && !b) return '';
      if (!a || a === b) return String(b || a) + suffix;
      return a + '–' + b + suffix;
    };
    const calories = range(nutrition.calorieMin, nutrition.calorieMax, ' ккал');
    const protein = range(nutrition.proteinMin, nutrition.proteinMax);
    const fat = range(nutrition.fatMin, nutrition.fatMax);
    const carbs = range(nutrition.carbsMin, nutrition.carbsMax);
    const macros = protein || fat || carbs
      ? `Б ${protein || '—'} · Ж ${fat || '—'} · У ${carbs || '—'} г`
      : '';
    return [calories ? '≈ ' + calories : '', macros].filter(Boolean).join(' · ');
  }

  function recordCookDecision(payload = {}) {
    const recipe = payload.recipe && typeof payload.recipe === 'object' ? payload.recipe : {};
    const name = String(recipe.name || '').trim();
    if (!name) return null;

    const id = String(payload.id || `cook-${Date.now()}`);
    const createdAt = String(payload.createdAt || new Date().toISOString());
    const nutritionText = cookNutritionText(recipe.nutrition || {});
    const priorityLabels = {
      fast: 'Быстро',
      satiety: 'Сытно',
      light: 'Полегче',
      use: 'Использовать продукты',
      none: 'Без приоритета',
    };
    const contextParts = [
      priorityLabels[payload.priority] || '',
      Number(recipe.duration || 0) > 0 ? `${Math.round(Number(recipe.duration))} минут` : '',
    ].filter(Boolean);

    const cook = {
      ingredients: Array.isArray(payload.ingredients) ? payload.ingredients.map(String).slice(0, 24) : [],
      staples: Array.isArray(recipe.staples) ? recipe.staples.map(String).slice(0, 16) : [],
      priority: String(payload.priority || 'none'),
      outcome: String(payload.outcome || 'prepared'),
      feedback: String(payload.feedback || ''),
      duration: Math.max(0, Number(recipe.duration || 0)),
      nutrition: recipe.nutrition && typeof recipe.nutrition === 'object'
        ? JSON.parse(JSON.stringify(recipe.nutrition))
        : null,
      steps: Array.isArray(recipe.steps)
        ? recipe.steps.map((step) => ({
            title: String(step?.[0] || step?.title || ''),
            instruction: String(step?.[1] || step?.instruction || ''),
            minutes: Math.max(0, Number(step?.[2] || step?.minutes || 0)),
          })).slice(0, 8)
        : [],
    };

    const decision = {
      id,
      source: 'cook',
      stage: 'ready',
      question: 'Что приготовить?',
      createdAt,
      updatedAt: new Date().toISOString(),
      decisionState: 'fits_well',
      title: 'Приготовил',
      icon: '✓',
      tone: 'good',
      explanation: String(recipe.note || 'Rinlo помог выбрать и приготовить это блюдо.'),
      calories: nutritionText,
      context: contextParts.join(' · ') || 'приготовлено дома',
      fit: '',
      actionsNow: [],
      futureTip: '',
      original: {
        name,
        calories: nutritionText,
        thumb: 'food-salad',
      },
      alternative: null,
      selected: {
        name,
        calories: nutritionText,
        thumb: 'food-salad',
        kind: 'original',
      },
      memoryAppliedCount: 0,
      memorySources: [],
      cook,
    };

    const index = decisions.findIndex((item) => item?.id === id);
    if (index >= 0) {
      decision.createdAt = decisions[index].createdAt || createdAt;
      decisions[index] = decision;
    } else {
      decisions.unshift(decision);
    }
    decisions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    saveDecisions();
    renderDecisionSurfaces();
    renderDayContext();
    renderProgress();
    window.dispatchEvent(new CustomEvent('rinlo2:decision-saved', {
      detail: { decision: JSON.parse(JSON.stringify(decision)) }
    }));
    return id;
  }

  function renderStoredDecisions() {
    renderDecisionSurfaces();
  }

  function importDecisions(incoming = []) {
    const indexById = new Map(
      decisions
        .map((item, index) => [item?.id, index])
        .filter(([id]) => Boolean(id))
    );
    let changed = 0;

    incoming.forEach((decision) => {
      if (!decision?.id) return;
      const index = indexById.get(decision.id);
      if (index == null) {
        decisions.push(decision);
        indexById.set(decision.id, decisions.length - 1);
        changed += 1;
        return;
      }

      const local = decisions[index];
      const localTime = new Date(local?.updatedAt || local?.createdAt || 0).getTime();
      const remoteTime = new Date(decision?.updatedAt || decision?.createdAt || 0).getTime();
      if (Number.isFinite(remoteTime) && remoteTime > (Number.isFinite(localTime) ? localTime : 0)) {
        decisions[index] = decision;
        if (currentDecision?.id === decision.id) currentDecision = decision;
        if (activeDetailDecision?.id === decision.id) activeDetailDecision = decision;
        changed += 1;
      }
    });

    if (!changed) return 0;
    decisions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    saveDecisions();
    renderDecisionSurfaces();
    renderDayContext();
    renderProgress();
    if (activeDetailDecision?.id) {
      const fresh = decisions.find((item) => item.id === activeDetailDecision.id);
      if (fresh) activeDetailDecision = fresh;
    }
    return changed;
  }

  document.querySelector('[data-action="text"]')?.addEventListener('click', openAsk);
  document.querySelector('[data-action="photo"]')?.addEventListener('click', openPhotoPicker);
  document.querySelector('[data-action="voice"]')?.addEventListener('click', openVoice);

  voiceRecordButton?.addEventListener('click', () => {
    if (voiceRecorder?.state === 'recording') stopVoiceRecording();
    else startVoiceRecording();
  });
  voiceFileButton?.addEventListener('click', () => {
    if (!voiceFileInput) return;
    voiceFileInput.value = '';
    voiceFileInput.click();
  });
  voiceFileInput?.addEventListener('change', async () => {
    const file = voiceFileInput.files?.[0];
    if (!file) return;
    voiceBlob = file;
    if (voiceTimer) voiceTimer.textContent = '—';
    await analyzeVoiceAudio(file);
  });
  voiceClarificationAnswer?.addEventListener('input', () => {
    if (voiceClarificationSubmit) {
      voiceClarificationSubmit.disabled = voiceClarificationAnswer.value.trim().length < 1;
    }
  });
  voiceClarificationSubmit?.addEventListener('click', async () => {
    const answer = voiceClarificationAnswer?.value.trim() || '';
    if (!voiceBlob || !answer) return;
    if (voiceClarification) voiceClarification.hidden = true;
    await analyzeVoiceAudio(voiceBlob, answer);
  });

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
      const profile = buildDecisionProfile(requestText);
      const response = await window.RinloVision.analyzeText(requestText, {
        goal: requestGoal(profile),
        profile,
        decisionStage: stage,
        dailyTarget: getDailyTarget() || 0,
        dayCaloriesMin: day.min,
        dayCaloriesMax: day.max,
      });
      const analysis = response?.analysis;
      if (!analysis) throw new Error('empty_text_analysis');
      analysis.__memoryAppliedCount = profile.recentCorrections.length;
      analysis.__memorySources = profile.recentCorrections;

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
      analyzeButton.disabled = false;
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
    if (activeStep === 'ask' || activeStep === 'photo' || activeStep === 'voice' || activeStep === 'detail') closeFlow();
    else if (activeStep === 'result') {
      if (currentDecision?.source === 'photo') showStep('photo');
      else if (currentDecision?.source === 'voice') showStep('voice');
      else showStep('ask');
    }
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

  window.addEventListener('rinlo2:profile-applied', () => renderProgress());
  window.addEventListener('rinlo2:feedback-changed', () => renderProgress());
  window.addEventListener('rinlo2:feedback-sync', () => {
    renderProgress();
    if (currentDecision) updateFeedbackSurface(currentDecision, 'result');
    if (activeDetailDecision) updateFeedbackSurface(activeDetailDecision, 'detail');
  });

  injectCalorieContext();
  injectMemoryExplainUi();
  injectCorrectionUi();
  injectFeedbackUi();
  renderStoredDecisions();
  renderDayContext();
  renderProgress();
  updateQuestionState();

  window.Rinlo2Decisions = {
    version: 'decision-v2.19-progress-v2',
    openAsk,
    openPhoto: openPhotoPicker,
    getDecisions: () => decisions.map((item) => JSON.parse(JSON.stringify(item))),
    importDecisions,
    recordCookDecision,
    getDayContext: () => {
      const plan = getCaloriePlan();
      return {
        target: getDailyTarget(),
        targetMin: plan?.status === 'ready' ? plan.targetMin : null,
        targetMax: plan?.status === 'ready' ? plan.targetMax : null,
        maintenance: plan?.status === 'ready' ? plan.maintenance : null,
        decisions: todayDecisions().length,
        calories: sumCalories(),
      };
    },
    showMemoryExplanation,
    clearDecisions() { decisions = []; localStorage.removeItem(STORAGE_KEY); location.reload(); }
  };
})();