(() => {
  'use strict';
  const codes = ['A', 'B', 'GLUTES', 'CARDIO', 'LIGHT'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<img class="ui-icon" src="./assets/impulse/icons/${escape(name)}.svg" alt="" aria-hidden="true">`;
  const art = (code, className = '') => `<img class="workout-art ${className}" src="./assets/impulse/${(code==='A'?'hero-v2':(codes.includes(code) ? code : 'LIGHT').toLowerCase())}.webp" alt="" aria-hidden="true" width="300" height="300">`;
  const meta = {A:'Основная силовая', B:'Умеренная силовая', GLUTES:'Силовая тренировка', CARDIO:'Кардио и корпус', LIGHT:'Лёгкая тренировка', REST:'Время восстановиться'};
  const duration = {A:'40–50 мин', B:'35–45 мин', GLUTES:'35–45 мин', CARDIO:'30–40 мин', LIGHT:'20–30 мин'};
  window.Fit74UI = {escape, icon, art, meta, duration};
  document.addEventListener('click', e => {
    const goto = e.target.closest('[data-goto]');
    if (goto && typeof switchScreen === 'function') switchScreen(goto.dataset.goto);
  });
})();
