(() => {
  'use strict';

  // Export is deliberately user-triggered, local-only, and contains no Auth sessions,
  // JWTs, refresh tokens, API keys, or passwords.
  const STORAGE_KEYS = Object.freeze([
    'rinlo2-foundation-state-v1',
    'rinlo2-decisions-v2',
    'rinlo2-cook-v1',
    'rinlo2-corrections-v1',
    'rinlo2-feedback-v1',
  ]);

  function buildSnapshot() {
    const data = {};
    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        data[key] = JSON.parse(raw);
      } catch {
        // Do not export unreadable/corrupted storage under a misleading backup label.
      }
    }
    return {
      format: 'rinlo-local-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      data,
    };
  }

  function exportSnapshot() {
    const status = document.getElementById('rinloBackupStatus');
    try {
      const snapshot = buildSnapshot();
      if (Object.keys(snapshot.data).length === 0) {
        if (status) status.textContent = 'На этом устройстве пока нет локальных данных для экспорта.';
        return false;
      }
      const text = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `rinlo-local-backup-${snapshot.createdAt.slice(0, 10)}.json`;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30_000);
      if (status) status.textContent = 'Файл создан на этом устройстве. Храни его в безопасном месте — внутри личные данные.';
      return true;
    } catch (error) {
      console.error('Rinlo local backup export failed', error);
      if (status) status.textContent = 'Не удалось создать файл. Попробуй снова или освободи память устройства.';
      return false;
    }
  }

  document.getElementById('exportRinloBackup')?.addEventListener('click', exportSnapshot);

  // Read-only snapshot builder for explicit migration QA; importing is intentionally
  // disabled until account ownership and Neon reconciliation are implemented.
  window.RinloLocalBackup = { version: 1, buildSnapshot, exportSnapshot };
})();
