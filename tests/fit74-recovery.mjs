import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const code=await readFile(new URL('../fit74/recovery-core.js',import.meta.url),'utf8');
const win={};
vm.runInNewContext(code,{window:win,Date,Math,Number,Object,Map});
const {calculate,stable}=win.Fit74RecoveryCore;
const good = day => ({entry_date:day,workout:true,nutrition:2,movement:true});
const entries=['2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'].map(good);
const base={start:'2026-11-01',end:'2026-12-31',today:'2026-11-08'};
{
  const result=calculate({...base,entries});
  assert.deepEqual([...result.gapDates],['2026-11-07'],'unfinished Sunday must not count as missed');
  assert.equal(result.fortnight.completed,6);
  assert.equal(result.fortnight.total,7,'today excluded until completed');
  assert.equal(result.show,true);
  assert.equal(result.returns,0);
}
{
  const result=calculate({...base,entries:[...entries,good('2026-11-08')]});
  assert.equal(result.success,true);
  assert.equal(result.returns,1,'one return after a missed day');
  assert.equal(result.fortnight.completed,7);
  assert.equal(result.fortnight.total,8);
}
{
  const result=calculate({...base,today:'2026-11-09',entries});
  assert.deepEqual([...result.gapDates],['2026-11-07','2026-11-08']);
  assert.equal(result.fortnight.percent,75);
}
{
  const gentle={entry_date:'2026-11-07',minimum_mode:true,movement:true,water:true,habit_3:true};
  assert(stable(gentle),'genuine minimum day remains counted as stable');
  const result=calculate({...base,entries:[...entries,gentle]});
  assert.equal(result.show,false);
  assert.equal(result.fortnight.completed,7);
}
{
  const result=calculate({...base,start:'2026-11-08',entries:[]});
  assert.equal(result.show,false);
  assert.equal(result.fortnight.total,0);
}
{
  const result=calculate({...base,today:'2026-11-10',entries:[]});
  assert.equal(result.show,true);
  assert.equal(result.startedBefore,false,'new users are welcomed without claiming they returned');
}
{
  const result=calculate({...base,entries:[...entries,{entry_date:'2026-11-07',notes:'had food slip',nutrition:0}]});
  assert.equal(result.fortnight.completed,6,'reflection does not fake a completed day');
}
const ui=await readFile(new URL('../fit74/recovery-ui.js',import.meta.url),'utf8');
const html=await readFile(new URL('../fit74/index.html',import.meta.url),'utf8');
const tracker=await readFile(new URL('../fit74/v3.js',import.meta.url),'utf8');
new vm.Script(ui);
for(const id of ['returnCard','return14','return30','returnComebacks','returnPastDays','returnSteps',
  'dayContextButton','recoveryReasonModal','recoveryReasonOptions'])
  assert(html.includes('id="'+id+'"'),id+' must be present');
assert(html.indexOf('recovery-ui.js') < html.indexOf('v3.js'),'recovery API must load before app start');
assert(tracker.includes('window.Fit74Recovery?.start'),'recovery is initialized for logged-in user');
console.log('Fit74 recovery: honest dates, gentle mode, comeback stats, DOM and integration pass');
