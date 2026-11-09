(() => {
  'use strict';
  if (window.HEALTHY_ACTION_CONFIG?.tatnetSameOrigin !== true) return;
  const parent = document.querySelector('.rinlo-home-focus');
  const lead = parent?.querySelector('.home-focus-lead');
  if (!lead) return;
  const note = document.createElement('p');
  note.className = 'tatnet-access-notice';
  note.setAttribute('role', 'status');
  note.textContent = 'Режим проверки доступности: решения и профиль пока сохраняются на устройстве. AI и облачная синхронизация ещё не подключены.';
  note.style.cssText = 'margin:10px 0 14px;padding:10px 12px;border:1px solid rgba(120,150,100,.22);border-radius:12px;background:#f4f9ee;color:#475244;font-size:12px;line-height:1.45;';
  lead.insertAdjacentElement('afterend', note);
})();
