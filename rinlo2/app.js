(() => {
  const STORAGE_KEY = 'rinlo2-foundation-state-v1';

  const shell = document.getElementById('appShell');
  const onboarding = document.getElementById('onboarding');
  const toast = document.getElementById('toast');
  const screens = [...document.querySelectorAll('[data-screen]')];
  const navButtons = [...document.querySelectorAll('[data-nav]')];
  const onboardingSteps = [...document.querySelectorAll('[data-onboarding-step]')];

  const defaultState = {
    onboardingDone: false,
    currentWeight: null,
    targetWeight: null,
    sexForCalorie: null,
    ageYears: null,
    heightCm: null,
    activityLevel: null,
    goal: null,
    priorities: [],
    staples: [],
    profileUpdatedAt: null,
    activeScreen: 'home'
  };

  let state = loadState();
  let toastTimer = null;

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const loaded = { ...defaultState, ...raw };

      // Prototype migration: early Rinlo 2 builds shipped with demo values
      // 70.2 → 68.0 kg. Do not treat them as real personalization unless
      // the profile was explicitly saved in the new editor.
      if (!raw.profileVersion
        && Number(loaded.currentWeight) === 70.2
        && Number(loaded.targetWeight) === 68
        && loaded.goal === 'lose') {
        loaded.currentWeight = null;
        loaded.targetWeight = null;
        loaded.goal = null;
      }
      return loaded;
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }


  const allowedGoals = new Set(['lose','maintain','aware']);
  const allowedPriorities = new Set(['satiety','calories','familiar','simplicity']);
  const allowedStaples = new Set([
    'salt','pepper','vegetable_oil','butter','garlic','onion',
    'eggs','rice','buckwheat','pasta','flour','milk','cheese','sour_cream','soy_sauce'
  ]);
  const allowedSexForCalorie = new Set(['male','female']);
  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
    very_high: 1.9,
  };
  const activityLabels = {
    sedentary: 'низкая активность',
    light: 'лёгкая активность',
    moderate: 'средняя активность',
    high: 'высокая активность',
    very_high: 'очень высокая активность',
  };

  function optionalNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(',', '.'));
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function normalizeProfile(input = {}) {
    const goal = allowedGoals.has(input.goal) ? input.goal : null;
    const currentWeight = optionalNumber(input.currentWeight);
    const targetWeight = optionalNumber(input.targetWeight);
    const sexForCalorie = allowedSexForCalorie.has(input.sexForCalorie) ? input.sexForCalorie : null;
    const ageYearsRaw = optionalNumber(input.ageYears);
    const ageYears = ageYearsRaw && ageYearsRaw >= 18 && ageYearsRaw <= 100 ? Math.round(ageYearsRaw) : null;
    const heightCmRaw = optionalNumber(input.heightCm);
    const heightCm = heightCmRaw && heightCmRaw >= 120 && heightCmRaw <= 230 ? Math.round(heightCmRaw * 10) / 10 : null;
    const activityLevel = Object.prototype.hasOwnProperty.call(activityFactors, input.activityLevel)
      ? input.activityLevel
      : null;
    const priorities = Array.isArray(input.priorities)
      ? [...new Set(input.priorities.filter((item) => allowedPriorities.has(item)))].slice(0, 4)
      : [];
    const staples = Array.isArray(input.staples)
      ? [...new Set(input.staples.filter((item) => allowedStaples.has(item)))].slice(0, 15)
      : [];
    return { goal, currentWeight, targetWeight, sexForCalorie, ageYears, heightCm, activityLevel, priorities, staples };
  }

  function roundTo50(value) {
    return Math.round(Number(value || 0) / 50) * 50;
  }

  function calculateCaloriePlan(input = {}) {
    const profile = normalizeProfile(input);
    const missing = [];
    if (!profile.sexForCalorie) missing.push('sex');
    if (!profile.ageYears) missing.push('age');
    if (!profile.heightCm) missing.push('height');
    if (!profile.currentWeight) missing.push('weight');
    if (!profile.activityLevel) missing.push('activity');

    if (missing.length) {
      return {
        status: 'incomplete',
        missing,
        formula: 'Mifflin–St Jeor',
        targetMin: null,
        targetMax: null,
        targetMid: null,
        maintenance: null,
        bmr: null,
        activityFactor: profile.activityLevel ? activityFactors[profile.activityLevel] : null,
      };
    }

    const sexOffset = profile.sexForCalorie === 'male' ? 5 : -161;
    const bmrRaw = (10 * profile.currentWeight)
      + (6.25 * profile.heightCm)
      - (5 * profile.ageYears)
      + sexOffset;
    const activityFactor = activityFactors[profile.activityLevel];
    const maintenanceRaw = bmrRaw * activityFactor;

    let targetMinRaw;
    let targetMaxRaw;
    if (profile.goal === 'lose') {
      targetMinRaw = maintenanceRaw * 0.8;
      targetMaxRaw = maintenanceRaw * 0.9;
    } else {
      targetMinRaw = maintenanceRaw * 0.95;
      targetMaxRaw = maintenanceRaw * 1.05;
    }

    const targetMin = Math.max(0, roundTo50(targetMinRaw));
    const targetMax = Math.max(targetMin, roundTo50(targetMaxRaw));
    const maintenance = Math.max(0, roundTo50(maintenanceRaw));
    const bmr = Math.max(0, Math.round(bmrRaw));

    return {
      status: 'ready',
      formula: 'Mifflin–St Jeor',
      bmr,
      maintenance,
      targetMin,
      targetMax,
      targetMid: roundTo50((targetMin + targetMax) / 2),
      activityFactor,
      activityLabel: activityLabels[profile.activityLevel] || '',
      goal: profile.goal || 'aware',
      deficitPercentMin: profile.goal === 'lose' ? 10 : 0,
      deficitPercentMax: profile.goal === 'lose' ? 20 : 0,
    };
  }

  function formatCalorieRange(plan) {
    if (!plan || plan.status !== 'ready') return '—';
    return plan.targetMin === plan.targetMax
      ? `${plan.targetMin.toLocaleString('ru-RU')} ккал/день`
      : `${plan.targetMin.toLocaleString('ru-RU')}–${plan.targetMax.toLocaleString('ru-RU')} ккал/день`;
  }

  function goalLabel(goal) {
    if (goal === 'lose') return 'снизить вес';
    if (goal === 'maintain') return 'удерживать вес';
    if (goal === 'aware') return 'питаться осознаннее';
    return '';
  }

  function renderProfile() {
    const profile = normalizeProfile(state);
    document.querySelectorAll('[data-profile-goal]').forEach((button) => {
      button.classList.toggle('active', button.dataset.profileGoal === profile.goal);
    });
    document.querySelectorAll('[data-profile-sex]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-profile-sex]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderProfilePreviewFromForm();
    });
  });

  document.querySelectorAll('[data-profile-priority]').forEach((button) => {
      button.classList.toggle('active', profile.priorities.includes(button.dataset.profilePriority));
    });
    document.querySelectorAll('[data-profile-staple]').forEach((button) => {
      button.classList.toggle('active', profile.staples.includes(button.dataset.profileStaple));
    });
    document.querySelectorAll('[data-profile-sex]').forEach((button) => {
      button.classList.toggle('active', button.dataset.profileSex === profile.sexForCalorie);
    });

    const current = document.getElementById('profileCurrentWeight');
    const target = document.getElementById('profileTargetWeight');
    const age = document.getElementById('profileAgeYears');
    const height = document.getElementById('profileHeightCm');
    const activity = document.getElementById('profileActivityLevel');
    if (current && document.activeElement !== current) current.value = profile.currentWeight ?? '';
    if (target && document.activeElement !== target) target.value = profile.targetWeight ?? '';
    if (age && document.activeElement !== age) age.value = profile.ageYears ?? '';
    if (height && document.activeElement !== height) height.value = profile.heightCm ?? '';
    if (activity && document.activeElement !== activity) activity.value = profile.activityLevel || '';

    const title = document.getElementById('profileSummaryTitle');
    const text = document.getElementById('profileSummaryText');
    const parts = [];
    if (profile.goal) parts.push(`Цель — ${goalLabel(profile.goal)}`);
    if (profile.currentWeight && profile.targetWeight) {
      parts.push(`${profile.currentWeight.toLocaleString('ru-RU')} → ${profile.targetWeight.toLocaleString('ru-RU')} кг`);
    }
    const caloriePlan = calculateCaloriePlan(profile);
    if (caloriePlan.status === 'ready') parts.push(formatCalorieRange(caloriePlan));
    if (title) title.textContent = parts.length ? parts.join(' · ') : 'Контекст пока минимальный';

    const calorieCard = document.getElementById('profileCaloriePlan');
    const calorieTarget = document.getElementById('profileCalorieTarget');
    const calorieMaintenance = document.getElementById('profileCalorieMaintenance');
    const calorieBmr = document.getElementById('profileCalorieBmr');
    const calorieNote = document.getElementById('profileCalorieNote');
    if (calorieCard) calorieCard.dataset.state = caloriePlan.status;
    if (calorieTarget) {
      calorieTarget.textContent = caloriePlan.status === 'ready'
        ? formatCalorieRange(caloriePlan)
        : 'Заполни параметры выше';
    }
    if (calorieMaintenance) {
      calorieMaintenance.textContent = caloriePlan.status === 'ready'
        ? `≈ ${caloriePlan.maintenance.toLocaleString('ru-RU')} ккал`
        : '—';
    }
    if (calorieBmr) {
      calorieBmr.textContent = caloriePlan.status === 'ready'
        ? `≈ ${caloriePlan.bmr.toLocaleString('ru-RU')} ккал`
        : '—';
    }
    if (calorieNote) {
      calorieNote.textContent = caloriePlan.status === 'ready'
        ? (profile.goal === 'lose'
            ? 'Диапазон рассчитан примерно на 10–20% ниже поддержки. Это ориентир, а не медицинское назначение.'
            : 'Диапазон близок к расчётной поддержке. Это ориентир, а не медицинское назначение.')
        : 'Нужны пол для расчёта, возраст, рост, текущий вес и уровень активности.';
    }

    const priorityLabels = {
      satiety: 'сытность',
      calories: 'калорийность',
      familiar: 'привычные продукты',
      simplicity: 'простота',
    };
    const chosen = profile.priorities.map((item) => priorityLabels[item]).filter(Boolean);
    if (text) {
      const summary = [];
      if (chosen.length) summary.push(`В спорных случаях учитывать: ${chosen.join(', ')}.`);
      if (profile.staples.length) summary.push(`Обычно дома отмечено продуктов: ${profile.staples.length}.`);
      text.textContent = summary.length
        ? summary.join(' ')
        : 'Можно оставить всё как есть или добавить пару ориентиров ниже.';
    }
  }

  function applyDecisionProfile(profile, { silent = false, updatedAt = null } = {}) {
    const normalized = normalizeProfile(profile);
    const nextUpdatedAt = updatedAt || (!silent ? new Date().toISOString() : state.profileUpdatedAt || null);
    state = { ...state, ...normalized, profileVersion: 4, profileUpdatedAt: nextUpdatedAt };
    saveState();
    renderProfile();
    window.dispatchEvent(new CustomEvent('rinlo2:profile-applied', {
      detail: { profile: { ...normalized } }
    }));
    if (!silent) {
      window.dispatchEvent(new CustomEvent('rinlo2:profile-changed', {
        detail: { profile: { ...normalized } }
      }));
    }
    return { ...normalized };
  }

  function showScreen(name) {
    const target = screens.find((screen) => screen.dataset.screen === name) || screens[0];
    screens.forEach((screen) => screen.classList.toggle('active', screen === target));
    navButtons.forEach((button) => {
      const isActive = button.closest('.bottom-nav') && button.dataset.nav === target.dataset.screen;
      button.classList.toggle('active', Boolean(isActive));
    });
    state.activeScreen = target.dataset.screen;
    saveState();
    if (target.dataset.screen === 'profile') renderProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showOnboardingStep(name) {
    onboardingSteps.forEach((step) => step.classList.toggle('active', step.dataset.onboardingStep === name));
    onboarding.hidden = false;
    shell.setAttribute('aria-hidden', 'true');
  }

  function closeOnboarding() {
    onboarding.hidden = true;
    shell.removeAttribute('aria-hidden');
    state.onboardingDone = true;
    saveState();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  navButtons.forEach((button) => {
    button.addEventListener('click', () => showScreen(button.dataset.nav));
  });

  document.getElementById('startSetup')?.addEventListener('click', () => showOnboardingStep('setup'));
  document.getElementById('backWelcome')?.addEventListener('click', () => showOnboardingStep('welcome'));
  document.getElementById('skipOnboarding')?.addEventListener('click', () => {
    closeOnboarding();
    showScreen('home');
  });

  document.querySelectorAll('.goal-choice button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.goal-choice button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.goal = button.dataset.setupGoal || null;
    });
  });

  document.getElementById('finishOnboarding')?.addEventListener('click', () => {
    const current = Number(String(document.getElementById('currentWeight')?.value || '').replace(',', '.'));
    const target = Number(String(document.getElementById('targetWeight')?.value || '').replace(',', '.'));
    if (!Number.isFinite(current) || !Number.isFinite(target) || current <= 0 || target <= 0) {
      showToast('Проверь значения веса');
      return;
    }
    const activeGoal = document.querySelector('.goal-choice button.active')?.dataset.setupGoal || null;
    state.currentWeight = current;
    state.targetWeight = target;
    state.goal = allowedGoals.has(activeGoal) ? activeGoal : 'lose';
    state.priorities = Array.isArray(state.priorities) ? state.priorities : [];
    state.staples = Array.isArray(state.staples) ? state.staples : [];
    state.profileVersion = 4;
    state.profileUpdatedAt = new Date().toISOString();
    saveState();
    window.dispatchEvent(new CustomEvent('rinlo2:profile-changed', {
      detail: { profile: normalizeProfile(state) }
    }));
    closeOnboarding();
    showScreen('home');
    showToast('Готово. Теперь можно принимать решения.');
  });

  document.querySelectorAll('[data-demo]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.demo;
      if (action === 'photo') showToast('Фото-анализ подключим во втором slice');
      if (action === 'text') showToast('Текстовый decision flow — следующий slice');
      if (action === 'voice') showToast('Голос оставим после основного decision flow');
    });
  });

  document.querySelectorAll('.decision-row').forEach((row) => {
    row.addEventListener('click', () => showToast('Карточка решения откроется в следующем slice'));
  });


  document.querySelectorAll('[data-profile-goal]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-profile-goal]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderProfilePreviewFromForm();
    });
  });

  document.querySelectorAll('[data-profile-priority]').forEach((button) => {
    button.addEventListener('click', () => button.classList.toggle('active'));
  });

  document.querySelectorAll('[data-profile-staple]').forEach((button) => {
    button.addEventListener('click', () => button.classList.toggle('active'));
  });

  function profileFromForm() {
    return {
      goal: document.querySelector('[data-profile-goal].active')?.dataset.profileGoal || null,
      currentWeight: optionalNumber(document.getElementById('profileCurrentWeight')?.value || ''),
      targetWeight: optionalNumber(document.getElementById('profileTargetWeight')?.value || ''),
      sexForCalorie: document.querySelector('[data-profile-sex].active')?.dataset.profileSex || null,
      ageYears: optionalNumber(document.getElementById('profileAgeYears')?.value || ''),
      heightCm: optionalNumber(document.getElementById('profileHeightCm')?.value || ''),
      activityLevel: document.getElementById('profileActivityLevel')?.value || null,
      priorities: [...document.querySelectorAll('[data-profile-priority].active')]
        .map((button) => button.dataset.profilePriority)
        .filter(Boolean),
      staples: [...document.querySelectorAll('[data-profile-staple].active')]
        .map((button) => button.dataset.profileStaple)
        .filter(Boolean),
    };
  }

  function renderProfilePreviewFromForm() {
    const profile = normalizeProfile(profileFromForm());
    const plan = calculateCaloriePlan(profile);
    const calorieCard = document.getElementById('profileCaloriePlan');
    const calorieTarget = document.getElementById('profileCalorieTarget');
    const calorieMaintenance = document.getElementById('profileCalorieMaintenance');
    const calorieBmr = document.getElementById('profileCalorieBmr');
    const calorieNote = document.getElementById('profileCalorieNote');
    if (calorieCard) calorieCard.dataset.state = plan.status;
    if (calorieTarget) calorieTarget.textContent = plan.status === 'ready' ? formatCalorieRange(plan) : 'Заполни параметры выше';
    if (calorieMaintenance) calorieMaintenance.textContent = plan.status === 'ready' ? `≈ ${plan.maintenance.toLocaleString('ru-RU')} ккал` : '—';
    if (calorieBmr) calorieBmr.textContent = plan.status === 'ready' ? `≈ ${plan.bmr.toLocaleString('ru-RU')} ккал` : '—';
    if (calorieNote) {
      calorieNote.textContent = plan.status === 'ready'
        ? (profile.goal === 'lose'
            ? 'Диапазон рассчитан примерно на 10–20% ниже поддержки. Это ориентир, а не медицинское назначение.'
            : 'Диапазон близок к расчётной поддержке. Это ориентир, а не медицинское назначение.')
        : 'Нужны пол для расчёта, возраст, рост, текущий вес и уровень активности.';
    }
  }

  ['profileCurrentWeight','profileTargetWeight','profileAgeYears','profileHeightCm','profileActivityLevel'].forEach((id) => {
    const element = document.getElementById(id);
    element?.addEventListener('input', renderProfilePreviewFromForm);
    element?.addEventListener('change', renderProfilePreviewFromForm);
  });

  document.getElementById('saveDecisionProfile')?.addEventListener('click', () => {
    const profile = applyDecisionProfile(profileFromForm());
    const status = document.getElementById('profileSaveState');
    if (status) status.textContent = 'Сохранено';
    showToast('Контекст для решений обновлён');
    setTimeout(() => { if (status) status.textContent = ''; }, 1800);
  });


  document.querySelectorAll('.filters button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filters button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
  });

  // Demo reset helper: add ?reset=1 to show onboarding again.
  const params = new URLSearchParams(location.search);
  if (params.get('reset') === '1') {
    localStorage.removeItem(STORAGE_KEY);
    state = { ...defaultState };
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete('reset');
    history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }

  if (!state.onboardingDone) {
    showOnboardingStep('welcome');
  } else {
    onboarding.hidden = true;
    showScreen(state.activeScreen || 'home');
  }

  renderProfile();

  window.Rinlo2Foundation = {
    version: 'foundation-v5-calorie-plan',
    getState: () => ({ ...state }),
    getDecisionProfile: () => {
      const profile = normalizeProfile(state);
      return {
        ...profile,
        caloriePlan: calculateCaloriePlan(profile),
        updatedAt: state.profileUpdatedAt || null,
      };
    },
    getCaloriePlan: () => calculateCaloriePlan(state),
    applyDecisionProfile: (profile, options = {}) => applyDecisionProfile(profile, options),
    navigate: showScreen,
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
})();
