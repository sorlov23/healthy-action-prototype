(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  function mount() {
    const doc = frame.contentDocument;
    if (!doc?.head) return;

    let style = doc.getElementById('rinlo-scale-pass-v1-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'rinlo-scale-pass-v1-style';
      doc.head.appendChild(style);
    }

    style.textContent = `
      /* Shared scale: Today keeps a small hierarchy advantage, not a separate scale system. */
      #today.rinlo-core-today{
        padding:max(17px,env(safe-area-inset-top)) 18px calc(104px + env(safe-area-inset-bottom))!important;
      }
      #today.rinlo-core-today .rc-today-top{margin-bottom:16px!important}
      #today.rinlo-core-today .rc-greeting h1{
        font-size:26px!important;
        line-height:1.09!important;
        letter-spacing:-.04em!important;
        margin-bottom:4px!important;
      }
      #today.rinlo-core-today .rc-greeting p{font-size:11px!important}

      #today.rinlo-core-today .rc-checkin{
        margin-top:14px!important;
        padding:14px!important;
        border-radius:19px!important;
      }
      #today.rinlo-core-today .rc-checkin-head{margin-bottom:10px!important}
      #today.rinlo-core-today .rc-checkin-head b{font-size:12.5px!important;line-height:1.28!important}
      #today.rinlo-core-today .rc-checkin-head button{font-size:10px!important}
      #today.rinlo-core-today .rc-moods{gap:6px!important}
      #today.rinlo-core-today .rc-mood{
        height:40px!important;
        border-radius:12px!important;
        font-size:10.25px!important;
      }
      #today.rinlo-core-today .rc-checkin-note{margin-top:7px!important;font-size:10px!important}

      #today.rinlo-core-today .rc-action{
        margin-top:11px!important;
        padding:16px 15px!important;
        border-radius:21px!important;
      }
      #today.rinlo-core-today .rc-action-kicker{
        gap:6px!important;
        margin-bottom:8px!important;
        font-size:10.25px!important;
      }
      #today.rinlo-core-today .rc-action-kicker svg{width:15px!important;height:15px!important}
      #today.rinlo-core-today .rc-action h2{
        font-size:22px!important;
        line-height:1.14!important;
        letter-spacing:-.032em!important;
        margin-bottom:7px!important;
      }
      #today.rinlo-core-today .rc-action p{
        font-size:12px!important;
        line-height:1.45!important;
      }
      #today.rinlo-core-today .rc-effort{margin-top:9px!important;padding:4px 8px!important;font-size:9.25px!important}
      #today.rinlo-core-today .rc-action-buttons{margin-top:13px!important;gap:8px!important}
      #today.rinlo-core-today .rc-action-buttons button{height:43px!important;border-radius:13px!important;font-size:10.75px!important}
      #today.rinlo-core-today .rc-not-fit{height:31px!important;margin-top:5px!important;font-size:10px!important}
      #today.rinlo-core-today .rc-feedback{margin-top:10px!important;padding-top:10px!important}

      #today.rinlo-core-today .rc-placeholder{
        margin-top:11px!important;
        padding:16px!important;
        border-radius:21px!important;
      }
      #today.rinlo-core-today .rc-placeholder b{font-size:14px!important}
      #today.rinlo-core-today .rc-placeholder p{font-size:11px!important}

      #today.rinlo-core-today .rc-section{margin:17px 0 8px!important}
      #today.rinlo-core-today .rc-section h2{font-size:14.75px!important}
      #today.rinlo-core-today .rc-section span{font-size:9.25px!important}
      #today.rinlo-core-today .rc-calories{padding:14px!important;border-radius:19px!important}
      #today.rinlo-core-today .rc-cal-top b{font-size:23px!important}
      #today.rinlo-core-today .rc-mini{padding:10px 9px!important;border-radius:15px!important}
      #today.rinlo-core-today .rc-mini b{font-size:13.5px!important}
      #today.rinlo-core-today .rc-quick button{height:64px!important;border-radius:16px!important}
      #today.rinlo-core-today .rc-quick svg{width:18px!important;height:18px!important}

      /* The other primary screens share the same base typography scale. */
      #actions.rinlo-plan-v01 .rp-heading h1,
      #progress.rinlo-insights-v01 .ri-heading h1,
      #profile.rinlo-profile-v01 .rpf-heading h1{
        font-size:25px!important;
        line-height:1.12!important;
        letter-spacing:-.037em!important;
      }
      #actions.rinlo-plan-v01 .rp-section h2,
      #progress.rinlo-insights-v01 .ri-section h2,
      #profile.rinlo-profile-v01 .rpf-section h2{
        font-size:15px!important;
      }
      #actions.rinlo-plan-v01 #actionHero .heroTitle,
      #progress.rinlo-insights-v01 .ri-hero h2{
        font-size:21.5px!important;
        line-height:1.15!important;
      }

      @media(max-width:360px){
        #today.rinlo-core-today .rc-greeting h1{font-size:25px!important}
        #today.rinlo-core-today .rc-action h2{font-size:21px!important}
        #actions.rinlo-plan-v01 .rp-heading h1,
        #progress.rinlo-insights-v01 .ri-heading h1,
        #profile.rinlo-profile-v01 .rpf-heading h1{font-size:24px!important}
      }
    `;
  }

  frame.addEventListener('load', () => {
    setTimeout(mount, 0);
    setTimeout(mount, 160);
  });
  setTimeout(mount, 0);
  setTimeout(mount, 220);
})();
