(() => {
  const STORAGE_KEY = 'rinlo2-decisions-v2';
  const flow = document.getElementById('decisionFlow');
  if (!flow) return;

  const steps = [...flow.querySelectorAll('[data-flow-step]')];
  const questionInput = document.getElementById('decisionQuestion');
  const questionCount = document.getElementById('questionCount');
  const analyzeButton = document.getElementById('analyzeDecision');
  const resultQuestion = document.getElementById('resultQuestion');
  const resultCard = document.getElementById('resultVerdictCard');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultExplanation = document.getElementById('resultExplanation');
  const resultCalories = document.getElementById('resultCalories');
  const resultContext = document.getElementById('resultContext');
  const resultFit = document.getElementById('resultFit');
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

  let activeStep = 'ask';
  let currentDecision = null;
  let decisions = loadDecisions();
  let toastTimer = null;

  const presets = {
    burger: {
      title: 'Можно, но аккуратнее', icon: '✓', tone: 'caution',
      explanation: 'Бургер и кола — нормальный выбор иногда, но вместе это довольно калорийно. Не нужно отказываться от идеи целиком — достаточно немного облегчить комбинацию.',
      calories: '~ 820 ккал', context: 'плотный выбор',
      fit: 'Если хочется сохранить текущий темп, лучше убрать то, что почти не добавляет удовольствия, но заметно увеличивает калорийность.',
      original: { name: 'Бургер + кола', calories: '~ 820 ккал', thumb: 'food-burger', image: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=85')" },
      alternative: { name: 'Бургер без соуса + Cola Zero', calories: '~ 540 ккал', diffs: ['примерно на 280 ккал меньше', 'меньше сахара', 'проще вписать в текущий темп'], image: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=85')" }
    },
    rolls: {
      title: 'Можно брать', icon: '✓', tone: 'good',
      explanation: 'Роллы вполне могут вписаться в ужин. Основная разница обычно не в самих роллах, а в количестве, темпуре и дополнительных соусах.',
      calories: '~ 560 ккал', context: 'нормально для ужина',
      fit: 'Одна обычная порция без темпуры и лишнего соуса выглядит спокойно для твоей текущей цели.',
      original: { name: 'Роллы на ужин', calories: '~ 560 ккал', thumb: 'food-salad', image: "url('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=85')" },
      alternative: { name: 'Роллы без темпуры + соус отдельно', calories: '~ 430 ккал', diffs: ['меньше масла', 'проще контролировать соус', 'та же идея ужина'], image: "url('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=85')" }
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
      title: 'Можно, если вписывается в день', icon: '✓', tone: 'caution',
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

  function showStep(name) {
    activeStep = name;
    steps.forEach((step) => step.classList.toggle('active', step.dataset.flowStep === name));
    flow.hidden = false;
    document.body.style.overflow = 'hidden';
    flow.querySelector('.flow-step.active .flow-body')?.scrollTo(0, 0);
    if (name === 'ask') setTimeout(() => questionInput?.focus({ preventScroll: true }), 180);
  }

  function closeFlow() {
    flow.hidden = true;
    steps.forEach((step) => step.classList.remove('active'));
    document.body.style.overflow = '';
  }

  function openAsk() {
    currentDecision = null;
    questionInput.value = '';
    updateQuestionState();
    showStep('ask');
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
    return {
      id: `d-${Date.now()}`,
      question,
      createdAt: new Date().toISOString(),
      title: preset.title,
      icon: preset.icon,
      tone: preset.tone,
      explanation: preset.explanation,
      calories: preset.calories,
      context: preset.context,
      fit: preset.fit,
      original: { ...preset.original },
      alternative: preset.alternative ? { ...preset.alternative, diffs: [...preset.alternative.diffs] } : null,
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
    resultFit.textContent = decision.fit;
    resultCard.classList.toggle('good', decision.tone === 'good');

    const hasAlternative = Boolean(decision.alternative);
    showAlternativeButton.hidden = !hasAlternative;
    saveOriginalButton.textContent = hasAlternative ? 'Оставить как есть' : 'Сохранить решение';
    saveOriginalButton.classList.toggle('primary', !hasAlternative);
    saveOriginalButton.classList.toggle('secondary', hasAlternative);
  }

  function renderAlternative(decision) {
    if (!decision.alternative) return;
    originalName.textContent = decision.original.name;
    originalCalories.textContent = decision.original.calories;
    alternativeName.textContent = decision.alternative.name;
    alternativeCalories.textContent = decision.alternative.calories;
    originalPhoto.style.backgroundImage = decision.original.image;
    alternativePhoto.style.backgroundImage = `linear-gradient(135deg,rgba(199,255,91,.12),rgba(255,255,255,.04)),${decision.alternative.image}`;
    differenceList.replaceChildren(...decision.alternative.diffs.map((text) => {
      const li = document.createElement('li'); li.textContent = text; return li;
    }));
  }

  function saveChoice(useAlternative) {
    if (!currentDecision) return;
    const selected = useAlternative && currentDecision.alternative ? currentDecision.alternative : currentDecision.original;
    currentDecision.selected = { ...selected, kind: useAlternative ? 'alternative' : 'original' };
    decisions.unshift(currentDecision);
    saveDecisions();
    savedName.textContent = selected.name;
    savedCalories.textContent = selected.calories;
    renderDecisionRow(currentDecision, true);
    showStep('saved');
  }

  function createRow(decision, large = false) {
    const row = document.createElement('article');
    row.className = `decision-row${large ? ' large' : ''} is-new`;
    row.dataset.decisionId = decision.id;
    const thumb = document.createElement('div');
    thumb.className = `thumb ${decision.original.thumb || 'food-salad'}`;
    const copy = document.createElement('div'); copy.className = 'row-copy';
    const name = document.createElement('b'); name.textContent = decision.selected?.name || decision.original.name;
    const verdict = document.createElement('span'); verdict.className = `verdict ${decision.selected?.kind === 'alternative' || decision.tone === 'good' ? 'good' : 'neutral'}`;
    verdict.textContent = decision.selected?.kind === 'alternative' ? '● Выбран лучший вариант' : `● ${decision.title}`;
    const time = document.createElement('small');
    time.textContent = `Сегодня · ${new Date(decision.createdAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`;
    const arrow = document.createElement('span'); arrow.textContent = '›';
    copy.append(name, verdict, time); row.append(thumb, copy, arrow);
    row.addEventListener('click', () => showToast('Детали сохранённого решения добавим следующим слоем'));
    return row;
  }

  function renderDecisionRow(decision, prepend = false) {
    const home = document.getElementById('homeRecentList');
    const history = document.getElementById('todayHistoryList');
    if (!home || !history || document.querySelector(`[data-decision-id="${decision.id}"]`)) return;
    const homeRow = createRow(decision, false);
    const historyRow = createRow(decision, true);
    prepend ? home.prepend(homeRow) : home.append(homeRow);
    prepend ? history.prepend(historyRow) : history.append(historyRow);
    const count = document.getElementById('todayCount');
    if (count) count.textContent = `${2 + decisions.length} решения`;
  }

  function renderStoredDecisions() {
    [...decisions].reverse().forEach((decision) => renderDecisionRow(decision, true));
  }

  document.querySelector('[data-action="text"]')?.addEventListener('click', openAsk);
  document.querySelector('[data-action="photo"]')?.addEventListener('click', () => showToast('Фото-анализ — следующий технический slice. Текстовый flow уже работает.'));
  document.querySelector('[data-action="voice"]')?.addEventListener('click', () => showToast('Голос подключим после основного decision flow.'));

  questionInput?.addEventListener('input', updateQuestionState);
  document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => {
    questionInput.value = button.dataset.question || '';
    updateQuestionState();
    questionInput.focus();
  }));

  analyzeButton?.addEventListener('click', () => {
    const question = questionInput.value.trim();
    if (question.length < 3) return;
    currentDecision = classify(question);
    renderResult(currentDecision);
    showStep('result');
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
    if (activeStep === 'ask') closeFlow();
    else if (activeStep === 'result') showStep('ask');
    else if (activeStep === 'alternative') showStep('result');
  }));

  document.getElementById('goHistory')?.addEventListener('click', () => {
    closeFlow();
    window.Rinlo2Foundation?.navigate?.('history');
  });
  document.getElementById('askAgain')?.addEventListener('click', openAsk);

  renderStoredDecisions();
  updateQuestionState();

  window.Rinlo2Decisions = {
    version: 'decision-v2',
    openAsk,
    getDecisions: () => decisions.map((item) => ({ ...item })),
    clearDecisions() { decisions = []; localStorage.removeItem(STORAGE_KEY); location.reload(); }
  };
})();
