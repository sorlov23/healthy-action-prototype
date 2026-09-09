(() => {
  const frame = document.getElementById('app');
  if (!frame) return;

  const LOGO_SRC = './rinlo-logo.svg?rev=27';
  const SELECTOR = '.rinlo-wordmark,.rc-wordmark,.ro-wordmark';
  let observer = null;

  function ensureStyles(doc) {
    doc.getElementById('rinlo-wordmark-v01')?.remove();

    let style = doc.getElementById('rinlo-brand-v1-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'rinlo-brand-v1-style';
      doc.head.appendChild(style);
    }

    style.textContent = `
      :root {
        --rinlo-brand-wordmark-width: 98px;
        --rinlo-brand-wordmark-width-large: 116px;
      }

      .rinlo-brand-wordmark,
      .rinlo-wordmark.rinlo-brand-wordmark,
      .rc-wordmark.rinlo-brand-wordmark,
      .ro-wordmark.rinlo-brand-wordmark {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        width: var(--rinlo-brand-wordmark-width) !important;
        height: 35px !important;
        min-width: var(--rinlo-brand-wordmark-width) !important;
        padding: 0 !important;
        margin: 0 !important;
        color: transparent !important;
        font-size: 0 !important;
        line-height: 0 !important;
        letter-spacing: 0 !important;
        position: relative !important;
        overflow: visible !important;
      }

      #onboarding .rinlo-brand-wordmark,
      #onboarding .rc-wordmark.rinlo-brand-wordmark,
      #onboarding .ro-wordmark.rinlo-brand-wordmark {
        width: var(--rinlo-brand-wordmark-width-large) !important;
        min-width: var(--rinlo-brand-wordmark-width-large) !important;
        height: 42px !important;
      }

      #today.rinlo-core-today .rinlo-brand-wordmark,
      #today.rinlo-core-today .rc-wordmark.rinlo-brand-wordmark {
        width: 104px !important;
        min-width: 104px !important;
        height: 37px !important;
      }

      .rinlo-brand-wordmark > img {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        max-width: none !important;
        object-fit: contain !important;
        object-position: left center !important;
        pointer-events: none !important;
        user-select: none !important;
      }

      .rinlo-brand-wordmark .rinlo-wordmark-dot,
      .rinlo-brand-wordmark .ro-wordmark-dot,
      .rinlo-brand-wordmark > i {
        display: none !important;
      }
    `;
  }

  function normalize(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;

    const nodes = [];
    if (root.nodeType === 1 && root.matches?.(SELECTOR)) nodes.push(root);
    root.querySelectorAll?.(SELECTOR).forEach((node) => nodes.push(node));

    for (const el of nodes) {
      if (el.dataset.rinloBrand === 'v1' && el.querySelector('img[data-rinlo-logo="v1"]')) continue;

      const img = el.ownerDocument.createElement('img');
      img.src = LOGO_SRC;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.setAttribute('draggable', 'false');
      img.dataset.rinloLogo = 'v1';

      el.replaceChildren(img);
      el.classList.add('rinlo-brand-wordmark');
      el.dataset.rinloBrand = 'v1';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'Rinlo');
    }
  }

  function mount() {
    const doc = frame.contentDocument;
    if (!doc?.head || !doc.documentElement) return;

    ensureStyles(doc);
    normalize(doc);

    observer?.disconnect();
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) normalize(node);
        }
      }
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }

  frame.addEventListener('load', () => {
    setTimeout(mount, 0);
    setTimeout(mount, 120);
  });

  setTimeout(mount, 0);
  setTimeout(mount, 180);
})();