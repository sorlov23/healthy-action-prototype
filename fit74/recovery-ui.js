/* Fit74 Recovery UI: private context notes, honest day counts and soft return actions. */
(() => {
  'use strict';
  const core = window.Fit74RecoveryCore;
  if (!core) return;
  const q = s => document.querySelector(s);
  let ctx = null, rows = new Map(), pending = false, initialized = false, seq = 0;
  let modalDay = null, state = null;
  const dayLabel = iso => new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'short'})
    .format(new Date(iso + 'T12:00:00Z'));
  const reason = code => core.REASONS.find(r => r.code === code);
  const current = iso => rows.get(iso) || {reason:null, return_steps:{}};
  const setText = (selector, text) => {const node=q(selector);if(node)node.textContent=text};
  const toggle = (selector, on) => {const node=q(selector);if(node)node.classList.toggle('hidden',!on)};
  const button = (text, onClick, cls) => {
    const node=document.createElement('button');
    node.type='button'; node.textContent=text;
    if(cls)node.className=cls;
    node.disabled=pending; node.addEventListener('click',onClick);
    return node;
  };

  async function reload() {
    if (!ctx) return;
    const requestId = ++seq, p = ctx.period();
    try {
      const data=await ctx.db('fit74_day_context?select=entry_date,reason,return_steps&user_id=eq.' +
        encodeURIComponent(ctx.userId) + '&entry_date=gte.' + p.start +
        '&entry_date=lte.' + p.end + '&order=entry_date.asc');
      if (requestId !== seq) return;
      rows = new Map((data||[]).map(row=>[row.entry_date,row]));
    } catch (error) {
      // Failure of optional reflections must never block the daily tracker.
      console.warn('Fit74 recovery notes unavailable',error);
      ctx.toast('Не удалось загрузить заметки о сложных днях. Основные отметки доступны.');
    }
    if (requestId === seq) render();
  }

  async function write(date, patch) {
    if (!ctx || pending || date > ctx.today() || date < ctx.period().start || date > ctx.period().end) return;
    pending = true;
    const old = current(date), next = { ...old, ...patch };
    render(); drawModal();
    try {
      const payload = {user_id:ctx.userId, entry_date:date, reason:next.reason,
        return_steps:next.return_steps || {}, updated_at:new Date().toISOString()};
      const result=await ctx.db('fit74_day_context?on_conflict=user_id,entry_date',{
        method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=representation'},
        body:JSON.stringify(payload)
      });
      if (!result?.[0]) throw new Error('Сервер не подтвердил сохранение');
      rows.set(date,result[0]); ctx.toast('Сохранил без изменения баллов ✓');
      if (modalDay) closeModal();
    } catch(error) {
      console.warn('Fit74 recovery save',error);
      ctx.toast('Не удалось сохранить. Проверь интернет и попробуй ещё раз.');
    } finally {pending=false;render();drawModal();}
  }

  function openModal(date) {
    if (!ctx || date>ctx.today() || date<ctx.period().start || date>ctx.period().end) return;
    modalDay=date; drawModal();
    const modal=q('#recoveryReasonModal');
    if(!modal)return;
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');
    q('#recoveryModalClose')?.focus();
  }
  function closeModal() {
    modalDay=null;
    const modal=q('#recoveryReasonModal');
    if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
  }
  function drawModal() {
    const list=q('#recoveryReasonOptions');if(!list || !modalDay)return;
    setText('#recoveryModalDate', dayLabel(modalDay));
    list.replaceChildren();
    for(const item of core.REASONS) {
      const b=button(item.icon + '  ' + item.label,()=>write(modalDay,{reason:item.code}), 'recovery-reason-option');
      const selected=current(modalDay).reason===item.code;
      b.setAttribute('aria-pressed',String(selected));
      if(selected)b.classList.add('selected');
      list.appendChild(b);
    }
    const empty=button('Без объяснения',()=>write(modalDay,{reason:null}),'recovery-reason-option neutral');
    empty.setAttribute('aria-pressed',String(!current(modalDay).reason));
    list.appendChild(empty);
  }

  function renderSteps(today,shift) {
    const list=q('#returnSteps');if(!list)return;
    list.replaceChildren();
    const descriptions=core.STEPS.map(step=>{
      if(step.id==='movement' && (shift?.kind==='night'||shift?.kind==='recovery'))
        return { ...step, text: 'Дал себе восстановиться после смены' };
      if(step.id==='movement' && shift?.kind==='work')
        return { ...step, text: 'Выбрал посильный минимум после работы' };
      return step;
    });
    const checked=current(today).return_steps || {};
    for(const step of descriptions) {
      const b=button((checked[step.id]?'✓':'○')+'  '+step.text,()=>{
        write(today,{return_steps:{...checked,[step.id]:!checked[step.id]}})
      },'return-step'+(checked[step.id]?' done':''));
      b.setAttribute('aria-pressed',String(!!checked[step.id]));
      list.appendChild(b);
    }
    const marked=descriptions.filter(s=>checked[s.id]).length;
    setText('#returnStepCount',marked+' из 3 · без штрафов и догонялок');
  }

  function render() {
    if(!ctx)return;
    const p=ctx.period(), today=ctx.today();
    try{state=core.calculate({entries:ctx.entries(),start:p.start,end:p.end,today});}
    catch(error){console.warn('Fit74 recovery stats',error);return;}
    const f=state.fortnight,m=state.month;
    setText('#return14',f.total?f.percent+'%':'—');
    setText('#return14Detail',f.completed+' из '+f.total+' дней');
    setText('#return30',m.total?m.percent+'%':'—');
    setText('#return30Detail',m.completed+' из '+m.total+' дней');
    setText('#returnComebacks',String(state.returns));
    setText('#resilienceTeaser',f.total?'14 дней · '+f.completed+'/'+f.total+' в ритме':'Начни в своём темпе');
    toggle('#returnCard',state.show);
    if(state.show) {
      setText('#returnTitle',state.success?'Ты вернулся в ритм 💪':'Ты всё ещё в игре');
      const n=state.gapDates.length;
      setText('#returnDescription',state.success?
        'Отлично, что вернулся к действиям. Ничего не нужно наверстывать.':
        state.startedBefore?
        'Были непростые дни ('+n+'). Они остаются в истории, но не отменяют весь путь.':
        'Не нужно наверстывать начало. Выбери одно небольшое действие сегодня.');
      const shift=ctx.shift?.();
      const soft=['night','recovery'].includes(shift?.kind);
      setText('#returnShiftHint',soft?
        'У тебя восстановление после ночной смены. Сон и отдых — полноценная часть плана.':
        shift?.kind==='work'?
        'В рабочий день достаточно небольшого действия. Двойная тренировка не нужна.':
        'После переедания не нужно голодать или наказывать себя тренировкой.');
      toggle('#returnStepsGroup',!state.success);
      toggle('#returnOpenCheckin',!state.success);
      if(!state.success)renderSteps(today,shift);
      const days=q('#returnPastDays');
      if(days){
        days.replaceChildren();
        const last=state.gapDates.slice(-4).reverse();
        for(const iso of last) {
          const label=reason(current(iso).reason);
          days.appendChild(button(dayLabel(iso)+' · '+(label?label.label:'указать причину'),
            ()=>openModal(iso),'return-day'));
        }
      }
    }
    const selected=ctx.selected();
    const selectedReason=reason(current(selected).reason);
    setText('#dayContextNote',selectedReason?
      'Отмечено: '+selectedReason.label+'. Это не меняет баллы.':
      'Можно отметить обстоятельства дня, без штрафов и оправданий.');
    setText('#dayContextButton',selectedReason?'Изменить отметку':'Отметить сложный день');
    const canEdit=selected>=p.start&&selected<=p.end&&selected<=today;
    const note=q('#dayContextButton');if(note)note.disabled=!canEdit||pending;
    decorateCalendar();
    decorateHistory();
  }

  function decorateCalendar() {
    const grid=q('#calendarGrid');if(!grid)return;
    for(const cell of grid.querySelectorAll('[data-date]')) {
      const iso=cell.dataset.date, r=reason(current(iso).reason);
      cell.classList.toggle('reflected-day',!!r);
      if(r)cell.title=dayLabel(iso)+' · '+r.label+' (отметка не влияет на баллы)';
    }
  }
  function decorateHistory() {
    const root=q('#historyList');if(!root)return;
    for(const item of root.querySelectorAll('[data-date]')) {
      const existing=item.querySelector('.recovery-history-note');
      if(existing)existing.remove();
      const selected=reason(current(item.dataset.date).reason);
      if(!selected)continue;
      const tag=document.createElement('span');
      tag.className='recovery-history-note';tag.textContent='🌿 '+selected.label;
      item.querySelector('small')?.after(tag);
    }
  }

  function bindOnce() {
    if(initialized)return;initialized=true;
    q('#returnOpenCheckin')?.addEventListener('click',()=>ctx?.checkin());
    q('#dayContextButton')?.addEventListener('click',()=>ctx&&openModal(ctx.selected()));
    q('#recoveryModalClose')?.addEventListener('click',closeModal);
    q('#recoveryReasonModal')?.addEventListener('click',event=>{
      if(event.target.id==='recoveryReasonModal')closeModal();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape' && modalDay)closeModal();
    });
    window.addEventListener('fit74:plan-change',()=>reload());
    window.addEventListener('online',()=>reload());
  }
  function start(next) {
    ctx=next;rows=new Map();bindOnce();render();reload();
  }
  window.Fit74Recovery=Object.freeze({start,render,decorateCalendar,decorateHistory});
})();
