(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  function apply() {
    const doc = frame.contentDocument;
    if (!doc?.head) {
      setTimeout(apply, 0);
      return;
    }

    doc.getElementById('rinlo-polish-v03')?.remove();
    const style = doc.createElement('style');
    style.id = 'rinlo-polish-v03';
    style.textContent = `
      /* Rinlo Today — optical polish v0.3 */
      #today.rinlo-today-v02{
        padding-top:max(16px,env(safe-area-inset-top))!important;
        padding-bottom:calc(112px + env(safe-area-inset-bottom))!important;
      }

      /* Header: one date signal only. The navigator below remains canonical. */
      #today.rinlo-today-v02 .rinlo-top{
        min-height:32px!important;
        margin-bottom:14px!important;
        justify-content:flex-start!important;
      }
      #today.rinlo-today-v02 .rinlo-day-status{display:none!important}

      /* Greeting rhythm */
      #today.rinlo-today-v02 .rinlo-greeting{margin-bottom:8px!important}
      #today.rinlo-today-v02 .rinlo-greeting h1{
        font-size:23px!important;
        line-height:1.12!important;
        margin-bottom:4px!important;
      }
      #today.rinlo-today-v02 .rinlo-greeting .sub{
        color:#68747A!important;
        font-size:12.5px!important;
        line-height:1.4!important;
      }

      /* Date navigator becomes service UI, not a content block */
      #today.rinlo-today-v02 .rinlo-date-compact{
        margin:0 0 9px!important;
        grid-template-columns:28px 1fr 28px!important;
      }
      #today.rinlo-today-v02 .datebtn{
        width:28px!important;
        height:28px!important;
        color:#929B9E!important;
      }
      #today.rinlo-today-v02 .dateTitle b{
        font-size:11px!important;
        color:#596468!important;
        letter-spacing:.005em;
      }

      /* Hero: slightly tighter, quieter and more premium */
      #today.rinlo-today-v02 .rinlo-hero{
        border-radius:22px!important;
        padding:17px 16px 15px!important;
        box-shadow:0 10px 28px rgba(15,23,32,.075)!important;
      }
      #today.rinlo-today-v02 .rinlo-hero-label{
        margin-bottom:8px!important;
        font-size:10px!important;
      }
      #today.rinlo-today-v02 .heroTitle{
        max-width:292px!important;
        font-size:21px!important;
        line-height:1.16!important;
        margin-bottom:6px!important;
      }
      #today.rinlo-today-v02 .rinlo-hero .sub{
        max-width:294px!important;
        color:rgba(255,255,255,.72)!important;
      }
      #today.rinlo-today-v02 .rinlo-hero-meta{margin-top:10px!important}
      #today.rinlo-today-v02 .rinlo-hero-meta span{
        padding:4px 7px!important;
        font-size:9px!important;
      }
      #today.rinlo-today-v02 .rinlo-hero-actions{
        gap:7px!important;
        margin-top:12px!important;
      }
      #today.rinlo-today-v02 .rinlo-hero-primary,
      #today.rinlo-today-v02 .rinlo-hero-secondary{
        min-height:40px!important;
        border-radius:12px!important;
      }
      #today.rinlo-today-v02 .rinlo-hero-primary{font-size:11.7px!important}
      #today.rinlo-today-v02 .rinlo-hero-secondary{font-size:11px!important}
      #today.rinlo-today-v02 .rinlo-why{
        margin-top:8px!important;
        font-size:10px!important;
        color:rgba(255,255,255,.54)!important;
      }

      /* Sections: less vertical noise */
      #today.rinlo-today-v02 .rinlo-section-title{
        margin:18px 0 8px!important;
      }
      #today.rinlo-today-v02 .rinlo-section-title h2{
        font-size:14.5px!important;
      }
      #today.rinlo-today-v02 .rinlo-section-title span{
        color:#818C90!important;
        font-size:9.2px!important;
      }

      /* Quick actions align as one compact instrument row */
      #today.rinlo-today-v02 .rinlo-quick-row{gap:6px!important}
      #today.rinlo-today-v02 .rinlo-quick{
        min-height:69px!important;
        border-radius:16px!important;
        padding:8px 4px 7px!important;
      }
      #today.rinlo-today-v02 .rinlo-quick .rinlo-icon-box{
        width:29px!important;
        height:29px!important;
        margin-bottom:6px!important;
      }
      #today.rinlo-today-v02 .rinlo-quick strong{
        font-size:9.8px!important;
        font-weight:600!important;
      }

      /* Secondary context gets readable contrast without competing with hero */
      #today.rinlo-today-v02 .rinlo-summary-card strong{color:#243036!important}
      #today.rinlo-today-v02 .rinlo-summary-card small{color:#778286!important}
      #today.rinlo-today-v02 .rinlo-insight p{color:#5F6D72!important}
      #today.rinlo-today-v02 .metric .sub{color:#737F84!important}
      #today.rinlo-today-v02 .item .main small{color:#788388!important}
      #today.rinlo-today-v02 .event p{color:#788388!important}

      /* Navigation: quieter and safer around iOS home indicator */
      .nav{
        height:64px!important;
        padding:5px 8px calc(6px + env(safe-area-inset-bottom))!important;
        background:rgba(255,255,255,.955)!important;
        border-top-color:#E8ECEA!important;
        box-shadow:0 -6px 24px rgba(15,23,32,.025)!important;
      }
      .nav button{
        color:#818B86!important;
        font-size:8.8px!important;
        gap:2px!important;
      }
      .nav button b svg{width:18px!important;height:18px!important}
      .nav button.active{color:#2E7D64!important}

      @media(max-width:360px){
        #today.rinlo-today-v02 .rinlo-top{margin-bottom:12px!important}
        #today.rinlo-today-v02 .rinlo-greeting h1{font-size:22px!important}
        #today.rinlo-today-v02 .heroTitle{font-size:20px!important}
      }
    `;
    doc.head.appendChild(style);
  }

  frame.addEventListener('load', () => {
    setTimeout(apply, 0);
  });

  try {
    if (frame.contentDocument?.readyState === 'complete') setTimeout(apply, 0);
  } catch {}
})();