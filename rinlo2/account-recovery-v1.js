(() => {
  const STORAGE_KEY = 'rinlo2-account-recovery-v1';
  const QUARANTINE_KEY = 'rinlo2-recovery-quarantine-v1';
  const USER_KEYS = [
    'rinlo2-foundation-state-v1',
    'rinlo2-decisions-v2',
    'rinlo2-corrections-v1',
    'rinlo2-feedback-v1',
    'rinlo2-sync-center-v1',
    'rinlo2-account-protection-v1',
  ];

  const auth = window.RinloSupabaseAuth;
  const emailStep = document.getElementById('recoveryEmailStep');
  const codeStep = document.getElementById('recoveryCodeStep');
  const readyBox = document.getElementById('recoveryReady');
  const emailInput = document.getElementById('recoveryEmail');
  const otpInput = document.getElementById('recoveryOtp');
  const sendButton = document.getElementById('recoverySendCode');
  const verifyButton = document.getElementById('recoveryVerifyCode');
  const resendButton = document.getElementById('recoveryResendCode');
  const changeEmailButton = document.getElementById('recoveryChangeEmail');
  const codeEmail = document.getElementById('recoveryCodeEmail');
  const statusNode = document.getElementById('accountRecoveryStatus');
  const titleNode = document.getElementById('accountRecoveryTitle');
  const textNode = document.getElementById('accountRecoveryText');
  const badgeNode = document.getElementById('accountRecoveryBadge');
  const warningBox = document.getElementById('recoveryLocalWarning');
  const warningText = document.getElementById('recoveryLocalWarningText');

  let busy = false;
  let pending = loadPending();

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

  function loadPending() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!value?.email) return null;
      return {
        email: String(value.email).trim().toLowerCase(),
        requestedAt: value.requestedAt || null,
      };
    } catch {
      return null;
    }
  }

  function savePending(value) {
    pending = value;
    if (!value) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validOtp(value) {
    return /^\d{6}$/.test(String(value || '').replace(/\s+/g, ''));
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
      const details = localSummaryText(summary);
      warningText.textContent = `Перед входом Rinlo сохранит локальную копию (${details}) отдельно и не смешает её с восстановленным аккаунтом.`;
    }
  }

  function setBusy(value) {
    busy = Boolean(value);
    if (sendButton) sendButton.disabled = busy || !validEmail(emailInput?.value);
    if (verifyButton) verifyButton.disabled = busy || !validOtp(otpInput?.value);
    if (resendButton) resendButton.disabled = busy;
    if (changeEmailButton) changeEmailButton.disabled = busy;
  }

  function renderLocalOnly() {
    if (emailStep) emailStep.hidden = true;
    if (codeStep) codeStep.hidden = true;
    if (readyBox) readyBox.hidden = true;
    if (warningBox) warningBox.hidden = true;
    if (titleNode) titleNode.textContent = 'Восстановление аккаунта';
    if (badgeNode) badgeNode.textContent = 'Недоступно';
    if (textNode) textNode.textContent = 'В локальном режиме вход в облачный аккаунт отключён.';
    setStatus('');
  }

  function renderProtected() {
    savePending(null);
    if (emailStep) emailStep.hidden = true;
    if (codeStep) codeStep.hidden = true;
    if (readyBox) readyBox.hidden = false;
    if (warningBox) warningBox.hidden = true;
    if (titleNode) titleNode.textContent = 'Восстановление настроено';
    if (badgeNode) badgeNode.textContent = 'Email OTP';
    if (textNode) {
      textNode.textContent = 'Аккаунт защищён. На другом устройстве можно войти по email и одноразовому коду.';
    }
    setStatus('');
  }

  function renderTemporary() {
    if (readyBox) readyBox.hidden = true;
    if (titleNode) titleNode.textContent = 'Уже есть Rinlo?';
    if (badgeNode) badgeNode.textContent = 'Email OTP';
    if (textNode) {
      textNode.textContent = 'Войди в защищённый аккаунт и верни облачную историю, профиль, память и оценки.';
    }

    if (pending) {
      if (emailStep) emailStep.hidden = true;
      if (codeStep) codeStep.hidden = false;
      if (codeEmail) codeEmail.textContent = pending.email;
    } else {
      if (emailStep) emailStep.hidden = false;
      if (codeStep) codeStep.hidden = true;
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
    if (message === 'invalid_otp') return 'Введи 6 цифр из письма.';
    if (message.includes('rate limit') || code.includes('rate')) {
      return 'Слишком много запросов подряд. Попробуй использовать последнее письмо.';
    }
    if (phase === 'verify' && (
      message.includes('expired')
      || message.includes('invalid')
      || message.includes('token')
      || code.includes('otp')
    )) {
      return 'Код неверный или уже истёк. Можно запросить новый.';
    }
    if (phase === 'send') {
      return 'Не получилось отправить код. Проверь email и попробуй ещё раз.';
    }
    return 'Не получилось восстановить аккаунт. Текущие данные на устройстве не изменены.';
  }

  async function requestCode(email = emailInput?.value) {
    if (busy || !cloudEnabled()) return;
    const normalized = String(email || '').trim().toLowerCase();
    if (!validEmail(normalized)) {
      setStatus('Проверь адрес email.', 'error');
      return;
    }

    setBusy(true);
    setStatus('Отправляю одноразовый код…');
    if (sendButton) sendButton.textContent = 'Отправляю…';
    if (resendButton) resendButton.textContent = 'Отправляю…';

    try {
      await auth.requestLoginOtp(normalized);
      savePending({ email: normalized, requestedAt: new Date().toISOString() });
      if (codeEmail) codeEmail.textContent = normalized;
      if (emailStep) emailStep.hidden = true;
      if (codeStep) codeStep.hidden = false;
      if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
      }
      updateLocalWarning();
      setStatus('Код отправлен. Он действует ограниченное время.', 'success');
    } catch (error) {
      console.warn('Rinlo recovery OTP request failed', error);
      setStatus(errorCopy(error, 'send'), 'error');
    } finally {
      if (sendButton) sendButton.textContent = 'Получить код';
      if (resendButton) resendButton.textContent = 'Отправить новый код';
      setBusy(false);
    }
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
    localStorage.removeItem(STORAGE_KEY);
  }

  async function verifyCode() {
    if (busy || !pending?.email || !cloudEnabled()) return;
    const token = String(otpInput?.value || '').replace(/\s+/g, '');
    if (!validOtp(token)) {
      setStatus('Введи 6 цифр из письма.', 'error');
      return;
    }

    const previousUserId = auth?.getUserId?.() || null;
    setBusy(true);
    setStatus('Проверяю код…');
    if (verifyButton) verifyButton.textContent = 'Вхожу…';

    try {
      const session = await auth.verifyLoginOtp(pending.email, token);
      const nextUserId = session?.user?.id || null;
      if (!nextUserId) throw new Error('recovery_missing_user');

      if (previousUserId && previousUserId !== nextUserId) {
        quarantineCurrentUser(previousUserId, nextUserId);
      } else {
        savePending(null);
      }

      setStatus('Аккаунт найден. Восстанавливаю данные…', 'success');
      window.dispatchEvent(new CustomEvent('rinlo2:account-recovered', {
        detail: { userId: nextUserId },
      }));

      // Reload from an empty user-scoped cache so cloud data becomes the source
      // of truth for the restored account and never mixes with the temp user.
      setTimeout(() => window.location.reload(), 120);
    } catch (error) {
      console.warn('Rinlo recovery OTP verification failed', error);
      setStatus(errorCopy(error, 'verify'), 'error');
      setBusy(false);
      if (verifyButton) verifyButton.textContent = 'Войти и восстановить';
    }
  }

  function changeEmail() {
    if (busy) return;
    savePending(null);
    if (otpInput) otpInput.value = '';
    if (emailStep) emailStep.hidden = false;
    if (codeStep) codeStep.hidden = true;
    if (emailInput) {
      emailInput.value = '';
      emailInput.focus();
    }
    setStatus('');
    updateLocalWarning();
    setBusy(false);
  }

  emailInput?.addEventListener('input', () => {
    if (sendButton) sendButton.disabled = busy || !validEmail(emailInput.value);
    if (statusNode?.dataset.state === 'error') setStatus('');
  });

  otpInput?.addEventListener('input', () => {
    const cleaned = String(otpInput.value || '').replace(/\D+/g, '').slice(0, 6);
    if (otpInput.value !== cleaned) otpInput.value = cleaned;
    if (verifyButton) verifyButton.disabled = busy || !validOtp(cleaned);
    if (statusNode?.dataset.state === 'error') setStatus('');
  });

  sendButton?.addEventListener('click', () => requestCode());
  resendButton?.addEventListener('click', () => requestCode(pending?.email));
  verifyButton?.addEventListener('click', verifyCode);
  changeEmailButton?.addEventListener('click', changeEmail);

  window.addEventListener('rinlo:supabase-auth', (event) => {
    render(event.detail?.user || auth?.getSession?.()?.user || null);
  });

  render();

  window.Rinlo2AccountRecovery = {
    version: 'v1-email-otp',
    requestCode,
    verifyCode,
    getPending: () => pending ? { ...pending } : null,
    getQuarantine: () => {
      try { return JSON.parse(localStorage.getItem(QUARANTINE_KEY) || 'null'); }
      catch { return null; }
    },
    refresh: () => render(),
  };
})();