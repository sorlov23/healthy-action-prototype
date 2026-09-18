(() => {
  const STORAGE_KEY = 'rinlo2-sync-center-v1';
  const auth = window.RinloSupabaseAuth;
  const modules = () => ({
    profile: window.Rinlo2ProfileSync,
    decisions: window.Rinlo2Supabase,
    corrections: window.Rinlo2Corrections,
    feedback: window.Rinlo2Feedback,
  });

  let syncPromise = null;
  let refreshTimer = null;
  let state = loadState();

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        status: parsed.status || 'checking',
        lastSuccessfulAt: parsed.lastSuccessfulAt || null,
        lastAttemptAt: parsed.lastAttemptAt || null,
        pending: Boolean(parsed.pending),
      };
    } catch {
      return { status: 'checking', lastSuccessfulAt: null, lastAttemptAt: null, pending: false };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatTime(value) {
    const date = new Date(value || 0);
    if (!Number.isFinite(date.getTime())) return '—';
    const diff = Date.now() - date.getTime();
    if (diff >= 0 && diff < 45_000) return 'только что';
    if (diff >= 0 && diff < 60 * 60_000) return `${Math.max(1, Math.floor(diff / 60_000))} мин назад`;
    const today = new Date();
    const sameDay = date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
    return sameDay
      ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  function meaningfulProfile(profile = {}) {
    return Boolean(profile.goal || profile.currentWeight || profile.targetWeight
      || (Array.isArray(profile.priorities) && profile.priorities.length));
  }

  function counts() {
    return {
      decisions: window.Rinlo2Decisions?.getDecisions?.().length || 0,
      memory: window.Rinlo2Corrections?.getActiveCorrections?.().length || 0,
      feedback: window.Rinlo2Feedback?.getAll?.().length || 0,
      profile: window.Rinlo2Foundation?.getDecisionProfile?.() || {},
    };
  }

  function cloudEnabled() {
    const available = Object.values(modules()).filter(Boolean);
    return Boolean(auth?.enabled && available.length && available.some((item) => item.enabled));
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  async function accountInfo() {
    if (!auth?.enabled) return { enabled: false, anonymous: true };
    try {
      const session = auth.getSession?.() || await auth.ensureSession?.();
      const user = session?.user || {};
      const anonymous = user.is_anonymous !== false
        && !(Array.isArray(user.identities) && user.identities.length > 0);
      return { enabled: Boolean(session?.user?.id), anonymous, user };
    } catch {
      return { enabled: false, anonymous: true };
    }
  }

  function renderStatus(account = null) {
    const hero = document.getElementById('syncHeroCard');
    const button = document.getElementById('syncNowButton');
    const action = document.getElementById('syncActionStatus');
    const online = navigator.onLine !== false;
    const enabled = cloudEnabled();

    let status = state.status;
    let title = 'Проверяю облако…';
    let text = 'Локальные данные уже доступны, соединение проверяется.';
    let mark = '↻';

    if (!enabled) {
      status = 'local';
      title = 'Только на этом устройстве';
      text = 'Облачная синхронизация отключена для этой версии.';
      mark = '⌁';
    } else if (!online || status === 'offline') {
      status = 'offline';
      title = 'Сейчас офлайн';
      text = 'Изменения остаются на устройстве и синхронизируются после возвращения сети.';
      mark = '↓';
    } else if (status === 'syncing') {
      title = 'Синхронизирую…';
      text = 'Сверяю профиль, решения, память и оценки ответов.';
      mark = '↻';
    } else if (state.pending) {
      status = 'pending';
      title = 'Есть изменения на устройстве';
      text = 'Rinlo сохранит их в облаке при ближайшей синхронизации.';
      mark = '↑';
    } else if (state.lastSuccessfulAt) {
      status = 'synced';
      title = 'Данные Rinlo сохранены';
      text = 'Более свежие версии профиля и решений согласованы с облаком.';
      mark = '✓';
    } else {
      title = 'Облако подключено';
      text = 'Rinlo готов синхронизировать данные этого устройства.';
      mark = '☁';
    }

    if (hero) hero.dataset.state = status;
    setText('syncCloudMark', mark);
    setText('syncStatusTitle', title);
    setText('syncStatusText', text);
    setText('syncLastAt', formatTime(state.lastSuccessfulAt));

    if (button) {
      button.disabled = status === 'syncing' || !enabled || !online;
      button.textContent = status === 'syncing' ? 'Синхронизирую…' : 'Синхронизировать сейчас';
    }
    if (action && status !== 'syncing') action.textContent = '';

    const c = counts();
    setText('settingsDecisionCount', String(c.decisions));
    setText('settingsMemoryCount', String(c.memory));
    setText('settingsFeedbackCount', String(c.feedback));
    setText('settingsProfileState', meaningfulProfile(c.profile) ? 'Настроен' : 'Минимальный');
    setText('settingsDecisionVersion', window.Rinlo2Decisions?.version || '—');
    setText('settingsSyncVersion', 'v1');

    const profileSummary = document.getElementById('profileSyncSummary');
    if (profileSummary) {
      profileSummary.textContent = status === 'synced'
        ? `Синхронизировано · ${formatTime(state.lastSuccessfulAt)}`
        : status === 'offline'
          ? 'Офлайн · изменения сохранены локально'
          : status === 'pending'
            ? 'Есть изменения для синхронизации'
            : title;
    }

    if (account) {
      if (!account.enabled) {
        setText('syncAccountMode', 'Локальный режим');
        setText('settingsAccountBadge', 'Локальный');
        setText('settingsAccountText', 'Облачная сессия сейчас недоступна. Данные на устройстве продолжают работать.');
      } else if (account.anonymous) {
        setText('syncAccountMode', 'Временный аккаунт');
        setText('settingsAccountBadge', 'Временный');
        setText('settingsAccountText', 'Сейчас Rinlo использует временный аккаунт без регистрации. Если очистить данные браузера или сменить устройство, этот аккаунт нельзя будет восстановить.');
      } else {
        setText('syncAccountMode', 'Защищённый аккаунт');
        setText('settingsAccountBadge', 'Защищён');
        setText('settingsAccountText', 'Аккаунт можно восстановить на другом устройстве. Данные Rinlo остаются привязаны к этой учётной записи.');
      }
    }
  }

  async function refreshUi() {
    renderStatus();
    const account = await accountInfo();
    renderStatus(account);
    return account;
  }

  function normalizeResult(name, result) {
    const value = result?.status === 'fulfilled' ? result.value : { error: result?.reason };
    const failed = result?.status === 'rejected'
      || Boolean(value?.error)
      || ['offline', 'error'].includes(String(value?.status || ''));
    return { name, failed, value };
  }

  async function syncAll({ manual = false } = {}) {
    if (syncPromise) return syncPromise;
    if (!cloudEnabled()) {
      state.status = 'local';
      saveState();
      await refreshUi();
      return { status: 'local' };
    }
    if (navigator.onLine === false) {
      state.status = 'offline';
      saveState();
      await refreshUi();
      return { status: 'offline' };
    }

    syncPromise = (async () => {
      state.status = 'syncing';
      state.lastAttemptAt = new Date().toISOString();
      saveState();
      await refreshUi();

      try {
        await auth?.ensureSession?.();
        const active = Object.entries(modules()).filter(([, module]) => module?.enabled && typeof module.syncNow === 'function');
        const settled = await Promise.allSettled(active.map(([, module]) => module.syncNow()));
        const results = settled.map((result, index) => normalizeResult(active[index][0], result));
        const failures = results.filter((item) => item.failed);

        if (failures.length) {
          state.status = 'offline';
          state.pending = true;
          saveState();
          const action = document.getElementById('syncActionStatus');
          if (action && manual) action.textContent = 'Не всё удалось синхронизировать. Данные на устройстве сохранены.';
          return { status: 'partial', results };
        }

        state.status = 'synced';
        state.pending = false;
        state.lastSuccessfulAt = new Date().toISOString();
        saveState();
        const action = document.getElementById('syncActionStatus');
        if (action && manual) action.textContent = 'Готово — данные синхронизированы';
        window.dispatchEvent(new CustomEvent('rinlo2:sync-center', {
          detail: { status: 'synced', at: state.lastSuccessfulAt, results },
        }));
        return { status: 'synced', results };
      } catch (error) {
        state.status = 'offline';
        state.pending = true;
        saveState();
        const action = document.getElementById('syncActionStatus');
        if (action && manual) action.textContent = 'Синхронизация не завершилась. Изменения остались на устройстве.';
        return { status: 'offline', error };
      } finally {
        syncPromise = null;
        await refreshUi();
      }
    })();

    return syncPromise;
  }

  function markPending() {
    if (!cloudEnabled()) return;
    state.pending = true;
    if (state.status !== 'syncing') state.status = navigator.onLine === false ? 'offline' : 'pending';
    saveState();
    refreshUi();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => syncAll(), 900);
  }

  document.getElementById('syncNowButton')?.addEventListener('click', () => syncAll({ manual: true }));
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-nav="settings"]')) setTimeout(refreshUi, 0);
  });

  ['rinlo2:profile-changed', 'rinlo2:decision-saved', 'rinlo2:correction-recorded', 'rinlo2:correction-revoked', 'rinlo2:feedback-changed']
    .forEach((name) => window.addEventListener(name, markPending));

  ['rinlo2:sync', 'rinlo2:profile-sync', 'rinlo2:corrections-sync', 'rinlo2:feedback-sync']
    .forEach((name) => window.addEventListener(name, () => {
      if (state.status !== 'syncing') refreshUi();
    }));

  window.addEventListener('online', () => {
    state.status = state.pending ? 'pending' : 'checking';
    saveState();
    refreshUi();
    syncAll();
  });
  window.addEventListener('offline', () => {
    state.status = 'offline';
    saveState();
    refreshUi();
  });

  refreshUi();
  setTimeout(() => syncAll(), 1200);

  window.Rinlo2SyncCenter = {
    version: 'v1',
    syncNow: () => syncAll({ manual: true }),
    getState: () => ({ ...state }),
    refresh: refreshUi,
  };
})();
