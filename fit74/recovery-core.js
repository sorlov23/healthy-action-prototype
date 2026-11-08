/* Fit74: honest progress metrics; a reflected day never becomes a completed day. */
(() => {
  'use strict';
  const MS = 86400000;
  const dayNo = iso => Date.parse(iso + 'T12:00:00Z') / MS;
  const add = (iso, days) => new Date((dayNo(iso) + days) * MS).toISOString().slice(0, 10);
  const min = (a, b) => a < b ? a : b;
  const max = (a, b) => a > b ? a : b;
  const score = e => !e ? 0 : (e.workout ? 2 : 0) + (Number(e.nutrition) || 0) +
    (e.movement ? 1 : 0) + (e.water ? 1 : 0) + (e.sleep ? 1 : 0) +
    (e.habit_1 ? 1 : 0) + (e.habit_2 ? 1 : 0) + (e.habit_3 ? 1 : 0);
  const stable = e => !!e && (score(e) >= 5 ||
    !!(e.minimum_mode && e.movement && e.water && e.habit_3));
  const REASONS = Object.freeze([
    { code: 'fatigue', label: 'Не было сил', icon: '🌙' },
    { code: 'schedule', label: 'Сбился режим', icon: '🕒' },
    { code: 'food', label: 'Питание не в цель', icon: '🥗' },
    { code: 'health', label: 'Самочувствие', icon: '🌿' },
    { code: 'other', label: 'Другие обстоятельства', icon: '💬' }
  ]);
  const STEPS = Object.freeze([
    { id: 'food', text: 'Поел как обычно, без компенсаций' },
    { id: 'movement', text: 'Выбрал посильную активность или отдых' },
    { id: 'reflection', text: 'Честно отметил, как прошёл день' }
  ]);

  function calculate({ entries = [], start, end, today }) {
    if (!start || !end || !today || end < start) throw new Error('Invalid recovery plan');
    const map = new Map(entries.map(e => [e.entry_date, e]));
    const yesterday = add(today, -1), doneEnd = min(end, yesterday);
    const todayStable = today >= start && today <= end && stable(map.get(today));
    const reportEnd = todayStable ? today : doneEnd;
    const range = days => {
      if (reportEnd < start) return { completed: 0, total: 0, percent: 0 };
      const from = max(start, add(reportEnd, -days + 1));
      let total = 0, completed = 0;
      for (let d = from; d <= reportEnd; d = add(d, 1)) {
        total++;
        if (stable(map.get(d))) completed++;
      }
      return { completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
    };
    let returns = 0, gapSinceStable = false, hadStable = false;
    if (reportEnd >= start) {
      for (let d = start; d <= reportEnd; d = add(d, 1)) {
        if (stable(map.get(d))) {
          if (hadStable && gapSinceStable) returns++;
          hadStable = true; gapSinceStable = false;
        } else if (hadStable) gapSinceStable = true;
      }
    }
    // Do not call the current unfinished day a missed day.
    let lastStable = null;
    if (doneEnd >= start) {
      for (let d = start; d <= doneEnd; d = add(d, 1))
        if (stable(map.get(d))) lastStable = d;
    }
    const gapDates = [];
    if (doneEnd >= start) {
      const from = max(start, add(doneEnd, -6), lastStable ? add(lastStable, 1) : start);
      for (let d = from; d <= doneEnd; d = add(d, 1))
        if (!stable(map.get(d))) gapDates.push(d);
    }
    const active = today >= start && today <= end;
    const show = active && (gapDates.length > 0 && (lastStable !== null || dayNo(today) - dayNo(start) >= 2));
    return {
      active, show, returning: show && !todayStable, success: show && todayStable,
      startedBefore: lastStable !== null, gapDates, returns,
      fortnight: range(14), month: range(30), todayStable
    };
  }
  window.Fit74RecoveryCore = Object.freeze({ calculate, score, stable, add, REASONS, STEPS });
})();
