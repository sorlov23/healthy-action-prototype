(() => {
  'use strict';

  const button = document.getElementById('homeSuggestNow');
  if (!button || !window.RinloCook?.suggestFromHome) return;

  let busy = false;

  const getIngredients = () => window.RinloCook?.getZeroPromptIngredients?.() || [];
  const getParts = () => ({
    kicker: button.querySelector('.home-suggest-kicker'),
    title: button.querySelector('.home-suggest-main b'),
    context: document.getElementById('homeSuggestContext'),
    readiness: document.getElementById('homeSuggestReadiness'),
    status: document.getElementById('homeSuggestStatus'),
  });

  function renderEntryState({ preserveStatus = false } = {}) {
    if (busy) return;
    const ingredients = getIngredients();
    const ready = ingredients.length >= 2;
    const parts = getParts();
    button.dataset.zeroPromptReady = ready ? 'true' : 'false';

    if (parts.kicker) parts.kicker.textContent = ready ? 'ZERO-PROMPT' : 'НАСТРОЙ ОДИН РАЗ';
    if (parts.title) parts.title.textContent = 'Предложи мне';
    if (parts.context) {
      parts.context.textContent = ready
        ? ingredients.slice(0, 4).join(' · ')
        : 'Сначала выбери, что обычно есть дома';
    }
    if (parts.readiness) {
      parts.readiness.textContent = ready
        ? 'Можно получить решение без ввода'
        : 'Дальше — решения без ввода';
    }
    if (!preserveStatus && parts.status) parts.status.textContent = '';
  }

  async function handleSuggest(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;

    const ready = getIngredients().length >= 2;
    if (!ready) {
      await window.RinloCook.suggestFromHome();
      return;
    }

    busy = true;
    const stableMarkup = button.innerHTML;
    const request = window.RinloCook.suggestFromHome();

    // cook-v1 historically treated every trigger as a plain text button.
    // Restore the structured Home CTA immediately while the request runs.
    button.innerHTML = stableMarkup;
    button.disabled = true;
    let parts = getParts();
    if (parts.title) parts.title.textContent = 'Rinlo подбирает…';
    if (parts.status) parts.status.textContent = 'Учитываю продукты, профиль и прошлые решения.';

    let success = false;
    try {
      success = await request;
    } catch (error) {
      console.error('Home zero-prompt failed', error);
    } finally {
      // cook-v1 also restores textContent in finally; rebuild the card once more.
      button.innerHTML = stableMarkup;
      button.disabled = false;
      busy = false;
      renderEntryState({ preserveStatus: true });
      parts = getParts();
      if (parts.status) {
        parts.status.textContent = success
          ? ''
          : 'Не получилось получить решение. Попробуй ещё раз.';
      }
    }
  }

  button.addEventListener('click', handleSuggest, true);
  window.addEventListener('rinlo2:profile-applied', () => renderEntryState());
  window.addEventListener('rinlo2:behavior-memory-changed', () => renderEntryState({ preserveStatus: true }));
  renderEntryState();
})();
