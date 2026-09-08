(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const icons = {
    meal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v6m3-6v6M5 7h7m-3 3v10M16 4v7c0 1.5.8 2.4 2 2.4h1V20m0-16v9.4"/></svg>`,
    weight: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5" width="15" height="14" rx="4"/><path d="M9 10.5a3 3 0 0 1 6 0M12 10.5l1.7-1.7"/></svg>`,
    water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s5.5 6.3 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 9.8 12 3.5 12 3.5Z"/></svg>`,
    steps: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 4.5c1.5 0 2.4 1.5 2 3.1l-.8 3.3c-.3 1.3-1.6 2-2.8 1.5l-.8-.3c-1.4-.5-2-2.2-1.4-3.5l1.7-3.2c.4-.6 1.1-.9 2.1-.9Zm7.8 7.1c1.4-.2 2.7.9 2.8 2.4l.2 3.6c.1 1.5-1.2 2.7-2.7 2.6l-.9-.1c-1.3-.1-2.2-1.2-2-2.5l.5-3.4c.2-1.4.9-2.4 2.1-2.6Z"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.8 3 2.5 4.7 5.5 5.5-3 .8-4.7 2.5-5.5 5.5-.8-3-2.5-4.7-5.5-5.5 3-.8 4.7-2.5 5.5-5.5Z"/><path d="M18.2 14.4c.4 1.5 1.3 2.4 2.8 2.8-1.5.4-2.4 1.3-2.8 2.8-.4-1.5-1.3-2.4-2.8-2.8 1.5-.4 2.4-1.3 2.8-2.8Z"/></svg>`
  };

  function ensureStyles(doc) {
    doc.getElementById('rinlo-system-v01-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-system-v01-style';
    style.textContent = `
      :root{
        --rinlo-graphite:#0F1720;
        --rinlo-text:#172027;
        --rinlo-muted:#68757A;
        --rinlo-green:#2E7D64;
        --rinlo-green-soft:#EEF5F1;
        --rinlo-cloud:#F3F6F4;
        --rinlo-border:#E2E8E5;
        --rinlo-danger:#B95353;
      }
      html,body{background:#F3F6F4!important;color:var(--rinlo-text)!important}
      button,input,select,textarea{font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif!important}

      /* Shared bottom sheets */
      .overlay{background:rgba(15,23,32,.34)!important;backdrop-filter:saturate(110%) blur(2px);-webkit-backdrop-filter:saturate(110%) blur(2px)}
      .sheet{max-height:88dvh!important;border-radius:28px 28px 0 0!important;padding:13px 18px calc(22px + env(safe-area-inset-bottom))!important;background:#FBFCFB!important;box-shadow:0 -18px 54px rgba(15,23,32,.16)!important;overscroll-behavior:contain!important}
      .sheet .handle{width:36px!important;height:4px!important;margin:0 auto 16px!important;background:#D7DEDA!important}
      .sheet h2{margin:0 0 5px!important;font-size:20px!important;line-height:1.16!important;font-weight:600!important;letter-spacing:-.025em!important;color:var(--rinlo-text)!important}
      .sheet>.sub,.sheet .sub{font-size:12.5px!important;line-height:1.45!important;color:var(--rinlo-muted)!important}
      .sheet .tiny{font-size:10.5px!important;line-height:1.42!important;color:#818C90!important}
      .sheet .card{margin-top:11px!important;border:1px solid var(--rinlo-border)!important;border-radius:18px!important;background:#fff!important;box-shadow:none!important}
      .sheet .coach{background:#F7FAF8!important;border-color:#DDE8E2!important}
      .sheet .coach b{color:#2F6654!important;font-weight:600!important}
      .sheet .coach p{color:#5F6D72!important}

      /* Inputs */
      .field{margin-top:13px!important}
      .field label{display:block!important;margin-bottom:7px!important;font-size:11px!important;line-height:1.25!important;font-weight:600!important;color:#647176!important}
      .field input,.field select,.field textarea{
        width:100%!important;border:1px solid var(--rinlo-border)!important;border-radius:14px!important;background:#fff!important;color:var(--rinlo-text)!important;outline:none!important;box-shadow:none!important;
        font-size:15px!important;line-height:1.35!important;padding:13px 14px!important;transition:border-color .14s ease,box-shadow .14s ease,background .14s ease!important;
      }
      .field input,.field select{min-height:50px!important}
      .field textarea{min-height:96px!important;resize:vertical!important}
      .field input:focus,.field select:focus,.field textarea:focus{border-color:#8CAFA0!important;box-shadow:0 0 0 3px rgba(46,125,100,.09)!important}
      .field input::placeholder,.field textarea::placeholder{color:#A0AAA6!important}

      /* Buttons */
      .btn{min-height:48px!important;border-radius:14px!important;padding:12px 15px!important;font-size:12px!important;font-weight:600!important;box-shadow:none!important}
      .btn.primary{background:var(--rinlo-graphite)!important;color:#fff!important}
      .btn.secondary{background:var(--rinlo-green-soft)!important;color:var(--rinlo-green)!important}
      .btn.ghost{background:#F0F3F1!important;color:#596469!important}
      .btn.danger{background:#FFF5F4!important;color:var(--rinlo-danger)!important}
      .btn:active{transform:translateY(1px)}
      .btn.full{width:100%!important;margin-top:12px!important}

      /* Choice rows / quick actions inside sheets */
      .sheet .choice,.sheet .foodMode,.sheet .foodSuggest{
        border:1px solid var(--rinlo-border)!important;border-radius:16px!important;background:#fff!important;box-shadow:none!important;
      }
      .sheet .choice{min-height:62px!important;padding:12px 13px!important;margin:6px 0!important}
      .sheet .choice b,.sheet .foodModeCopy b,.sheet .foodSuggestCopy b{font-weight:600!important;color:var(--rinlo-text)!important}
      .sheet .choice span,.sheet .foodModeCopy small,.sheet .foodSuggestCopy small{color:#788388!important}
      .sheet .foodModeIcon,.sheet .foodSuggestIcon{background:var(--rinlo-green-soft)!important;color:var(--rinlo-green)!important}
      .sheet .foodModeIcon svg,.sheet .foodSuggestIcon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

      /* Rinlo quick sheet */
      .rinlo-quick-sheet{display:grid;gap:7px;margin-top:14px}
      .rinlo-quick-action{width:100%;min-height:62px;border:1px solid var(--rinlo-border);border-radius:16px;background:#fff;padding:10px 12px;display:flex;align-items:center;gap:11px;text-align:left;color:var(--rinlo-text)}
      .rinlo-quick-action:active{background:#F7F9F8}
      .rinlo-quick-icon{width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:var(--rinlo-green-soft);color:var(--rinlo-green);display:grid;place-items:center}
      .rinlo-quick-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .rinlo-quick-copy b{display:block;font-size:12px;font-weight:600}
      .rinlo-quick-copy small{display:block;margin-top:2px;font-size:9.5px;line-height:1.3;color:#788388}

      /* Toast / feedback */
      .toast{top:calc(12px + env(safe-area-inset-top))!important;width:min(390px,calc(100vw - 32px))!important;border-radius:15px!important;padding:12px 14px!important;background:rgba(15,23,32,.96)!important;color:#fff!important;box-shadow:0 10px 30px rgba(15,23,32,.16)!important;font-size:12px!important;font-weight:500!important;line-height:1.35!important}

      /* Reusable state language */
      .rinlo-state{padding:22px 16px;text-align:center;border:1px dashed #DDE5E1;border-radius:18px;background:#F8FAF9}
      .rinlo-state-icon{width:34px;height:34px;margin:0 auto 9px;border-radius:11px;background:var(--rinlo-green-soft);color:var(--rinlo-green);display:grid;place-items:center}
      .rinlo-state-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .rinlo-state b{display:block;font-size:12px;font-weight:600;color:var(--rinlo-text)}
      .rinlo-state p{margin:4px auto 0;max-width:280px;font-size:10px;line-height:1.4;color:#788388}

      @media(max-width:360px){.sheet{padding-left:14px!important;padding-right:14px!important}.sheet h2{font-size:19px!important}}
    `;
    doc.head.appendChild(style);
  }

  function patchBrandText(root) {
    if (!root) return;
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue || '';
      if (!text.trim()) return;
      node.nodeValue = text
        .replace(/Healthy Action/g, 'Rinlo')
        .replace(/AI Coach/g, 'Rinlo')
        .replace(/✦\s*Coach/g, 'Rinlo')
        .replace(/Coach/g, 'Rinlo');
    });
  }

  function patchSheetObserver(doc) {
    const body = doc.getElementById('sheetBody');
    if (!body || body.dataset.rinloObserved === '1') return;
    body.dataset.rinloObserved = '1';
    const observer = new MutationObserver(() => patchBrandText(body));
    observer.observe(body,{childList:true,subtree:true,characterData:true});
    patchBrandText(body);
  }

  function patchBehavior(doc, win) {
    if (win.__rinloSystemPatched) return;
    win.__rinloSystemPatched = true;

    if (typeof win.openSheet === 'function') {
      win.openQuick = function() {
        win.openSheet(`
          <h2>Добавить</h2>
          <div class="sub">Выберите то, что действительно произошло.</div>
          <div class="rinlo-quick-sheet">
            <button class="rinlo-quick-action" onclick="openFood()"><span class="rinlo-quick-icon">${icons.meal}</span><span class="rinlo-quick-copy"><b>Еда</b><small>Записать приём пищи</small></span></button>
            <button class="rinlo-quick-action" onclick="openWeight()"><span class="rinlo-quick-icon">${icons.weight}</span><span class="rinlo-quick-copy"><b>Вес</b><small>Добавить измерение</small></span></button>
            <button class="rinlo-quick-action" onclick="addWater(250);closeSheet()"><span class="rinlo-quick-icon">${icons.water}</span><span class="rinlo-quick-copy"><b>Вода</b><small>Добавить 250 мл</small></span></button>
            <button class="rinlo-quick-action" onclick="addSteps(1000);closeSheet()"><span class="rinlo-quick-icon">${icons.steps}</span><span class="rinlo-quick-copy"><b>Шаги</b><small>Добавить 1000 шагов</small></span></button>
          </div>`);
      };

      win.openCoach = function() {
        const text = typeof win.coach === 'function' ? win.coach() : 'Rinlo подбирает следующий полезный шаг.';
        win.openSheet(`<h2>Rinlo</h2><div class="sub">Спокойная рекомендация на основе текущих записей.</div><div class="card coach"><b>Что имеет смысл сейчас</b><p>${text}</p></div><div class="tiny">Рекомендации прототипа не являются медицинским заключением.</div>`);
      };
    }

    doc.title = 'Rinlo';
    patchBrandText(doc.getElementById('sheetBody'));
  }

  function apply() {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;
    ensureStyles(doc);
    patchSheetObserver(doc);
    patchBehavior(doc,win);
  }

  frame.addEventListener('load',() => {
    try { setTimeout(apply,60); }
    catch (e) { console.error('Rinlo system pass v0.1',e); }
  });

  try { if (frame.contentDocument?.readyState === 'complete') setTimeout(apply,60); }
  catch {}
})();
