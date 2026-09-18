(() => {
  const STORAGE_KEY = 'rinlo2-decisions-v2';
  const DAY_TARGET = 2000;
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
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const photoDescription = document.getElementById('photoDescription');
  const analyzePhotoButton = document.getElementById('analyzePhoto');

  let activeStep = 'ask';
  let currentDecision = null;
  let decisions = loadDecisions();
  let toastTimer = null;
  let photoObjectUrl = null;

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

  function injectCalorieContext() {
    if (document.getElementById('dayCalorieContext')) return;

    const style = document.createElement('style');
    style.textContent = `
      .day-calorie-context{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;background:#fff;border:1px solid rgba(17,19,21,.06);border-radius:18px;padding:13px 15px;margin:-5px 0 16px;box-shadow:0 7px 24px rgba(17,19,21,.04)}
      .day-calorie-copy{min-width:0;display:flex;flex-direction:column;gap:3px}.day-calorie-copy small{font-size:9px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8a9298}.day-calorie-copy strong{font-size:15px;line-height:1.2;letter-spacing:-.025em}.day-calorie-copy span{font-size:10px;line-height:1.35;color:#7b848c}
      .day-calorie-target{text-align:right;display:flex;flex-direction:column;gap:2px;white-space:nowrap}.day-calorie-target small{font-size:9px;color:#8a9298}.day-calorie-target b{font-size:12px}.day-calorie-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#c7ff5b;box-shadow:0 0 0 4px rgba(199,255,91,.16);margin-right:6px}
      .prospective-calories{margin-top:11px;padding:12px 14px;background:#111315;color:#fff;border-radius:16px;display:flex;justify-content:space-between;align-items:center;gap:12px}.prospective-calories div{display:flex;flex-direction:column;gap:2px}.prospective-calories small{font-size:9px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.09em;font-weight:800}.prospective-calories strong{font-size:13px;line-height:1.25}.prospective-calories span{font-size:10px;color:rgba(255,255,255,.62);line-height:1.3;text-align:right;max-width:130px}
      @media(max-width:380px){.day-calorie-context{grid-template-columns:1fr}.day-calorie-target{text-align:left;flex-direction:row;gap:5px}.prospective-calories{align-items:flex-start;flex-direction:column}.prospective-calories span{text-align:left;max-width:none}}
    `;
    document.head.appendChild(style);

    const progress = document.querySelector('[data-screen="home"] .progress-strip');
    if (progress) {
      const card = document.createElement('section');
      card.className = 'day-calorie-context';
      card.id = 'dayCalorieContext';
      card.innerHTML = `
        <div class="day-calorie-copy">
          <small><span class="day-calorie-dot"></span>Контекст дня</small>
          <strong id="dayCalorieValue">Пока нет сохранённых решений</strong>
          <span id="dayCalorieNote">Только по решениям, которые ты сохранил в Rinlo</span>
        </div>
        <div class="day-calorie-target"><small>ориентир</small><b>~ ${DAY_TARGET.toLocaleString('ru-RU')} ккал</b></div>
      `;
      progress.insertAdjacentElement('afterend', card);
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

  function openAsk() {
    currentDecision = null;
    questionInput.value = '';
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

  function showPhoto(file) {
    if (!file || !photoPreview) return;
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    photoObjectUrl = URL.createObjectURL(file);
    photoPreview.style.backgroundImage = `linear-gradient(180deg,rgba(17,19,21,.02),rgba(17,19,21,.18)),url("${photoObjectUrl}")`;
    photoDescription.value = '';
    updatePhotoState();
    showStep('photo');
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
    renderProspective(decision.original.calories, 'prospectiveCalorieValue');
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
    renderDecisionRow(currentDecision, true);
    renderDayContext();
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
    renderStoredDecisions();
    renderDayContext();
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
    currentDecision = classify(description);
    currentDecision.source = 'photo';
    currentDecision.question = description;
    renderResult(currentDecision);
    showStep('result');
  });

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
    if (activeStep === 'ask' || activeStep === 'photo') closeFlow();
    else if (activeStep === 'result') showStep(currentDecision?.source === 'photo' ? 'photo' : 'ask');
    else if (activeStep === 'alternative') showStep('result');
  }));

  document.getElementById('goHistory')?.addEventListener('click', () => {
    closeFlow();
    window.Rinlo2Foundation?.navigate?.('history');
  });
  document.getElementById('askAgain')?.addEventListener('click', openAsk);

  injectCalorieContext();
  renderStoredDecisions();
  renderDayContext();
  updateQuestionState();

  window.Rinlo2Decisions = {
    version: 'decision-v2.2-photo-flow',
    openAsk,
    openPhoto: openPhotoPicker,
    getDecisions: () => decisions.map((item) => JSON.parse(JSON.stringify(item))),
    importDecisions,
    getDayContext: () => ({ target: DAY_TARGET, decisions: todayDecisions().length, calories: sumCalories() }),
    clearDecisions() { decisions = []; localStorage.removeItem(STORAGE_KEY); location.reload(); }
  };
})();