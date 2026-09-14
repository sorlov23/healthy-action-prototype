(() => {
  const frame = document.getElementById('app');
  if (!frame) return;
  let observer;
  const apply = () => {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;
    if (win.__rinloTodayV3 === 'v3') win.__rinloTodayV2 = 'v1';
    const today = doc.getElementById('today');
    if (today?.classList.contains('rinlo-today-v3')) today.classList.add('rtv2');
    today?.querySelector('.r3-hero')?.classList.add('rc-action');
    today?.querySelector('.r3-quick')?.classList.add('rc-quick');
  };
  const install = () => {
    const doc = frame.contentDocument;
    if (!doc?.documentElement) return;
    apply();
    observer?.disconnect();
    observer = new MutationObserver(() => apply());
    observer.observe(doc.documentElement, { childList:true, subtree:true });
  };
  frame.addEventListener('load', () => setTimeout(install, 0));
  setTimeout(install, 0);
  setTimeout(install, 220);
})();