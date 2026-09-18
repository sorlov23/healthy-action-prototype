(() => {
  const STORAGE_KEY = 'rinlo2-account-protection-v1';
  const auth = window.RinloSupabaseAuth;
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const form = document.getElementById('accountProtectionForm');
  const pendingBox = document.getElementById('accountProtectionPending');
  const doneBox = document.getElementById('accountProtectionDone');
  const emailInput = document.getElementById('accountProtectionEmail');
  const sendButton = document.getElementById('accountProtectionSend');
  const checkButton = document.getElementById('accountProtectionCheck');
  const resendButton = document.getElementById('accountProtectionResend');
  const pendingEmailNode = document.getElementById('accountProtectionPendingEmail');
  const doneEmailNode = document.getElementById('accountProtectionEmailValue');
  const statusNode = document.getElementById('accountProtectionStatus');
  const badge = document.getElementById('settingsAccountBadge');
  const title = document.getElementById('accountProtectionTitle');
  const accountText = document.getElementById('settingsAccountText');

  let pending = loadPending();
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

  function loadPending() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!value?.email) return null;
      return {
        email: String(value.email).trim().toLowerCase(),
        requestedAt: value.requestedAt || null,
        userId: value.userId || null,
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

  function isProtectedUser(user) {
    if (!user?.id) return false;
    if (user.is_anonymous === false) return true;
    if (user.email_confirmed_at) return true;
    return Array.isArray(user.identities) && user.identities.some((identity) =>
      identity?.provider === 'email'
      && identity?.identity_data?.email_verified === true
    );
  }

  function userEmail(user) {
    return String(
      user?.email
      || user?.new_email
      || user?.email_change
      || pending?.email
      || ''
    ).trim().toLowerCase();
  }

  function redirectUrl() {
    return String(config.rinloAccountRedirectUrl || '').trim();
  }

  function setStatus(message, type = '') {
    if (!statusNode) return;
    statusNode.textContent = message || '';
    statusNode.dataset.state = type || '';
  }

  function errorCopy(error) {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();
    if (code.includes('rate') || message.includes('rate limit')) {
      return 'Слишком много запросов подряд. Письмо уже могло уйти — проверь почту чуть позже.';
    }
    if (code.includes('email_exists') || code.includes('user_already_exists') || message.includes('already registered')) {
      return 'Этот email уже связан с другим аккаунтом. Существующий аккаунт не будем перезаписывать.';
    }
    if (code.includes('manual_link') || message.includes('manual linking')) {
      return 'Привязка email выключена в Auth-настройках проекта Supabase. Данные на устройстве не затронуты.';
    }
    if (message.includes('invalid email') || message === 'invalid_email') {
      return 'Проверь адрес email.';
    }
    return 'Не получилось отправить подтверждение. Данные Rinlo на устройстве сохранены.';
  }

  function setBusy(value) {
    busy = Boolean(value);
    if (sendButton) sendButton.disabled = busy || !validEmail(emailInput?.value);
    if (checkButton) checkButton.disabled = busy;
    if (resendButton) resendButton.disabled = busy;
  }

  function renderLocalOnly() {
    if (form) form.hidden = true;
    if (pendingBox) pendingBox.hidden = true;
    if (doneBox) doneBox.hidden = true;
    if (badge) badge.textContent = 'Локальный';
    if (title) title.textContent = 'Защита аккаунта';
    if (accountText) {
      accountText.textContent = 'В локальном режиме Rinlo не создаёт облачную Auth-сессию. Защита email появится, когда облачная синхронизация включена.';
    }
    setStatus('');
  }

  function renderTemporary(user = null) {
    const serverPendingEmail = userEmail(user);
    if (serverPendingEmail && !isProtectedUser(user) && !pending) {
      savePending({
        email: serverPendingEmail,
        requestedAt: new Date().toISOString(),
        userId: user?.id || auth?.getUserId?.() || null,
      });
    }

    if (pending) {
      if (form) form.hidden = true;
      if (pendingBox) pendingBox.hidden = false;
      if (doneBox) doneBox.hidden = true;
      if (badge) badge.textContent = 'Ждёт подтверждения';
      if (title) title.textContent = 'Подтверди email';
      if (accountText) {
        accountText.textContent = 'Текущий Rinlo-аккаунт уже запросил привязку email. После подтверждения его user_id и все данные останутся прежними.';
      }
      if (pendingEmailNode) pendingEmailNode.textContent = pending.email;
      setBusy(false);
      return;
    }

    if (form) form.hidden = false;
    if (pendingBox) pendingBox.hidden = true;
    if (doneBox) doneBox.hidden = true;
    if (badge) badge.textContent = 'Временный';
    if (title) title.textContent = 'Защитить аккаунт';
    if (accountText) {
      accountText.textContent = 'Сейчас Rinlo использует временный аккаунт без регистрации. Привяжи email, чтобы этот же аккаунт перестал быть одноразовым.';
    }
    setBusy(false);
  }

  function renderProtected(user) {
    savePending(null);
    if (form) form.hidden = true;
    if (pendingBox) pendingBox.hidden = true;
    if (doneBox) doneBox.hidden = false;
    if (badge) badge.textContent = 'Защищён';
    if (title) title.textContent = 'Аккаунт защищён';
    if (accountText) {
      accountText.textContent = 'Email подтверждён. Текущий Rinlo user больше не является одноразовым, а данные остаются привязаны к тому же владельцу.';
    }
    if (doneEmailNode) doneEmailNode.textContent = userEmail(user) || 'Email подтверждён';
    setStatus('Готово — аккаунт защищён', 'success');
    window.Rinlo2SyncCenter?.refresh?.();
  }

  function render(user = auth?.getSession?.()?.user || null) {
    if (!cloudEnabled()) {
      renderLocalOnly();
      return;
    }
    if (isProtectedUser(user)) renderProtected(user);
    else renderTemporary(user);
  }

  async function sendProtectionEmail() {
    if (busy || !cloudEnabled()) return;
    const email = String(emailInput?.value || '').trim().toLowerCase();
    if (!validEmail(email)) {
      setStatus('Проверь адрес email.', 'error');
      return;
    }

    setBusy(true);
    setStatus('Сначала сохраняю свежие данные Rinlo…');
    if (sendButton) sendButton.textContent = 'Отправляю…';

    try {
      await window.Rinlo2SyncCenter?.syncNow?.().catch(() => null);
      const user = await auth.requestEmailProtection(email, {
        emailRedirectTo: redirectUrl(),
      });

      savePending({
        email,
        requestedAt: new Date().toISOString(),
        userId: user?.id || auth?.getUserId?.() || null,
      });

      if (isProtectedUser(user)) {
        renderProtected(user);
      } else {
        renderTemporary(user);
        setStatus('Письмо отправлено. Подтверди email и вернись сюда.', 'success');
      }
    } catch (error) {
      console.warn('Rinlo account protection request failed', error);
      setStatus(errorCopy(error), 'error');
    } finally {
      if (sendButton) sendButton.textContent = 'Отправить письмо';
      setBusy(false);
    }
  }

  async function checkProtection() {
    if (busy || !cloudEnabled()) return;
    setBusy(true);
    if (checkButton) checkButton.textContent = 'Проверяю…';
    setStatus('Проверяю подтверждение…');

    try {
      const user = await auth.getUser();
      if (isProtectedUser(user)) {
        renderProtected(user);
        window.dispatchEvent(new CustomEvent('rinlo2:account-protected', {
          detail: { userId: user.id, email: userEmail(user) },
        }));
        await window.Rinlo2SyncCenter?.syncNow?.().catch(() => null);
      } else {
        renderTemporary(user);
        setStatus('Email пока не подтверждён. Если письмо уже открыто — попробуй ещё раз.', 'pending');
      }
    } catch (error) {
      console.warn('Rinlo account protection check failed', error);
      setStatus('Не удалось проверить подтверждение. Данные на устройстве сохранены.', 'error');
    } finally {
      if (checkButton) checkButton.textContent = 'Я подтвердил email';
      setBusy(false);
    }
  }

  async function resendProtection() {
    if (busy || !cloudEnabled() || !pending?.email) return;
    setBusy(true);
    if (resendButton) resendButton.textContent = 'Отправляю…';
    setStatus('');

    try {
      await auth.resendEmailChange(pending.email, {
        emailRedirectTo: redirectUrl(),
      });
      setStatus('Новое письмо отправлено.', 'success');
    } catch (error) {
      console.warn('Rinlo account protection resend failed', error);
      setStatus(errorCopy(error), 'error');
    } finally {
      if (resendButton) resendButton.textContent = 'Отправить письмо ещё раз';
      setBusy(false);
    }
  }

  emailInput?.addEventListener('input', () => {
    if (sendButton) sendButton.disabled = busy || !validEmail(emailInput.value);
    if (statusNode?.dataset.state === 'error') setStatus('');
  });
  sendButton?.addEventListener('click', sendProtectionEmail);
  checkButton?.addEventListener('click', checkProtection);
  resendButton?.addEventListener('click', resendProtection);

  window.addEventListener('rinlo:supabase-auth', (event) => {
    render(event.detail?.user || auth?.getSession?.()?.user || null);
  });
  window.addEventListener('online', () => render());

  render();

  // If an email-change request is pending, do one authentic server check on load.
  if (cloudEnabled() && pending) {
    setTimeout(() => {
      auth.getUser()
        .then((user) => render(user))
        .catch(() => render());
    }, 350);
  }

  window.Rinlo2AccountProtection = {
    version: 'v1-email-link',
    isProtectedUser,
    getPending: () => pending ? { ...pending } : null,
    refresh: async () => {
      if (!cloudEnabled()) {
        renderLocalOnly();
        return null;
      }
      const user = await auth.getUser();
      render(user);
      return user;
    },
  };
})();
