(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const VERSION = 'v1';

  function compatibleRow(row) {
    if (Array.isArray(row)) return [...row];
    if (!row || typeof row !== 'object') return row;
    const aliases = Array.isArray(row.aliases)
      ? row.aliases
      : String(row.aliases || '').split('|').filter(Boolean);
    return Object.assign({}, row, {
      aliases,
      0: row.id,
      1: row.name,
      2: aliases.join('|'),
      3: row.kcal100,
      4: row.protein100,
      5: row.portion ?? row.serving ?? 100,
      6: row.icon || row.emoji || '🍽️',
    });
  }

  function keepPhotoPrivacyCopy(doc) {
    const note = doc.querySelector('.rsf-photo .rsf-beta');
    if (!note) return;
    note.textContent = 'Фото остаётся на устройстве и никуда не отправляется. Сейчас Rinlo использует только вашу подпись; Vision-анализ подключим следующим этапом.';
  }

  function install() {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc?.body || win.__rinloSmartFood !== 'v1') return false;

    if (Array.isArray(window.HEALTHY_FOOD_CATALOG) && window.HEALTHY_FOOD_CATALOG.length) {
      const bridged = window.HEALTHY_FOOD_CATALOG.map(compatibleRow);
      window.HEALTHY_FOOD_CATALOG = bridged;
      win.HEALTHY_FOOD_CATALOG = bridged.map(compatibleRow);
    }

    if (doc.__rinloSmartFoodEventsV1) {
      win.__rinloSmartFoodEvents = VERSION;
      keepPhotoPrivacyCopy(doc);
      return true;
    }

    doc.__rinloSmartFoodEventsV1 = true;
    doc.addEventListener('input', (event) => {
      if (event.target?.id === 'rsfText') win.rinloSmartFoodSuggest?.();
    }, true);
    doc.addEventListener('change', (event) => {
      if (event.target?.id === 'rsfPhotoInput') setTimeout(() => keepPhotoPrivacyCopy(doc), 0);
    }, true);
    doc.addEventListener('click', (event) => {
      if (event.target?.closest?.('.rsf-mode')) setTimeout(() => keepPhotoPrivacyCopy(doc), 0);
    }, true);

    win.__rinloSmartFoodEvents = VERSION;
    return true;
  }

  function mount() {
    if (install()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries >= 40) clearInterval(timer);
    }, 100);
  }

  frame.addEventListener('load', () => setTimeout(mount, 0));
  setTimeout(mount, 0);
})();
