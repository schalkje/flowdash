// Adds Previous / Next demo navigation buttons to the .demo-header of each
// demo page. The ordered list of demos is parsed from /index.html (the same
// source the sidebar uses), so adding/removing demos there keeps this in sync.
//
// When the demo is loaded inside the index.html iframe, navigation goes
// through a postMessage so the sidebar's active item and URL hash stay in
// sync. Standalone, it just sets location.href.
(function () {
  'use strict';

  const STYLE_ID = 'demo-nav-style';
  const CSS = [
    '.demo-nav{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap;}',
    '.demo-nav-btn{padding:6px 14px;border:1px solid rgba(255,255,255,0.35);border-radius:5px;background:rgba(255,255,255,0.18);color:inherit;font:inherit;font-size:0.95rem;cursor:pointer;transition:background .2s ease,transform .2s ease,box-shadow .2s ease;}',
    '.demo-nav-btn:hover:not(:disabled){background:rgba(255,255,255,0.32);transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,0.15);}',
    '.demo-nav-btn:disabled{opacity:0.4;cursor:not-allowed;}',
    '.demo-nav-position{opacity:0.85;font-variant-numeric:tabular-nums;font-size:0.9rem;min-width:5ch;text-align:center;}',
    '.demo-nav-title{opacity:0.75;font-size:0.85rem;max-width:40ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
  ].join('');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  function navigateTo(path) {
    if (!path) return;
    if (inIframe()) {
      try {
        window.parent.postMessage({ type: 'flowdash-nav', path: path }, '*');
        return;
      } catch (e) {
        /* fall through to top-level navigation */
      }
    }
    window.location.href = '/' + path;
  }

  function currentPath() {
    // location.pathname is e.g. "/01_basicNodes/01_basic/basic.html"
    return decodeURIComponent(location.pathname.replace(/^\/+/, ''));
  }

  function parsePaths(html) {
    // Use DOMParser to avoid loading scripts/iframes from the parsed doc.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const anchors = doc.querySelectorAll('a[data-path]');
    const paths = [];
    anchors.forEach(function (a) {
      const p = a.getAttribute('data-path');
      if (p) paths.push(p);
    });
    return paths;
  }

  function build(paths) {
    const header = document.querySelector('.demo-header');
    if (!header) return;
    if (header.querySelector('.demo-nav')) return; // already injected

    const here = currentPath();
    const idx = paths.indexOf(here);
    const prev = idx > 0 ? paths[idx - 1] : null;
    const next = idx >= 0 && idx < paths.length - 1 ? paths[idx + 1] : null;

    const nav = document.createElement('div');
    nav.className = 'demo-nav';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'demo-nav-btn demo-nav-prev';
    prevBtn.textContent = '◀ Previous';
    prevBtn.disabled = !prev;
    if (prev) prevBtn.title = prev;
    prevBtn.addEventListener('click', function () {
      navigateTo(prev);
    });

    const label = document.createElement('span');
    label.className = 'demo-nav-position';
    label.textContent = idx >= 0 ? idx + 1 + ' / ' + paths.length : '— / ' + paths.length;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'demo-nav-btn demo-nav-next';
    nextBtn.textContent = 'Next ▶';
    nextBtn.disabled = !next;
    if (next) nextBtn.title = next;
    nextBtn.addEventListener('click', function () {
      navigateTo(next);
    });

    nav.appendChild(prevBtn);
    nav.appendChild(label);
    nav.appendChild(nextBtn);
    header.appendChild(nav);

    // Keyboard shortcuts: Alt+Left / Alt+Right for prev/next.
    document.addEventListener('keydown', function (e) {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft' && prev) {
        e.preventDefault();
        navigateTo(prev);
      } else if (e.key === 'ArrowRight' && next) {
        e.preventDefault();
        navigateTo(next);
      }
    });
  }

  // Some demos build .demo-header at runtime via mountDemoChrome (a module
  // script that runs deferred, just like us). We may arrive before it does,
  // so wait for the header to appear before injecting buttons.
  function whenHeaderReady(cb) {
    const existing = document.querySelector('.demo-header');
    if (existing) {
      cb(existing);
      return;
    }
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', function () {
        whenHeaderReady(cb);
      });
      return;
    }
    let done = false;
    let timer = null;
    var obs = new MutationObserver(function () {
      const h = document.querySelector('.demo-header');
      if (h && !done) {
        done = true;
        obs.disconnect();
        if (timer) clearTimeout(timer);
        cb(h);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Give up after a few seconds — the page just doesn't have a header.
    timer = setTimeout(function () {
      if (!done) {
        done = true;
        obs.disconnect();
      }
    }, 5000);
  }

  function start() {
    injectStyle();
    let paths = null,
      header = null;
    function tryBuild() {
      if (paths && header) build(paths);
    }
    fetch('/index.html', { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status));
      })
      .then(function (html) {
        paths = parsePaths(html);
        tryBuild();
      })
      .catch(function (err) {
        console.warn('[demo-nav] could not load index.html:', err);
      });
    whenHeaderReady(function (h) {
      header = h;
      tryBuild();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
