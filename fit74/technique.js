(() => {
  'use strict';
  // Compatibility entry point for cached clients. The image renderer is shared
  // with the current player, so this never inserts a second technique card.
  if (window.Fit74TechniqueImages) return;
  if (!document.querySelector('link[href*="technique-images.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './technique-images.css?v=10.0';
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[src*="technique-images.js"]')) {
    const script = document.createElement('script');
    script.src = './technique-images.js?v=10.0';
    document.head.appendChild(script);
  }
})();
