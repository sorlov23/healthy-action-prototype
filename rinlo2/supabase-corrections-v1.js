(() => {
  const STORAGE_KEY = 'rinlo2-corrections-v1';
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const auth = window.RinloSupabaseAuth;
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const params = new URLSearchParams(location.search);
  const localOnly = params.get('local') === '1';
  const enabled = !localOnly
    && config.supabaseDataEnabled === true
    && Boolean(auth?.enabled && base && publishableKey);
  const allowedTypes = new Set(['dish', 'portion', 'ingredients', 'choice']);

  let corrections = loadLocal();
  let syncPromise = null;

  function makeId() {
    if (globalThis.crypto?.randomUUID) return `c-${crypto.randomUUID()}`;
    return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalize(input = {}) {
    const type = allowedTypes.has(String(input.type || input.correction_type || ''))
      ? String(input.type || input.correction_type)
      : null;
    const value = String(input.value || input.correction_value || '').trim().slice(0, 240);
    const decisionId = String(input.decisionId || input.client_decision_id || '').trim().slice(0, 160);
    if (!type || !value || !decisionId) return null;

    return {
      id: String(input.id || input.client_correction_id || makeId()),
      decisionId,
      type,
      value,
      dishName: String(input.dishName || input.dish_name || '').trim().slice(0, 160),
      payload: input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
        ? input.payload
        : {},
      createdAt: input.createdAt || input.created_at || new Date().toISOString(),
      revokedAt: input.revokedAt || input.revoked_at || null,
    };
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalize).filter(Boolean).slice(0, 100);
    } catch {
      return [];
    }
  }

  function saveLocal() {
    corrections.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    corrections = corrections.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(corrections));
  }

  async function request(path, options = {}) {
    if (!enabled) throw new Error('rinlo2_corrections_sync_disabled');
    const session = await auth.ensureSession();
    if (!session?.access_token || !session?.user?.id) throw new Error('rinlo2_no_session');

    const response = await fetch(`${base}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.message || data?.error || data?.hint || `rinlo2_corrections_${response.status}`);
      error.status = response.status;
      error.code = data?.code || null;
      throw error;
    }
    return { data, session };
  }

  function toRow(correction, userId) {
    return {
      user_id: userId,
      client_correction_id: correction.id,
      client_decision_id: correction.decisionId,
      correction_type: correction.type,
      correction_value: correction.value,
      dish_name: correction.dishName || null,
      payload: correction.payload || {},
      created_at: correction.createdAt || new Date().toISOString(),
      revoked_at: correction.revokedAt || null,
    };
  }

  function fromRow(row) {
    return normalize({
      id: row.client_correction_id,
      decisionId: row.client_decision_id,
      type: row.correction_type,
      value: row.correction_value,
      dishName: row.dish_name,
      payload: row.payload,
      createdAt: row.created_at,
      revokedAt: row.revoked_at,
    });
  }

  async function upsertCorrection(correction) {
    if (!enabled || !correction?.id) return null;
    const session = await auth.ensureSession();
    const row = toRow(correction, session.user.id);
    const { data } = await request('/rest/v1/rinlo_decision_corrections?on_conflict=user_id,client_correction_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    });
    return Array.isArray(data) ? data[0] : data;
  }

  function recentStartIso(days = 90) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  async function fetchRecent(days = 90) {
    if (!enabled) return [];
    const query = [
      'select=*',
      `created_at=gte.${encodeURIComponent(recentStartIso(days))}`,
      'order=created_at.desc',
      'limit=100',
    ].join('&');
    const { data } = await request(`/rest/v1/rinlo_decision_corrections?${query}`, { method: 'GET' });
    return (Array.isArray(data) ? data : []).map(fromRow).filter(Boolean);
  }

  function correctionTime(item) {
    const time = new Date(item?.revokedAt || item?.createdAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function mergeCorrections(incoming = []) {
    const byId = new Map(corrections.map((item) => [item.id, item]));
    let changed = 0;
    incoming.forEach((item) => {
      const normalized = normalize(item);
      if (!normalized) return;
      const local = byId.get(normalized.id);
      if (!local) {
        byId.set(normalized.id, normalized);
        changed += 1;
        return;
      }
      if (correctionTime(normalized) > correctionTime(local)) {
        byId.set(normalized.id, normalized);
        changed += 1;
      }
    });
    corrections = [...byId.values()];
    saveLocal();
    return changed;
  }

  function record(input = {}) {
    const correction = normalize({ ...input, id: input.id || makeId(), createdAt: input.createdAt || new Date().toISOString() });
    if (!correction) throw new Error('invalid_rinlo_correction');

    if (!corrections.some((item) => item.id === correction.id)) {
      corrections.unshift(correction);
      saveLocal();
    }

    window.dispatchEvent(new CustomEvent('rinlo2:correction-recorded', {
      detail: { correction: JSON.parse(JSON.stringify(correction)) },
    }));

    renderMemory();
    if (enabled) {
      upsertCorrection(correction).catch((error) => {
        console.warn('Rinlo correction background sync failed', error);
      });
    }
    return JSON.parse(JSON.stringify(correction));
  }

  function activeCorrections() {
    return corrections.filter((item) => !item.revokedAt);
  }

  function correctionTypeLabel(type) {
    if (type === 'dish') return 'Блюдо';
    if (type === 'portion') return 'Порция';
    if (type === 'ingredients') return 'Состав';
    if (type === 'choice') return 'Фактический выбор';
    return 'Поправка';
  }

  function formatMemoryDate(value) {
    const date = new Date(value || 0);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  function showMemoryStatus(message) {
    const node = document.getElementById('rinloMemoryStatus');
    if (!node) return;
    node.textContent = message || '';
    clearTimeout(showMemoryStatus.timer);
    if (message) {
      showMemoryStatus.timer = setTimeout(() => {
        if (node.textContent === message) node.textContent = '';
      }, 2200);
    }
  }

  async function revokeCorrection(id) {
    const correction = corrections.find((item) => item.id === id);
    if (!correction || correction.revokedAt) return null;
    correction.revokedAt = new Date().toISOString();
    saveLocal();
    renderMemory();

    window.dispatchEvent(new CustomEvent('rinlo2:correction-revoked', {
      detail: { correction: JSON.parse(JSON.stringify(correction)) },
    }));

    if (enabled) {
      upsertCorrection(correction).catch((error) => {
        console.warn('Rinlo correction revoke sync failed', error);
      });
    }
    return JSON.parse(JSON.stringify(correction));
  }

  function renderMemory() {
    const list = document.getElementById('rinloMemoryList');
    const empty = document.getElementById('rinloMemoryEmpty');
    const summary = document.getElementById('rinloMemorySummary');
    if (!list || !empty || !summary) return;

    const active = activeCorrections()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    summary.textContent = active.length
      ? `${active.length} ${active.length === 1 ? 'актуальная поправка' : (active.length >= 2 && active.length <= 4 ? 'актуальные поправки' : 'актуальных поправок')}`
      : 'Память по поправкам пока пустая';

    empty.hidden = active.length > 0;
    const visible = active.slice(0, 6);
    list.replaceChildren(...visible.map((item) => {
      const row = document.createElement('article');
      row.className = 'profile-memory-row';

      const copy = document.createElement('div');
      copy.className = 'profile-memory-copy';

      const meta = document.createElement('small');
      meta.textContent = [correctionTypeLabel(item.type), formatMemoryDate(item.createdAt)]
        .filter(Boolean)
        .join(' · ');

      const title = document.createElement('b');
      title.textContent = item.dishName || 'Поправка к решению';

      const value = document.createElement('p');
      value.textContent = item.value;

      const forget = document.createElement('button');
      forget.type = 'button';
      forget.dataset.forgetCorrection = item.id;
      forget.textContent = 'Забыть';
      forget.setAttribute('aria-label', `Не учитывать поправку: ${item.value}`);

      copy.append(meta, title, value);
      row.append(copy, forget);
      return row;
    }));

    const more = document.getElementById('rinloMemoryMore');
    if (more) {
      const hiddenCount = Math.max(0, active.length - visible.length);
      more.hidden = hiddenCount === 0;
      more.textContent = hiddenCount ? `Ещё ${hiddenCount} в памяти Rinlo` : '';
    }
  }

  function injectMemoryUi() {
    if (document.getElementById('rinloMemoryCard')) {
      renderMemory();
      return;
    }
    const profile = document.querySelector('[data-screen="profile"]');
    const trustCard = profile?.querySelector('.profile-trust-card');
    if (!profile || !trustCard) return;

    const card = document.createElement('article');
    card.id = 'rinloMemoryCard';
    card.className = 'profile-memory-card';
    card.innerHTML = `
      <div class="profile-memory-head">
        <div>
          <small>ПРОЗРАЧНАЯ ПАМЯТЬ</small>
          <h2>Что Rinlo запомнил</h2>
          <p id="rinloMemorySummary">Память по поправкам пока пустая</p>
        </div>
        <span class="profile-memory-mark" aria-hidden="true">↺</span>
      </div>
      <p class="profile-memory-explain">Здесь только твои явные исправления. Они помогают в похожих ситуациях, но не становятся жёсткими правилами.</p>
      <div class="profile-memory-list" id="rinloMemoryList"></div>
      <p class="profile-memory-empty" id="rinloMemoryEmpty">Когда ты исправишь блюдо, порцию, состав или фактический выбор, Rinlo покажет это здесь.</p>
      <small class="profile-memory-more" id="rinloMemoryMore" hidden></small>
      <span class="profile-memory-status" id="rinloMemoryStatus" aria-live="polite"></span>
    `;
    trustCard.insertAdjacentElement('afterend', card);

    card.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-forget-correction]');
      if (!button) return;
      const id = button.dataset.forgetCorrection;
      button.disabled = true;
      button.textContent = 'Убираю…';
      await revokeCorrection(id);
      showMemoryStatus('Rinlo больше не будет учитывать эту поправку');
    });

    renderMemory();
  }

  const MEMORY_STOP_WORDS = new Set([
    'это','как','что','мне','можно','хочу','буду','есть','съесть','взять','сегодня','сейчас',
    'мой','моя','мои','этот','эта','эти','или','для','без','при','уже','ещё','еще','было',
    'была','были','был','примерно','обычная','обычный','большая','большой','маленькая',
  ]);

  function memoryTokens(value = '') {
    return String(value || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/gi, ' ')
      .trim()
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !MEMORY_STOP_WORDS.has(token))
      .map((token) => token.length >= 6 ? token.slice(0, 5) : token);
  }

  function memoryScore(query, correction) {
    const queryTokens = new Set(memoryTokens(query));
    if (!queryTokens.size) return 0;

    const dishTokens = new Set(memoryTokens(correction.dishName || ''));
    const valueTokens = new Set(memoryTokens(correction.value || ''));
    let score = 0;

    queryTokens.forEach((token) => {
      if (dishTokens.has(token)) score += 4;
      if (valueTokens.has(token)) score += correction.type === 'dish' ? 4 : 2;
    });

    const queryText = String(query || '').toLowerCase().replace(/ё/g, 'е');
    const dishText = String(correction.dishName || '').toLowerCase().replace(/ё/g, 'е').trim();
    const valueText = String(correction.value || '').toLowerCase().replace(/ё/g, 'е').trim();
    if (dishText.length >= 4 && queryText.includes(dishText)) score += 6;
    if (correction.type === 'dish' && valueText.length >= 4 && queryText.includes(valueText)) score += 6;

    return score;
  }

  function getRelevantContext(query, days = 30, limit = 4) {
    const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
    const text = String(query || '').trim();
    if (!text) return [];

    return activeCorrections()
      .filter((item) => {
        const time = new Date(item.createdAt || 0).getTime();
        return Number.isFinite(time) && time >= cutoff;
      })
      .map((item) => ({ item, score: memoryScore(text, item) }))
      .filter((entry) => entry.score >= 4)
      .sort((a, b) => b.score - a.score || new Date(b.item.createdAt || 0) - new Date(a.item.createdAt || 0))
      .slice(0, Math.max(1, Math.min(6, limit)))
      .map(({ item, score }) => ({
        type: item.type,
        value: String(item.value || '').slice(0, 160),
        dishName: String(item.dishName || '').slice(0, 120),
        relevance: score,
      }));
  }

  function getRecentContext(days = 30, limit = 6) {
    const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
    return activeCorrections()
      .filter((item) => {
        const time = new Date(item.createdAt || 0).getTime();
        return Number.isFinite(time) && time >= cutoff;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, Math.max(1, Math.min(10, limit)))
      .map((item) => ({
        type: item.type,
        value: String(item.value || '').slice(0, 160),
        dishName: String(item.dishName || '').slice(0, 120),
      }));
  }

  async function syncLocal() {
    if (!enabled) return { pushed: 0, pulled: 0 };

    // Pull first so a remote revoke cannot be undone by a stale device.
    const remote = await fetchRecent(90);
    const pulled = mergeCorrections(remote);

    let pushed = 0;
    for (const correction of corrections) {
      try {
        await upsertCorrection(correction);
        pushed += 1;
      } catch (error) {
        console.warn('Rinlo correction sync push failed', error);
      }
    }

    renderMemory();
    window.dispatchEvent(new CustomEvent('rinlo2:corrections-sync', {
      detail: { status: 'synced', pushed, pulled },
    }));
    return { pushed, pulled };
  }

  function scheduleSync() {
    if (!enabled) return Promise.resolve({ pushed: 0, pulled: 0 });
    if (!syncPromise) {
      syncPromise = syncLocal()
        .catch((error) => {
          console.warn('Rinlo correction sync failed', error);
          window.dispatchEvent(new CustomEvent('rinlo2:corrections-sync', {
            detail: { status: 'offline', error: String(error?.message || error) },
          }));
          return { pushed: 0, pulled: 0, error };
        })
        .finally(() => { syncPromise = null; });
    }
    return syncPromise;
  }

  window.addEventListener('online', scheduleSync);
  window.addEventListener('rinlo2:correction-recorded', renderMemory);
  window.addEventListener('rinlo2:correction-revoked', renderMemory);
  setTimeout(() => {
    injectMemoryUi();
    scheduleSync();
  }, 0);

  window.Rinlo2Corrections = {
    version: 'v4-sync-safe-memory',
    enabled,
    localOnly,
    record,
    revokeCorrection,
    getCorrections: () => corrections.map((item) => JSON.parse(JSON.stringify(item))),
    getActiveCorrections: () => activeCorrections().map((item) => JSON.parse(JSON.stringify(item))),
    getRecentContext,
    getRelevantContext,
    fetchRecent,
    syncNow: scheduleSync,
  };
})();
