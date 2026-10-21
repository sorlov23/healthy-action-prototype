(()=>{
  'use strict';
  const plan=window.Fit74PlanPeriod,q=s=>document.querySelector(s);
  const start=q('#planStartInput'),end=q('#planEndInput');
  let pickerField=null,month='',focusDate='',opener=null;
  const plural=n=>n%100>=11&&n%100<=14?'дней':n%10===1?'день':n%10>=2&&n%10<=4?'дня':'дней';
  const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const human=iso=>new Date(iso+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  function setError(message=''){q('#planDateError').textContent=message;start.setAttribute('aria-invalid',String(!!message&&!plan.validDate(plan.fromDisplay(start.value))));end.setAttribute('aria-invalid',String(!!message))}
  function read(){return plan.create(plan.fromDisplay(start.value),plan.fromDisplay(end.value))}
  function preview(){
    setError();
    try{const p=read();q('#planDuration').textContent=p.total+' '+plural(p.total);q('#planRangePreview').textContent=human(p.start)+' — '+human(p.end)}
    catch{q('#planDuration').textContent='—';q('#planRangePreview').textContent='Выбери две даты для расчёта длительности.'}
  }
  function render(){start.value=plan.display(plan.current.start);end.value=plan.display(plan.current.end);preview()}
  [start,end].forEach(input=>input.addEventListener('input',()=>{
    // Deleting a separator remains possible; formatting is applied only as digits are added.
    const atEnd=input.selectionStart===input.value.length,digits=input.value.replace(/\D/g,'').slice(0,8);
    if(atEnd)input.value=[digits.slice(0,2),digits.slice(2,4),digits.slice(4)].filter(Boolean).join('.');
    preview();
  }));
  document.body.insertAdjacentHTML('beforeend',`<dialog id="planCalendar" class="plan-calendar-dialog" aria-labelledby="planCalendarTitle"><div class="plan-calendar-top"><h2 id="planCalendarTitle">Выбери дату</h2><button type="button" id="planCalendarClose" aria-label="Закрыть календарь">×</button></div><div class="plan-calendar-nav"><button type="button" data-plan-month="-1" aria-label="Предыдущий месяц">‹</button><strong id="planCalendarMonth"></strong><button type="button" data-plan-month="1" aria-label="Следующий месяц">›</button></div><div class="plan-calendar-weekdays" aria-hidden="true">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>'<span>'+d+'</span>').join('')}</div><div id="planCalendarDays" class="plan-calendar-days" role="group" aria-label="Дни месяца"></div><button type="button" id="planCalendarToday" class="plan-calendar-today">Сегодня</button><p class="micro">Дату также можно ввести в поле: ДД.ММ.ГГГГ.</p></dialog>`);
  const dialog=q('#planCalendar');
  function renderCalendar(focus=false){
    const date=new Date(month+'-01T12:00:00Z'),offset=(date.getUTCDay()+6)%7,first=plan.addDays(month+'-01',-offset),chosen=plan.fromDisplay(pickerField.value),today=localToday();
    q('#planCalendarMonth').textContent=date.toLocaleDateString('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'});
    q('#planCalendarDays').innerHTML=Array.from({length:42},(_,i)=>{
      const d=plan.addDays(first,i),classes=[d.slice(0,7)!==month?'outside':'',d===chosen?'chosen':'',d===today?'today':''].filter(Boolean).join(' ');
      return `<button type="button" data-plan-date="${d}" class="${classes}" tabindex="${d===focusDate?'0':'-1'}" aria-label="${human(d)}" aria-pressed="${d===chosen}">${Number(d.slice(-2))}</button>`;
    }).join('');
    if(focus)q(`[data-plan-date="${focusDate}"]`)?.focus();
  }
  function moveMonth(step){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+step);const next=d.toISOString().slice(0,7);if(Number(next.slice(0,4))<1000||Number(next.slice(0,4))>9998)return;month=next;focusDate=month+'-01';renderCalendar(true)}
  function open(field,button){pickerField=field;opener=button;const value=plan.fromDisplay(field.value);focusDate=plan.validDate(value)?value:localToday();month=focusDate.slice(0,7);q('#planCalendarTitle').textContent=field===start?'Дата начала':'Дата окончания';renderCalendar();dialog.showModal();q(`[data-plan-date="${focusDate}"]`)?.focus()}
  function choose(iso){pickerField.value=plan.display(iso);preview();dialog.close()}
  document.querySelectorAll('[data-plan-picker]').forEach(button=>button.addEventListener('click',()=>open(button.dataset.planPicker==='start'?start:end,button)));
  q('#planCalendarClose').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>opener?.focus());
  dialog.addEventListener('click',event=>{
    const date=event.target.closest('[data-plan-date]'),nav=event.target.closest('[data-plan-month]');
    if(date)choose(date.dataset.planDate);else if(nav)moveMonth(Number(nav.dataset.planMonth));else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}
  });
  q('#planCalendarToday').onclick=()=>choose(localToday());
  q('#planCalendarDays').addEventListener('keydown',event=>{
    const steps={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    if(event.key==='PageUp'||event.key==='PageDown'){event.preventDefault();moveMonth(event.key==='PageUp'?-1:1);return}
    if(!(event.key in steps))return;event.preventDefault();
    const next=plan.addDays(focusDate,steps[event.key]);if(!plan.validDate(next))return;focusDate=next;month=next.slice(0,7);renderCalendar(true);
  });
  q('#savePlanPeriodBtn').onclick=()=>window.dispatchEvent(new Event('fit74:save-plan'));
  window.Fit74PlanSettings=Object.freeze({read,render,setError,setSaving(saving){q('#savePlanPeriodBtn').disabled=saving;q('#savePlanPeriodBtn').textContent=saving?'Сохраняю…':'Сохранить период';start.disabled=saving;end.disabled=saving;document.querySelectorAll('[data-plan-picker]').forEach(b=>b.disabled=saving)}});
  render();
})();
