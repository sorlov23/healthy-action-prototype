(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  function applyWordmarkSpec() {
    const doc = frame.contentDocument;
    if (!doc || !doc.head) return;

    let style = doc.getElementById('rinlo-wordmark-v01');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'rinlo-wordmark-v01';
      doc.head.appendChild(style);
    }

    style.textContent = `
      #today.rinlo-today-v02 .rinlo-wordmark {
        position: relative !important;
        display: inline-block !important;
        padding-right: 8px !important;
        font-size: 26px !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        letter-spacing: -0.045em !important;
        color: #0F1720 !important;
      }

      #today.rinlo-today-v02 .rinlo-wordmark-dot {
        position: absolute !important;
        width: 6px !important;
        height: 6px !important;
        right: 0 !important;
        top: 6px !important;
        margin: 0 !important;
        vertical-align: initial !important;
        border-radius: 50% !important;
        background: #2E7D64 !important;
      }
    `;
  }

  frame.addEventListener('load', () => {
    try { setTimeout(applyWordmarkSpec, 0); }
    catch (e) { console.error('Rinlo wordmark', e); }
  });

  try { setTimeout(applyWordmarkSpec, 0); }
  catch {}
})();