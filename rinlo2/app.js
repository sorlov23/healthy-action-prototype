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
    goal: null,
    priorities: [],
    activeScreen: 'home'
  };

  let state = loadState();
  let toastTimer = null;

  function loadState() {
    try {
      return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }


  const allowedGoals = new Set(['lose','maintain','aware']);
  const allowedPriorities = new Set(['satiety','calories','familiar','simplicity']);

  function optionalNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(',', '.'));
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function normalizeProfile(input = {}) {
    const goal = allowedGoals.has(input.goal) ? input.goal : null;
    const currentWeight = optionalNumber(input.currentWeight);
    const targetWeight = optionalNumber(input.targetWeight);
    const priorities = Array.isArray(input.priorities)
      ? [...new Set(input.priorities.filter((item) => allowedPriorities.has(item)))].slice(0, 4)
      : [];
    return { goal, currentWeight, targetWeight, priorities };
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
    document.querySelectorAll('[data-profile-priority]').forEach((button) => {
      button.classList.toggle('active', profile.priorities.includes(button.dataset.profilePriority));
    });

    const current = document.getElementById('profileCurrentWeight');
    const target = document.getElementById('profileTargetWeight');
    if (current && document.activeElement !== current) current.value = profile.currentWeight ?? '';
    if (target && document.activeElement !== target) target.value = profile.targetWeight ?? '';

    const title = document.getElementById('profileSummaryTitle');
    const text = document.getElementById('profileSummaryText');
    const parts = [];
    if (profile.goal) parts.push(`Цель — ${goalLabel(profile.goal)}`);
    if (profile.currentWeight && profile.targetWeight) {
      parts.push(`${profile.currentWeight.toLocaleString('ru-RU')} → ${profile.targetWeight.toLocaleString('ru-RU')} кг`);
    }
    if (title) title.textContent = parts.length ? parts.join(' · ') : 'Контекст пока минимальный';

    const priorityLabels = {
      satiety: 'сытность',
      calories: 'калорийность',
      familiar: 'привычные продукты',
      simplicity: 'простота',
    };
    const chosen = profile.priorities.map((item) => priorityLabels[item]).filter(Boolean);
    if (text) {
      text.textContent = chosen.length
        ? `В спорных случаях учитывать: ${chosen.join(', ')}.`
        : 'Можно оставить всё как есть или добавить пару ориентиров ниже.';
    }
  }

  function applyDecisionProfile(profile, { silent = false } = {}) {
    const normalized = normalizeProfile(profile);
    state = { ...state, ...normalized };
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
    });
  });

  document.querySelectorAll('[data-profile-priority]').forEach((button) => {
    button.addEventListener('click', () => button.classList.toggle('active'));
  });

  document.getElementById('saveDecisionProfile')?.addEventListener('click', () => {
    const goal = document.querySelector('[data-profile-goal].active')?.dataset.profileGoal || null;
    const currentWeight = optionalNumber(document.getElementById('profileCurrentWeight')?.value || '');
    const targetWeight = optionalNumber(document.getElementById('profileTargetWeight')?.value || '');
    const priorities = [...document.querySelectorAll('[data-profile-priority].active')]
      .map((button) => button.dataset.profilePriority)
      .filter(Boolean);

    const profile = applyDecisionProfile({ goal, currentWeight, targetWeight, priorities });
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
    version: 'foundation-v2-decision-profile',
    getState: () => ({ ...state }),
    getDecisionProfile: () => normalizeProfile(state),
    applyDecisionProfile: (profile, options = {}) => applyDecisionProfile(profile, options),
    navigate: showScreen,
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
})();
