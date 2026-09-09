(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  function install(attempt = 0) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;

    const coreReady = win.__rinloCoreUiV1 === true;
    const functionalReady = win.__rinloFunctionalMvp === 'v1';
    const profileReady = doc.getElementById('profile')?.dataset.rinloProfile === 'v01';
    if (!coreReady || !functionalReady || !profileReady || typeof win.restartOnboarding !== 'function') {
      if (attempt < 80) setTimeout(() => install(attempt + 1), 75);
      return;
    }
    if (win.__rinloSettingsBridge === 'v1') return;

    const previousRestart = win.restartOnboarding.bind(win);

    function showCoreOnboarding() {
      /* Keep the legacy profile-field population, then deterministically return
         the Core onboarding to step one. The old restart function only knew
         about the pre-Rinlo onboarding, while the Core step state lives in a
         closure. Calling the public Back action is the supported way to reset
         that state without duplicating it here. */
      try { previousRestart(); }
      catch (error) { console.warn('Rinlo settings: legacy restart skipped', error); }

      for (let i = 0; i < 4; i += 1) win.rinloCoreOnboardingBack?.();

      const onboarding = doc.getElementById('onboarding');
      if (!onboarding) return;
      doc.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('on', screen === onboarding));
      const nav = doc.querySelector('.nav');
      const fab = doc.querySelector('.fab');
      if (nav) nav.style.display = 'none';
      if (fab) fab.style.display = 'none';
      onboarding.scrollTo?.({ top: 0, behavior: 'instant' });
    }

    win.rinloCoreOpenOnboarding = showCoreOnboarding;
    win.restartOnboarding = showCoreOnboarding;
    win.__rinloSettingsBridge = 'v1';
  }

  function mount() {
    install(0);
  }

  frame.addEventListener('load', () => setTimeout(mount, 0));
  mount();
})();
