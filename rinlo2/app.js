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
    currentWeight: 70.2,
    targetWeight: 68,
    goal: 'lose',
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

  function showScreen(name) {
    const target = screens.find((screen) => screen.dataset.screen === name) || screens[0];
    screens.forEach((screen) => screen.classList.toggle('active', screen === target));
    navButtons.forEach((button) => {
      const isActive = button.closest('.bottom-nav') && button.dataset.nav === target.dataset.screen;
      button.classList.toggle('active', Boolean(isActive));
    });
    state.activeScreen = target.dataset.screen;
    saveState();
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

  document.querySelectorAll('.goal-choice button').forEach((button, index) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.goal-choice button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.goal = index === 0 ? 'lose' : 'maintain';
    });
  });

  document.getElementById('finishOnboarding')?.addEventListener('click', () => {
    const current = Number(String(document.getElementById('currentWeight')?.value || '').replace(',', '.'));
    const target = Number(String(document.getElementById('targetWeight')?.value || '').replace(',', '.'));
    if (!Number.isFinite(current) || !Number.isFinite(target) || current <= 0 || target <= 0) {
      showToast('Проверь значения веса');
      return;
    }
    state.currentWeight = current;
    state.targetWeight = target;
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

  document.querySelectorAll('.settings-list button').forEach((button) => {
    button.addEventListener('click', () => showToast('Настройка пока показана как foundation-state'));
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

  window.Rinlo2Foundation = {
    version: 'foundation-v1',
    getState: () => ({ ...state }),
    navigate: showScreen,
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
})();
