(() => {
  const frame = document.getElementById('app');
  if(!frame) return;

  const APP_VERSION = 'v0.9.1';

  const icons = {
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.4 12 4l7.5 6.4v8.1a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6h-3.6V20H6a1.5 1.5 0 0 1-1.5-1.5z"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2.8 5.9 13h5.2l-.6 8.2L18.1 11h-5.2z"/></svg>`,
    trend: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5v9.2c0 1.3 1 2.3 2.3 2.3h11.2"/><path d="m8.2 14.2 3.2-3.2 2.5 2.5 4.1-4.1"/><path d="M14.8 9.4H18v3.2"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.2"/><path d="M5.8 19.2c.7-3.2 2.8-5 6.2-5s5.5 1.8 6.2 5"/></svg>`,
    left: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5.5 5 5.5"/></svg>`,
    right: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5.5-5 5.5"/></svg>`
  };

  function ensureStyles(doc){
    doc.getElementById('pwa-ui-polish-v2')?.remove();
    doc.getElementById('pwa-ui-polish-v3')?.remove();
    if(doc.getElementById('pwa-ui-polish-v4')) return;
    const style = doc.createElement('style');
    style.id = 'pwa-ui-polish-v4';
    style.textContent = `
      button{-webkit-tap-highlight-color:transparent}
      .btn,.action,.choice,.datebtn,.check,.nav button,.pill,.del,.photoRemove{touch-action:manipulation}
      .btn,.action,.choice,.datebtn,.pill,.foodMode,.foodSuggest{transition:transform .12s ease,background-color .12s ease,border-color .12s ease,box-shadow .12s ease}
      .btn:active,.action:active,.choice:active,.datebtn:active,.pill:active,.foodMode:active,.foodSuggest:active{transform:scale(.985)}

      /* Mission/status rows */
      .item{min-height:72px;padding:13px 14px;gap:12px}
      .item .left{width:40px;height:40px;border-radius:13px;font-size:20px}
      .item .main b{display:block;line-height:1.24}
      .item .main small{line-height:1.35}
      .check{
        appearance:none;-webkit-appearance:none;
        flex:0 0 30px;width:30px;height:30px;min-width:30px;
        padding:0!important;margin:0;border-radius:50%;
        border:2px solid #cbd5cd;background:transparent;
        display:grid;place-items:center;position:relative;box-sizing:border-box;
        font-size:0!important;line-height:0;box-shadow:none!important;overflow:hidden;
        transition:background-color .16s ease,border-color .16s ease,transform .12s ease;
      }
      .check::before{
        content:'';width:14px;height:11px;opacity:0;transform:scale(.9);
        background-repeat:no-repeat;background-position:center;background-size:14px 11px;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 11'%3E%3Cpath d='M1.3 5.7 4.9 9.1 12.7 1.5' fill='none' stroke='%2319874c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        transition:opacity .16s ease,transform .16s ease;
      }
      .check.done{background:#edf8f1;border-color:#d5eadc;box-shadow:none!important}
      .check.done::before{opacity:1;transform:scale(1)}
      button.check:active{transform:scale(.94)}

      /* Controls */
      .field input,.field select,.field textarea{transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease}
      .field input:focus,.field select:focus,.field textarea:focus{border-color:#7bc894!important;box-shadow:0 0 0 4px rgba(39,158,83,.08);outline:none}
      .btn{min-height:48px}
      .pill{min-height:38px;display:inline-flex;align-items:center;justify-content:center}
      .datebtn{display:grid;place-items:center;font-size:0;color:#526058}
      .datebtn svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round}

      /* Navigation */
      .nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;line-height:1.1}
      .nav button b{height:24px;margin:0!important;display:grid!important;place-items:center;font-size:0!important;line-height:0}
      .nav button b svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .nav button.active b svg{stroke-width:2.15}

      /* Perfectly centred plus */
      .fab{font-size:0!important;display:grid;place-items:center}
      .fab::before,.fab::after{content:'';position:absolute;width:23px;height:2.4px;border-radius:99px;background:#fff;left:50%;top:50%;transform:translate(-50%,-50%)}
      .fab::after{transform:translate(-50%,-50%) rotate(90deg)}

      /* Small destructive/close controls */
      .del,.photoRemove{font-size:0!important;position:relative;display:grid;place-items:center;padding:0}
      .del::before,.del::after,.photoRemove::before,.photoRemove::after{content:'';position:absolute;width:12px;height:1.7px;border-radius:99px;background:currentColor;left:50%;top:50%}
      .del::before,.photoRemove::before{transform:translate(-50%,-50%) rotate(45deg)}
      .del::after,.photoRemove::after{transform:translate(-50%,-50%) rotate(-45deg)}

      /* Bottom sheets */
      .sheet .handle{width:38px;height:5px;background:#d6ddd7;margin-bottom:16px}
      .sheet h2{line-height:1.22}
      .sheet .sub{margin-top:5px}
      .sheet .choice,.foodMode,.foodSuggest,.photoSelectedRow{box-shadow:0 1px 0 rgba(20,40,25,.02)}

      /* Micro alignment */
      .metric .v{font-variant-numeric:tabular-nums}
      .tiny{line-height:1.45}
      .sec h2{line-height:1.2}
      .event .del{display:grid}
    `;
    doc.head.appendChild(style);
  }

  function applyIcons(doc){
    const nav = [...doc.querySelectorAll('.nav button')];
    const navIcons = [icons.home, icons.bolt, icons.trend, icons.profile];
    nav.forEach((button, i) => {
      const holder = button.querySelector('b');
      if(holder && navIcons[i]) holder.innerHTML = navIcons[i];
    });

    const dateButtons = [...doc.querySelectorAll('.datebtn')];
    if(dateButtons[0]) dateButtons[0].innerHTML = icons.left;
    if(dateButtons[1]) dateButtons[1].innerHTML = icons.right;
  }

  function syncVersions(doc){
    const replaceText = root => {
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        const v = node.nodeValue;
        if(v && /v\d+\.\d+(?:\.\d+)?/i.test(v)) node.nodeValue = v.replace(/v\d+\.\d+(?:\.\d+)?/gi, APP_VERSION);
      });
    };
    replaceText(doc.body);
    if(!doc.__haVersionObserver){
      doc.__haVersionObserver = new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
          if(node.nodeType === 3){
            if(/v\d+\.\d+(?:\.\d+)?/i.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/v\d+\.\d+(?:\.\d+)?/gi, APP_VERSION);
          } else if(node.nodeType === 1) replaceText(node);
        }));
      });
      doc.__haVersionObserver.observe(doc.body,{subtree:true,childList:true});
    }
  }

  function apply(){
    const doc = frame.contentDocument;
    if(!doc) return;
    ensureStyles(doc);
    applyIcons(doc);
    syncVersions(doc);
  }

  frame.addEventListener('load', () => {
    try { apply(); } catch(e) { console.error('Healthy Action UI polish', e); }
  });

  try {
    if(frame.contentDocument?.readyState === 'complete') setTimeout(apply, 0);
  } catch {}
})();