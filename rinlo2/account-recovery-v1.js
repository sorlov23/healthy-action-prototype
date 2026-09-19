(() => {
  const QUARANTINE_KEY = 'rinlo2-recovery-quarantine-v1';
  const PASSWORD_READY_KEY = 'rinlo2-recovery-password-ready-v1';
  const USER_KEYS = [
    'rinlo2-foundation-state-v1',
    'rinlo2-decisions-v2',
    'rinlo2-corrections-v1',
    'rinlo2-feedback-v1',
    'rinlo2-sync-center-v1',
    'rinlo2-account-protection-v1',
  ];

  const auth = window.RinloSupabaseAuth;
  const loginStep = document.getElementById('recoveryLoginStep');
  const setupStep = document.getElementById('recoverySetupStep');
  const loginEmail = document.getElementById('recoveryLoginEmail');
  const loginPassword = document.getElementById('recoveryLoginPassword');
  const loginButton = document.getElementById('recoveryLoginButton');
  const setPassword = document.getElementById('recoverySetPassword');
  const setPasswordConfirm = document.getElementById('recoverySetPasswordConfirm');
  const setPasswordButton = document.getElementById('recoverySetPasswordButton');
  const setupHint = document.getElementById('recoverySetupHint');
  const statusNode = document.getElementById('accountRecoveryStatus');
  const titleNode = document.getElementById('accountRecoveryTitle');
  const textNode = document.getElementById('accountRecoveryText');
  const badgeNode = document.getElementById('accountRecoveryBadge');
  const warningBox = document.getElementById('recoveryLocalWarning');
  const warningText = document.getElementById('recoveryLocalWarningText');

  let busy = false;

  function cloudEnabled() {
    return Boolean(
      auth?.enabled
      && (
        window.Rinlo2ProfileSync?.enabled
        || window.Rinlo2Supabase?.enabled
        || window.Rinlo2Corrections?.enabled
        || window.Rinlo2Feedback?.enabled
      )
    );
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validPassword(value) {
    return String(value || '').length >= 8;
  }

  function isProtected(user) {
    if (window.Rinlo2AccountProtection?.isProtectedUser) {
      return window.Rinlo2AccountProtection.isProtectedUser(user);
    }
    return Boolean(user?.id && user?.is_anonymous === false);
  }

  function setStatus(message, state = '') {
    if (!statusNode) return;
    statusNode.textContent = message || '';
    statusNode.dataset.state = state;
  }

  function localSummary() {
    const profile = window.Rinlo2Foundation?.getDecisionProfile?.() || {};
    const decisions = window.Rinlo2Decisions?.getDecisions?.().length || 0;
    const corrections = window.Rinlo2Corrections?.getCorrections?.().length || 0;
    const feedback = window.Rinlo2Feedback?.getAll?.().length || 0;
    const meaningfulProfile = Boolean(
      profile.goal
      || profile.currentWeight
      || profile.targetWeight
      || (Array.isArray(profile.priorities) && profile.priorities.length)
    );
    return { decisions, corrections, feedback, meaningfulProfile };
  }

  function localSummaryText(summary) {
    const parts = [];
    if (summary.decisions) parts.push(`${summary.decisions} реш.`);
    if (summary.corrections) parts.push(`${summary.corrections} попр.`);
    if (summary.feedback) parts.push(`${summary.feedback} оцен.`);
    if (summary.meaningfulProfile) parts.push('профиль');
    return parts.join(' · ');
  }

  function hasMeaningfulLocalData(summary = localSummary()) {
    return Boolean(
      summary.decisions
      || summary.corrections
      || summary.feedback
      || summary.meaningfulProfile
    );
  }

  function updateLocalWarning() {
    if (!warningBox) return;
    const summary = localSummary();
    const meaningful = hasMeaningfulLocalData(summary);
    warningBox.hidden = !meaningful;
    if (meaningful && warningText) {
      warningText.textContent = `Перед входом Rinlo сохранит локальную копию (${localSummaryText(summary)}) отдельно и не смешает её с восстановленным аккаунтом.`;
    }
  }

  function setBusy(value) {
    busy = Boolean(value);
    if (loginButton) {
      loginButton.disabled = busy
        || !validEmail(loginEmail?.value)
        || !validPassword(loginPassword?.value);
    }
    if (setPasswordButton) {
      const password = String(setPassword?.value || '');
      const confirm = String(setPasswordConfirm?.value || '');
      setPasswordButton.disabled = busy
        || !validPassword(password)
        || password !== confirm;
    }
  }

  function renderLocalOnly() {
    if (loginStep) loginStep.hidden = true;
    if (setupStep) setupStep.hidden = true;
    if (warningBox) warningBox.hidden = true;
    if (titleNode) titleNode.textContent = 'Восстановление аккаунта';
    if (badgeNode) badgeNode.textContent = 'Недоступно';
    if (textNode) textNode.textContent = 'В локальном режиме вход в облачный аккаунт отключён.';
    setStatus('');
  }

  function renderProtected() {
    if (loginStep) loginStep.hidden = true;
    if (setupStep) setupStep.hidden = false;
    if (warningBox) warningBox.hidden = true;
    if (titleNode) titleNode.textContent = 'Доступ с другого устройства';
    if (badgeNode) badgeNode.textContent = 'Email + пароль';
    if (textNode) {
      textNode.textContent = 'Аккаунт защищён. Добавь пароль восстановления, чтобы войти в этот же Rinlo на другом устройстве.';
    }
    const ready = localStorage.getItem(PASSWORD_READY_KEY);
    if (setupHint) {
      setupHint.textContent = ready
        ? 'Пароль восстановления уже задавался. Здесь его можно заменить.'
        : 'Пароль сохраняется только в Supabase Auth и не хранится в Rinlo.';
    }
    setBusy(false);
  }

  function renderTemporary() {
    if (loginStep) loginStep.hidden = false;
    if (setupStep) setupStep.hidden = true;
    if (titleNode) titleNode.textContent = 'Уже есть Rinlo?';
    if (badgeNode) badgeNode.textContent = 'Email + пароль';
    if (textNode) {
      textNode.textContent = 'Войди в защищённый аккаунт и верни облачную историю, профиль, память и оценки.';
    }
    updateLocalWarning();
    setBusy(false);
  }

  function render(user = auth?.getSession?.()?.user || null) {
    if (!cloudEnabled()) {
      renderLocalOnly();
      return;
    }
    if (isProtected(user)) renderProtected();
    else renderTemporary();
  }

  function errorCopy(error, phase) {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();

    if (message === 'invalid_email') return 'Проверь адрес email.';
    if (message === 'password_too_short') return 'Пароль должен быть не короче 8 символов.';
    if (message.includes('weak password') || code.includes('weak_password')) {
      return 'Supabase считает этот пароль слишком слабым. Выбери более сложный.';
    }
    if (phase === 'login' && (
      message.includes('invalid login credentials')
      || message.includes('invalid credentials')
      || code.includes('invalid_credentials')
    )) {
      return 'Email или пароль не подошли. Проверь данные и попробуй ещё раз.';
    }
    if (message.includes('reauth') || message.includes('nonce')) {
      return 'Для смены пароля нужно заново подтвердить вход. Текущие данные не изменены.';
    }
    return phase === 'setup'
      ? 'Не получилось сохранить пароль восстановления. Данные Rinlo не изменены.'
      : 'Не получилось войти. Текущие данные на устройстве не изменены.';
  }

  function quarantineCurrentUser(previousUserId, nextUserId) {
    const summary = localSummary();
    const backup = {};

    for (const key of USER_KEYS) {
      const value = localStorage.getItem(key);
      if (value != null) backup[key] = value;
    }

    if (hasMeaningfulLocalData(summary) && Object.keys(backup).length) {
      localStorage.setItem(QUARANTINE_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        previousUserId: previousUserId || null,
        nextUserId: nextUserId || null,
        summary,
        data: backup,
      }));
    }

    USER_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(PASSWORD_READY_KEY);
  }

  async function saveRecoveryPassword() {
    if (busy || !cloudEnabled()) return;

    const password = String(setPassword?.value || '');
    const confirm = String(setPasswordConfirm?.value || '');

    if (!validPassword(password)) {
      setStatus('Пароль должен быть не короче 8 символов.', 'error');
      return;
    }
    if (password !== confirm) {
      setStatus('Пароли не совпадают.', 'error');
      return;
    }

    setBusy(true);
    setStatus('Сохраняю пароль восстановления…');
    if (setPasswordButton) setPasswordButton.textContent = 'Сохраняю…';

    try {
      const user = await auth.setRecoveryPassword(password);
      if (!isProtected(user)) throw new Error('recovery_user_not_protected');
      localStorage.setItem(PASSWORD_READY_KEY, new Date().toISOString());
      if (setPassword) setPassword.value = '';
      if (setPasswordConfirm) setPasswordConfirm.value = '';
      setStatus('Готово — теперь этот аккаунт можно открыть на другом устройстве.', 'success');
      if (setupHint) setupHint.textContent = 'Пароль восстановления настроен. Здесь его можно изменить.';
    } catch (error) {
      console.warn('Rinlo recovery password setup failed', error);
      setStatus(errorCopy(error, 'setup'), 'error');
    } finally {
      if (setPasswordButton) setPasswordButton.textContent = 'Сохранить пароль восстановления';
      setBusy(false);
    }
  }

  async function loginAndRestore() {
    if (busy || !cloudEnabled()) return;

    const email = String(loginEmail?.value || '').trim().toLowerCase();
    const password = String(loginPassword?.value || '');

    if (!validEmail(email)) {
      setStatus('Проверь адрес email.', 'error');
      return;
    }
    if (!validPassword(password)) {
      setStatus('Пароль должен быть не короче 8 символов.', 'error');
      return;
    }

    const previousUserId = auth?.getUserId?.() || null;
    setBusy(true);
    setStatus('Вхожу в защищённый аккаунт…');
    if (loginButton) loginButton.textContent = 'Вхожу…';

    try {
      const session = await auth.signInWithPassword(email, password);
      const nextUserId = session?.user?.id || null;
      if (!nextUserId || session?.user?.is_anonymous !== false) {
        throw new Error('recovery_invalid_session');
      }

      if (previousUserId && previousUserId !== nextUserId) {
        quarantineCurrentUser(previousUserId, nextUserId);
      }

      setStatus('Аккаунт найден. Восстанавливаю данные…', 'success');
      window.dispatchEvent(new CustomEvent('rinlo2:account-recovered', {
        detail: { userId: nextUserId },
      }));

      // Reload with a clean user-scoped cache. The existing Supabase session
      // stays in localStorage, so all Rinlo modules now hydrate from cloud data
      // owned by the recovered user.
      setTimeout(() => window.location.reload(), 120);
    } catch (error) {
      console.warn('Rinlo password recovery failed', error);
      setStatus(errorCopy(error, 'login'), 'error');
      setBusy(false);
      if (loginButton) loginButton.textContent = 'Войти и восстановить';
    }
  }

  [loginEmail, loginPassword].forEach((node) => node?.addEventListener('input', () => {
    setBusy(busy);
    if (statusNode?.dataset.state === 'error') setStatus('');
  }));

  [setPassword, setPasswordConfirm].forEach((node) => node?.addEventListener('input', () => {
    setBusy(busy);
    if (statusNode?.dataset.state === 'error') setStatus('');
  }));

  loginButton?.addEventListener('click', loginAndRestore);
  setPasswordButton?.addEventListener('click', saveRecoveryPassword);

  window.addEventListener('rinlo:supabase-auth', (event) => {
    render(event.detail?.user || auth?.getSession?.()?.user || null);
  });

  render();

  window.Rinlo2AccountRecovery = {
    version: 'v1-password',
    loginAndRestore,
    saveRecoveryPassword,
    getQuarantine: () => {
      try { return JSON.parse(localStorage.getItem(QUARANTINE_KEY) || 'null'); }
      catch { return null; }
    },
    refresh: () => render(),
  };
})();