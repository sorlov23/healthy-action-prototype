window.HEALTHY_ACTION_CONFIG = Object.freeze({
  apiBase: '',
  apiTimeoutMs: 2500,
  supabaseAuthEnabled: true,
  supabaseDataEnabled: true,
  supabaseUrl: 'https://xhlbiaueiqcmgifmihur.supabase.co',
  supabasePublishableKey: 'sb_publishable_WFXPfO4XN6rFJ7IA20Px9w_aoLhdJzI',
});

if (location.pathname.includes('/rinlo2/')) {
  const mobilePassStyles = document.createElement('link');
  mobilePassStyles.rel = 'stylesheet';
  mobilePassStyles.href = './mobile-pass-v1.css';
  document.head.appendChild(mobilePassStyles);

  document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = './home-decision-entry-v1.js';
    document.body.appendChild(script);
  }, { once: true });
}
