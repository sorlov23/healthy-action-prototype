import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {slotFor, addDays} = require('../fit74/shift-cycle.js');

const first = ['REST','REST','A','CARDIO','B','REST','REST','REST'];
const second = ['REST','REST','A','CARDIO','GLUTES','REST','REST','REST'];
for (let cycle = 0; cycle < 8; cycle++) {
  const start = addDays('2026-10-20', cycle * 8);
  const days = Array.from({length:8}, (_,i) => slotFor(addDays(start,i)));
  assert.deepEqual(days.map(s=>s.day), [1,2,3,4,5,6,7,8]);
  assert.deepEqual(days.map(s=>s.code), cycle % 2 ? second : first);
  assert.equal(days.filter(s=>['A','B','GLUTES'].includes(s.code)).length, 2);
  assert(days.every(s=>s.cycle === cycle));
  assert.equal(slotFor(addDays(start,8)).day, 1);
  assert.equal(slotFor(addDays(start,8)).short, 'Д1');
  assert.match(days[4].planNote, /3–5 часов/);
  assert.match(days[4].planNote, /RPE около 6, без отказа/);
  assert.match(days[6].detail, /заканчивается в 09:00/);
}
// Keep the persisted second-day-off anchor; never shift the actual work dates.
assert.equal(slotFor('2026-10-19').day, 8);
assert.equal(slotFor('2026-10-19').code, 'REST');
assert.equal(slotFor('2026-10-20').short, 'Д1');
assert.equal(slotFor('2026-10-22').code, 'A');
assert.equal(slotFor('2026-10-23').code, 'CARDIO');
assert.equal(slotFor('2026-10-24').code, 'B');
assert.equal(slotFor('2026-10-25').code, 'REST');
assert.equal(slotFor('2026-10-26').day, 7);
assert.equal(slotFor('2026-10-27').day, 8);
assert.equal(slotFor('2026-10-28').day, 1);
assert.equal(slotFor('2026-11-01').code, 'GLUTES');
assert.equal(slotFor('2026-11-09').code, 'B');
// Anchor adjustment, dates before anchor and a year boundary keep 8 whole days.
const moved = '2026-10-21';
for (let i = -24; i < 80; i++) {
  const date=addDays(moved,i);
  assert.deepEqual(slotFor(date,moved),slotFor(addDays(date,-2)));
}
assert.equal(slotFor('2027-01-01').day, ((slotFor('2026-12-31').day)%8)+1);
console.log(JSON.stringify({ok:true,cyclesChecked:8,exactDateMapping:true,anchorPreserved:true,twoStrengthSessionsPerCycle:true,alternation:'B / GLUTES',yearBoundary:true},null,2));
