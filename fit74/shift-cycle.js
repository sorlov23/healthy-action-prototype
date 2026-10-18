(() => {
  'use strict';

  // Existing preferences store the SECOND day off after the night shifts.
  // Keep that anchor's meaning; canonical day 1 is the following daytime shift.
  const DEFAULT_ANCHOR = '2026-10-19';
  const utc = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const addDays = (iso, days) => new Date(utc(iso) + days * 86400000).toISOString().slice(0, 10);

  function slotFor(iso, anchor = DEFAULT_ANCHOR) {
    const offset = Math.round((utc(iso) - utc(anchor)) / 86400000) - 1;
    const idx = ((offset % 8) + 8) % 8;
    const cycle = Math.floor(offset / 8);
    const gluteCycle = ((cycle % 2) + 2) % 2 === 1;
    const slots = [
      {
        short:'Д1', title:'Дневная 1', detail:'09:00–21:00', icon:'☀️',
        code:'REST', kind:'work', status:'очень легко',
        planTitle:'Отдых и мобилизация', planLabel:'После дневной смены',
        planNote:'Отдых или 10–15 минут мягкой мобилизации. Обязательной тренировки нет.'
      },
      {
        short:'Д2', title:'Дневная 2', detail:'09:00–21:00', icon:'☀️',
        code:'REST', kind:'work', status:'легко',
        planTitle:'Отдых или лёгкое вело', planLabel:'По самочувствию',
        planNote:'Можно полностью отдохнуть. Если есть силы — 15–20 минут лёгкого вело.'
      },
      {
        short:'Вых 1', title:'1-й полный выходной', detail:'после двух дневных смен', icon:'🏠',
        code:'A', kind:'main', status:'основная',
        planTitle:'Тренировка A', planLabel:'Основная силовая',
        planNote:'Основная силовая в первый полный выходной после дневных смен.'
      },
      {
        short:'Вых 2', title:'2-й полный выходной', detail:'перед первой ночной', icon:'🏠',
        code:'CARDIO', kind:'cardio', status:'умеренно',
        planTitle:'Кардио + кор + мобилизация', planLabel:'Умеренная нагрузка',
        planNote:'Кардио, упражнения на корпус и мягкая мобилизация. Второй тяжёлой силовой сегодня нет.'
      },
      {
        short:'Н1', title:'Ночная 1', detail:'21:00–09:00 · тренировка до смены', icon:'🌙',
        code:gluteCycle ? 'GLUTES' : 'B', kind:'moderate', status:'умеренно',
        planTitle:gluteCycle ? 'Ягодицы' : 'Тренировка B', planLabel:'Вместо второй силовой этого цикла',
        planNote:'До первой ночной: закончи за 3–5 часов до 21:00. RPE около 6, без отказа. ' +
          (gluteCycle ? 'В этом цикле ягодицы заменяют B; в следующем будет B.' : 'В этом цикле B; в следующем её заменят ягодицы.')
      },
      {
        short:'Н2', title:'Ночная 2', detail:'21:00–09:00 · после сна снова на смену', icon:'🌙',
        code:'REST', kind:'night', status:'восстановление',
        planTitle:'Восстановление после сна', planLabel:'Без силовой нагрузки',
        planNote:'Сначала сон после первой ночной. Затем только восстановление: по самочувствию 10–20 минут очень лёгкого вело и мягкие движения.'
      },
      {
        short:'Вых 1', title:'1-й выходной после ночных', detail:'вторая ночная заканчивается в 09:00', icon:'🌿',
        code:'REST', kind:'recovery', status:'восстановление',
        planTitle:'Сон и отдых', planLabel:'После второй ночной',
        planNote:'До 09:00 ещё ночная смена. После неё — сон, отдых и лёгкая мобилизация. Силовую не ставим.'
      },
      {
        short:'Вых 2', title:'2-й выходной после ночных', detail:'перед первой дневной 09:00–21:00', icon:'🌿',
        code:'REST', kind:'recovery', status:'легко',
        planTitle:'Отдых и лёгкая активность', planLabel:'Второй выходной после ночных',
        planNote:'Отдых, прогулка или лёгкое вело по самочувствию. Завтра снова день 1 — дневная смена. Тяжёлая тренировка не запланирована.'
      }
    ];
    return {...slots[idx], idx, day:idx + 1, cycle, gluteCycle};
  }

  const api = Object.freeze({version:'12.0', DEFAULT_ANCHOR, slotFor, addDays});
  if (typeof window !== 'undefined') window.Fit74ShiftCycle = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
