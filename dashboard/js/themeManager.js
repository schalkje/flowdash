(() => {
  const STORAGE_KEY = 'flowdashTheme';
  const KNOWN_THEMES = [
    'light',
    'dark',
    'brutalism',
    'neumorphism',
    'cyberpunk',
    'glassmorphism',
    'flat',
    'retro',
    'high-contrast-light',
    'high-contrast-dark',
  ];

  function getScriptEl() {
    return (
      document.currentScript ||
      Array.from(document.scripts).find((s) => s.src && s.src.endsWith('/themeManager.js'))
    );
  }

  function dirname(url) {
    try {
      const u = new URL(url, document.baseURI);
      u.pathname = u.pathname.replace(/\/[^/]*$/, '/');
      u.search = '';
      u.hash = '';
      return u.href;
    } catch (e) {
      return location.href;
    }
  }

  const scriptEl = getScriptEl();
  const scriptBase = dirname(scriptEl?.src || location.href);
  const themesBase = new URL('../themes/', scriptBase).href;

  function getQueryTheme() {
    const p = new URL(location.href).searchParams.get('theme');
    return KNOWN_THEMES.includes(p || '') ? p : null;
  }
  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
  function getOsPrefTheme() {
    try {
      return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  function getDefaultConfigTheme() {
    const cfg = (window.FLOWDASH_THEME && window.FLOWDASH_THEME.default) || null;
    return KNOWN_THEMES.includes(cfg || '') ? cfg : null;
  }
  function resolveInitialTheme() {
    return (
      getQueryTheme() || getStoredTheme() || getDefaultConfigTheme() || getOsPrefTheme() || 'light'
    );
  }

  function ensureThemeLinks() {
    const head = document.head;
    KNOWN_THEMES.forEach((themeName) => {
      if (!head.querySelector(`link[data-flowdash-theme="${themeName}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL(`${themeName}/flowdash.css`, themesBase).href;
        link.setAttribute('data-flowdash-theme', themeName);
        link.disabled = true;
        head.appendChild(link);
      }
    });
  }

  let currentTheme = null;
  function setTheme(themeName, { persist = true, broadcast = true } = {}) {
    if (!KNOWN_THEMES.includes(themeName)) return;
    const links = document.head.querySelectorAll('link[data-flowdash-theme]');
    links.forEach((link) => {
      link.disabled = link.getAttribute('data-flowdash-theme') !== themeName;
    });
    document.documentElement.setAttribute('data-theme', themeName);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, themeName);
      } catch {}
    }
    currentTheme = themeName;
    if (broadcast) {
      try {
        window.dispatchEvent(
          new CustomEvent('flowdash:themechange', { detail: { theme: themeName } }),
        );
      } catch {}
    }
    updateUi(themeName);
  }
  function listThemes() {
    return [...KNOWN_THEMES];
  }
  function toggleTheme() {
    const idx = KNOWN_THEMES.indexOf(currentTheme);
    const next = KNOWN_THEMES[(idx + 1) % KNOWN_THEMES.length];
    setTheme(next);
  }

  let uiRoot = null;
  function injectUi() {
    if (uiRoot) return;
    uiRoot = document.createElement('div');
    uiRoot.setAttribute('data-flowdash-theme-ui', 'root');
    uiRoot.innerHTML = `
      <style>
        [data-flowdash-theme-ui="root"]{position:fixed;top:10px;left:10px;display:flex;gap:6px;align-items:center;padding:6px 8px;border-radius:8px;z-index:99999;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);color-scheme: dark}
        [data-flowdash-theme-ui="root"] select,[data-flowdash-theme-ui="root"] button{font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#fff;background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:6px;padding:4px 8px;cursor:pointer}
        [data-flowdash-theme-ui="root"] select{background:var(--fd-surface);color:var(--fd-text,#fff)}
        [data-flowdash-theme-ui="root"] select option{background:var(--fd-surface);color:var(--fd-text,#fff)}
        [data-flowdash-theme-ui="root"] button{white-space:nowrap}
      </style>
      <select aria-label="Theme select"></select>
      <button type="button" aria-label="Toggle theme">Toggle</button>
    `;
    document.body.appendChild(uiRoot);
    const select = uiRoot.querySelector('select');
    listThemes().forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
    select.addEventListener('change', (e) => setTheme(e.target.value));
    uiRoot.querySelector('button').addEventListener('click', toggleTheme);
  }
  function updateUi(themeName) {
    if (!uiRoot) return;
    const select = uiRoot.querySelector('select');
    if (select && select.value !== themeName) {
      select.value = themeName;
    }
  }

  function boot() {
    ensureThemeLinks();
    injectUi();
    setTheme(resolveInitialTheme(), { persist: true, broadcast: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.flowdashTheme = {
    list: listThemes,
    get: () => currentTheme,
    set: (t) => setTheme(t),
    toggle: toggleTheme,
    onChange: (cb) => window.addEventListener('flowdash:themechange', (e) => cb(e.detail.theme)),
  };
})();
